const bleManager = require("./services/bleManager");
const { RingSdk } = require("./sdk/rw-ble-sdk.min.js");

App({
  globalData: {
    bleManager,
  },

  onLaunch() {
    // 仅Demo开启控制台日志；SDK本身仍默认关闭，不保存或上传日志。
    RingSdk.setLogCallback((log) => {
      console.log("[rwsdk-demo][sdk-log]", log);
    });
    bleManager.init().catch((error) => {
      console.warn("[BLE] adapter init failed", error);
    });
  },
});
