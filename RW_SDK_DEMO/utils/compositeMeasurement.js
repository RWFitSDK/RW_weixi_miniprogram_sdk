function formatCompositeValues(items) {
  const types = {
    heartRate: ["心率", "bpm"], hrv: ["HRV", "ms"], stress: ["压力", ""],
    bloodPressure: ["血压", "mmHg"], temperature: ["体温", "℃"], bloodSugar: ["血糖", "mmol/L"],
  };
  return items.map((item) => {
    const type = types[item.healthType];
    if (!type || !Number.isFinite(item.value)) return "";
    const value = item.healthType === "bloodPressure" ? `${item.value}/${item.extraValue}`
      : item.healthType === "temperature" || item.healthType === "bloodSugar" ? item.value.toFixed(1)
        : String(item.value);
    return `${type[0]}：${value}${type[1] ? " " + type[1] : ""}`;
  }).filter(Boolean).join("\n");
}

module.exports = { formatCompositeValues };
