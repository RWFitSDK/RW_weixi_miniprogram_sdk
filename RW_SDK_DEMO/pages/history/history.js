const bleManager = require("../../services/bleManager");
const storage = require("../../utils/storage");
const { findHealthType } = require("../../utils/capabilities");
const { formatTime } = require("../../utils/format");

function valueText(record, fallbackUnit) {
  const unit = record.unit || fallbackUnit;
  return `${record.value}${unit ? ` ${unit}` : ""}`;
}

function buildHistoryRecords(records, type, fallbackUnit) {
  if (type !== "sleep") {
    const ordered = type === "steps"
      ? records.slice().sort((first, second) => {
        const firstToday = String(first.id || "").startsWith("steps-day-") ? 1 : 0;
        const secondToday = String(second.id || "").startsWith("steps-day-") ? 1 : 0;
        return secondToday - firstToday || second.measuredAt - first.measuredAt;
      })
      : records;
    return ordered.map((record) => ({
      id: record.id,
      valueText: valueText(record, fallbackUnit),
      summary: record.summary || "设备同步数据",
      timeText: formatTime(record.measuredAt),
    }));
  }

  const result = [];
  records.forEach((record) => {
    const stages = record.detail && Array.isArray(record.detail.items)
      ? record.detail.items
      : [];
    if (!stages.length) {
      result.push({
        id: record.id,
        valueText: valueText(record, fallbackUnit),
        summary: record.summary || "睡眠记录",
        timeText: formatTime(record.measuredAt),
      });
      return;
    }
    stages.forEach((stage, index) => {
      result.push({
        id: `${record.id}-stage-${index}`,
        valueText: stage.sleepTypeText || "睡眠状态",
        summary: `${stage.minutes} 分钟${stage.isTemporary ? " · 临时数据" : ""}`,
        timeText: formatTime(stage.startAt),
      });
    });
  });
  return result;
}

Page({
  data: {
    type: "",
    title: "健康数据",
    unit: "",
    records: [],
    latestValue: "暂无数据",
    latestTime: "连接设备同步后显示",
    connected: false,
    supportsMeasurement: false,
    measuring: false,
    measurementBusy: false,
    historyCaption: "0 条",
  },

  onLoad(options) {
    const type = options.type || "";
    this.definition = findHealthType(type);
    this.pageVisible = false;
    this.lastHealthRevision = -1;
    this.lastRealtimeHealthRevision = -1;
    this.setData({
      type,
      title: this.definition ? this.definition.title : "健康数据",
      unit: this.definition ? this.definition.unit : "",
      supportsMeasurement: !!(this.definition && this.definition.measurementCode),
    });
    wx.setNavigationBarTitle({
      title: `${this.definition ? this.definition.title : "健康"}历史`,
    });
    this.unsubscribe = bleManager.subscribe((state) => {
      this.setData({
        connected: state.connected,
        measuring: state.activeMeasurementType === this.data.type,
      });
      const historyChanged = state.healthRevision !== this.lastHealthRevision;
      const realtimeChanged = state.realtimeHealthRevision !== this.lastRealtimeHealthRevision;
      this.lastHealthRevision = state.healthRevision;
      this.lastRealtimeHealthRevision = state.realtimeHealthRevision;
      if (historyChanged || (this.pageVisible && realtimeChanged)) {
        this.loadRecords(state);
      }
    });
    this.loadRecords();
  },

  onShow() {
    this.pageVisible = true;
    this.loadRecords();
  },

  onHide() {
    this.pageVisible = false;
  },

  onUnload() {
    this.pageVisible = false;
    if (this.unsubscribe) this.unsubscribe();
  },

  onPullDownRefresh() {
    this.loadRecords();
    wx.stopPullDownRefresh();
  },

  loadRecords(snapshot) {
    const state = snapshot || bleManager.snapshot();
    const device = state.boundDevice;
    if (!device || !this.data.type) {
      this.setData({ records: [], latestValue: "暂无数据", latestTime: "尚未绑定设备" });
      return;
    }
    const storedRecords = storage.getHealthRecords(device.deviceId, this.data.type);
    const records = buildHistoryRecords(storedRecords, this.data.type, this.data.unit);
    const realtime = state.realtimeHealth[this.data.type] || null;
    const latestHistorical = this.data.type === "steps"
      ? storedRecords.find((record) => String(record.id || "").startsWith("steps-day-")) || storedRecords[0]
      : storedRecords[0];
    const latest = realtime || latestHistorical || null;
    this.setData({
      records,
      latestValue: latest ? valueText(latest, this.data.unit) : "暂无数据",
      latestTime: latest ? formatTime(latest.measuredAt) : "连接设备同步后显示",
      historyCaption: this.data.type === "steps"
        ? `今日累计与历史明细 · ${records.length} 条`
        : `${records.length} 条`,
    });
  },

  async startMeasurement() {
    if (!this.ensureConnected() || this.data.measurementBusy || !this.definition) return;
    this.setData({ measurementBusy: true });
    try {
      await bleManager.setHealthMeasurement(this.data.type, this.definition.measurementCode, true);
      wx.showToast({ title: "实时检测已开始", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "启动失败", icon: "none" });
    } finally {
      this.setData({ measurementBusy: false });
    }
  },

  async stopMeasurement() {
    if (!this.ensureConnected() || this.data.measurementBusy || !this.definition) return;
    this.setData({ measurementBusy: true });
    try {
      await bleManager.setHealthMeasurement(this.data.type, this.definition.measurementCode, false);
      wx.showToast({ title: "实时检测已结束", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "结束失败", icon: "none" });
    } finally {
      this.setData({ measurementBusy: false });
    }
  },

  ensureConnected() {
    if (this.data.connected) return true;
    wx.showToast({ title: "请先连接设备", icon: "none" });
    return false;
  },
});
