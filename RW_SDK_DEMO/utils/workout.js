const WORKOUT_NAMES = "跑步|跑步机|户外跑步|骑行|游泳|健走|登山|瑜伽|动感单车|篮球|足球|羽毛球|马拉松|室内步行|自由锻炼|田径|体能训练|举重|拳击|跳绳|爬楼梯|滑雪|滑冰|轮滑|室内骑行|呼啦圈|高尔夫|棒球|舞蹈|乒乓球|曲棍球|普拉提|跆拳道|手球|街舞|排球|网球|飞镖|体操|踏步|椭圆机|尊巴|板球|徒步旅行|有氧运动|划船机|橄榄球|仰卧起坐|哑铃|健身操|空手道|击剑|武术|太极拳|飞盘|射箭|骑马|保龄球|冲浪|垒球|壁球|帆船|引体向上|滑板|蹦床|钓鱼|钢管舞|广场舞|爵士舞|芭蕾舞|迪斯科|踢踏舞|现代舞|俯卧撑|滑板车|平板支撑|桌球|攀岩|铁饼|赛马|摔跤|跳高|跳伞|铅球|跳远|标枪|链球|深蹲|压腿|越野自行车|越野摩托车|赛艇|Crossfit|水上自行车|皮划艇|槌球|地板球|泰拳|回力球|网球(双打)|背部训练|水上排球|滑水|登山机|高强度间歇性训练|BODY COMBAT|BODY BALANCE|全身抗阻力锻炼|跆搏|小轮车|拉伸|室内健身|柔韧训练|上肢训练|下肢训练|自由体操|杠铃训练|体能训练|硬拉|波比跳|功能性训练|腰腹训练|桌式足球|打猎|立桨冲浪|皮艇漂流|摩托艇|跑酷|沙滩车|滑翔伞|冰壶|滑雪板|滑雪双板|高山滑雪|越野滑雪|雪地摩托|雪车|雪橇|墙球|冰球|藤球|水球|肚皮舞|交际舞|民族舞|拉丁舞|柔道|踢拳|放风筝|拔河|毽球|卡巴迪|赛车|石子游戏|捉人游戏".split("|");

const WORKOUT_TYPES = WORKOUT_NAMES.map((name, index) => ({
  code: index + 7,
  name,
  symbol: name.slice(0, 1),
}));

function getWorkoutTypeName(code) {
  const value = Number(code);
  const index = value - 7;
  if (WORKOUT_NAMES[index]) return WORKOUT_NAMES[index];
  return Number.isFinite(value) && value > 0 ? `运动 ${value}` : "未知运动";
}

function formatWorkoutDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = Math.floor(value % 60);
  return [hours, minutes, rest].map((item) => String(item).padStart(2, "0")).join(":");
}

function getWorkoutStatusText(status) {
  if (status === 1) return "运动中";
  if (status === 2) return "已继续";
  if (status === 3) return "已暂停";
  return "已结束";
}

module.exports = {
  WORKOUT_TYPES,
  getWorkoutTypeName,
  formatWorkoutDuration,
  getWorkoutStatusText,
};
