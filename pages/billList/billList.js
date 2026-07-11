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
      
      resId: options.resId,
      comId: options.comId,
    })
    
    this._initData();


  },

  _initData(){
    var data = {
      resFatherId: this.data.resId,
      comId: this.data.comId
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
      url: '../bill/bill?billId=' + e.currentTarget.dataset.id,
    })
  },






})