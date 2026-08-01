const bleManager = require("../../services/bleManager");
const {
  getWorkoutTypeName,
  getWorkoutStatusText,
  formatWorkoutDuration,
} = require("../../utils/workout");

function confirmFinish() {
  return new Promise((resolve) => {
    wx.showModal({
      title: "结束运动",
      content: "结束后设备会保存本次运动；运动不足 2 分钟可能不会生成报告。",
      confirmText: "结束",
      confirmColor: "#d84b4b",
      success: (result) => resolve(!!result.confirm),
      fail: () => resolve(false),
    });
  });
}

Page({
  data: {
    connected: false,
    sportType: 7,
    typeName: "跑步",
    status: 1,
    statusText: "运动中",
    isRunning: true,
    isPaused: false,
    busy: false,
    timeText: "00:00:00",
    stepsText: "0",
    distanceText: "0.00",
    calorieText: "0.0",
    heartRateText: "--",
  },

  onLoad(options) {
    const sportType = Number(options.sportType) || 7;
    const status = Number(options.status) || 1;
    this.setData({
      sportType,
      typeName: getWorkoutTypeName(sportType),
      status,
      statusText: getWorkoutStatusText(status),
      isRunning: status >= 1 && status <= 3,
      isPaused: status === 3,
    });
    wx.setNavigationBarTitle({ title: getWorkoutTypeName(sportType) });
    this.lastWorkoutRevision = -1;
    this.realtimeDesired = false;
    this.realtimeEnabled = false;
    this.realtimeStarting = false;
    this.unsubscribe = bleManager.subscribe((state) => this.applyState(state));
  },

  onShow() {
    this.pageVisible = true;
    this.enableRealtime();
  },

  onHide() {
    this.pageVisible = false;
    this.disableRealtime();
  },

  onUnload() {
    this.pageVisible = false;
    this.disableRealtime();
    if (this.unsubscribe) this.unsubscribe();
  },

  applyState(state) {
    const workout = state.workoutState;
    const values = { connected: state.connected };
    if (workout && (workout.isRunning || workout.sportType === this.data.sportType)) {
      values.sportType = workout.sportType || this.data.sportType;
      values.typeName = getWorkoutTypeName(values.sportType);
      values.status = workout.status;
      values.statusText = getWorkoutStatusText(workout.status);
      values.isRunning = workout.isRunning;
      values.isPaused = workout.status === 3;
    }
    if (state.workoutRevision !== this.lastWorkoutRevision) {
      this.lastWorkoutRevision = state.workoutRevision;
      const realtime = state.workoutRealtime;
      values.timeText = formatWorkoutDuration(realtime.activityTime);
      values.stepsText = String(realtime.steps || 0);
      values.distanceText = ((realtime.distance || 0) / 1000).toFixed(2);
      values.calorieText = ((realtime.calorie || 0) / 1000).toFixed(1);
      values.heartRateText = realtime.heartRate > 0 ? String(realtime.heartRate) : "--";
    }
    this.setData(values);
  },

  async enableRealtime() {
    this.realtimeDesired = true;
    if (this.realtimeEnabled || this.realtimeStarting) return;
    const state = bleManager.snapshot();
    if (!state.connected) return;
    this.realtimeStarting = true;
    try {
      await bleManager.setWorkoutRealtimePush(true);
      this.realtimeEnabled = true;
      if (!this.realtimeDesired) {
        this.disableRealtime();
        return;
      }
      await bleManager.getWorkoutState();
    } catch (error) {
      if (this.pageVisible) wx.showToast({ title: error.message || "实时运动数据开启失败", icon: "none" });
    } finally {
      this.realtimeStarting = false;
    }
  },

  disableRealtime() {
    this.realtimeDesired = false;
    if (!this.realtimeEnabled) return Promise.resolve();
    this.realtimeEnabled = false;
    if (!bleManager.snapshot().connected) return Promise.resolve();
    return bleManager.setWorkoutRealtimePush(false).catch(() => undefined);
  },

  pauseWorkout() {
    this.runControl(3, "运动已暂停");
  },

  continueWorkout() {
    this.runControl(2, "运动已继续");
  },

  async runControl(status, successText) {
    if (!this.data.connected || this.data.busy) return;
    this.setData({ busy: true });
    try {
      await bleManager.controlWorkout(this.data.sportType, status);
      wx.showToast({ title: successText, icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "运动控制失败", icon: "none" });
    } finally {
      this.setData({ busy: false });
    }
  },

  async finishWorkout() {
    if (!this.data.connected || this.data.busy || !await confirmFinish()) return;
    this.setData({ busy: true });
    wx.showLoading({ title: "正在结束", mask: true });
    let reportCount = 0;
    let reportError = null;
    try {
      await bleManager.controlWorkout(this.data.sportType, 4);
      await this.disableRealtime();
      try {
        const records = await bleManager.syncWorkoutReports();
        reportCount = records.length;
      } catch (error) {
        reportError = error;
      }
    } catch (error) {
      wx.showToast({ title: error.message || "结束运动失败", icon: "none" });
      return;
    } finally {
      wx.hideLoading();
      this.setData({ busy: false });
    }

    wx.showToast({
      title: reportError ? "运动已结束，报告同步失败" : reportCount ? "运动报告已保存" : "运动已结束，暂无报告",
      icon: reportError || !reportCount ? "none" : "success",
      duration: 2200,
    });
    setTimeout(() => wx.navigateBack(), 350);
  },
});
