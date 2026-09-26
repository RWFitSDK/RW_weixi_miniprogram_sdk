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
    status: { recording: false, duration: 0, totalCapacity: 0, remainingCapacity: 0 },
    capacityText: "--",
    files: [],
    loadingStatus: false,
    loadingFiles: false,
    toggling: false,
    downloading: null,
  },

  unsubscribe: null,
  pushUnsubscribe: null,
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
    });
  },

  unsubscribeRecordPush() {
    this.pushUnsubscribe && this.pushUnsubscribe();
    this.pushUnsubscribe = null;
  },

  async refreshStatus() {
    if (this.data.loadingStatus) return;
    this.syncState({ loadingStatus: true });
    try {
      this.applyRecordStatus(await requireSdk().getRecordStatus());
    } catch (error) {
      this.notify(error.message || "获取状态失败");
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
    try {
      // 应答 0=成功、非 0 失败; 不依据本地旧状态提示, 实际录制状态由查询/推送更新
      const status = await requireSdk().recordControl(!this.data.status.recording);
      if (status !== undefined && status !== 0) throw new Error(`设备返回状态 ${status}`);
      this.notify("指令执行成功", "success");
      await this.refreshStatus();
    } catch (error) {
      this.notify(error.message || "操作失败");
    } finally {
      this.syncState({ toggling: false });
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
