const bleManager = require("../../services/bleManager");

function presentDevices(devices) {
  return devices.map((device) => ({
    deviceId: device.deviceId,
    name: device.name,
    localName: device.localName,
    RSSI: device.RSSI,
    macAddress: device.macAddress || "",
    systemConnected: !!device.systemConnected,
    macAddressText: device.macAddress || "未从广播获取",
    deviceIdText: device.deviceId,
    batteryStatusText: ({ 0: "未充电", 1: "充电中", 2: "充满" })[device.batteryStatus] || "",
    signalText: device.systemConnected
      ? "已系统配对"
      : device.RSSI >= -55 ? "信号强" : device.RSSI >= -72 ? "信号良好" : "信号较弱"
  }));
}

Page({
  data: {
    devices: [],
    scanning: false,
    scanRemainingSeconds: 0,
    connectingId: "",
    error: "",
    logs: []
  },

  onLoad() {
    this.unsubscribe = bleManager.subscribe((state) => {
      this.setData({
        devices: presentDevices(state.devices),
        scanning: state.scanning,
        scanRemainingSeconds: state.scanRemainingSeconds,
        error: state.error,
        logs: state.logs.slice(0, 8)
      });
    });
    this.startScan();
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
    bleManager.stopScan();
  },

  onPullDownRefresh() {
    this.startScan().finally(() => wx.stopPullDownRefresh());
  },

  async startScan() {
    try {
      await bleManager.startScan();
    } catch (error) {
      bleManager.presentError(error, "无法搜索设备");
    }
  },

  async stopScan() {
    await bleManager.stopScan();
  },

  async connectDevice(event) {
    if (this.data.connectingId) return;
    const deviceId = event.currentTarget.dataset.id;
    const device = this.data.devices.find((item) => item.deviceId === deviceId);
    if (!device) return;
    this.setData({ connectingId: deviceId });
    wx.showLoading({ title: "连接并初始化", mask: true });
    try {
      await bleManager.connect(device);
      wx.hideLoading();
      wx.showToast({ title: "绑定成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ connectingId: "" });
      bleManager.presentError(error, "连接失败");
    }
  },

  copyLogs() {
    wx.setClipboardData({
      data: bleManager.snapshot().logs.slice().reverse().join("\n"),
      success: () => wx.showToast({ title: "日志已复制", icon: "success" })
    });
  }
});
