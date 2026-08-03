# RW BLE 微信小程序 SDK 使用说明文档

## 1. 简介

RW BLE 微信小程序 SDK 用于在微信小程序中搜索、连接 RW 智能戒指，读取设备信息、配置设备功能、同步健康数据、控制多运动、获取传感器原始数据及执行 OTA 升级。

当前 SDK 版本：`RW_SDK_V2.0.0_20260724`。

#### 1.1 适用平台与语言

- 微信原生小程序，基础库建议 `3.5.0` 或以上。
- SDK 使用 CommonJS，可在 JavaScript 或 TypeScript 小程序中使用。
- BLE 能力必须使用真机测试，开发者工具模拟器不能完成真实连接与数据同步。

#### 1.2 相关术语

| 术语 | 说明 |
| --- | --- |
| `deviceId` | 微信蓝牙 API 返回的设备标识。iOS 上不等同于 MAC 地址 |
| BLE MAC | 设备广播数据中携带的 6 字节设备地址；iOS 上应与 `deviceId` 分开保存 |
| SupportMenu | 连接成功后获取的设备功能配置表 |

#### 1.3 注意事项

1. 调用蓝牙 API 前需确认用户已授权并打开手机蓝牙。
2. `RingSdk.connect()` 成功返回后再调用业务接口。
3. 请仅通过 SDK 提供的公开接口操作设备，不要直接调用微信 BLE 通信接口。
4. 小程序退到后台后 BLE 行为受微信运行环境限制，不应依赖长期后台连接。

## 2. 快速开始（Quick Start）

将发布目录 `sdk/` 放入小程序目录。运行时只加载 `rw-ble-sdk.min.js`，
`index.d.ts` 提供完整 TypeScript 类型声明：

```js
const { RingSdk } = require("./sdk/rw-ble-sdk.min.js");

const deviceId = "微信搜索得到的 deviceId";
const sdk = await RingSdk.connect(deviceId);

// connect() 成功返回后即可调用业务接口
const supportMenu = sdk.supportMenu;
const power = await sdk.readPower();
console.log("power", power.level);
```

断开连接时必须释放 SDK：

```js
await sdk.disconnect();
```

## 3. 接口说明（API Reference）

### 3.1 设备搜索与连接、绑定与重连

##### 3.1.1 搜索蓝牙

SDK 提供设备搜索接口，不包装授权界面。

```js
const scan = await RingSdk.startScan({
  onDevices(devices) {
    console.log(devices);
  },
});
```

系统当前保持连接的设备会置顶返回，并带有 `systemConnected: true`、`RSSI: 0`；其余设备按 RSSI 从强到弱排列。大部分设备在 iOS 上连接后会由系统默认完成配对。

##### 3.1.2 停止搜索

```js
await scan.stop();
```

##### 3.1.3 连接设备与状态监听

```js
const sdk = await RingSdk.connect(deviceId, {
  connectTimeoutMs: 12000,
  onStage(stage) {
    console.log("连接阶段", stage);
  },
  onConnectionStateChange({ connected }) {
    console.log(connected ? "connected" : "disconnected");
  },
});

// connect() 成功后，功能表已经读取完成
const supportMenu = sdk.supportMenu;
console.log("是否支持心率", supportMenu.hr);
```

`onStage` 按以下顺序返回连接过程：

| `stage` | 状态说明 | 此时能否调用业务接口 |
| --- | --- | --- |
| `connecting` | 正在连接设备 | 否 |
| `initializing` | 设备已连接，正在完成 SDK 初始化并读取功能表 | 否 |
| `ready` | 初始化及功能表读取完成 | 是 |

`RingSdk.connect()` 的 Promise 只在进入 `ready` 后返回。成功返回后，可直接通过 `sdk.supportMenu` 获取本次连接已经读取的功能表，不需要再次请求设备；需要主动刷新功能表时才调用 `await sdk.readFunctionList()`。

`onConnectionStateChange` 是可选的页面状态回调：进入 `ready` 时返回 `connected: true`，设备断开时返回 `connected: false`。连接失败会抛出 `RingSdkConnectionError`，其中包含 `errCode` 和 `detail`，不会进入 `ready`。

建议根据 `errCode` 向用户提供对应提示和操作：

| 错误情况 | 建议提示与操作 |
| --- | --- |
| `10000` 蓝牙适配器未初始化 | 重新初始化蓝牙后再试 |
| `10001` 蓝牙不可用 | 提示开启蓝牙；支持时调用 `wx.openSystemBluetoothSetting()` |
| 权限拒绝 | 提示用户进入小程序设置；调用 `wx.openSetting()` |
| `10002` / `10003` | 提示靠近设备，并确认设备未连接其他手机 |
| `10004` / `10005` | 提示设备型号或固件不兼容 |
| `10006` | 提示连接断开并提供重新连接入口 |
| `10007` | 提示当前设备不支持该蓝牙操作 |
| `10008` | 提示系统蓝牙繁忙，可重新开启蓝牙后重试 |
| `10009` | 提示当前手机或微信版本不支持所需蓝牙能力 |
| `10012` | 提示操作超时并允许重试 |
| `10013` | 提示蓝牙参数或设备数据无效，检查参数后重试 |

##### 3.1.4 断开连接设备

```js
await sdk.disconnect("user disconnected");
```

`disconnect()` 用于主动断开设备。系统异常断连时 SDK 会自动释放当前实例，接入方无需再次调用 `dispose()`。

##### 3.1.5 本地绑定与自动重连、解绑

SDK 不强制绑定策略。建议连接初始化成功后保存 `deviceId`、设备名称、BLE MAC 和 `SupportMenu`：

```js
wx.setStorageSync("boundDevice", {
  deviceId,
  name,
  macAddress,
  supportMenu,
});
```

小程序启动后可读取缓存并调用 `RingSdk.connect(deviceId)` 重连。解绑时先调用 `sdk.disconnect()`，再删除缓存。iOS 的 `deviceId` 由微信提供，不要自行当作 MAC 地址解析；应同时保存广播解析或设备指令返回的 BLE MAC。

**iOS 解绑必须提示用户解除系统配对。** 小程序无法直接删除 iOS 保存的蓝牙配对关系。完成应用内解绑后，必须弹出明确提示，引导用户前往“系统设置 → 蓝牙”，找到对应设备并选择“忽略此设备”。支持 `wx.openSystemBluetoothSetting()` 时，应提供直接进入系统蓝牙设置的入口。

##### 3.1.6 设备功能配置表

```js
const supportMenu = sdk.supportMenu;
// 需要刷新功能表时可重新读取
const latestMenu = await sdk.readFunctionList();
```

常用字段：

| SupportMenu 属性 | 说明 |
| --- | --- |
| `alarm` | 闹钟 |
| `brightScreenSleepTime` | 屏幕睡眠时间 |
| `brightScreenTime` | 亮屏时长 |
| `newSport` | 多运动 |
| `rememberSwitch` | 赞念开关 |
| `supportHrReminder` / `supportBoReminder` | 心率/血氧报警 |
| `supportMotoVibrationLevel` | 震动强度和次数 |
| `supportAlarmVibrationDuration` | 闹钟震动时长 |
| `supportVibrationInterval` | 震动间隔 |
| `supportCountReminder` | 计数提醒间隔 |
| `step` / `hr` / `bloodPress` / `sleep` | 计步、心率、血压、睡眠 |
| `bloodOxy` / `hrv` / `pressure` | 血氧、HRV、压力 |
| `bloodSugar` / `muslimCountData` / `temperature` | 血糖、赞念、体温 |
| `activityDataInterval` | 当天计步明细间隔，默认 60 分钟 |
| `supportSensorRawPPG` / `supportSensorRawACC` | PPG/ACC 原始数据 |
| `supportSensorRawPPGRed` / `supportSensorRawIR` | 红光/红外原始数据 |
| `supportSensorRawSleep` | 睡眠状态实时推送 |
| `supportPPGMonitoring` | PPG 定时监测 |
| `supportTemperatureMonitoring` | 体温定时监测 |
| `supportFallDetect` | 跌落提醒 |

调用相关接口前应先判断相应功能位。

### 3.2 设备功能操作

#### 3.2.1 基础功能指令接口

##### 3.2.1.1 Get SDK Version

```js
const version = sdk.getSDKVersion(); // "RW_SDK_V2.0.0_20260724"

// 也可以通过顶层接口或常量读取：
const RWSDK = require("./sdk/rw-ble-sdk.min.js");
RWSDK.getSDKVersion();
RWSDK.SDK_VERSION;
```

##### 3.2.1.2 设置用户信息

用户信息影响计步距离和卡路里计算。

```js
await sdk.setUserProfile({
  measureUnit: 0, // 0 公制，1 英制
  gender: 1,      // 0 女，1 男
  age: 20,
  height: 170.5,  // cm
  weight: 80,     // kg
});
```

##### 3.2.1.3 获取设备信息

```js
const firmware = await sdk.readFirmwareVersion();
console.log(firmware);
```

| FirmwareInfo 属性 | 说明 |
| --- | --- |
| `deviceModel` | 设备型号 |
| `version` | 固件版本 |
| `screenType` | 0 方屏、1 圆屏 |
| `screenWidth` / `screenHeight` | 屏幕宽高 |
| `uiVersion` | UI 版本 |

固件升级前应读取并核对当前设备型号与固件版本。

##### 3.2.1.4 获取电量

```js
const power = await sdk.readPower();
console.log(power.level); // 0-100
```

##### 3.2.1.6 获取与设置 LED 亮屏强度

功能位：`ledLight`。

```js
const current = await sdk.getLedLevel();
// { enabled: true, level: 3 }

await sdk.setLedLevel(true, 3); // 1 微光、2 柔光、3 强光
await sdk.setLedLevel(false, 0);
```

##### 3.2.1.7 获取与设置佩戴位置

功能位：`wearDir`。

```js
const hand = await sdk.getWearHand(); // { rightHand: boolean }
await sdk.setWearHand(false); // 左手
await sdk.setWearHand(true);  // 右手
```

##### 3.2.1.8 启动与关闭拍照

功能位：`takePhoto`。小程序需自行实现相机页面；SDK 负责通知。

```js
const unsubscribe = sdk.onDeviceEvent((event) => {
  if (event.type === "camera" && event.action === 2) {
    // 调用小程序相机逻辑拍照
  }
});

await sdk.controlCamera(1); // 进入相机页
await sdk.controlCamera(0); // 离开相机页
unsubscribe();
```

##### 3.2.1.9 查找设备

```js
await sdk.findDevice();
```

##### 3.2.1.10 关机、恢复出厂设置

```js
const { DevicePowerControl } = require("./sdk/rw-ble-sdk.min.js");

await sdk.setPowerControl(DevicePowerControl.POWER_OFF);
await sdk.setPowerControl(DevicePowerControl.FACTORY_RESET);
```

恢复出厂会清除设备数据，执行后应同时清理小程序本地绑定信息。

##### 3.2.1.11 闹钟

功能位：`alarm`。`setAlarms()` 每次需要传入完整闹钟数组。

###### 3.2.1.11.1 获取已设置闹钟

```js
const alarms = await sdk.getAlarms();
```

###### 3.2.1.11.2 设置闹钟

```js
await sdk.setAlarms([
  {
    alarmId: 0,
    enabled: true,
    repeatDays: [0, 1, 1, 1, 1, 1, 0], // 周日至周六
    hour: 7,
    minute: 0,
    tag: "",
  },
]);
```

`AlarmConfig` 字段：

| 字段 | 说明 |
| --- | --- |
| `alarmId` | 闹钟 ID |
| `enabled` | 开关 |
| `repeatDays` | 7 项数组，周日至周六 |
| `hour` / `minute` | 时间 |
| `tag` | 最多 21 字节 UTF-8 标签，通常为空 |

###### 3.2.1.11.3 删除所有闹钟

```js
await sdk.deleteAllAlarms();
// setAlarms([]) 等价
```

##### 3.2.1.12 震动次数设置与获取

功能位：`supportMotoVibrationLevel`。

```js
const vibration = await sdk.getVibrationCount();
// { level: 1, count: 2 }
await sdk.setVibrationCount(1, 2);
```

`level`：0 关闭、1 低、2 中、3 高；`count`：0-6。

##### 3.2.1.13 屏幕睡眠模式设置与获取

功能位：`brightScreenSleepTime`。

```js
const backLight = await sdk.getBackLight();
await sdk.setScreenSleep({
  enabled: true,
  startHour: 20,
  startMinute: 0,
  endHour: 8,
  endMinute: 0,
});
```

##### 3.2.1.15 获取与设置赞念是否打开

功能位：`rememberSwitch`。

```js
const enabled = await sdk.getRememberEnabled();
await sdk.setRememberEnabled(true);
await sdk.setRememberEnabled(false);
```

##### 3.2.1.16 获取与设置心率/血氧报警配置

功能位：`supportHrReminder`、`supportBoReminder`。

```js
const hrAlert = await sdk.getHeartRateAlert();
await sdk.setHeartRateAlert(true, 140, 0xff);

const spo2Alert = await sdk.getBloodOxygenAlert();
await sdk.setBloodOxygenAlert(true, 94);

const off = sdk.onDeviceEvent((event) => {
  if (event.type !== "healthAlert") return;
  // alertType: 0 心率过高、1 血氧过低、2 心率过低
  console.log(event.alertType, event.value);
});
```

心率 `lowerValue=0xff` 表示设备不支持低值报警。

##### 3.2.1.17 获取与设置亮屏时长

功能位：`brightScreenTime`。

```js
const backLight = await sdk.getBackLight();
console.log(backLight.seconds, backLight.supportedDurations);
await sdk.setBrightDuration(10); // 0-30 秒，以设备能力为准
```

##### 3.2.1.18 获取与设置抬腕亮屏时长

功能位：`raiseBrightScreen`。

```js
const value = await sdk.getRaiseToWake();
await sdk.setRaiseToWake({
  enabled: true,
  startHour: 8,
  startMinute: 0,
  endHour: 20,
  endMinute: 0,
});
```

##### 3.2.1.19 设置时间格式 12/24 小时制

```js
await sdk.setHourSystem(0); // 24 小时制
await sdk.setHourSystem(1); // 12 小时制
```

##### 3.2.1.20 闹钟震动时长设置与获取

功能位：`supportAlarmVibrationDuration`。

```js
const count = await sdk.getAlarmVibrationDuration();
await sdk.setAlarmVibrationDuration(2); // 0-6，0 不震动
```

##### 3.2.1.21 触摸事件通知

```js
const off = sdk.onDeviceEvent((event) => {
  if (event.type !== "touch") return;
  // keyType: 1 触摸，2 跌落
  // touchType: 1 单击、2 双击、3 三击、4 长按、5 甩动
  console.log(event.keyType, event.touchType);
});
```

该功能需要设备固件支持。退出相关页面时调用 `off()`。

##### 3.2.1.22 震动间隔时长设置与获取

功能位：`supportVibrationInterval`。

```js
const intervalMs = await sdk.getVibrationInterval();
await sdk.setVibrationInterval(500); // 100-1000ms
```

##### 3.2.1.23 心率校正（工厂测试）

```js
const off = sdk.onDeviceEvent((event) => {
  if (event.type !== "factoryTest" || event.testMode !== 0x15) return;
  if (event.completed) console.log("校正完成", event.result);
  else console.log("校正中");
});

await sdk.startFactoryTest(0x15);
```

仅在厂家指导下使用工厂测试能力。

##### 3.2.1.24 跌落提醒设置

功能位：`supportFallDetect`。

```js
const enabled = await sdk.getFallDetect();
await sdk.setFallDetect(true);
```

跌落发生时由 3.2.1.21 的 `touch` 事件返回，`keyType=2`。

##### 3.2.1.25 计数提醒间隔设置

功能位：`supportCountReminder`。

```js
const minutes = await sdk.getCountReminderInterval();
await sdk.setCountReminderInterval(60); // 0/30/60/90/120
await sdk.setCountReminderInterval(0);  // 关闭
```

#### 3.2.2 健康数据同步（实时单次与全天检测）

实时单次检测由小程序启动后立即返回过程数据；全天检测由设备按计划测量并保存历史数据。睡眠没有实时单次检测。

##### 3.2.2.1 实时检测——启动与关闭设备健康数据检测

同一时间只能开启一种类型，收到完成事件或主动关闭后才能启动另一种。实时数据通过 `onDeviceEvent()` 返回，SDK 不负责持久化。

```js
const { HealthMeasurementType } = require("./sdk/rw-ble-sdk.min.js");

const off = sdk.onDeviceEvent((event) => {
  if (event.type === "health") {
    console.log(event.healthType, event.records);
  }
  if (event.type === "healthStatus" && event.completed) {
    console.log("measurement completed", event.status);
  }
});

await sdk.setHealthMeasurement(HealthMeasurementType.HEART_RATE, true);
await sdk.setHealthMeasurement(HealthMeasurementType.HEART_RATE, false);
```

支持的 `HealthMeasurementType`：

| 常量 | 健康类型 | 数值 |
| --- | --- | --- |
| `HEART_RATE` | 心率 | `0x03` |
| `BLOOD_PRESSURE` | 血压 | `0x04` |
| `TEMPERATURE` | 体温 | `0x08` |
| `BLOOD_OXYGEN` | 血氧 | `0x09` |
| `HRV` | 心率变异性 | `0x0A` |
| `STRESS` | 压力 | `0x0D` |
| `BLOOD_SUGAR` | 血糖 | `0x10` |

##### 3.2.2.2 全天检测——设置健康数据全天监听间隔

所有类型共用：

```js
await sdk.setMonitoring(type, {
  enabled: true,
  startHour: 0,
  startMinute: 0,
  endHour: 23,
  endMinute: 59,
  intervalMinutes: 60,
});

const current = await sdk.getMonitoring(type);
```

支持的 `type`：

| `type` | 健康类型 |
| --- | --- |
| `heartRate` | 心率 |
| `bloodOxygen` | 血氧 |
| `hrv` | 心率变异性 |
| `stress` | 压力 |
| `bloodSugar` | 血糖 |
| `bloodPressure` | 血压 |
| `temperature` | 体温 |
| `ppg` | PPG 定时检测 |

###### 3.2.2.2.1 心率检测设置与获取

```js
await sdk.setMonitoring("heartRate", {
  enabled: true, startHour: 0, startMinute: 0,
  endHour: 23, endMinute: 59, intervalMinutes: 60,
});
const heartRatePlan = await sdk.getMonitoring("heartRate");
```

心率间隔支持 30 或 60 分钟。

###### 3.2.2.2.2 血氧检测设置与获取

```js
await sdk.setMonitoring("bloodOxygen", {
  enabled: true, intervalMinutes: 60,
});
const bloodOxygenPlan = await sdk.getMonitoring("bloodOxygen");
```

###### 3.2.2.2.3 心率变异性（HRV）检测设置与获取

```js
await sdk.setMonitoring("hrv", { enabled: true, intervalMinutes: 60 });
const hrvPlan = await sdk.getMonitoring("hrv");
```

###### 3.2.2.2.4 压力检测设置与获取

```js
await sdk.setMonitoring("stress", { enabled: true, intervalMinutes: 60 });
const stressPlan = await sdk.getMonitoring("stress");
```

###### 3.2.2.2.5 血糖检测设置与获取

```js
await sdk.setMonitoring("bloodSugar", { enabled: true, intervalMinutes: 60 });
const bloodSugarPlan = await sdk.getMonitoring("bloodSugar");
```

###### 3.2.2.2.6 血压检测设置与获取

```js
await sdk.setMonitoring("bloodPressure", { enabled: true, intervalMinutes: 60 });
const bloodPressurePlan = await sdk.getMonitoring("bloodPressure");
```

###### 3.2.2.2.7 体温检测设置与获取

功能位：`supportTemperatureMonitoring`。

```js
await sdk.setMonitoring("temperature", { enabled: true, intervalMinutes: 60 });
const temperaturePlan = await sdk.getMonitoring("temperature");
```

体温支持 30 或 60 分钟，以设备功能为准。

##### 3.2.2.3 全天检测——同步健康历史数据

```js
const result = await sdk.syncAllHealthData({
  onProgress(progress) {
    console.log(progress.percent, progress.type);
  },
});

console.log(result.records); // 按类型返回 HealthRecord[]
console.log(result.errors);  // 单项失败不阻断其他类型
```

`syncAllHealthData()` 根据连接时获取的功能表，同步以下设备支持的健康历史数据：

| 健康数据 | 功能表字段 | `result.records` 键 | 返回内容 |
| --- | --- | --- | --- |
| 计步 | `step` | `steps` | 今日累计、今日分时明细和历史分时明细 |
| 睡眠 | `sleep` | `sleep` | 完整睡眠段及各睡眠状态明细 |
| 心率 | `hr` | `heartRate` | 心率测量记录 |
| HRV | `hrv` | `hrv` | 心率变异性测量记录 |
| 血氧 | `bloodOxy` | `bloodOxygen` | 血氧测量记录 |
| 血压 | `bloodPress` | `bloodPressure` | 收缩压和舒张压测量记录 |
| 压力 | `pressure` | `stress` | 压力测量记录 |
| 血糖 | `bloodSugar` | `bloodSugar` | 血糖测量记录 |
| 赞念 | `muslimCountData` | `muslimCount` | 赞念计数记录 |
| 体温 | `temperature` | `temperature` | 摄氏温度测量记录 |

返回结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `records` | `Partial<Record<HealthDataType, HealthRecord[]>>` | 按上表的键返回同步成功的数据；设备没有历史数据时返回空数组 |
| `errors` | `Partial<Record<HealthDataType, string>>` | 按类型返回同步失败原因；单项失败不会中断其他类型 |

设备不支持的类型不会出现在 `records` 或 `errors` 中。每条记录统一使用下节说明的 `HealthRecord` 格式。`onProgress` 会返回当前完成数量、总数量、百分比及当前健康类型。同步成功后，相应的设备历史数据会被删除，接入方应及时保存 `records`。

##### 3.2.2.4 全天检测——健康数据说明

###### 3.2.2.4.1 健康数据回调总览

小程序统一返回 `HealthRecord`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 稳定记录 ID，可用于本地去重 |
| `type` | string | 健康类型 |
| `measuredAt` | number | Unix 毫秒时间戳，可直接传给 `new Date()` |
| `value` | number/string | 主要数据值 |
| `unit` | string | 单位 |
| `summary` | string | 摘要文本 |
| `detail` | object | 该类型完整明细 |

类型对应关系：

| 数据 | `type` | 单位 |
| --- | --- | --- |
| 计步 | `steps` | 步 |
| 睡眠 | `sleep` | 时长文本 |
| 心率 | `heartRate` | bpm |
| 血压 | `bloodPressure` | mmHg |
| 血氧 | `bloodOxygen` | % |
| 体温 | `temperature` | ℃ |
| 压力 | `stress` | 无 |
| 血糖 | `bloodSugar` | mmol/L |
| HRV | `hrv` | ms |
| 赞念 | `muslimCount` | 次 |

###### 3.2.2.4.2 普通测量数据明细

普通类型每个测量点返回一条 `HealthRecord`。血压 `value` 为 `收缩压/舒张压`；血糖为小数；体温已换算成摄氏度，无需再次除以 10。

###### 3.2.2.4.3 计步数据

计步会同时返回今日累计、今日分时明细和设备历史明细。今日累计记录字段：

| 字段 | 说明 |
| --- | --- |
| `value` | 当天总步数 |
| `detail.calorie` | 当天卡路里 |
| `detail.distance` | 当天距离 |
| `detail.itemCount` | 设备返回的明细数 |
| `detail.date` | 本地日期 |

今日和历史分时明细均返回独立 `HealthRecord`，`summary` 分别为“今日计步明细”和“小时计步明细”。

###### 3.2.2.4.4 睡眠数据

每个从模式 17（睡眠开始）到 34（睡眠结束）的完整段生成一条记录：

| `detail` 字段 | 说明 |
| --- | --- |
| `asleepAt` / `awakeAt` | 入睡/醒来 Unix 毫秒 |
| `totalMinutes` | 总时长 |
| `deepMinutes` | 深睡 |
| `lightMinutes` | 浅睡 |
| `awakeMinutes` | 清醒 |
| `remMinutes` | REM |
| `items` | 睡眠状态明细数组 |

`detail.items` 每项包含：

| 字段 | 说明 |
| --- | --- |
| `startAt` / `endAt` | 状态起止 Unix 毫秒 |
| `minutes` | 状态持续分钟数 |
| `sleepType` | 0 清醒、1 浅睡、2 深睡、3 REM |
| `sleepTypeText` | 中文状态名称 |
| `isTemporary` | 0 正式数据、1 临时数据 |

###### 3.2.2.4.5 赞念数据

| 字段 | 说明 |
| --- | --- |
| `type` | 固定为 `muslimCount` |
| `value` | 设备返回的累计次数 |
| `unit` | `次` |
| `measuredAt` | 记录对应的 Unix 毫秒时间戳 |

#### 3.2.3 OTA 升级

> OTA 文件必须由设备厂家提供，并确认适用于当前设备。升级期间需保持小程序前台运行、蓝牙开启并让设备靠近手机。发布前必须使用目标设备验证升级成功、异常固件拒绝和中途断连等情况。

固件文件可通过以下方式获取：

- 使用 `wx.chooseMessageFile()` 从微信聊天或文件传输助手选择。
- 由服务器配置固件版本和下载地址，通过 `wx.downloadFile()` 下载。

无论使用哪种方式，升级前都必须核对当前设备型号和固件版本，确认固件适用于当前设备。

小程序先通过文件系统读取固件，再传入 `Uint8Array`：

```js
const fileSystem = wx.getFileSystemManager();

const arrayBuffer = await new Promise((resolve, reject) => {
  fileSystem.readFile({
    filePath: otaPath,
    success: ({ data }) => resolve(data),
    fail: reject,
  });
});

await sdk.upgradeFirmware(new Uint8Array(arrayBuffer), {
  onProgress(progress) {
    console.log(Math.round(progress * 100));
  },
});
```

`upgradeFirmware()` 成功返回表示固件数据已发送完成，不代表已经确认设备的新版本。设备重启后应重新连接并调用 `readFirmwareVersion()`，以实际版本号确认升级结果。



#### 3.2.4 多运动 Workout

功能位：`newSport`。运动超过 2 分钟设备才会保存报告。进入运动后，即使小程序关闭或断开，设备也可能继续运动，因此连接后应先查询状态。

##### 3.2.4.1 获取设备多运动状态

```js
const state = await sdk.getWorkoutState();
// { sportType, status, isRunning }
```

`status`：1 开始、2 继续、3 暂停、4 结束。

##### 3.2.4.2 控制设备进入多运动

```js
const { WorkoutControlStatus } = require("./sdk/rw-ble-sdk.min.js");

const off = sdk.onDeviceEvent((event) => {
  if (event.type === "workoutState") console.log(event.state);
  if (event.type === "workoutData") console.log(event.data);
});

await sdk.controlWorkout(7, WorkoutControlStatus.BEGIN);
await sdk.controlWorkout(7, WorkoutControlStatus.PAUSE);
await sdk.controlWorkout(7, WorkoutControlStatus.CONTINUE);
await sdk.controlWorkout(7, WorkoutControlStatus.FINISH);
```

`sportType` 完整取值：

| 数值 | 运动类型 | 数值 | 运动类型 |
| --- | --- | --- | --- |
| `7` | 跑步 | `8` | 跑步机 |
| `9` | 户外跑步 | `10` | 骑行 |
| `11` | 游泳 | `12` | 步行、健走 |
| `13` | 爬山 | `14` | 瑜伽 |
| `15` | 动感单车 | `16` | 篮球 |
| `17` | 足球 | `18` | 羽毛球 |
| `19` | 马拉松 | `20` | 室内步行 |
| `21` | 自由锻炼 | `22` | 田径 |
| `23` | 力量训练 | `24` | 举重 |
| `25` | 拳击 | `26` | 跳绳 |
| `27` | 爬楼梯 | `28` | 滑雪 |
| `29` | 滑冰 | `30` | 轮滑 |
| `31` | 室内骑行 | `32` | 呼啦圈 |
| `33` | 高尔夫 | `34` | 棒球 |
| `35` | 舞蹈 | `36` | 乒乓球 |
| `37` | 曲棍球 | `38` | 普拉提 |
| `39` | 跆拳道 | `40` | 手球 |
| `41` | 街舞 | `42` | 排球 |
| `43` | 网球 | `44` | 飞镖 |
| `45` | 体操 | `46` | 踏步 |
| `47` | 椭圆机 | `48` | 尊巴 |
| `49` | 板球 | `50` | 徒步旅行 |
| `51` | 有氧运动 | `52` | 划船机 |
| `53` | 橄榄球 | `54` | 仰卧起坐 |
| `55` | 哑铃 | `56` | 健身操 |
| `57` | 空手道 | `58` | 击剑 |
| `59` | 武术 | `60` | 太极拳 |
| `61` | 飞盘 | `62` | 射箭 |
| `63` | 骑马 | `64` | 保龄球 |
| `65` | 冲浪 | `66` | 垒球 |
| `67` | 壁球 | `68` | 帆船 |
| `69` | 引体向上 | `70` | 滑板 |
| `71` | 蹦床 | `72` | 钓鱼 |
| `73` | 钢管舞 | `74` | 广场舞 |
| `75` | 爵士舞 | `76` | 芭蕾舞 |
| `77` | 迪斯科 | `78` | 踢踏舞 |
| `79` | 现代舞 | `80` | 俯卧撑 |
| `81` | 滑板车 | `82` | 平板支撑 |
| `83` | 桌球 | `84` | 攀岩 |
| `85` | 铁饼 | `86` | 赛马 |
| `87` | 摔跤 | `88` | 跳高 |
| `89` | 跳伞 | `90` | 铅球 |
| `91` | 跳远 | `92` | 标枪 |
| `93` | 链球 | `94` | 深蹲 |
| `95` | 压腿 | `96` | 越野自行车 |
| `97` | 越野摩托 | `98` | 赛艇 |
| `99` | CROSSFIT | `100` | 水上自行车 |
| `101` | 皮划艇 | `102` | 槌球 |
| `103` | 地板球 | `104` | 泰拳 |
| `105` | 回力球 | `106` | 网球（双打） |
| `107` | 背部训练 | `108` | 水上排球 |
| `109` | 滑水 | `110` | 登山机 |
| `111` | HIIT | `112` | BODY COMBAT |
| `113` | BODY BALANCE | `114` | TRX |
| `115` | 跆搏 | `116` | 小轮车 |
| `117` | 拉伸 | `118` | 室内健身 |
| `119` | 柔韧训练 | `120` | 上肢训练 |
| `121` | 下肢训练 | `122` | 自由体操 |
| `123` | 杠铃 | `124` | 体能训练 |
| `125` | 硬拉 | `126` | 波比跳 |
| `127` | 功能性训练 | `128` | 腰腹训练 |
| `129` | 桌式足球 | `130` | 打猎 |
| `131` | 立桨冲浪 | `132` | 皮艇漂流 |
| `133` | 摩托艇 | `134` | 跑酷 |
| `135` | 沙滩车 | `136` | 滑翔伞 |
| `137` | 冰壶 | `138` | 滑雪板 |
| `139` | 滑雪双板 | `140` | 高山滑雪 |
| `141` | 越野滑雪 | `142` | 雪地摩托 |
| `143` | 雪车 | `144` | 雪橇 |
| `145` | 墙球 | `146` | 冰球 |
| `147` | 藤球 | `148` | 水球 |
| `149` | 肚皮舞 | `150` | 交际舞 |
| `151` | 民族舞 | `152` | 拉丁舞 |
| `153` | 柔道 | `154` | 踢拳 |
| `155` | 放风筝 | `156` | 拔河 |
| `157` | 毽球 | `158` | 卡巴迪 |
| `159` | 赛车 | `160` | 石子游戏 |
| `161` | 捉人游戏 |  |  |

实时 `workoutData`：

| 字段 | 说明 |
| --- | --- |
| `activityTime` | 秒 |
| `steps` | 步数 |
| `distance` | 米 |
| `calorie` | cal |
| `heartRate` | bpm |

##### 3.2.4.3 控制开启/关闭设备实时通知运动数据

```js
await sdk.setWorkoutRealtimePush(true);
await sdk.setWorkoutRealtimePush(false);
```

需要接收实时运动数据时开启，不再接收或小程序进入后台时关闭；关闭实时数据不会结束设备上的运动。

##### 3.2.4.4 获取多运动数据报告

```js
const reports = await sdk.getWorkoutReports();
```

`WorkoutReport` 包含 `startTime`、`endTime`（Unix 毫秒）、`exerciseTime`、`workModel`、`step`、`distance`、`calorie`、`speed`、`pace`、平均/最大/最小心率、步频、配速、`heartRates` 和 `pacePerKmList`。

#### 3.2.5 传感器原始数据

| 数据 | 获取方式 |
| --- | --- |
| PPG/ACC/PPG Red/IR | 启动采集后同步历史数据 |
| 睡眠状态 | 设备实时推送 |

原始数据设备通常只保存约 1 分钟。采样点没有独立绝对时间戳。

历史采集 `sensorType`：

| 值 | 组合 |
| --- | --- |
| 1 | ACC |
| 2 | PPG Green |
| 3 | PPG Green + ACC |
| 4 | PPG Red |
| 5 | PPG Red + ACC |
| 10 | PPG Green + IR |
| 11 | PPG Green + ACC + IR |
| 12 | PPG Red + IR |
| 13 | PPG Red + ACC + IR |

绿光和红光不能同时开启；IR 不能单独开启。

##### 3.2.5.0 PPG 定时监测

功能位：`supportPPGMonitoring`。

```js
await sdk.setMonitoring("ppg", {
  enabled: true,
  startHour: 0,
  startMinute: 0,
  endHour: 23,
  endMinute: 59,
  intervalMinutes: 60,
});
const ppgPlan = await sdk.getMonitoring("ppg");
```

##### 3.2.5.1 启动与关闭传感器原始数据

```js
const { SensorRawControl } = require("./sdk/rw-ble-sdk.min.js");

const off = sdk.onDeviceEvent((event) => {
  if (event.type === "sensorStopped") {
    console.log("device stopped sensor", event.reason);
  }
});

await sdk.controlSensorRaw(SensorRawControl.START, 3);
await sdk.controlSensorRaw(SensorRawControl.STOP, 3);
```

##### 3.2.5.2 历史原始数据获取

```js
const records = await sdk.getSensorHistoryRaw();
```

`SensorHistoryRawRecord`：

| 字段 | 说明 |
| --- | --- |
| `type` | 1 PPG、2 ACC、3 PPG Red、4 IR |
| `sequence` | 数据包序号 |
| `ppgDataList` | PPG int32 数组 |
| `accDataList` | `{x,y,z}` int16 数组 |
| `ppgRedDataList` | 红光 int32 数组 |
| `irDataList` | 红外 int32 数组 |

同步成功后设备历史数据会删除，应立即保存返回值。

##### 3.2.5.3 睡眠状态实时推送

功能位：`supportSensorRawSleep`。无需调用 `controlSensorRaw()`。

```js
const off = sdk.onDeviceEvent((event) => {
  if (event.type !== "sensorRaw" || event.data.type !== 5) return;
  event.data.sleepDataList.forEach(({ timestamp, sleepMode }) => {
    console.log(new Date(timestamp), sleepMode);
  });
});
```

`sleepDataList` 每项字段：

| 字段 | 说明 |
| --- | --- |
| `timestamp` | Unix 毫秒时间戳 |
| `sleepMode` | `17` 睡眠开始<br>`34` 睡眠结束<br>`1` 深睡<br>`2` 浅睡<br>`3` 清醒<br>`4` REM |

## SDK修订记录

**RW_SDK_V2.0.0_20260724** (2026.07.24)
- 微信小程序基本功能
