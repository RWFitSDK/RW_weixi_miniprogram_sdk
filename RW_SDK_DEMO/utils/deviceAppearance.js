const DEVICE_FORM_NAMES = ["无屏戒指", "有屏戒指", "无屏手链", "有屏手链", "无屏手环", "有屏手环", "手表"];
const DEVICE_BODY_COLORS = ["未设置", "黑色", "粉色", "红色", "银色", "金色"];

function formatDeviceBodyColor(color) {
  return Number.isInteger(color) ? DEVICE_BODY_COLORS[color] || "" : "";
}

function formatDeviceSize(size) {
  if (!Number.isInteger(size) || size < 0 || size > 255) return "";
  return size === 0 ? "尺寸未设置" : `${size}号`;
}

function formatDeviceAppearance(device) {
  const form = Number.isInteger(device.deviceForm) ? DEVICE_FORM_NAMES[device.deviceForm] || "" : "";
  const color = formatDeviceBodyColor(device.deviceBodyColor);
  return [
    form,
    color && device.deviceBodyColor === 0 ? "颜色未设置" : color,
    formatDeviceSize(device.deviceSize),
  ].filter(Boolean).join(" · ");
}

module.exports = { DEVICE_BODY_COLORS, formatDeviceBodyColor, formatDeviceSize, formatDeviceAppearance };
