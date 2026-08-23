function formatTime() {
  var dateTime = new Date();
  var year = dateTime.getFullYear()
  var month = dateTime.getMonth() + 1
  var day = dateTime.getDate()
  if(day < 10){
    day = '0' + day;
  }
  if(month < 10){
    month = '0' + month;
  }
  var hour = dateTime.getHours()
  var minute = dateTime.getMinutes()
  var second = dateTime.getSeconds();
  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatDate() {
  var dateDate = new Date();
  var year = dateDate.getFullYear()
  var month = dateDate.getMonth() + 1
  var day = dateDate.getDate()
  if(day < 10){
    day = '0' + day;
  }
  if(month < 10){
    month = '0' + month;
  }
  
  return year+"-"+month +"-"+ day
}

function getArriveDate( which) {
  var dateArrive = new Date();
  dateArrive.setTime(dateArrive.getTime()+ which*1 * 24*60*60*1000);
  var date = dateArrive.getDate();
  if(date < 10){
    date = '0' + date;
  }
  var month = dateArrive.getMonth()+1;
  if(month < 10){
    month = '0' + month;
  }
   var s3 = dateArrive.getFullYear()+"-" + month + "-" + date
  return s3;
}


function getArriveOnlyDate(which) {
  var dateOnly = new Date();
  dateOnly.setTime(dateOnly.getTime()+ which *1* 24*60*60*1000);
  var date = dateOnly.getDate();
  if(date < 10){
    date = '0' + date;
  }

  var month = dateOnly.getMonth()+1;
  if(month < 10){
    month = '0' + month;
  }
   var s3 = month + "-" + date
  return s3;
}

function getArriveWeeksYear(which) {
  /*
    date1是当前日期
    date2是当年第一天
    d是当前日期是今年第多少天
    用d + 当前年的第一天的周差距的和在除以7就是本年第几周
    */
   var dateFull = new Date();
   var a = dateFull.getFullYear()
   var b = dateFull.getMonth() + 1
   var c = dateFull.getDate() + which * 1
   var date1 = new Date(a, parseInt(b) - 1, c), date2 = new Date(a, 0, 1),
   d = Math.round((date1.valueOf() - date2.valueOf()) / 86400000);
   return Math.ceil(
   (d + ((date2.getDay() + 1) - 1)) / 7
   );
}
//
function getArriveWhatDay(which) { 
  var dateDay = new Date();
  console.log(dateDay)
  console.log("what the dateDay")
  var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = dateDay.getDay() +  which * 1;
    if(day == 7){
     var  week = "星期日"
    }else{
      var week = weeks[day];
    }
     console.log(week)
     return week;
}


function getFirstDateInMonth(){
  var dateFull = new Date();
  var a = dateFull.getFullYear();
  var b = dateFull.getMonth() + 1;
  if(b < 10){
    b = "0" + b;
  }
  return a + "-" + b + "-" + "01";
}

function getDateRange(rangeType, customStartDate, customEndDate) {
  if (!rangeType) { return { startDate: '', stopDate: '' }; }
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth() + 1;
  function fmt(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  var startDate = '', stopDate = '';
  switch (rangeType) {
    case 'today': startDate = stopDate = fmt(today); break;
    case 'yesterday': var yest = new Date(today); yest.setDate(today.getDate() - 1); startDate = stopDate = fmt(yest); break;
    case 'thisWeek': var dow = today.getDay(), mon = new Date(today); mon.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow)); startDate = fmt(mon); var sun = new Date(today); sun.setDate(today.getDate() + (dow === 0 ? 0 : 7 - dow)); stopDate = fmt(sun); break;
    case 'lastWeek': var dow2 = today.getDay(), lm = new Date(today); lm.setDate(today.getDate() + (dow2 === 0 ? -13 : -6 - dow2)); startDate = fmt(lm); var ls = new Date(lm); ls.setDate(lm.getDate() + 6); stopDate = fmt(ls); break;
    case 'lastSevenDays': var s = new Date(today); s.setDate(today.getDate() - 7); startDate = fmt(s); var e = new Date(today); e.setDate(today.getDate() - 1); stopDate = fmt(e); break;
    case 'thisMonth': startDate = fmt(new Date(year, month - 1, 1)); stopDate = fmt(today); break;
    case 'lastMonth': startDate = fmt(new Date(year, month - 2, 1)); stopDate = fmt(new Date(year, month - 1, 0)); break;
    case 'lastThirtyDays': var lm2 = new Date(today); lm2.setMonth(lm2.getMonth() - 1); startDate = fmt(lm2); stopDate = fmt(today); break;
    case 'custom': case 'customer': if (customStartDate && customEndDate) { startDate = customStartDate; stopDate = customEndDate; } break;
    default: break;
  }
  var names = { today: '今天', yesterday: '昨天', thisWeek: '本周', lastWeek: '上周', lastSevenDays: '过去7天', thisMonth: '本月', lastMonth: '上月', lastThirtyDays: '过去30天', custom: '自定义', customer: '自定义' };
  return { startDate: startDate, stopDate: stopDate, name: names[rangeType] || rangeType };
}

module.exports = {
  formatTime: formatTime,
  formatDate: formatDate,
  getArriveDate: getArriveDate,
  getArriveOnlyDate: getArriveOnlyDate,
  getArriveWeeksYear: getArriveWeeksYear,
  getArriveWhatDay: getArriveWhatDay,
  getFirstDateInMonth: getFirstDateInMonth,
  getDateRange: getDateRange
}
