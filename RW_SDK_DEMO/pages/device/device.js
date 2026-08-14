const bleManager = require("../../services/bleManager");
const { getSettings } = require("../../utils/capabilities");
const { SensorRawControl } = require("../../sdk/rw-ble-sdk.min.js");

function choose(itemList) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      success: (result) => resolve(result.tapIndex),
      fail: () => resolve(null),
    });
  });
}

function editable(title, placeholder) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      placeholderText: placeholder,
      success: (result) => resolve(result.confirm ? String(result.content || "").trim() : ""),
      fail: () => resolve(""),
    });
  });
}

function confirmAction(title, content, confirmText = "确定") {
  return new Promise((resolve) => wx.showModal({
    title,
    content,
    confirmText,
    confirmColor: "#d84b4b",
    success: (result) => resolve(!!result.confirm),
    fail: () => resolve(false),
  }));
}

function isIos() {
  try {
    const info = typeof wx.getDeviceInfo === "function"
      ? wx.getDeviceInfo()
      : typeof wx.getSystemInfoSync === "function" ? wx.getSystemInfoSync() : {};
    return String(info.platform || info.system || "").toLowerCase().includes("ios");
  } catch (_) {
    return false;
  }
}

function promptIosUnpair() {
  const canOpenBluetoothSetting = typeof wx.openSystemBluetoothSetting === "function";
  wx.showModal({
    title: "请解除系统配对",
    content: "请前往 iPhone“设置 → 蓝牙”，找到该设备，点击右侧信息按钮并选择“忽略此设备”。",
    showCancel: false,
    confirmText: canOpenBluetoothSetting ? "去系统设置" : "知道了",
    success: (result) => {
      if (result.confirm && canOpenBluetoothSetting) wx.openSystemBluetoothSetting({});
    },
  });
}

function formatAlarmList(alarms) {
  if (!alarms.length) return "设备中暂无闹钟";
  const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return alarms.map((alarm, index) => {
    const enabledDays = (alarm.repeatDays || [])
      .map((enabled, day) => enabled ? weekdayNames[day] : "")
      .filter(Boolean);
    const repeatText = enabledDays.length === 7
      ? "每天"
      : enabledDays.length
        ? enabledDays.join("、")
        : "仅一次";
    const hour = String(alarm.hour).padStart(2, "0");
    const minute = String(alarm.minute).padStart(2, "0");
    const tag = alarm.tag ? ` · ${alarm.tag}` : "";
    return `${index + 1}. ${hour}:${minute} · ${repeatText} · ${alarm.enabled ? "开启" : "关闭"}${tag}`;
  }).join("\n");
}

Page({
  data: {
    boundDevice: null,
    connectionState: "disconnected",
    connected: false,
    busy: false,
    settings: [],
    firmwareText: "--",
    modelText: "--",
    powerText: "--"
  },

  onLoad() {
    this.settingValues = {};
    this.unsubscribe = bleManager.subscribe((state) => {
      this.applyState(state);
      this.bindDeviceEvent();
    });
  },

  onShow() {
    this.applyState(bleManager.snapshot());
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.deviceEventUnsubscribe) this.deviceEventUnsubscribe();
    this.deviceEventUnsubscribe = null;
    this.deviceEventSdk = null;
  },

  bindDeviceEvent() {
    const sdk = bleManager.getSdk();
    if (this.deviceEventSdk === sdk) return;
    if (this.deviceEventUnsubscribe) this.deviceEventUnsubscribe();
    this.deviceEventUnsubscribe = null;
    this.deviceEventSdk = sdk;
    if (!sdk) return;
    this.deviceEventUnsubscribe = sdk.onDeviceEvent((event) => {
      console.log("onDeviceEvent", event);
      if (event.type !== "sensorStopped") return;
      console.log("device stopped sensor", event.reason);
      this.updateSettingValue("sensorRawPPG", "采集完成");
    });
  },

  applyState(state) {
    const device = state.boundDevice;
    const firmware = device && device.firmware;
    this.setData({
      boundDevice: device,
      connectionState: state.connectionState,
      connected: state.connected,
      settings: getSettings(device && device.supportMenu).map((item) => Object.assign(
        {},
        item,
        this.settingValues[item.id] ? { valueText: this.settingValues[item.id] } : {},
      )),
      firmwareText: firmware ? firmware.version : "--",
      modelText: firmware && firmware.deviceModel ? firmware.deviceModel : "--",
      powerText:
        device && device.powerLevel !== null && device.powerLevel !== undefined
          ? `${device.powerLevel}%`
          : "--"
    });
  },

  openSearch() {
    wx.navigateTo({ url: "/pages/search/search" });
  },

  openFirmwareUpgrade() {
    wx.navigateTo({ url: "/pages/firmware-upgrade/firmware-upgrade" });
  },

  async reconnect() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    wx.showLoading({ title: "连接中", mask: true });
    try {
      await bleManager.reconnect();
      wx.showToast({ title: "连接成功", icon: "success" });
    } catch (error) {
      bleManager.presentError(error, "重新连接失败");
    } finally {
      wx.hideLoading();
      this.setData({ busy: false });
    }
  },

  async disconnect() {
    await bleManager.disconnect();
  },

  unbind() {
    wx.showModal({
      title: "解除绑定",
      content: "解除后将同时清除该设备保存在 Demo 中的健康记录。",
      confirmText: "解除",
      confirmColor: "#d84b4b",
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await bleManager.unbind();
          if (isIos()) promptIosUnpair();
          else wx.showToast({ title: "已解除绑定", icon: "success" });
        } catch (error) {
          bleManager.presentError(error, "解除绑定失败");
        }
      }
    });
  },

  async refreshPower() {
    try {
      await bleManager.refreshPower();
      wx.showToast({ title: "电量已更新", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async tapSetting(event) {
    const id = event.currentTarget.dataset.id;
    const setting = this.data.settings.find((item) => item.id === id);
    if (!setting) return;
    if (!this.data.connected) {
      wx.showToast({ title: "请先连接设备", icon: "none" });
      return;
    }
    try {
      await this.executeSetting(id);
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    }
  },

  updateSettingValue(id, valueText) {
    this.settingValues[id] = valueText;
    this.applyState(bleManager.snapshot());
  },

  async executeSetting(id) {
    const sdk = bleManager.getSdk();
    if (!sdk) throw new Error("请先连接设备");

    const monitoringTypes = {
      heartRateMonitoring: "heartRate",
      bloodOxygenMonitoring: "bloodOxygen",
      hrvMonitoring: "hrv",
      stressMonitoring: "stress",
      bloodPressureMonitoring: "bloodPressure",
      bloodSugarMonitoring: "bloodSugar",
      temperatureMonitoring: "temperature",
      ppgMonitoring: "ppg",
    };
    if (monitoringTypes[id]) {
      const values = [0, 30, 60];
      const index = await choose(["关闭", "每 30 分钟", "每 60 分钟"]);
      if (index === null) return;
      const interval = values[index];
      await sdk.setMonitoring(monitoringTypes[id], {
        enabled: interval > 0,
        startHour: 0,
        startMinute: 0,
        endHour: 23,
        endMinute: 59,
        intervalMinutes: interval || 60,
      });
      this.updateSettingValue(id, interval ? `${interval} 分钟` : "已关闭");
      wx.showToast({ title: "设置成功", icon: "success" });
      return;
    }

    if (id === "findDevice") {
      await bleManager.findDevice();
      wx.showToast({ title: "查找指令已发送", icon: "success" });
      return;
    }
    if (id === "alarm") return this.editAlarm(sdk);
    if (id === "sensorRawPPG") return this.manageSensorRawPpg(sdk);
    if (id === "powerOff") return this.runPowerAction(sdk);

    const operations = {
      dnd: {
        labels: ["关闭", "22:00–08:00", "全天开启"],
        values: [
          { enabled: false, startHour: 22, startMinute: 0, endHour: 8, endMinute: 0 },
          { enabled: true, startHour: 22, startMinute: 0, endHour: 8, endMinute: 0 },
          { enabled: true, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
        ],
        run: (value) => sdk.setDnd(value),
      },
      screenSleep: {
        labels: ["关闭", "22:00–08:00", "全天开启"],
        values: [
          { enabled: false, startHour: 22, startMinute: 0, endHour: 8, endMinute: 0 },
          { enabled: true, startHour: 22, startMinute: 0, endHour: 8, endMinute: 0 },
          { enabled: true, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
        ],
        run: (value) => sdk.setScreenSleep(value),
      },
      brightDuration: {
        labels: ["5 秒", "10 秒", "15 秒", "20 秒", "30 秒"],
        values: [5, 10, 15, 20, 30],
        run: (value) => sdk.setBrightDuration(value),
      },
      raiseToWake: {
        labels: ["关闭", "08:00–22:00", "全天开启"],
        values: [
          { enabled: false, startHour: 8, startMinute: 0, endHour: 22, endMinute: 0 },
          { enabled: true, startHour: 8, startMinute: 0, endHour: 22, endMinute: 0 },
          { enabled: true, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
        ],
        run: (value) => sdk.setRaiseToWake(value),
      },
      ledLevel: {
        labels: ["关闭", "亮度 1", "亮度 2", "亮度 3"],
        values: [0, 1, 2, 3],
        run: (value) => sdk.setLedLevel(value > 0, value),
      },
      wearHand: {
        labels: ["左手", "右手"],
        values: [false, true],
        run: (value) => sdk.setWearHand(value),
      },
      takePhoto: {
        labels: ["进入遥控拍照", "退出遥控拍照"],
        values: [1, 0],
        run: (value) => sdk.controlCamera(value),
      },
      heartRateAlert: {
        labels: ["关闭", "上限 120 bpm", "上限 140 bpm", "上限 160 bpm"],
        values: [0, 120, 140, 160],
        run: (value) => sdk.setHeartRateAlert(value > 0, value || 140, 0xff),
      },
      bloodOxygenAlert: {
        labels: ["关闭", "下限 90%", "下限 92%", "下限 94%"],
        values: [0, 90, 92, 94],
        run: (value) => sdk.setBloodOxygenAlert(value > 0, value || 94),
      },
      vibrationCount: {
        labels: ["关闭", "低强度 · 1 次", "中强度 · 2 次", "高强度 · 3 次"],
        values: [[0, 0], [1, 1], [2, 2], [3, 3]],
        run: (value) => sdk.setVibrationCount(value[0], value[1]),
      },
      alarmVibration: {
        labels: ["不震动", "1 次", "2 次", "3 次", "4 次", "5 次", "6 次"],
        values: [0, 1, 2, 3, 4, 5, 6],
        run: (value) => sdk.setAlarmVibrationDuration(value),
      },
      vibrationInterval: {
        labels: ["100 ms", "200 ms", "300 ms", "500 ms", "1000 ms"],
        values: [100, 200, 300, 500, 1000],
        run: (value) => sdk.setVibrationInterval(value),
      },
      countReminder: {
        labels: ["关闭", "30 分钟", "60 分钟", "90 分钟", "120 分钟"],
        values: [0, 30, 60, 90, 120],
        run: (value) => sdk.setCountReminderInterval(value),
      },
      fallDetect: {
        labels: ["关闭", "开启"],
        values: [false, true],
        run: (value) => sdk.setFallDetect(value),
      },
      rememberSwitch: {
        labels: ["关闭", "开启"],
        values: [false, true],
        run: (value) => sdk.setRememberEnabled(value),
      },
      muslimTimeMode: {
        labels: ["唤醒先显示时间", "不显示时间", "休眠 10 分钟后显示"],
        values: [1, 2, 3],
        run: (value) => sdk.setMuslimTimeDisplayMode(value),
      },
    };
    const operation = operations[id];
    if (!operation) throw new Error("此功能暂未配置操作模型");
    const index = await choose(operation.labels);
    if (index === null) return;
    await operation.run(operation.values[index]);
    this.updateSettingValue(id, operation.labels[index]);
    wx.showToast({ title: "设置成功", icon: "success" });
  },

  async manageSensorRawPpg(sdk) {
    const action = await choose(["启动 PPG", "停止 PPG", "获取 PPG 历史"]);
    if (action === null) return;
    if (action === 0 || action === 1) {
      const started = action === 0;
      if (!started) this.updateSettingValue("sensorRawPPG", "停止中");
      await sdk.controlSensorRaw(
        started ? SensorRawControl.START : SensorRawControl.STOP,
        2,
      );
      if (started) this.updateSettingValue("sensorRawPPG", "采集中");
      wx.showToast({ title: started ? "PPG 已启动" : "停止指令已发送", icon: "success" });
      return;
    }

    if (this.sensorHistoryLoading) return;
    this.sensorHistoryLoading = true;
    wx.showLoading({ title: "读取历史中", mask: true });
    try {
      const records = await sdk.getSensorHistoryRaw();
      const ppgRecords = records.filter((record) => record.type === 1);
      const sampleCount = ppgRecords.reduce(
        (total, record) => total + (record.ppgDataList ? record.ppgDataList.length : 0),
        0,
      );
      this.updateSettingValue("sensorRawPPG", `${ppgRecords.length} 组 · ${sampleCount} 点`);
      wx.showModal({
        title: "PPG 历史数据",
        content: ppgRecords.length
          ? `获取 ${ppgRecords.length} 组，共 ${sampleCount} 个采样点。`
          : "设备中暂无 PPG 历史数据。",
        showCancel: false,
        confirmText: "知道了",
      });
    } finally {
      wx.hideLoading();
      this.sensorHistoryLoading = false;
    }
  },

  async editAlarm(sdk) {
    const action = await choose(["获取闹钟", "新增闹钟", "删除全部闹钟"]);
    if (action === null) return;
    if (action === 0) {
      const alarms = await sdk.getAlarms();
      this.updateSettingValue("alarm", `${alarms.length} 个闹钟`);
      wx.showModal({
        title: `设备闹钟（${alarms.length}）`,
        content: formatAlarmList(alarms),
        showCancel: false,
        confirmText: "知道了",
      });
      return;
    }
    if (action === 2) {
      if (!await confirmAction("删除全部闹钟", "确定删除设备中的全部闹钟吗？", "删除")) return;
      await sdk.deleteAllAlarms();
      this.updateSettingValue("alarm", "0 个闹钟");
      wx.showToast({ title: "已删除", icon: "success" });
      return;
    }
    const value = await editable("新增闹钟", "输入时间，例如 07:30");
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) throw new Error("时间格式应为 HH:mm");
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new Error("请输入有效时间");
    const alarms = await sdk.getAlarms();
    if (alarms.length >= 6) throw new Error("设备最多支持 6 个闹钟");
    const usedIds = new Set(alarms.map((item) => item.alarmId));
    let alarmId = 0;
    while (usedIds.has(alarmId)) alarmId++;
    alarms.push({
      alarmId,
      enabled: true,
      repeatDays: [1, 1, 1, 1, 1, 1, 1],
      hour,
      minute,
      tag: "",
    });
    await sdk.setAlarms(alarms);
    this.updateSettingValue("alarm", `${alarms.length} 个闹钟`);
    wx.showToast({ title: "闹钟已添加", icon: "success" });
  },

  async runPowerAction(sdk) {
    const action = await choose(["设备关机", "恢复出厂设置"]);
    if (action === null) return;
    const factoryReset = action === 1;
    const confirmed = await confirmAction(
      factoryReset ? "恢复出厂设置" : "设备关机",
      factoryReset ? "设备数据将被清除，此操作不可撤销。" : "确定让设备关机吗？",
      factoryReset ? "恢复出厂" : "关机",
    );
    if (!confirmed) return;
    await sdk.setPowerControl(factoryReset ? 2 : 1);
    if (factoryReset) {
      wx.showToast({ title: "恢复出厂指令已发送", icon: "success" });
      return;
    }
    wx.showToast({ title: "关机指令已发送", icon: "success" });
  }
});
