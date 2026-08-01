const storage = require("./storage");
const { formatTime } = require("./format");

const HEALTH_TYPES = [
  { type: "steps", title: "计步", icon: "步", unit: "步", support: (m) => m.step },
  { type: "heartRate", title: "心率", icon: "心", unit: "bpm", measurementCode: 0x03, monitoringType: "heartRate", support: (m) => m.hr },
  { type: "sleep", title: "睡眠", icon: "眠", unit: "", support: (m) => m.sleep },
  {
    type: "workout",
    title: "多运动",
    icon: "动",
    unit: "",
    support: (m) => m.newSport || m.workout,
  },
  { type: "bloodOxygen", title: "血氧", icon: "氧", unit: "%", measurementCode: 0x09, monitoringType: "bloodOxygen", support: (m) => m.bloodOxy },
  { type: "hrv", title: "HRV", icon: "变", unit: "ms", measurementCode: 0x0a, monitoringType: "hrv", support: (m) => m.hrv },
  { type: "stress", title: "压力", icon: "压", unit: "", measurementCode: 0x0d, monitoringType: "stress", support: (m) => m.pressure },
  {
    type: "bloodPressure",
    title: "血压",
    icon: "血",
    unit: "mmHg",
    measurementCode: 0x04,
    monitoringType: "bloodPressure",
    support: (m) => m.bloodPress,
  },
  { type: "bloodSugar", title: "血糖", icon: "糖", unit: "mmol/L", measurementCode: 0x10, monitoringType: "bloodSugar", support: (m) => m.bloodSugar },
  { type: "temperature", title: "体温", icon: "温", unit: "℃", measurementCode: 0x08, monitoringType: "temperature", support: (m) => m.temperature },
  {
    type: "muslimCount",
    title: "赞念计数",
    icon: "念",
    unit: "次",
    support: (m) => m.muslimCountData,
  },
];

const SETTING_TYPES = [
  { id: "alarm", title: "闹钟", subtitle: "设备闹钟管理", support: (m) => m.alarm },
  { id: "dnd", title: "勿扰模式", subtitle: "设置勿扰开关与时段", support: (m) => m.dnd },
  { id: "screenSleep", title: "屏幕睡眠", subtitle: "设置屏幕睡眠时段", support: (m) => m.brightScreenSleepTime },
  { id: "brightDuration", title: "亮屏时长", subtitle: "设置屏幕保持点亮时间", support: (m) => m.brightScreenTime },
  { id: "raiseToWake", title: "抬腕亮屏", subtitle: "设置开关与生效时段", support: (m) => m.raiseBrightScreen },
  { id: "ledLevel", title: "LED 亮度", subtitle: "设置 LED 开关与亮度", support: (m) => m.ledLight },
  { id: "wearHand", title: "佩戴位置", subtitle: "左手或右手佩戴", support: (m) => m.wearDir },
  { id: "findDevice", title: "查找设备", subtitle: "让戒指发出查找提示", support: (m) => m.findDevice, action: true },
  { id: "takePhoto", title: "遥控拍照", subtitle: "接收戒指拍照事件", support: (m) => m.takePhoto },
  { id: "heartRateMonitoring", title: "全天心率", subtitle: "设置全天监测开关与间隔", support: (m) => m.hr },
  { id: "bloodOxygenMonitoring", title: "全天血氧", subtitle: "设置全天血氧监测", support: (m) => m.bloodOxy },
  { id: "hrvMonitoring", title: "全天 HRV", subtitle: "设置全天 HRV 监测", support: (m) => m.hrv },
  { id: "stressMonitoring", title: "全天压力", subtitle: "设置全天压力监测", support: (m) => m.pressure },
  { id: "bloodPressureMonitoring", title: "全天血压", subtitle: "设置全天血压监测", support: (m) => m.bloodPress },
  { id: "bloodSugarMonitoring", title: "全天血糖", subtitle: "设置全天血糖监测", support: (m) => m.bloodSugar },
  {
    id: "temperatureMonitoring",
    title: "全天体温",
    subtitle: "设置全天体温监测",
    support: (m) => m.supportTemperatureMonitoring || m.temperature,
  },
  { id: "ppgMonitoring", title: "PPG 定时监测", subtitle: "设置 PPG 定时监测", support: (m) => m.supportPPGMonitoring },
  { id: "heartRateAlert", title: "心率报警", subtitle: "设置心率上下限", support: (m) => m.supportHrReminder },
  { id: "bloodOxygenAlert", title: "血氧报警", subtitle: "设置血氧下限", support: (m) => m.supportBoReminder },
  { id: "vibrationCount", title: "震动次数", subtitle: "设置提醒震动次数", support: (m) => m.supportMotoVibrationLevel },
  {
    id: "alarmVibration",
    title: "闹钟震动时长",
    subtitle: "设置闹钟震动参数",
    support: (m) => m.supportAlarmVibrationDuration,
  },
  {
    id: "vibrationInterval",
    title: "震动间隔",
    subtitle: "设置每次震动的间隔",
    support: (m) => m.supportVibrationInterval,
  },
  {
    id: "countReminder",
    title: "计数提醒",
    subtitle: "设置计数提醒间隔",
    support: (m) => m.supportCountReminder,
  },
  { id: "fallDetect", title: "跌落提醒", subtitle: "开启或关闭跌落检测", support: (m) => m.supportFallDetect },
  { id: "rememberSwitch", title: "赞念开关", subtitle: "开启或关闭赞念功能", support: (m) => m.rememberSwitch },
  {
    id: "muslimTimeMode",
    title: "赞念时间显示",
    subtitle: "设置时间显示模式",
    support: (m) => m.supportMuslimTimeDisplayMode,
  },
  { id: "powerOff", title: "关机与恢复出厂", subtitle: "设备电源操作", support: (m) => m.powerOff || m.recovery },
];

function getHealthCards(device, realtimeHealth = {}) {
  if (!device || !device.supportMenu) return [];
  return HEALTH_TYPES.filter((item) => item.support(device.supportMenu)).map((item) => {
    const records = item.type === "workout" ? [] : storage.getHealthRecords(device.deviceId, item.type);
    const historical = item.type === "steps"
      ? records.find((record) => String(record.id || "").startsWith("steps-day-")) || records[0]
      : records[0];
    const last = item.type === "muslimCount"
      ? realtimeHealth.muslimCount || historical
      : historical;
    return Object.assign({}, item, {
      valueText: last ? `${last.value}${last.unit || item.unit ? ` ${last.unit || item.unit}` : ""}` : "暂无数据",
      timeText: last ? formatTime(last.measuredAt) : item.type === "workout" ? "点击加载历史报告" : "点击查看历史",
    });
  });
}

function getSettings(menu) {
  if (!menu) return [];
  return SETTING_TYPES.filter(
    (item) => item.support(menu),
  ).map((item) => Object.assign({}, item, {
    symbol: item.title.slice(0, 1),
    valueText: item.action ? "立即执行" : "点击设置"
  }));
}

function findHealthType(type) {
  return HEALTH_TYPES.find((item) => item.type === type) || null;
}

module.exports = { HEALTH_TYPES, SETTING_TYPES, getHealthCards, getSettings, findHealthType };
