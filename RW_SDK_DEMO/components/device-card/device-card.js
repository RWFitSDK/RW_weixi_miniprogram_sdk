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
      const status = statusMap[connectionState] || statusMap.disconnected;
      this.setData({
        statusText: status[0],
        statusClass: status[1],
        powerText:
          device && device.powerLevel !== null && device.powerLevel !== undefined
            ? `${device.powerLevel}%`
            : "--",
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
