function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTime(timestamp) {
  if (!timestamp) return "暂无记录";
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (sameDay) return `今天 ${time}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`;
}

module.exports = { formatTime };
