
Page({


  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

   
  },


  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
    return {
      title: '请给我发链接', // 默认是小程序的名称(可以写slogan等)
      path: '/pages/loginWarn/loginWarn',
     
    }
  },










})