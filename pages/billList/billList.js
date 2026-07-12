// pages/billList.js


const globalData = getApp().globalData;

import {
  restrauntAndComGetSalesBills,
  sellerAndBuyerGetAccountBills
} from './../../lib/apiRestraunt'

Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,  
      depFatherId: options.depFatherId,
    })

    var depValue = wx.getStorageSync('depInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        disId: depValue.nxDepartmentDisId,
      })
    }
    
    this._initData();


  },

  _initData(){
    var data = {
      depFatherId: this.data.depFatherId,
      disId: this.data.disId
    }

    restrauntAndComGetSalesBills(data)
      .then(res =>{
        if(res.result.code == 0){
          console.log(res)
          var arr = res.result.data;
          var total = 0;
          for(var i = 0; i < arr.length; i++){
            var num = arr[i].arr.length;
            total = total + num;
          }
          this.setData({
            billArr: res.result.data,
            total: total
          })
        }
      })
 
  },


  openAccountBill(e){
    wx.navigateTo({
      url: '../issuePage/issuePage?billId=' + e.currentTarget.dataset.id 
        + '&depName=' + this.data.depName + '&depFatherId=' + this.data.depFatherId,
    })
  },

  toBack(){
      wx.navigateBack({delta : 1})

  },






})