export interface PowerInfo {
	level: number;
	voltage?: number;
	charging?: boolean;
}
export interface FirmwareInfo {
	version: string;
	screenType?: number;
	screenWidth?: number;
	screenHeight?: number;
	deviceModel?: string;
	uiVersion?: string;
}
/** 设备功能配置表的只读模型。 */
export interface SupportMenu {
	supportUnitSetting: boolean;
	addressBook: boolean;
	msgNotification: boolean;
	takePhoto: boolean;
	dnd: boolean;
	ledLight: boolean;
	wearDir: boolean;
	videoHid: boolean;
	healthMonitor: boolean;
	setBtName: boolean;
	findDevice: boolean;
	recovery: boolean;
	powerOff: boolean;
	videoHidBook: boolean;
	videoHidMusic: boolean;
	childAppSwitch: boolean;
	pushMsgEnableSwitch: boolean;
	pushMsgSwitchValue: number;
	pushMsgSwitchValue2: number;
	girlCare: boolean;
	alarm: boolean;
	brightScreenTime: boolean;
	brightScreenSleepTime: boolean;
	newSport: boolean;
	appFrontAndBack: boolean;
	rememberSwitch: boolean;
	supportHrReminder: boolean;
	supportBoReminder: boolean;
	raiseBrightScreen: boolean;
	supportFallDetect: boolean;
	supportMotoVibrationLevel: boolean;
	supportAlarmVibrationDuration: boolean;
	supportVibrationInterval: boolean;
	supportCountReminder: boolean;
	supportSensorRawACC: boolean;
	supportSensorRawPPG: boolean;
	supportSensorRawPPGRed: boolean;
	supportSensorRawIR: boolean;
	supportSensorRawSleep: boolean;
	supportMuslimTimeDisplayMode: boolean;
	supportPPGMonitoring: boolean;
	supportTemperatureMonitoring: boolean;
	supportRecording: boolean;
	supportMeasureUnit: boolean;
	supportSedentary: boolean;
	supportDrink: boolean;
	supportDeviceChallenge: boolean;
	supportDevicePasswordAuth: boolean;
	supportScreenControl: boolean;
	activityDataInterval: number;
	healthDataSwitchEnabled: boolean;
	step: boolean;
	hr: boolean;
	bloodPress: boolean;
	sleep: boolean;
	workout: boolean;
	bloodOxy: boolean;
	hrv: boolean;
	pressure: boolean;
	bloodSugar: boolean;
	muslimCountData: boolean;
	temperature: boolean;
}
/**
 * 健康历史数据解析。
 *
 * 设备时间是“本地时间相对 2000-01-01”的秒数，SDK 将其转换为 Unix 毫秒时间戳。
 */
export type HealthDataType = "steps" | "sleep" | "heartRate" | "hrv" | "bloodOxygen" | "bloodPressure" | "stress" | "bloodSugar" | "muslimCount" | "temperature" | "workout";
export interface HealthRecord {
	id: string;
	type: HealthDataType;
	measuredAt: number;
	value: number | string;
	unit: string;
	summary: string;
	detail?: Record<string, unknown>;
}
export interface AlarmConfig {
	alarmId: number;
	enabled: boolean;
	/** 周日至周六，1 表示重复。 */
	repeatDays: number[];
	hour: number;
	minute: number;
	tag?: string;
}
export interface LedLevelInfo {
	enabled: boolean;
	level: number;
}
export interface WearHandInfo {
	rightHand: boolean;
}
export interface VibrationInfo {
	level: number;
	count: number;
}
export interface AlertConfig {
	enabled: boolean;
	upperValue?: number;
	lowerValue?: number;
}
export interface MonitorInfo {
	enabled: boolean;
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
	intervalMinutes: number;
	/** 设备支持的监测间隔列表, 下划线分隔(如 "30_60"); 旧固件为 SDK 默认值。 */
	durationNums?: string;
}
/** 久坐/喝水提醒读取结果： weekdays 为重复日 bit0=周日…bit6=周六(设置帧固定每天)。 */
export interface ReminderInfo {
	enabled: boolean;
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
	intervalMinutes: number;
	weekdays: number[];
}
/** 录音状态(对齐 Android RecordStatusBean; 协议 ≥20 字节, 容量单位字节)。 */
export interface RecordStatus {
	recording: boolean;
	/** 本次录音开始时间(仅录制中有值, 毫秒); 0=未知。 */
	startTime: number;
	/** 本次已录时长(仅录制中有值, 秒)。 */
	duration: number;
	totalCapacity: number;
	remainingCapacity: number;
}
/** 录音文件列表项(fileId/fileSize/duration 各 4 字节大端, 时间为 2000 纪元大端)。 */
export interface RecordFileItem {
	fileId: number;
	fileSize: number;
	/** 录音时长(秒)。 */
	duration: number;
	/** 录制时间(毫秒)。 */
	timestamp: number;
}
/** 录音文件元信息(传输帧携带, 对齐 Android RecordFileTransferBean 只读部分)。 */
export interface RecordTransferMeta {
	fileType: number;
	/** 录音时长(秒)。 */
	duration: number;
	/** 录制时间(毫秒)。 */
	timestamp: number;
	fileId: number;
	format: number;
	fileSize: number;
}
export interface DndInfo {
	enabled: boolean;
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
}
export interface BackLightInfo extends MonitorInfo {
	seconds: number;
	supportedDurations: number[];
}
export interface WorkoutState {
	sportType: number;
	status: number;
	isRunning: boolean;
}
interface WorkoutRealtimeData {
	activityTime: number;
	steps: number;
	distance: number;
	calorie: number;
	heartRate: number;
}
export interface WorkoutReport {
	startTime: number;
	endTime: number;
	exerciseTime: number;
	workModel: number;
	step: number;
	distance: number;
	calorie: number;
	speed: number;
	pace: number;
	averageHeartRate: number;
	maxHeartRate: number;
	minHeartRate: number;
	viewType: number;
	cadence: number;
	maxCadence: number;
	minCadence: number;
	maxPace: number;
	minPace: number;
	heartRates: number[];
	pacePerKmList: number[];
}
interface AccRawItem {
	x: number;
	y: number;
	z: number;
}
export interface SensorHistoryRawRecord {
	type: 1 | 2 | 3 | 4;
	sequence: number;
	ppgDataList?: number[];
	accDataList?: AccRawItem[];
	ppgRedDataList?: number[];
	irDataList?: number[];
}
interface SleepRawItem {
	timestamp: number;
	sleepMode: number;
}
type SensorRawData = {
	type: 1;
	ppgDataList: number[];
} | {
	type: 2;
	accDataList: AccRawItem[];
} | {
	type: 3;
	ppgRedDataList: number[];
} | {
	type: 4;
	irDataList: number[];
} | {
	type: 5;
	sleepDataList: SleepRawItem[];
};
export type DeviceEvent = ({
	type: "power";
} & PowerInfo) | {
	type: "recordStatus";
	status: RecordStatus;
} | {
	type: "muslimCount";
	count: number;
	timestamp: number;
} | {
	type: "camera";
	action: number;
} | {
	type: "touch";
	keyType: number;
	touchType: number;
} | {
	type: "health";
	healthType: HealthDataType;
	records: HealthRecord[];
} | {
	type: "healthStatus";
	rawStatus: number;
	status: number;
	completed: boolean;
	measurementType?: number;
} | {
	type: "healthAlert";
	alertType: number;
	value: number;
} | {
	type: "workoutState";
	state: WorkoutState;
} | {
	type: "workoutData";
	data: WorkoutRealtimeData;
} | {
	type: "sensorStopped";
	reason: number;
} | {
	type: "sensorRaw";
	data: SensorRawData;
} | {
	type: "factoryTest";
	testMode: number;
	result: number;
	completed: boolean;
};
export interface MeasurementSessionResult {
	/** 检测类型(HealthMeasurementType 低字节)。 */
	healthType: number;
	success: boolean;
	/** device=设备结束帧; timeout=70s超时; error=开始指令失败。 */
	reason: "device" | "timeout" | "error";
}
export interface MeasurementSessionHandlers {
	onStarted?: () => void;
	onData?: (records: HealthRecord[]) => void;
	onFinished: (result: MeasurementSessionResult) => void;
}
/** 设备基础设置使用的数据模型。 */
export interface MonitorSchedule {
	enabled: boolean;
	startHour?: number;
	startMinute?: number;
	endHour?: number;
	endMinute?: number;
	intervalMinutes: number;
}
export interface TimeRangeSwitch {
	enabled: boolean;
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
}
export interface UserProfile {
	/** 0=公制，1=英制。 */
	measureUnit: number;
	/** 1=男，其它值=女。 */
	gender: number;
	age: number;
	height: number;
	weight: number;
}
export interface OtaUpgradeOptions {
	onProgress?: (progress: number) => void;
}
/** 录音文件下载结果: 元信息 + 拼接完整的原始录音字节(业务端自行保存/转码)。 */
export interface RecordTransferResult extends RecordTransferMeta {
	data: Uint8Array;
}
export type MonitoringType = "heartRate" | "bloodOxygen" | "hrv" | "stress" | "bloodSugar" | "bloodPressure" | "temperature" | "ppg";
export interface RingSdkOptions {
	/** 单条业务命令超时，默认 5000ms。 */
	timeoutMs?: number;
	/** 单条业务命令失败后的重试次数，默认 2。 */
	maxRetry?: number;
	/** 单帧最大协议负载，通常无需设置。 */
	maxPayloadLength?: number;
	/** 可选诊断输出；默认关闭，不影响正式集成。 */
	debug?: boolean | ((event: string, detail: unknown) => void);
}
export interface InitializeOptions {
	syncTimeZone?: boolean;
	syncTime?: boolean;
	/** 设备平台标识，默认 2，通常无需设置。 */
	platformCode?: number;
}
export interface HealthSyncProgress {
	current: number;
	total: number;
	percent: number;
	type: HealthDataType;
}
export interface SyncAllHealthOptions {
	onProgress?: (progress: HealthSyncProgress) => void;
}
export interface SyncAllHealthResult {
	records: Partial<Record<HealthDataType, HealthRecord[]>>;
	errors: Partial<Record<HealthDataType, string>>;
}
export type DeviceEventHandler = (event: DeviceEvent) => void;
export declare const SDK_VERSION: string;
/** 获取当前 SDK 版本号。 */
export declare function getSDKVersion(): string;
export type RingSdkConnectionStage = "connecting" | "initializing" | "ready";
export type RingSdkErrorStage = "scan" | "connect" | "initialize" | "disconnect";
export type RingSdkConnectionFailureReason = "PASSWORD_AUTH_FAILED";
export interface RingSdkConnectionState {
	deviceId: string;
	connected: boolean;
}
export type RingSdkConnectionStateHandler = (state: RingSdkConnectionState) => void;
export interface RingSdkConnectOptions extends RingSdkOptions {
	/** 微信建立 BLE 连接的超时时间，默认 12 秒。 */
	connectTimeoutMs?: number;
	/** 期望协商的 ATT MTU，默认 185；协商失败会自动使用安全值继续。 */
	preferredMtu?: number;
	/** 连接后的初始化选项。 */
	initializeOptions?: InitializeOptions;
	/** 可选连接阶段回调，便于页面展示连接进度。 */
	onStage?: (stage: RingSdkConnectionStage) => void;
	/** 连接准备完成或设备断开时回调。 */
	onConnectionStateChange?: RingSdkConnectionStateHandler;
}
export interface RingSdkScanDevice {
	deviceId: string;
	name?: string;
	localName?: string;
	RSSI: number;
	macAddress: string;
	/** 可确认属于当前SDK构建版本的系统连接设备为true。 */
	systemConnected: boolean;
	[key: string]: unknown;
}
export interface RingSdkScanOptions {
	/** 自动停止搜索的时间，默认 10 秒。 */
	timeoutMs?: number;
	/** 设备列表变化时回调；可验证的系统连接设备置顶，其余按RSSI从强到弱排列。 */
	onDevices?: (devices: RingSdkScanDevice[]) => void;
	/** 可选诊断回调；用于真机排查搜索与系统连接设备查询。 */
	debug?: (event: string, detail: unknown) => void;
}
export interface RingSdkScanSession {
	/** 搜索自动结束或主动停止后返回最终列表。 */
	readonly finished: Promise<RingSdkScanDevice[]>;
	/** 获取当前已发现设备快照。 */
	getDevices(): RingSdkScanDevice[];
	/** 主动停止搜索。 */
	stop(): Promise<RingSdkScanDevice[]>;
}
export declare class RingSdkConnectionError extends Error {
	readonly stage: RingSdkErrorStage;
	readonly reason?: RingSdkConnectionFailureReason | undefined;
	readonly name = "RingSdkConnectionError";
	readonly errCode?: number;
	readonly detail: string;
	constructor(stage: RingSdkErrorStage, cause: unknown, reason?: RingSdkConnectionFailureReason | undefined);
}
/**
 * 微信小程序 BLE SDK 高层入口。
 * 调用方只提供微信扫描得到的 deviceId；底层通信通道与初始化均由 SDK 管理。
 */
export declare class RingSdk {
	/** 新增会话接口；原 setHealthMeasurement/onDeviceEvent 保持不变。 */
	controlOpen(type: 0 | 1, healthType: number, handlers: MeasurementSessionHandlers): void;
	/** 注销测量监听，不发送停止指令。 */
	takeHealthMeasurement(): void;
	supportMenu: SupportMenu | null;
	getSDKVersion(): string;
	upgradeFirmware(firmware: Uint8Array, options: OtaUpgradeOptions): Promise<void>;
	/**
	 * 完成设备会话、时间信息和功能配置初始化。
	 * 业务调用应等待此 Promise 完成。
	 */
	initialize(options?: InitializeOptions): Promise<SupportMenu>;
	readPower(): Promise<PowerInfo>;
	readFirmwareVersion(): Promise<FirmwareInfo | null>;
	readFunctionList(): Promise<SupportMenu | null>;
	/**
	 * 修改设备密码。正常解绑前应先修改为0000，并在成功后再清除本地绑定。
	 * 注：RingSdk 子类会在成功后同步自动认证密码，保证下次重连用新密码认证。
	 */
	modifyDevicePwd(password?: string | null): Promise<void>;
	setTime(): Promise<void>;
	/**
	 * 设置自定义设备时间，仅建议用于调试或演示。SDK每次连接初始化时仍会自动同步手机时间。
	 * @param targetTime Unix 毫秒时间戳，按手机当前时区转换为设备显示时间。
	 */
	setDeviceTime(targetTime: number): Promise<void>;
	readBleAddress(): Promise<string>;
	setUserProfile(profile: UserProfile): Promise<void>;
	setMonitoring(type: MonitoringType, schedule: MonitorSchedule): Promise<void>;
	getMonitoring(type: MonitoringType): Promise<MonitorInfo>;
	setDnd(range: TimeRangeSwitch): Promise<void>;
	getDnd(): Promise<DndInfo>;
	setFallDetect(enabled: boolean): Promise<void>;
	getFallDetect(): Promise<boolean>;
	setCountReminderInterval(minutes: number): Promise<void>;
	getCountReminderInterval(): Promise<number>;
	setRaiseToWake(range: TimeRangeSwitch): Promise<void>;
	getRaiseToWake(): Promise<MonitorInfo>;
	setScreenSleep(range: TimeRangeSwitch): Promise<void>;
	setBrightDuration(seconds: number): Promise<void>;
	getBackLight(): Promise<BackLightInfo>;
	setRingName(name: string): Promise<void>;
	getRingName(): Promise<string>;
	setLedLevel(enabled: boolean, level: number): Promise<void>;
	getLedLevel(): Promise<LedLevelInfo>;
	/** false=左手，true=右手。 */
	setWearHand(rightHand: boolean): Promise<void>;
	getWearHand(): Promise<WearHandInfo>;
	setVibrationCount(level: number, count: number): Promise<void>;
	getVibrationCount(): Promise<VibrationInfo>;
	setHourSystem(type: 0 | 1): Promise<void>;
	setHeartRateAlert(enabled: boolean, upperValue: number, lowerValue: number): Promise<void>;
	getHeartRateAlert(): Promise<AlertConfig>;
	setBloodOxygenAlert(enabled: boolean, lowerValue: number): Promise<void>;
	getBloodOxygenAlert(): Promise<AlertConfig>;
	setHealthMeasurement(healthType: number, enabled: boolean): Promise<void>;
	/** 公制/英制单位(协议2.2.28)：0=公制, 1=英制。 */
	setMeasureUnit(unit: 0 | 1): Promise<void>;
	readMeasureUnit(): Promise<number>;
	/** 久坐提醒(协议2.2.18)：需功能表 supportSedentary。 */
	setSedentaryRemind(config: MonitorSchedule): Promise<void>;
	readSedentaryRemind(): Promise<ReminderInfo>;
	/** 喝水提醒(协议2.2.19)：需功能表 supportDrink。 */
	setDrinkRemind(config: MonitorSchedule): Promise<void>;
	readDrinkRemind(): Promise<ReminderInfo>;
	/**
	 * 设备身份认证(协议2.1.5)：透传云端挑战值，返回设备 HMAC-SHA256 应答(64位hex)。
	 * 挑战值须为64个hex字符(32字节，兼容分隔符)；应答校验由业务与云端完成。
	 */
	deviceChallenge(challengeHex: string): Promise<string>;
	/** 开始/停止录音。返回设备应答状态(0=成功, 非 0 失败; 纯 ACK 时为 undefined); 实际录制状态经 getRecordStatus 或 recordStatus 推送获取。需功能表 supportRecording。 */
	recordControl(start: boolean): Promise<number | undefined>;
	/** 查询录音状态与录音区容量(总容量/剩余容量, 字节)。 */
	getRecordStatus(): Promise<RecordStatus>;
	/** 获取录音文件列表(设备分页推送, SDK 循环索取并聚合为完整列表; 并发调用共享同一次读取)。 */
	getRecordFileList(): Promise<RecordFileItem[]>;
	/**
	 * 按文件 ID 下载录音文件, 返回拼接完整的原始录音字节——SDK 不做本地保存与格式
	 * 转换(不封 Ogg、不转 WAV), 由业务端自行处理。进度经 handlers.onProgress 汇报。
	 *
	 * 协议为窗口式连续读取: 设备每收到一次 READ 推送至多 20 帧数据, SDK 校验
	 * fileId/dataOffset/fileSize 连续性后自动应答索取下一窗口; 收满后设备以短帧
	 * 收尾。传输中重复调用会被拒绝; 断连、校验失败或 30 秒无进展经 reject 收尾。
	 */
	transferRecordFile(fileId: number, handlers?: {
		onProgress?: (received: number, meta: RecordTransferMeta) => void;
	}): Promise<RecordTransferResult>;
	/** 删除指定录音文件(fileId 4 字节大端)。返回设备应答状态(0=成功, 非 0 失败; 纯 ACK 时为 undefined)。 */
	deleteRecordFile(fileId: number): Promise<number | undefined>;
	/** 格式化录音存储区(清空全部录音文件)。返回设备应答状态(0=成功, 非 0 失败; 纯 ACK 时为 undefined)。 */
	formatRecordStorage(): Promise<number | undefined>;
	findDevice(): Promise<void>;
	controlCamera(type: 0 | 1 | 2): Promise<void>;
	setPowerControl(type: number): Promise<void>;
	setAppState(state: 1 | 2): Promise<void>;
	getAlarms(): Promise<AlarmConfig[]>;
	setAlarms(alarms: AlarmConfig[]): Promise<void>;
	deleteAllAlarms(): Promise<void>;
	setRememberEnabled(enabled: boolean): Promise<void>;
	getRememberEnabled(): Promise<boolean>;
	setMuslimTimeDisplayMode(mode: 1 | 2 | 3): Promise<void>;
	getMuslimTimeDisplayMode(): Promise<number>;
	setAlarmVibrationDuration(count: number): Promise<void>;
	getAlarmVibrationDuration(): Promise<number>;
	setVibrationInterval(intervalMs: number): Promise<void>;
	getVibrationInterval(): Promise<number>;
	setScreenOn(isOn: boolean): Promise<void>;
	getScreenOn(): Promise<boolean>;
	startFactoryTest(testMode: number): Promise<void>;
	getWorkoutState(): Promise<WorkoutState>;
	controlWorkout(sportType: number, status: 1 | 2 | 3 | 4): Promise<void>;
	setWorkoutRealtimePush(enabled: boolean): Promise<void>;
	getWorkoutReports(): Promise<WorkoutReport[]>;
	controlSensorRaw(outputType: 1 | 2, sensorType: number): Promise<void>;
	getSensorHistoryRaw(): Promise<SensorHistoryRawRecord[]>;
	onDeviceEvent(handler: DeviceEventHandler): () => void;
	/**
	 * 按功能配置表同步全部受支持的常规健康数据。
	 */
	syncAllHealthData(options?: SyncAllHealthOptions): Promise<SyncAllHealthResult>;
	readonly deviceId: string;
	/** 设置后续连接自动认证使用的密码；空值按默认密码0000处理。 */
	static prepareAutoPassword(password?: string | null): void;
	/** 授权下一次连接重置设备密码；调用方应先在业务层完成重置资格校验。 */
	static preparePasswordReset(targetPassword?: string | null): void;
	static connect(deviceId: string, options?: RingSdkConnectOptions): Promise<RingSdk>;
	/** 搜索当前构建品牌的设备；可确认品牌的iOS系统连接设备会一同返回。 */
	static startScan(options?: RingSdkScanOptions): Promise<RingSdkScanSession>;
	/** 主动断开并释放 SDK 持有的微信 BLE 监听。 */
	disconnect(reason?: string): Promise<void>;
	dispose(reason?: string): void;
	/** 监听 SDK 连接状态；订阅后会立即返回当前状态。 */
	onConnectionStateChange(handler: RingSdkConnectionStateHandler): () => void;
	/** 修改设备密码；成功后同步自动认证密码，保证下次重连用新密码认证（对齐iOS）。 */
	modifyDevicePwd(password?: string | null): Promise<void>;
}
export declare const HealthMeasurementType: {
	readonly HEART_RATE: 3;
	readonly BLOOD_PRESSURE: 4;
	readonly TEMPERATURE: 8;
	readonly BLOOD_OXYGEN: 9;
	readonly HRV: 10;
	readonly STRESS: 13;
	readonly BLOOD_SUGAR: 16;
};
export declare const WorkoutControlStatus: {
	readonly BEGIN: 1;
	readonly CONTINUE: 2;
	readonly PAUSE: 3;
	readonly FINISH: 4;
};
export declare const DevicePowerControl: {
	readonly POWER_OFF: 1;
	readonly FACTORY_RESET: 2;
};
export declare const SensorRawControl: {
	readonly START: 1;
	readonly STOP: 2;
};

export {};
