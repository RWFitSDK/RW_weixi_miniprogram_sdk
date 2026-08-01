const bleManager = require("../../services/bleManager");
const { getHealthCards } = require("../../utils/capabilities");
const { formatTime } = require("../../utils/format");

Page({
  data: {
    boundDevice: null,
    connectionState: "disconnected",
    healthCards: [],
    connected: false,
    healthSyncing: false,
    healthSyncProgress: 0,
    lastSyncText: "下拉同步全部健康数据"
  },

  onLoad() {
    this.unsubscribe = bleManager.subscribe((state) => {
      this.setData({
        boundDevice: state.boundDevice,
        connectionState: state.connectionState,
        connected: state.connected,
        healthCards: getHealthCards(state.boundDevice, state.realtimeHealth),
        healthSyncing: state.healthSyncing,
        healthSyncProgress: state.healthSyncProgress,
        lastSyncText: state.healthSyncing
          ? `正在同步 ${state.healthSyncProgress}%`
          : state.boundDevice && state.boundDevice.lastHealthSyncAt
            ? `上次同步 ${formatTime(state.boundDevice.lastHealthSyncAt)}`
            : "下拉同步全部健康数据"
      });
    });
  },

  onShow() {
    const state = bleManager.snapshot();
    this.setData({ healthCards: getHealthCards(state.boundDevice, state.realtimeHealth) });
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
  },

  async onPullDownRefresh() {
    const state = bleManager.snapshot();
    if (!state.boundDevice) {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "请先绑定设备", icon: "none" });
      return;
    }
    try {
      if (!state.connected) await bleManager.reconnect();
      const result = await bleManager.syncAllHealthData();
      const latestState = bleManager.snapshot();
      this.setData({ healthCards: getHealthCards(latestState.boundDevice, latestState.realtimeHealth) });
      wx.showToast({
        title: result.failedTypes.length
          ? `同步完成，${result.failedTypes.length}项失败`
          : "同步完成",
        icon: result.failedTypes.length ? "none" : "success",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "同步失败", icon: "none" });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  openSearch() {
    wx.navigateTo({ url: "/pages/search/search" });
  },

  openDevice() {
    wx.switchTab({ url: "/pages/device/device" });
  },

  openHistory(event) {
    const type = event.currentTarget.dataset.type;
    if (type === "workout") {
      wx.navigateTo({ url: "/pages/workout/workout" });
      return;
    }
    wx.navigateTo({ url: `/pages/history/history?type=${type}` });
  }
});
