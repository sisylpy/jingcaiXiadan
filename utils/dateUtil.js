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


module.exports = {
  formatTime: formatTime,
  formatDate: formatDate,
  getArriveDate: getArriveDate,
  getArriveOnlyDate: getArriveOnlyDate,
  getArriveWeeksYear: getArriveWeeksYear,
  getArriveWhatDay: getArriveWhatDay



}
