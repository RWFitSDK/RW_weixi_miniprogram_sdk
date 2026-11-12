const bleManager = require("../../services/bleManager");
const { formatTime } = require("../../utils/format");

function formatBytes(value) {
  if (!value && value !== 0) return "--";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function requireSdk() {
  const sdk = bleManager.getSdk();
  if (!sdk) throw new Error("请先连接设备");
  return sdk;
}

function confirmModal(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: "#d86a32",
      success: ({ confirm }) => resolve(confirm),
      fail: () => resolve(false),
    });
  });
}

Page({
  data: {
    connected: false,
    status: { recording: false, duration: 0, totalCapacity: 0, remainingCapacity: 0, realtime: false },
    realtimeMode: false,
    realtimeStats: { packets: 0, bytes: 0, sequence: "--" },
    capacityText: "--",
    files: [],
    loadingStatus: false,
    loadingFiles: false,
    toggling: false,
    togglingRealtime: false,
    downloading: null,
  },

  unsubscribe: null,
  pushUnsubscribe: null,
  /** 实时音频为高频推送: 先在内存累计, 每 500ms 刷一次界面, 避免逐包 setData。 */
  realtimeCounters: { packets: 0, bytes: 0, sequence: null },
  realtimeFlushTimer: null,
  /** 页面存活(onLoad 置 true, onUnload 置 false): 异步返回后不再更新已销毁页面。 */
  alive: true,
  /** 页面可见(onShow 置 true, onHide 置 false): 被覆盖时不再弹提示。 */
  visible: true,

  /** 页面销毁后放弃所有界面更新。 */
  syncState(patch) {
    if (this.alive) this.setData(patch);
  },

  /** 仅在页面存活且可见时弹提示, 避免在覆盖页之上弹窗。 */
  notify(title, icon = "none") {
    if (this.alive && this.visible) wx.showToast({ title, icon });
  },

  applyRecordStatus(status) {
    if (!status) return;
    this.syncState({
      status,
      realtimeMode: status.recording && !!status.realtime,
      capacityText: `${formatBytes(status.remainingCapacity)} / ${formatBytes(status.totalCapacity)}`,
    });
  },

  onLoad() {
    this.unsubscribe = bleManager.subscribe((state) => {
      const connected = state.connectionState === "connected";
      // 重连会创建新的 SDK 实例, 需重新绑定推送监听并刷新状态; 文件列表由用户点击刷新获取
      if (connected && !this.data.connected) {
        this.subscribeRecordPush();
        void this.refreshStatus();
      } else if (!connected) {
        this.unsubscribeRecordPush();
        // 断连/切换设备后旧列表失效, 清空避免用旧 fileId 误操作新设备
        this.syncState({ files: [] });
      }
      this.syncState({ connected });
    });
    this.syncState({ connected: bleManager.snapshot().connectionState === "connected" });
  },

  onUnload() {
    this.alive = false;
    this.visible = false;
    this.unsubscribe && this.unsubscribe();
    this.unsubscribe = null;
    this.unsubscribeRecordPush();
  },

  onShow() {
    this.visible = true;
    if (bleManager.snapshot().connectionState === "connected") {
      this.subscribeRecordPush();
      void this.refreshStatus();
    }
  },

  onHide() {
    this.visible = false;
    this.unsubscribeRecordPush();
  },

  /** 设备会在录制状态变化时主动推送(对齐 Android DevicePushType.RECORD_STATUS)。 */
  subscribeRecordPush() {
    this.unsubscribeRecordPush();
    const sdk = bleManager.getSdk();
    if (!sdk) return;
    this.pushUnsubscribe = sdk.onDeviceEvent((event) => {
      if (event.type === "recordStatus") this.applyRecordStatus(event.status);
      if (event.type === "recordRealtimeData") this.onRealtimeAudio(event);
    });
  },

  /** 实时音频只统计不保存: 包数/字节/最新序号, 节流刷新界面。 */
  onRealtimeAudio(event) {
    this.realtimeCounters.packets += 1;
    this.realtimeCounters.bytes += event.audioData.length;
    this.realtimeCounters.sequence = event.sequence;
    if (this.realtimeFlushTimer) return;
    this.realtimeFlushTimer = setTimeout(() => {
      this.realtimeFlushTimer = null;
      this.syncState({ realtimeStats: { ...this.realtimeCounters, sequence: String(this.realtimeCounters.sequence ?? "--") } });
    }, 500);
  },

  unsubscribeRecordPush() {
    this.pushUnsubscribe && this.pushUnsubscribe();
    this.pushUnsubscribe = null;
    if (this.realtimeFlushTimer) {
      clearTimeout(this.realtimeFlushTimer);
      this.realtimeFlushTimer = null;
    }
  },

  /** 本次查询成功返回 true; 失败或已有查询在途时返回 false, 调用方不应再用旧状态做后续判断。 */
  async refreshStatus() {
    if (this.data.loadingStatus) return false;
    this.syncState({ loadingStatus: true });
    try {
      this.applyRecordStatus(await requireSdk().getRecordStatus());
      return true;
    } catch (error) {
      this.notify(error.message || "获取状态失败");
      return false;
    } finally {
      this.syncState({ loadingStatus: false });
    }
  },

  async refreshFiles() {
    if (this.data.loadingFiles) return;
    this.syncState({ loadingFiles: true });
    try {
      const files = await requireSdk().getRecordFileList();
      this.syncState({
        files: files.map((item) => ({
          fileId: item.fileId,
          sizeText: formatBytes(item.fileSize),
          duration: item.duration,
          timeText: item.timestamp ? formatTime(item.timestamp) : "未知时间",
        })),
      });
    } catch (error) {
      this.notify(error.message || "获取列表失败");
    } finally {
      this.syncState({ loadingFiles: false });
    }
  },

  async toggleRecord() {
    if (this.data.toggling) return;
    this.syncState({ toggling: true });
    const start = !this.data.status.recording;
    try {
      // 返回操作后的实际录音状态(1=录音中, 0=空闲)，查询后更新页面。
      await requireSdk().recordControl(start);
      // 查询失败已提示"获取状态失败", 不再用旧状态判断, 避免覆盖错误提示
      if (!(await this.refreshStatus())) return;
      this.notify(!!this.data.status.recording === start
        ? (start ? "录音已开始" : "录音已停止")
        : (start ? "设备未开始录音" : "设备未停止录音"),
        !!this.data.status.recording === start ? "success" : "none");
    } catch (error) {
      this.notify(error.message || "操作失败");
    } finally {
      this.syncState({ toggling: false });
    }
  },

  /** 实时录音：音频经 recordRealtimeData 事件推送，此处只演示接收统计。 */
  async toggleRealtimeRecord() {
    if (this.data.togglingRealtime) return;
    // 普通录音进行中不直接切换模式; 先停止, 再启动实时录音
    if (this.data.status.recording && !this.data.realtimeMode) {
      this.notify("请先停止普通录音");
      return;
    }
    this.syncState({ togglingRealtime: true });
    const start = !this.data.status.recording;
    try {
      if (start) {
        this.realtimeCounters = { packets: 0, bytes: 0, sequence: null };
        this.syncState({ realtimeStats: { packets: 0, bytes: 0, sequence: "--" } });
      }
      // 查询详细状态，确认启动/停止是否生效并更新页面。
      await requireSdk().recordRealtimeControl(start);
      // 查询失败已提示"获取状态失败", 不再用旧状态判断, 避免覆盖错误提示
      if (!(await this.refreshStatus())) return;
      const started = start ? this.data.realtimeMode : !this.data.status.recording;
      this.notify(started
        ? (start ? "实时录音已启动" : "实时录音已停止")
        : (start ? "设备未开始实时录音" : "设备未停止录音"),
        started ? "success" : "none");
    } catch (error) {
      this.notify(error.message || "操作失败");
    } finally {
      this.syncState({ togglingRealtime: false });
    }
  },

  async downloadFile(event) {
    if (this.data.downloading) return;
    const fileId = Number(event.currentTarget.dataset.fileId);
    const target = this.data.files.find((item) => item.fileId === fileId);
    if (!target) return;
    const startedAt = Date.now();
    this.syncState({ downloading: { fileId, progress: 0 } });
    try {
      // SDK 只交付拼接完整的原始录音字节(不保存、不转码), Demo 仅演示接收结果。
      const result = await requireSdk().transferRecordFile(fileId, {
        onProgress: (received, meta) => {
          const percent = meta.fileSize > 0 ? Math.round((received / meta.fileSize) * 100) : 1;
          this.syncState({ "downloading.progress": Math.min(100, percent) });
        },
      });
      if (!this.alive || !this.visible) return;
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      wx.showModal({
        title: "下载完成",
        content: `收到原始录音数据 ${formatBytes(result.data.length)},耗时 ${seconds} 秒。\n(fileType=${result.fileType}, format=${result.format}, 时长 ${result.duration} 秒)\n按当前设计不保存到本地, 由业务端自行处理。`,
        showCancel: false,
      });
    } catch (error) {
      this.notify(error.message || "下载失败");
    } finally {
      this.syncState({ downloading: null });
    }
  },

  async removeFile(event) {
    const fileId = Number(event.currentTarget.dataset.fileId);
    const target = this.data.files.find((item) => item.fileId === fileId);
    if (!target) return;
    const sdkAtPrompt = bleManager.getSdk();
    if (!sdkAtPrompt) return;
    if (!(await confirmModal("删除录音", `删除 ${target.timeText} 的录音文件?`))) return;
    // 确认期间可能断连或切换设备: 实例变化或已断连则取消, 避免用旧列表 fileId 误删新设备文件
    if (bleManager.getSdk() !== sdkAtPrompt || !this.data.connected) {
      this.notify("连接已变化，已取消删除");
      return;
    }
    try {
      const status = await sdkAtPrompt.deleteRecordFile(fileId);
      if (status !== undefined && status !== 0) throw new Error(`设备返回状态 ${status}`);
      this.notify("已删除", "success");
      await this.refreshFiles();
      await this.refreshStatus();
    } catch (error) {
      this.notify(error.message || "删除失败");
    }
  },
});
