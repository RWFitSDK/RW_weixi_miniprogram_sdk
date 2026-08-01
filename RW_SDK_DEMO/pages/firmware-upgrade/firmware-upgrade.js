const bleManager = require("../../services/bleManager");
const firmwareFiles = require("../../utils/firmwareFiles");

function choose(itemList) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      success: ({ tapIndex }) => resolve(tapIndex),
      fail: () => resolve(null),
    });
  });
}

function confirmUpgrade(content) {
  return new Promise((resolve) => {
    wx.showModal({
      title: "确认固件升级",
      content,
      confirmText: "开始升级",
      confirmColor: "#d86a32",
      success: (result) => resolve(!!result.confirm),
      fail: () => resolve(false),
    });
  });
}

function formatFileSize(size) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

Page({
  data: {
    boundDevice: null,
    connected: false,
    currentDeviceModel: "--",
    currentVersion: "--",
    files: [],
    selectedId: "",
    compareModelEnabled: true,
    readingFirmwareInfo: false,
    upgrading: false,
    progress: 0,
    statusText: "请选择厂家提供的升级文件",
  },

  onLoad() {
    this.unsubscribe = bleManager.subscribe((state) => this.applyState(state));
    this.refreshFiles();
  },

  onShow() {
    this.applyState(bleManager.snapshot());
    this.refreshFiles();
    this.refreshFirmwareInfo();
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
    if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload({});
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: false });
  },

  applyState(state) {
    const device = state.boundDevice;
    const firmware = device && device.firmware;
    this.setData({
      boundDevice: device,
      connected: state.connected,
      currentDeviceModel: firmware && firmware.deviceModel ? firmware.deviceModel : "--",
      currentVersion: firmware && firmware.version ? firmware.version : "--",
    });
  },

  async refreshFirmwareInfo() {
    if (!this.data.connected || this.data.upgrading || this.data.readingFirmwareInfo) return;
    const sdk = bleManager.getSdk();
    if (!sdk) return;
    this.setData({ readingFirmwareInfo: true });
    try {
      const firmware = await sdk.readFirmwareVersion();
      if (!firmware) throw new Error("固件信息为空");
      this.setData({
        currentDeviceModel: firmware.deviceModel || "--",
        currentVersion: firmware.version || "--",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "固件信息获取失败", icon: "none" });
    } finally {
      this.setData({ readingFirmwareInfo: false });
    }
  },

  refreshFiles(selectedId) {
    const files = firmwareFiles.getFiles().map((file) => ({
      ...file,
      sizeText: formatFileSize(file.fileSize),
      dateText: formatDate(file.importedAt),
    }));
    const nextSelectedId = selectedId === undefined ? this.data.selectedId : selectedId;
    const selected = files.find((file) => file.id === nextSelectedId);
    const values = { files, selectedId: selected ? selected.id : "" };
    if (selected && !this.data.upgrading) values.statusText = `已选择 ${selected.fileName}`;
    this.setData(values);
  },

  async importFirmware() {
    if (this.data.upgrading) return;
    if (!wx.chooseMessageFile) {
      wx.showToast({ title: "当前微信版本不支持聊天文件选择", icon: "none" });
      return;
    }
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      success: async ({ tempFiles }) => {
        const source = tempFiles && tempFiles[0];
        if (!source) return;
        wx.showLoading({ title: "正在导入", mask: true });
        try {
          const file = await firmwareFiles.importFile(source);
          this.refreshFiles(file.id);
          wx.showToast({ title: "导入成功", icon: "success" });
        } catch (error) {
          wx.showToast({ title: error.message || "导入失败", icon: "none", duration: 3000 });
        } finally {
          wx.hideLoading();
        }
      },
      fail: (error) => {
        const message = error && error.errMsg && error.errMsg.includes("cancel")
          ? ""
          : "选择固件失败";
        if (message) wx.showToast({ title: message, icon: "none" });
      },
    });
  },

  selectFile(event) {
    if (this.data.upgrading) return;
    const id = event.currentTarget.dataset.id;
    const selected = this.data.files.find((file) => file.id === id);
    if (!selected) return;
    this.setData({
      selectedId: id,
      statusText: `已选择 ${selected.fileName}`,
      progress: 0,
    });
  },

  async manageFile(event) {
    if (this.data.upgrading) return;
    const id = event.currentTarget.dataset.id;
    const file = this.data.files.find((item) => item.id === id);
    if (!file) return;
    const action = await choose(["转发文件到聊天", "删除文件"]);
    if (action === 0) {
      if (!wx.shareFileMessage) {
        wx.showToast({ title: "当前微信版本不支持文件转发", icon: "none" });
        return;
      }
      wx.shareFileMessage({
        filePath: file.filePath,
        fileName: file.fileName,
        fail: () => wx.showToast({ title: "转发失败", icon: "none" }),
      });
      return;
    }
    if (action === 1) {
      firmwareFiles.removeFile(id);
      this.refreshFiles(this.data.selectedId === id ? "" : this.data.selectedId);
      wx.showToast({ title: "已删除", icon: "success" });
    }
  },

  changeCompareModel(event) {
    if (this.data.upgrading) return;
    this.setData({ compareModelEnabled: !!event.detail.value });
  },

  async startUpgrade() {
    if (this.data.upgrading) return;
    if (!this.data.connected) {
      wx.showToast({ title: "请先连接设备", icon: "none" });
      return;
    }
    const sdk = bleManager.getSdk();
    if (!sdk) {
      wx.showToast({ title: "SDK 尚未初始化", icon: "none" });
      return;
    }
    const file = this.data.files.find((item) => item.id === this.data.selectedId);
    if (!file) {
      wx.showToast({ title: "请先选择升级文件", icon: "none" });
      return;
    }
    if (this.data.compareModelEnabled) {
      const deviceModel = this.data.currentDeviceModel === "--" ? "" : this.data.currentDeviceModel;
      if (!deviceModel) {
        wx.showToast({ title: "未获取到设备型号，请先刷新固件信息", icon: "none", duration: 3000 });
        return;
      }
      if (!firmwareFiles.fileNameMatchesModel(file.fileName, deviceModel)) {
        wx.showModal({
          title: "固件型号不匹配",
          content: `当前设备型号：${deviceModel}\n固件文件名：${file.fileName}\n\n文件名中未找到当前设备型号。如已确认固件正确，可关闭“对比设备型号”后重试。`,
          showCancel: false,
        });
        return;
      }
    }
    const confirmed = await confirmUpgrade(
      `文件：${file.fileName}\n当前设备：${this.data.currentDeviceModel}\n当前固件：${this.data.currentVersion}\n型号校验：${this.data.compareModelEnabled ? "已通过" : "已关闭"}\n\n升级期间请保持小程序前台、设备靠近且不要关闭蓝牙。`,
    );
    if (!confirmed) return;

    this.setData({ upgrading: true, progress: 0, statusText: "正在读取升级文件" });
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: true });
    if (wx.enableAlertBeforeUnload) {
      wx.enableAlertBeforeUnload({ message: "固件正在升级，退出可能导致升级失败" });
    }
    try {
      const firmware = await firmwareFiles.readFile(file.filePath);
      let lastProgress = -1;
      this.setData({ statusText: "正在升级，请勿离开页面" });
      await sdk.upgradeFirmware(firmware, {
        onProgress: (value) => {
          const progress = Math.max(0, Math.min(100, Math.round(value * 100)));
          if (progress === lastProgress) return;
          lastProgress = progress;
          this.setData({ progress });
        },
      });
      this.setData({ progress: 100, statusText: "固件数据发送完成" });
      wx.showModal({
        title: "固件发送完成",
        content: "设备可能会自动重启或断开连接。请重新连接设备并读取固件版本，确认升级结果。",
        showCancel: false,
      });
    } catch (error) {
      this.setData({ statusText: `升级失败：${error.message || error}` });
      wx.showModal({ title: "升级失败", content: error.message || String(error), showCancel: false });
    } finally {
      this.setData({ upgrading: false });
      if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload({});
      if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keepScreenOn: false });
    }
  },
});
