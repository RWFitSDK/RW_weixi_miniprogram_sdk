function macFromDevice(device) {
  if (!device) return "";
  if (device.macAddress) return device.macAddress;
  const deviceId = String(device.deviceId || "").replace(/-/g, ":").toUpperCase();
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(deviceId) ? deviceId : "";
}

Component({
  properties: {
    device: { type: Object, value: null },
    connectionState: { type: String, value: "disconnected" },
    compact: { type: Boolean, value: false }
  },

  data: {
    statusText: "未连接",
    statusClass: "offline",
    powerText: "--",
    batteryStatusText: "",
    macAddressText: "",
    deviceIdText: ""
  },

  observers: {
    "device, connectionState": function (device, connectionState) {
      const statusMap = {
        connecting: ["连接中", "pending"],
        initializing: ["初始化中", "pending"],
        connected: ["已连接", "online"],
        disconnected: ["未连接", "offline"]
      };
      const batteryStatusMap = { 0: "未充电", 1: "充电中", 2: "充满" };
      const status = statusMap[connectionState] || statusMap.disconnected;
      // 连接后充电状态以实时查询/推送的 charging 为准，广播状态仅扫描阶段(未连接)使用，避免长期显示旧值。
      const batteryStatusText = connectionState === "connected"
        ? (device && device.charging === true ? "充电中" : "")
        : (device ? (batteryStatusMap[device.batteryStatus] || "") : "");
      this.setData({
        statusText: status[0],
        statusClass: status[1],
        powerText:
          device && device.powerLevel !== null && device.powerLevel !== undefined
            ? `${device.powerLevel}%`
            : "--",
        batteryStatusText,
        macAddressText: macFromDevice(device),
        deviceIdText: device ? (device.deviceId || "") : ""
      });
    }
  },

  methods: {
    select() {
      this.triggerEvent("select");
    }
  }
});
