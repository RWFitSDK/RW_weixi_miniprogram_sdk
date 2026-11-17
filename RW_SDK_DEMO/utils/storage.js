const BOUND_DEVICE_KEY = "rwsdk.boundDevice.v1";
const DEVICE_ADDRESS_MAP_KEY = "rwsdk.deviceAddressMap.v1";

function getBoundDevice() {
  return wx.getStorageSync(BOUND_DEVICE_KEY) || null;
}

function saveBoundDevice(device) {
  wx.setStorageSync(BOUND_DEVICE_KEY, device);
}

function clearBoundDevice() {
  wx.removeStorageSync(BOUND_DEVICE_KEY);
}

function getDeviceAddress(deviceId) {
  if (!deviceId) return "";
  const addressMap = wx.getStorageSync(DEVICE_ADDRESS_MAP_KEY) || {};
  return addressMap[deviceId] || "";
}

function saveDeviceAddress(deviceId, macAddress) {
  if (!deviceId || !macAddress) return;
  const addressMap = wx.getStorageSync(DEVICE_ADDRESS_MAP_KEY) || {};
  if (addressMap[deviceId] === macAddress) return;
  addressMap[deviceId] = macAddress;
  wx.setStorageSync(DEVICE_ADDRESS_MAP_KEY, addressMap);
}

module.exports = {
  getBoundDevice,
  saveBoundDevice,
  clearBoundDevice,
  getDeviceAddress,
  saveDeviceAddress,
};
