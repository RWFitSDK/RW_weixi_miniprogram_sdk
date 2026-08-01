const bleManager = require("../../services/bleManager");
const { formatTime } = require("../../utils/format");
const {
  WORKOUT_TYPES,
  getWorkoutTypeName,
  getWorkoutStatusText,
} = require("../../utils/workout");

Page({
  data: {
    connected: false,
    checking: false,
    starting: false,
    reportsLoading: false,
    workoutTypes: WORKOUT_TYPES,
    activeWorkout: null,
    reports: [],
    keyword: "",
  },

  onLoad() {
    this.autoResume = true;
    this.navigating = false;
    this.unsubscribe = bleManager.subscribe((state) => this.applyState(state));
  },

  onShow() {
    this.navigating = false;
    const shouldAutoResume = this.autoResume;
    this.autoResume = false;
    if (bleManager.snapshot().connected) this.refreshState(shouldAutoResume);
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
  },

  onPullDownRefresh() {
    const refresh = bleManager.snapshot().connected
      ? this.refreshState(false)
      : Promise.resolve();
    refresh.finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  applyState(state) {
    const workout = state.workoutState;
    this.setData({
      connected: state.connected,
      reports: (state.workoutReports || []).map((record) => ({
        id: record.id,
        valueText: record.value,
        typeName: getWorkoutTypeName(record.detail && record.detail.workModel),
        summary: record.summary || "运动记录",
        timeText: formatTime(record.measuredAt),
      })),
      activeWorkout: workout && workout.isRunning ? {
        sportType: workout.sportType,
        typeName: getWorkoutTypeName(workout.sportType),
        status: workout.status,
        statusText: getWorkoutStatusText(workout.status),
      } : null,
    });
  },

  async refreshState(autoResume) {
    if (this.data.checking) return null;
    this.setData({ checking: true });
    try {
      const state = await bleManager.getWorkoutState();
      if (state.isRunning && autoResume) this.openRunning(state);
      return state;
    } catch (error) {
      wx.showToast({ title: error.message || "运动状态读取失败", icon: "none" });
      return null;
    } finally {
      this.setData({ checking: false });
    }
  },

  filterTypes(event) {
    const keyword = String(event.detail.value || "").trim().toLowerCase();
    this.setData({
      keyword,
      workoutTypes: keyword
        ? WORKOUT_TYPES.filter((item) => item.name.toLowerCase().includes(keyword))
        : WORKOUT_TYPES,
    });
  },

  async selectWorkout(event) {
    if (!this.data.connected) {
      wx.showToast({ title: "请先连接设备", icon: "none" });
      return;
    }
    if (this.data.starting || this.data.checking) return;
    const sportType = Number(event.currentTarget.dataset.code);
    this.setData({ starting: true });
    wx.showLoading({ title: "正在启动", mask: true });
    try {
      const current = await bleManager.getWorkoutState();
      if (current.isRunning) {
        this.openRunning(current);
        return;
      }
      const state = await bleManager.controlWorkout(sportType, 1);
      this.openRunning(state);
    } catch (error) {
      wx.showToast({ title: error.message || "启动运动失败", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ starting: false });
    }
  },

  continueWorkout() {
    if (this.data.activeWorkout) this.openRunning(this.data.activeWorkout);
  },

  async loadHistoricalReports() {
    if (!this.data.connected) {
      wx.showToast({ title: "请先连接设备", icon: "none" });
      return;
    }
    if (this.data.reportsLoading) return;
    this.setData({ reportsLoading: true });
    wx.showLoading({ title: "加载运动报告", mask: true });
    try {
      const records = await bleManager.syncWorkoutReports();
      wx.showToast({
        title: records.length ? `已加载 ${records.length} 条报告` : "设备暂无新报告",
        icon: records.length ? "success" : "none",
      });
    } catch (error) {
      wx.showToast({ title: error.message || "运动报告加载失败", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ reportsLoading: false });
    }
  },

  openRunning(state) {
    if (this.navigating || !state) return;
    this.navigating = true;
    wx.navigateTo({
      url: `/pages/workout-running/workout-running?sportType=${state.sportType}&status=${state.status}`,
      fail: () => { this.navigating = false; },
    });
  },

});
