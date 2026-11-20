# RW BLE 微信小程序 SDK 使用说明文档

## 1. 简介

RW BLE 微信小程序 SDK 用于在微信小程序中搜索、连接 RW 智能戒指，读取设备信息、配置设备功能、同步健康数据、控制多运动、获取传感器原始数据及执行 OTA 升级。

当前 SDK 版本：`RW_SDK_V2.0.0_20261120`。

#### 1.1 适用平台与语言

- 微信原生小程序，基础库建议 `3.5.0` 或以上。
- SDK 使用 CommonJS，可在 JavaScript 或 TypeScript 小程序中使用。
- BLE 能力必须使用真机测试，开发者工具模拟器不能完成真实连接与数据同步。

#### 1.2 相关术语

| 术语 | 说明 |
| --- | --- |
| `deviceId` | 微信蓝牙 API 返回的设备标识，各平台不同：<br>**iOS**：系统分配的 UUID，不等于 MAC 地址<br>**Android**：通常为设备 MAC 地址<br>**鸿蒙**：临时分配的地址，可能变化（[官方说明](https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth/wx.onBluetoothDeviceFound.html)），不建议长期缓存直连<br>绑定设备应以广播 `macAddress` 为准；直连失败时重新搜索、按 `macAddress` 匹配到新的 `deviceId` 后再连接 |
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

当前SDK版本对应Service下的系统连接设备会置顶返回，并带有 `systemConnected: true`、`RSSI: 0`；其余设备按 RSSI 从强到弱排列。大部分设备在 iOS 上连接后会由系统默认完成配对。

扫描设备常用字段：

| 字段 | 说明 |
| --- | --- |
| `deviceId` | 微信提供的设备标识，连接时使用 |
| `name` / `localName` | 设备名称 |
| `RSSI` | 信号强度（dBm）；系统连接设备固定为 `0` |
| `macAddress` | 广播解析出的 BLE MAC；未携带时回退为其它来源，可能为空字符串 |
| `batteryStatus` | 广播携带的电量状态：`0` 未充电、`1` 充电中、`2` 充满；广播未携带时为 `undefined` |
| `deviceForm` | 广播携带的产品形态：`0` 无屏戒指、`1` 有屏戒指、`2` 无屏手链、`3` 有屏手链、`4` 无屏手环、`5` 有屏手环、`6` 手表；广播未携带或为未知值时为 `-1` |
| `deviceBodyColor` | 设备外观颜色：`0` 未设置、`1` 黑色、`2` 粉色、`3` 红色、`4` 银色、`5` 金色；`-1` 或 `undefined` 表示未提供或不支持，需设备固件支持 |
| `deviceSize` | 设备尺寸号，如 `9` 表示9号、`10` 表示10号；`0` 未设置，`-1` 或 `undefined` 表示未提供或不支持，需设备固件支持 |
| `systemConnected` | 当前SDK构建版本对应的系统连接设备为 `true` |

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

`connect()` 成功返回后可直接使用 `sdk.supportMenu`，无需再次读取功能表；需要刷新时调用 `await sdk.readFunctionList()`。

支持密码认证的设备会自动完成校验，认证失败时抛出 `reason: "PASSWORD_AUTH_FAILED"`。

连接失败抛出 `RingSdkConnectionError`，包含 `errCode` 和 `detail`。

建议根据 `errCode` 向用户提供对应提示和操作：

| 错误情况 | 建议提示与操作 |
| --- | --- |
| `10000` 蓝牙适配器未初始化 | 重新初始化蓝牙后再试 |
| `10001` 蓝牙不可用 | 提示“蓝牙暂不可用，请检查蓝牙权限后重试”，保留错误码；需要等待就绪时调用 `RingSdk.openAdapter()` |
| 微信系统蓝牙权限拒绝 | `appBluetoothAuthorized === "denied"`，支持时调用 `wx.openAppAuthorizeSetting()` |
| 小程序蓝牙权限拒绝 | `scopeBluetooth === false`，调用 `wx.openSetting()` |
| `10002` / `10003` | 提示靠近设备，并确认设备未连接其他手机 |
| `10004` / `10005` | 提示靠近设备后重试；持续失败可开关手机蓝牙后重试 |
| `10006` | 提示连接断开并提供重新连接入口 |
| `10007` | 提示当前设备不支持该蓝牙操作 |
| `10008` | 提示系统蓝牙繁忙，可重新开启蓝牙后重试 |
| `10009` | 提示当前手机或微信版本不支持所需蓝牙能力 |
| `10012` | 提示操作超时并允许重试 |
| `10013` | 提示蓝牙参数或设备数据无效，检查参数后重试 |
| `reason: PASSWORD_AUTH_FAILED` | 提示设备密码不匹配，不能进入业务可用状态 |
| `reason: CANCELLED` | 本次重连已取消，无需显示连接失败提示 |
| `reason: BUSY` | 蓝牙资源仍在使用或清理中，稍后重试 |
| `reason: STAGE_TIMEOUT` | 本次等待超时，可结合 `stage`、`detail` 排查后重试 |

##### 3.1.4 断开连接设备

```js
await sdk.disconnect("user disconnected");
```

`disconnect()` 用于主动断开设备。异常断连时 SDK 自动释放，无需手动清理。

##### 3.1.5 本地绑定与自动重连、解绑

连接成功后建议保存 `deviceId`、`macAddress`、`supportMenu`，启动后调用 `RingSdk.reconnect({ deviceId, macAddress })` 重连，见 3.1.9。

解绑流程：

- 支持密码认证的设备：连接状态下先调用 `await sdk.modifyDevicePwd("0000")`，成功后断开并删除缓存
- 其它设备：直接断开并删除缓存
- iOS 须提示用户前往"系统设置 → 蓝牙"忽略设备，小程序无法删除系统配对

##### 3.1.6 设备功能配置表

> [!IMPORTANT]
>
> 功能表是设备能力说明，不是功能开关。功能支持标志为 `true` 表示支持，`false` 表示不支持。
>
> 修改 `SupportMenu` 属性或调用 SDK 设置接口，都不能让设备获得原本不支持的功能。SDK 接口只能控制设备已经支持的功能。
>
> 如需增加功能支持，须确认是否可通过适配固件升级实现；涉及硬件能力时，需更换支持该功能的设备型号。

可根据业务需要保存功能表；更换设备或升级固件后，应重新获取。

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
| `supportDevicePasswordAuth` | 设备密码认证 |
| `supportDeviceChallenge` | 设备身份认证 |
| `supportScreenControl` | 即时屏幕亮灭控制 |
| `supportCustomNumberDisplay` | 自定义数字显示（3.2.1.32） |
| `supportCountControl` | 计数识别开关与状态查询（3.2.1.33） |
| `supportUnitSetting` | 公制/英制单位设置 |
| `supportSedentary` | 久坐提醒 |
| `supportDrink` | 喝水提醒 |
| `supportVibrationControl` | 自定义震动控制（3.2.1.31） |
| `supportRecording` | 录音 |
| `supportCustomerModel` | 客户型号设置与获取（3.2.1.34） |
| `supportPpgSampleRate` | PPG 采样率设置与获取（5.2.5.4） |
| `supportCustomTextDisplay` | 自定义字符显示与时长设置（3.2.1.32） |
| `supportDeviceBodyColor` | 设备外观颜色设置与获取（3.2.1.36） |
| `supportVibrationSwitch` | 震动总开关设置与获取（3.2.1.37） |
| `supportDeviceSize` | 设备尺寸设置与获取（3.2.1.38） |

调用相关接口前应先判断相应功能位。

##### 3.1.7 日志回调

日志默认关闭，建议在连接设备前开启。接入方可通过回调获取日志，自行保存或上传。

```js
const pendingLogs = [];

// 开启日志
RingSdk.setLogCallback((log) => {
  pendingLogs.push(log);
});
```

不再需要时关闭日志：

```js
RingSdk.setLogCallback(null);
```

回调日志格式：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | `number` | 日志时间，Unix 毫秒时间戳 |
| `type` | `string` | `send` 发送、`receive` 接收、`connection` 连接与断开、`error` 错误 |
| `message` | `string` | 日志内容；蓝牙收发内容为十六进制字符串，如 `02 03 10`，`connection` 日志在开始连接时携带 `deviceId`，其它日志为事件描述 |

> [!TIP]
> 建议先缓存日志，在一次功能操作完成后，或累计一定条数（如 20 条或 100 条）时，再批量保存或上传，避免每条日志单独上传。保存或上传方式由接入方自行实现。

##### 3.1.8 等待蓝牙就绪

首次授权或蓝牙暂不可用时，可先等待就绪，再搜索设备。

```js
await RingSdk.openAdapter({ timeoutMs: 30000 }); // 默认等待15秒，此处设置为30秒
const scan = await RingSdk.startScan({ onDevices: (devices) => console.log(devices) });
```

失败或超时抛出错误，在 `catch` 中按 3.1.3 提示用户。手机蓝牙已关闭或权限被拒绝时直接失败，开启蓝牙或允许权限后需重新调用。

##### 3.1.9 缓存设备重连

同时传入已保存的 `deviceId` 与 `macAddress`。默认在鸿蒙直连失败后按 MAC 搜索设备；成功后应保存实际返回的 `sdk.deviceId`。

```js
const bound = wx.getStorageSync("boundDevice");
const task = RingSdk.reconnect({
  deviceId: bound.deviceId,
  macAddress: bound.macAddress,
  fallbackScanTimeoutMs: 6000, // 每轮搜索6秒
  fallbackScanAttempts: 2, // 最多搜索2次
  connectOptions: {
    onStage: (stage) => console.log("连接阶段", stage),
    onConnectionStateChange: ({ connected }) => console.log("连接状态", connected),
  },
});
const sdk = await task;
wx.setStorageSync("boundDevice", { ...bound, deviceId: sdk.deviceId, supportMenu: sdk.supportMenu });
```

| 可选参数 | 说明 |
| --- | --- |
| `scanFallback` | 默认 `"auto"`：仅鸿蒙启用搜索兜底；`"always"`：各平台启用；`"never"`：不搜索兜底。搜索兜底需提供有效 `macAddress` |
| `adapterTimeoutMs` | 蓝牙就绪等待，默认15000毫秒；0表示跳过等待 |
| `directConnectTimeoutMs` | 启用搜索兜底时的首次直连超时，默认5000毫秒 |
| `fallbackScanTimeoutMs` | 每轮搜索时长，默认6000毫秒 |
| `fallbackScanAttempts` | 搜索总次数，默认2次，包含第一次；至少1次，传0按1次处理 |
| `cleanupTimeoutMs` | 连接或扫描清理的单次等待上限，默认2000毫秒 |
| `connectOptions` | 与 `connect` 相同的连接参数和回调；其中 `connectTimeoutMs` 只控制建链，不是整轮重连时长 |

轮间不重复直连，找到设备立即连接，全部未找到才返回搜索超时。

取消重连：`RingSdk.cancelReconnect(task)`，已连接成功时用 `sdk.disconnect()`。

### 3.2 设备功能操作

#### 3.2.1 基础功能指令接口

##### 3.2.1.0 Get SDK Version

```js
const version = sdk.getSDKVersion(); // "RW_SDK_V2.0.0_20261120"

// 也可以通过顶层接口或常量读取：
const RWSDK = require("./sdk/rw-ble-sdk.min.js");
RWSDK.getSDKVersion();
RWSDK.SDK_VERSION;
```

##### 3.2.1.1 获取设备 MAC 地址

```js
const macAddress = await sdk.readBleAddress();
console.log(macAddress); // "AA:BB:CC:DD:EE:FF"
```

返回设备 BLE MAC 地址（大写、冒号分隔）。iOS 上 `deviceId` 不等于 MAC 地址；设备完成系统配对后可能无法再从广播包解析出地址，此时可通过本接口获取。绑定设备时应同时保存该地址（见 3.1.5）。

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
| `deviceForm` | 产品形态：`0` 无屏戒指、`1` 有屏戒指、`2` 无屏手链、`3` 有屏手链、`4` 无屏手环、`5` 有屏手环、`6` 手表；`-1` 未提供或不支持 |
| `customerModel` | 客户型号；未提供时与原设备型号一致 |
| `deviceBodyColor` | 设备外观颜色：`0` 未设置、`1` 黑色、`2` 粉色、`3` 红色、`4` 银色、`5` 金色；`-1` 未提供或不支持，需设备固件支持 |
| `deviceSize` | 设备尺寸号，如 `9` 表示9号、`10` 表示10号；`0` 未设置，`-1` 未提供或不支持。设置与查询见3.2.1.38 |

固件升级前应读取并核对当前设备型号与固件版本。

##### 3.2.1.4 获取电量

`readPower()` 返回 `level`（电量百分比）。

| `PowerInfo` 属性 | 说明 |
| --- | --- |
| `level` | 电量百分比，`0-100` |
| `voltage` | 电池电压（mV）；固件未返回时为 `undefined` |
| `charging` | 是否正在充电：`true` 正在充电，`false` 未充电；固件未返回时为 `undefined`。注意 `false` 无法区分“未充电”与“固件未提供充电状态” |

实时电量通过 `onDeviceEvent()` 的 `event.type === "power"` 接收，字段与查询一致。充电状态推送需固件支持。

> [!TIP]
>
> 扫描阶段无需连接即可获知充电状态：扫描设备字段 `batteryStatus`（`0` 未充电、`1` 充电中、`2` 充满，见 3.1.1），由设备广播携带、SDK 扫描时解析。连接后 `readPower()` 返回电量百分比与 `charging` 充电状态，两者数据来源相互独立，请勿互相换算。

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

功能位：`takePhoto`。

小程序需使用相机组件自行实现相机页面, 不能直接拉起手机系统相机实现戒指拍照控制. SDK负责相机模式控制与拍照事件通知, 拍照及保存到手机相册由小程序完成.

使用流程:

1. 进入相机页面时, 通过 `sdk.onDeviceEvent()` 监听设备事件, 调用 `sdk.controlCamera(1)` 通知戒指进入相机控制模式.
2. 用户在戒指上触发拍照手势后, 收到 `type="camera"`、`action=2` 的事件; 小程序调用相机组件拍照, 并将照片保存到手机相册.
3. 退出相机页面时, 调用 `sdk.controlCamera(0)` 通知戒指退出相机控制模式, 并调用监听返回的函数取消监听.

```js
const unsubscribe = sdk.onDeviceEvent((event) => {
  if (event.type === "camera" && event.action === 2) {
    // 调用小程序相机组件拍照, 并将照片保存到手机相册
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

##### 3.2.1.21 设备主动推送监听

> 设备主动事件的统一监听通道：电量推送、录音状态推送、触摸/跌落/SOS/连续点击事件等按 `event.type` 分发。

`sdk.onDeviceEvent(listener)` 返回注销函数，退出相关页面时调用：

```js
const off = sdk.onDeviceEvent((event) => {
  switch (event.type) {
    case "touch":
      // keyType: 1 触摸，2 跌落（需开启跌落提醒），3 SOS，4 连续点击
      // touchType: 触摸时 1 单击、2 双击、3 三击、4 长按、5 甩动、6 Release(长按后松手)；跌落时默认1；SOS时不使用；连续点击时为次数(1-9)
      if (event.keyType === 1 && event.touchType === 6) console.log("Release");
      else console.log(event.keyType, event.touchType);
      break;
    case "power":
      console.log(event.level, event.charging);
      break;
    case "recordStatus":
      console.log(event.status.recording, event.status.remainingCapacity);
      break;
  }
});
```

推送类型说明：

| `event.type` | 数据 | 字段 | 说明 |
| --- | --- | --- | --- |
| `power` | 电量与充电状态 | `level` / `voltage` / `charging` | 见 3.2.1.4 |
| `recordStatus` | 录音状态推送 | `status`（字段同 `RecordStatus`） | 见 3.2.5.2 |
| `recordRealtimeData` | 实时录音音频 | `sequence`（0-255 循环序号，255 后回到0，可检查丢包/顺序）、`audioData`（当前包原始 Opus 压缩音频） | 实时录音中设备主动推送；见 3.2.5.7 |
| `countControl` | 计数识别状态 | `armed`：`true` 开启(Arm)、`false` 关闭(Disarm) | 开关状态变化时推送（含小程序控制与设备自动切换）；见 3.2.1.33 |
| `muslimCount` | 赞念计数实时上报 | `count`（本次计数）、`timestamp`（Unix 毫秒）；一帧多项时逐项上报，每项一条事件 | 用户在设备上按键计数时上报，无需开启检测；见 3.2.1.15 |
| `touch` | 触摸/跌落/SOS/连续点击事件 | `keyType`：`1` 触摸，`2` 跌落，`3` SOS，`4` 连续点击。<br>`touchType`：触摸时 `1` 单击、`2` 双击、`3` 三击、`4` 长按、`5` 甩动、`6` Release(长按后松手)；跌落时默认 `1`；SOS时不使用；连续点击时表示次数(1-9) | 需设备固件支持；跌落提醒需开启 |

触摸与跌落事件需设备固件支持。

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

##### 3.2.1.25 计数提醒间隔设置

功能位：`supportCountReminder`。

```js
const minutes = await sdk.getCountReminderInterval();
await sdk.setCountReminderInterval(60); // 0/30/60/90/120
await sdk.setCountReminderInterval(0);  // 关闭
```

##### 3.2.1.26 设备密码认证

功能位：`supportDevicePasswordAuth`。设备密码固定为4位数字，空值按默认密码 `0000` 处理。

###### 3.2.1.26.1 准备自动认证密码

```js
RingSdk.prepareAutoPassword("1234");
const sdk = await RingSdk.connect(deviceId);
```

保存密码，连接时自动认证，认证失败则 `connect()` 抛出错误。

###### 3.2.1.26.2 修改设备密码

```js
await sdk.modifyDevicePwd("0000");
```

设备必须已连接并完成密码认证。正常解绑时将密码修改为 `0000`，等待设备返回成功后再断开连接及清除本地绑定记录。

###### 3.2.1.26.3 准备授权密码重置

```js
RingSdk.preparePasswordReset("1234");
const sdk = await RingSdk.connect(deviceId);
```

当业务层已通过可靠方式确认用户具备密码重置资格时，可在连接前调用该方法。SDK会在下一次连接中将设备密码重置为传入密码；重置成功后，该密码会自动用于后续正常连接认证。该授权只对下一次连接有效。

###### 3.2.1.26.4 设备身份认证

功能位：`supportDeviceChallenge`。透传云端下发的挑战值，返回设备以出厂密钥计算的 HMAC-SHA256 应答；应答校验由业务与云端完成。

```js
// challengeHex 为云端下发的 64 个 hex 字符(32 字节, 兼容空格/冒号/横线分隔)
const response = await sdk.deviceChallenge("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
console.log(response); // 设备应答, 64 位 hex, 与云端比对
```

##### 3.2.1.27 即时屏幕控制

功能位：`supportScreenControl`。仅支持该能力的设备可使用。

```js
await sdk.setScreenOn(true);  // 亮屏
await sdk.setScreenOn(false); // 息屏
```

##### 3.2.1.28 公制/英制单位设置与获取

功能位：`supportUnitSetting`。

```js
await sdk.setMeasureUnit(1);      // 0=公制, 1=英制
const unit = await sdk.readMeasureUnit();
```

##### 3.2.1.29 久坐提醒设置与获取

功能位：`supportSedentary`。设置帧重复日固定为每天。

```js
await sdk.setSedentaryRemind({ enabled: true, intervalMinutes: 60, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 });

const info = await sdk.readSedentaryRemind();
console.log(info.enabled, info.intervalMinutes, info.weekdays); // weekdays: bit0=周日…bit6=周六
```

##### 3.2.1.30 喝水提醒设置与获取

功能位：`supportDrink`。参数与返回同久坐提醒(3.2.1.29)。

```js
await sdk.setDrinkRemind({ enabled: true, intervalMinutes: 60 });
const info = await sdk.readDrinkRemind();
```

##### 3.2.1.31 控制自定义震动次数与强度

功能位：`supportVibrationControl`。即时控制，不修改设备已保存的震动设置。

| 参数 | 说明 |
| --- | --- |
| `mode` | `1-15`：单轮震动次数；`255`：持续或节奏循环 |
| `strength` | `0`：停止；`1`：弱；`2`：中；`3`：强 |
| `groupCount` | 节奏循环时每组震动次数，`1-15`；不使用循环时填 `0` |
| `frequency` | 节奏循环时组内频率，`1-10` 次/秒；不使用循环时填 `0` |
| `pause` | 节奏循环时组间停顿，`1-255`，单位 100ms；不使用循环时填 `0` |

单轮和持续模式的三个循环参数均填 `0`；节奏循环使用 `mode=255` 并填写全部循环参数。`strength=0` 停止震动并忽略循环参数。参数非法抛 `Error`。指令为一次性应答，前一次返回后再发起下一次。

```js
await sdk.controlVibration(3, 2);                 // 中强度震动3次
await sdk.controlVibration(255, 2);               // 持续震动
await sdk.controlVibration(255, 2, 3, 2, 10);     // 每组3次、2次/秒、组间停顿1秒
await sdk.controlVibration(255, 0);               // 停止震动
```

##### 3.2.1.32 自定义数字显示

将小程序指定的数字显示到设备，显示3秒后退出。再次调用时更新数字并重新计时3秒，数字的含义及解读由小程序自行处理。

功能位：`supportCustomNumberDisplay`。仅支持该能力的设备可使用。

方法说明：

`showCustomNumber(number: number): Promise<void>`

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| number | number | 显示数字，范围0～9999，最多4位；小于0按0处理，大于9999按9999处理，小数取整数部分 |

操作成功后 Promise 完成，失败时进入 `catch`。

```js
try {
  await sdk.showCustomNumber(627);
  console.log("自定义数字显示成功");
} catch (error) {
  console.error("自定义数字显示失败", error);
}
```

**显示字符与设置时长**

将英文字母、数字或混合内容显示到设备，持续指定秒数后退出。再次调用时更新内容并重新计时。功能位：`supportCustomTextDisplay`，仅支持该能力的设备可使用。

`showCustomText(text: string, durationSeconds: number): Promise<void>`

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| text | string | 显示内容，最多5个英文字母或数字，超出截取前5个 |
| durationSeconds | number | 显示时长，单位秒，范围1～255，超出范围自动限制 |

Promise 在设备接受操作后完成，不必等待显示结束；失败时进入 `catch`。

```js
if (menu.supportCustomTextDisplay) {
  try {
    await sdk.showCustomText("A627", 5);
    console.log("字符显示设置成功");
  } catch (error) {
    console.error("字符显示设置失败", error);
  }
}
```

##### 3.2.1.33 计数识别开关与状态查询

开启或关闭计数识别，切换不清零累计计数。功能位：`supportCountControl`。仅支持该能力的设备可使用。

方法说明：

`setCountControl(armed: boolean): Promise<number | undefined>`

`getCountControl(): Promise<boolean>`

| 参数/返回 | 说明 |
| ---- | ---- |
| armed | `true`：开启(Arm)；`false`：关闭(Disarm) |
| setCountControl 返回 | 设备执行结果：`0` 成功，`0x10` 失败（个别固件无应答数据时为 `undefined`） |
| getCountControl 返回 | 当前开关状态：`true` = Arm，`false` = Disarm；回包非法时 Promise 抛错 |

等待上一次操作完成后再进行下一次设置或查询。

```js
const result = await sdk.setCountControl(true);
if (result === 0) console.log("计数识别已开启");

const armed = await sdk.getCountControl();
console.log("计数识别状态:", armed);
```

状态变化通过 `onDeviceEvent` 的 `countControl` 事件推送（`armed` 布尔）；实时计数经 `muslimCount` 事件上报。

##### 3.2.1.34 客户型号设置与获取

设置或查询客户型号，默认与原设备型号一致。功能位：`supportCustomerModel`。

方法说明：

`setCustomerModel(model: string): Promise<void>`

`getCustomerModel(): Promise<string>`

| 参数 | 说明 |
| --- | --- |
| model | 客户型号，最多8个字符，仅支持英文字母和数字 |

```js
await sdk.setCustomerModel("MODEL001");
const model = await sdk.getCustomerModel();
console.log("客户型号:", model);
```

获取固件信息时也可通过 `FirmwareInfo.customerModel` 读取客户型号。固件升级仍使用原设备型号 `deviceModel` 匹配固件。

##### 3.2.1.36 设备外观颜色设置与获取

> 功能配置表属性：`supportDeviceBodyColor`。设置或查询设备外观颜色，也可通过扫描结果或设备信息 `FirmwareInfo` 的 `deviceBodyColor` 读取，需设备固件支持。

`setDeviceBodyColor(color: number): Promise<void>`

`getDeviceBodyColor(): Promise<number>`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| color | number | `0`：未设置<br>`1`：黑色<br>`2`：粉色<br>`3`：红色<br>`4`：银色<br>`5`：金色 |

设置成功后 Promise 完成；查询成功返回颜色值，编码与 `color` 相同。失败时进入 `catch`。

```js
if (sdk.supportMenu.supportDeviceBodyColor) {
  await sdk.setDeviceBodyColor(4);
  const color = await sdk.getDeviceBodyColor();
  console.log("外观颜色:", color);
}
```

##### 3.2.1.37 震动总开关设置与获取

> 功能配置表属性：`supportVibrationSwitch`。设置或查询设备震动总开关，需设备固件支持。

`setVibrationSwitch(enabled: boolean): Promise<void>`

`getVibrationSwitch(): Promise<boolean>`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| enabled | boolean | `true`：开启<br>`false`：关闭 |

设置成功后 Promise 完成；查询成功返回当前开关，`true` 表示开启，`false` 表示关闭。失败时进入 `catch`。

```js
if (sdk.supportMenu.supportVibrationSwitch) {
  await sdk.setVibrationSwitch(true);
  const enabled = await sdk.getVibrationSwitch();
  console.log("震动总开关:", enabled);
}
```

##### 3.2.1.38 设备尺寸设置与获取

> 功能配置表属性：`supportDeviceSize`。设置或查询设备尺寸，也可通过扫描结果或设备信息 `FirmwareInfo` 的 `deviceSize` 读取，需设备固件支持。

`setDeviceSize(size: number): Promise<void>`

`getDeviceSize(): Promise<number>`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| size | number | 设备尺寸号，如 `9` 表示9号、`10` 表示10号；`0` 表示未设置 |

设置成功后 Promise 完成；查询成功返回当前尺寸号，`0` 表示未设置。失败时进入 `catch`。

```js
if (sdk.supportMenu.supportDeviceSize) {
  await sdk.setDeviceSize(9);
  const size = await sdk.getDeviceSize();
  console.log("设备尺寸:", size);
}
```

#### 3.2.2 健康数据同步（实时单次与全天检测）

实时单次检测由小程序启动后立即返回过程数据；全天检测由设备按计划测量并保存历史数据。睡眠没有实时单次检测。

##### 3.2.2.0 实时检测——单项检测

使用 `controlOpen()` 管理单次检测：`1` 开始、`0` 停止。实时数据通过 `onData` 返回，检测结束通过 `onFinished` 返回。同一时间只开启一种检测。

```js
const { HealthMeasurementType } = require("./sdk/rw-ble-sdk.min.js");

sdk.controlOpen(1, HealthMeasurementType.HEART_RATE, {
  onStarted: () => console.log("started"),
  onData: (records) => console.log(records),
  onFinished: (result) => console.log(result.success, result.reason),
});
// 主动停止：结果仍通过开始时的 onFinished 返回。
sdk.controlOpen(0, HealthMeasurementType.HEART_RATE, { onFinished: () => {} });
```

- 结束或断连后自动注销；超时自动停止并返回 `reason: "timeout"`
- 页面退出可调用 `takeHealthMeasurement()` 仅注销监听
- `onFinished(result)` 中 `result.endResult`：

| 值 | 说明 |
| --- | --- |
| `0` | 正常 |
| `9` | 未佩戴（`success` 为 `false`） |
| `undefined` | 旧固件无该字段 |

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

##### 3.2.2.1 实时检测——综合检测

> 功能位：`supportCompositeMeasurement`。一轮检测可返回心率、HRV、压力、血压、体温、血糖（不含血氧），以设备实际返回的项目为准。综合检测与单项检测不能同时进行。

经 `controlCompositeMeasurement(1, handlers)` 启动，`onData` 返回的数组为本次上报的全部检测项目，每项含 `healthType`/`timestamp`/`value`/`extraValue`（血压 `value`=收缩压、`extraValue`=舒张压；同一次上报的各项共用相同 `timestamp`）：

```js
sdk.controlCompositeMeasurement(1, {
  onStarted: () => console.log("综合检测已开始"),
  onData: (items) => items.forEach((item) => console.log(item.healthType, item.value)),
  onFinished: (result) => {
    if (result.endResult === 9) console.log("未佩戴，请佩戴后重试");
    else console.log("综合检测结束", result.success);
  },
});
// 主动停止：结果仍通过开始时的 onFinished 返回。
sdk.controlCompositeMeasurement(0, { onFinished: () => {} });
```

收到数据不代表整轮结束，以 `onFinished` 为准；未佩戴时 `success=false`、`endResult=9`。

##### 3.2.2.2 全天检测——设置健康数据全天监听间隔

`getMonitoring(type)` 的 `durationNums` 返回可选间隔，如 `"30_60"`。旧固件未附带列表时，心率/PPG 默认 `"30_60"`，其他类型默认 `"60"`。

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

每段完整的夜睡或小睡分别返回一条记录，可包含多天数据。小睡需设备固件支持。

| `detail` 字段 | 说明 |
| --- | --- |
| `sleepCategory` | 睡眠类别：`0` 夜睡，`1` 小睡（如午睡） |
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

##### 3.2.3.1 执行 OTA 升级

固件文件由客户自行管理，可通过以下方式获取：

- 使用 `wx.chooseMessageFile()` 从微信聊天或文件传输助手选择。
- 使用客户自行提供的下载地址，通过 `wx.downloadFile()` 下载；需在微信公众平台配置对应的 downloadFile 合法域名。

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

#### 3.2.5 AI录音功能

功能位：`supportRecording`。仅支持该能力的设备可使用。录音数据为原始 Opus 编码字节，SDK 只负责传输，不保存本地、不做格式转换，由业务端自行处理。

##### 3.2.5.1 开始/停止录音

`recordControl(start: boolean): Promise<number>`

```js
const state = await sdk.recordControl(true);   // 开始录音, 返回操作后的实际录音状态
await sdk.recordControl(false);                // 停止录音
```

返回操作后的实际录音状态：`1` 录音中、`0` 空闲。可通过 `getRecordStatus()` 查询详细状态，或监听 `recordStatus` 事件接收状态变化。

##### 3.2.5.2 查询录音状态

```js
const status = await sdk.getRecordStatus();     // 实际录制状态以查询/推送为准
```

设备在录制状态变化时会主动推送，可通过 `onDeviceEvent` 监听 `recordStatus` 事件（`status` 字段同 `RecordStatus`），实际录制状态以查询或推送为准。

| `RecordStatus` 属性 | 说明 |
| --- | --- |
| `recording` | 是否正在录制 |
| `startTime` | 本次录音开始时间（Unix 毫秒，仅录制中有值，否则 `0`） |
| `duration` | 本次已录时长（秒，仅录制中有值） |
| `totalCapacity` / `remainingCapacity` | 录音区总容量 / 剩余容量（字节） |
| `realtime` | 是否为实时录音 |

##### 3.2.5.3 获取录音文件列表

一次性返回完整文件列表：

```js
const files = await sdk.getRecordFileList();
files.forEach(({ fileId, fileSize, duration, timestamp }) => {
  console.log(fileId, fileSize, duration, new Date(timestamp));
});
```

| `RecordFileItem` 属性 | 说明 |
| --- | --- |
| `fileId` | 文件 ID（下载与删除时使用） |
| `fileSize` | 文件大小（字节） |
| `duration` | 录音时长（秒） |
| `timestamp` | 录制时间（Unix 毫秒） |

##### 3.2.5.4 下载录音文件

传输过程由 SDK 自动管理，进度通过 `onProgress` 汇报，完成后一次性返回完整数据。

```js
const result = await sdk.transferRecordFile(fileId, {
  onProgress: (received, meta) => console.log(`${received}/${meta.fileSize} 字节`),
});
```

| `RecordTransferResult` 属性 | 说明 |
| --- | --- |
| `fileType` / `format` | 设备侧文件类型与编码格式标识 |
| `duration` / `timestamp` | 录音时长（秒）与录制时间（Unix 毫秒） |
| `fileId` / `fileSize` | 文件 ID 与文件大小（字节） |
| `data` | 拼接完整的原始录音字节（`Uint8Array`），由业务端自行保存或转码 |

同一时间只允许一个下载任务，重复调用会 reject；断连或传输异常经 reject 收尾。

##### 3.2.5.5 删除录音文件

```js
const status = await sdk.deleteRecordFile(fileId);  // 删除指定文件
```

返回操作结果：`0` 成功，非 `0` 失败。

##### 3.2.5.6 格式化录音区

```js
const status = await sdk.formatRecordStorage();  // 清空全部录音文件, 不可恢复
```

返回操作结果：`0` 成功，非 `0` 失败。

##### 3.2.5.7 实时录音

功能位：`supportRecording`，需设备固件支持实时录音。普通录音使用 `recordControl`。

方法说明：

`recordRealtimeControl(start: boolean): Promise<number>`

| 参数/返回 | 说明 |
| ---- | ---- |
| start | `true`：启动实时录音；`false`：停止 |
| Promise 返回 | 操作后的实际录音状态：`1` 录音中、`0` 空闲 |

音频通过 `onDeviceEvent` 的 `recordRealtimeData` 事件接收：

| `recordRealtimeData` 字段 | 说明 |
| ---- | ---- |
| sequence | 数据包序号 0～255，255 后回到 0，可用于检查丢包和顺序 |
| audioData | 当前包的音频数据（原始 Opus 压缩数据） |

```js
const offEvent = sdk.onDeviceEvent((event) => {
  if (event.type !== "recordRealtimeData") return;
  // 按到达顺序处理 event.audioData；sequence 为 0-255 循环序号，可用于检查丢包/顺序。
  console.log("audio", event.sequence, event.audioData.length);
});
const result = await sdk.recordRealtimeControl(true);   // 先注册监听再启动
// 停止时调用：await sdk.recordRealtimeControl(false);
// 页面退出或不再使用时：offEvent();
```

先注册监听再启动。操作后的实际录制状态经 `getRecordStatus()` 或 `recordStatus` 事件获取（`realtime` 表示当前是否为实时方式）。实时音频为高频数据，请勿在事件回调中执行耗时操作。

#### 5.2.5 传感器原始数据（定制功能）

| 数据 | 获取方式 |
| --- | --- |
| PPG/ACC/PPG Red/IR | 启动采集后同步历史数据 |
| 睡眠状态 | 设备实时推送 |

设备只保存最近一次约 1 分钟的 PPG 原始数据，无论由定时监测还是手动测量触发，下一次采集都可能覆盖尚未同步的数据。每次采集完成后会触发 `sensorStopped` 设备事件；收到事件后应及时调用 `getSensorHistoryRaw()` 同步并持久化数据。

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

##### 5.2.5.0 PPG 定时监测

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

##### 5.2.5.1 启动与关闭传感器原始数据

采集停止时，通过 `sensorStopped` 事件返回 `reason`：`1` App主动停止、`2` 采集完成、`9` 未佩戴。启动/关闭指令成功不代表采集完成。

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

##### 5.2.5.2 历史原始数据获取

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

##### 5.2.5.3 睡眠状态实时推送

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
| `sleepMode` | `17` 夜睡开始<br>`18` 小睡开始<br>`34` 睡眠结束<br>`1` 深睡<br>`2` 浅睡<br>`3` 清醒<br>`4` REM |

##### 5.2.5.4 PPG 采样率设置与获取

设置或查询 PPG 采样率，单位 Hz，具体可用值需设备固件支持。功能位：`supportPpgSampleRate`。

方法说明：

`setPpgSampleRate(sampleRate: number): Promise<void>`

`getPpgSampleRate(): Promise<number>`

| 参数 | 说明 |
| --- | --- |
| sampleRate | PPG 采样率，单位 Hz |

```js
await sdk.setPpgSampleRate(100);
const sampleRate = await sdk.getPpgSampleRate();
console.log("PPG 采样率:", sampleRate, "Hz");
```

## SDK修订记录

**RW_SDK_V2.0.0_20261120** (2026.11.20)

- 单项检测、综合检测及 PPG 原始数据采集的未佩戴返回码统一为 `9`。
- 优化 iOS 小程序固件升级的发包节奏。

**RW_SDK_V2.0.0_20261116** (2026.11.16)

- 新增震动总开关设置与获取接口 `setVibrationSwitch`/`getVibrationSwitch`（3.2.1.37），功能表新增 `supportVibrationSwitch`
- 新增设备外观颜色设置与获取接口 `setDeviceBodyColor`/`getDeviceBodyColor`（3.2.1.36），功能表新增 `supportDeviceBodyColor`
- 新增设备尺寸设置与获取接口 `setDeviceSize`/`getDeviceSize`（3.2.1.38），功能表新增 `supportDeviceSize`
- 新增等待蓝牙就绪接口 `RingSdk.openAdapter`（3.1.8）
- 新增缓存设备重连接口 `RingSdk.reconnect`（3.1.9）

**RW_SDK_V2.0.0_20261112** (2026.11.12)

- 新增日志回调 `RingSdk.setLogCallback`（3.1.7），可获取蓝牙收发十六进制、连接过程及错误日志，由接入方自行保存或上传；默认关闭

**RW_SDK_V2.0.0_20261105** (2026.11.05)

- 新增实时综合检测接口 `controlCompositeMeasurement` 一次获取心率、HRV、压力、血压、体温、血糖多项数据(3.2.2.1)，功能表新增 `supportCompositeMeasurement`；结束通知携带检测结果码，未佩戴时 `endResult=2`
- 新增字符显示与时长设置接口 `showCustomText`（3.2.1.32），功能表新增 `supportCustomTextDisplay`
- 修复设备信息中客户型号 `customerModel` 读取偏移
- 新增小睡数据支持，睡眠记录新增 `detail.sleepCategory` 区分夜睡与小睡（3.2.2.4.4）

**RW_SDK_V2.0.0_20261028** (2026.10.28)

- 新增PPG采样率设置与获取接口 `setPpgSampleRate`/`getPpgSampleRate`(5.2.5.4)，功能表新增 `supportPpgSampleRate`
- 新增客户型号设置与获取接口 `setCustomerModel`/`getCustomerModel`(3.2.1.34)，功能表新增 `supportCustomerModel`，设备信息新增 `customerModel`
- 新增实时录音控制接口 `recordRealtimeControl` 及实时音频监听(3.2.5.7)
- 新增计数识别开关、状态查询及主动推送(3.2.1.33)，功能表新增 `supportCountControl`
- 扫描结果与设备版本信息新增产品形态 `deviceForm`(3.1.1、3.2.1.3)

**RW_SDK_V2.0.0_20261012** (2026.10.12)

- 添加自定义数字显示接口 `showCustomNumber`(3.2.1.32)
- 添加赞念计数清零接口 `setMuslimCountClean`
- 设备主动推送监听新增 SOS 与连续点击次数通知(3.2.1.21)
- 设备主动推送监听新增 Release(长按后松手)事件，`keyType=1`、`touchType=6`(3.2.1.21)

**RW_SDK_V2.0.0_20260930** (2026.09.30)
- 扫描设备新增广播电量状态 `batteryStatus`(3.1.1)
- 添加自定义震动控制接口 `controlVibration`(3.2.1.31)，功能表添加 `supportVibrationControl`

**RW_SDK_V2.0.0_20260922** (2026.09.22)
- 修正 MAC 地址显示颠倒的问题(3.2.1.1)
- 添加完整单次检测会话 `controlOpen`，完善全天监测可选间隔返回(3.2.2)
- 电量查询与主动推送新增可选充电状态(3.2.1.4)，需固件支持
- 添加公制/英制单位设置与获取接口(3.2.1.28)
- 添加设备身份认证接口(3.2.1.26.4), 功能表添加 `supportDeviceChallenge`
- 添加久坐提醒设置与获取接口(3.2.1.29), 功能表添加 `supportSedentary`
- 添加喝水提醒设置与获取接口(3.2.1.30), 功能表添加 `supportDrink`
- 添加录音功能六接口(3.2.5): 控制/状态/文件列表/下载/删除/格式化, 需固件支持

**RW_SDK_V2.0.0_20260820** (2026.08.20)
- 添加即时屏幕控制功能(3.2.1.27)
- 添加调试、测试用自定义设备时间设置接口 `setDeviceTime`
- 添加授权密码重置功能（3.2.1.26.3）
- 补充OTA型号、版本校验说明(3.2.3.1)

**RW_SDK_V2.0.0_20260807** (2026.08.07)
- 添加设备密码认证功能

**RW_SDK_V2.0.0_20260806** (2026.08.06)
- 优化健康数据与传感器历史数据同步
- Demo 增加 PPG 原始数据采集与历史获取

**RW_SDK_V2.0.0_20260724** (2026.07.24)
- 微信小程序基本功能
