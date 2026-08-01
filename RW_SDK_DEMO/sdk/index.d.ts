export interface PowerInfo {
	level: number;
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
export type DeviceEvent = {
	type: "power";
	level: number;
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
export interface OtaUpgradeOptions {
	onProgress?: (progress: number) => void;
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
export declare const SDK_VERSION = "RW_SDK_V2.0.0_20260724";
/** 获取当前 SDK 版本号。 */
export declare function getSDKVersion(): string;
export type RingSdkConnectionStage = "connecting" | "initializing" | "ready";
export type RingSdkErrorStage = "scan" | "connect" | "initialize" | "disconnect";
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
	/** iOS 系统当前保持连接的设备为 true。 */
	systemConnected: boolean;
	[key: string]: unknown;
}
export interface RingSdkScanOptions {
	/** 自动停止搜索的时间，默认 10 秒。 */
	timeoutMs?: number;
	/** 设备列表变化时回调；系统连接设备置顶，其余按 RSSI 从强到弱排列。 */
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
	readonly name = "RingSdkConnectionError";
	readonly errCode?: number;
	readonly detail: string;
	constructor(stage: RingSdkErrorStage, cause: unknown);
}
/**
 * 微信小程序 BLE SDK 高层入口。
 * 调用方只提供微信扫描得到的 deviceId；底层通信通道与初始化均由 SDK 管理。
 */
export declare class RingSdk {
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
	setTime(): Promise<void>;
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
	static connect(deviceId: string, options?: RingSdkConnectOptions): Promise<RingSdk>;
	/** 搜索设备；iOS 系统当前保持连接的设备会一同返回。 */
	static startScan(options?: RingSdkScanOptions): Promise<RingSdkScanSession>;
	/** 主动断开并释放 SDK 持有的微信 BLE 监听。 */
	disconnect(reason?: string): Promise<void>;
	dispose(reason?: string): void;
	/** 监听 SDK 连接状态；订阅后会立即返回当前状态。 */
	onConnectionStateChange(handler: RingSdkConnectionStateHandler): () => void;
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
