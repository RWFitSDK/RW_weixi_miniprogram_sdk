const bleManager = require("./services/bleManager");

App({
  globalData: {
    bleManager,
  },

  onLaunch() {
    bleManager.init().catch((error) => {
      console.warn("[BLE] adapter init failed", error);
    });
  },
});
