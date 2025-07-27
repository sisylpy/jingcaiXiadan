

const globalData = getApp().globalData;

var load = require('../../lib/load.js');


import {
  sellerAndBuyerGetAccountBills,
  

} from '../../lib/apiRestraunt'

Page({

 
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,  
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,    
    })

    var depValue = wx.getStorageSync('depInfo');

    if (depValue) {
      this.setData({
        depInfo: depValue,  
        disId: depValue.nxDepartmentDisId     
      })
      if(this.data.depInfo.nxDepartmentFatherId == 0){
        this.setData({
          depFatherId: this.data.depInfo.nxDepartmentId,
          depName: this.data.depInfo.nxDepartmentName,
        })
      }else{
        this.setData({
          depFatherId: this.data.depInfo.nxDepartmentFatherId,
          depName: this.data.depInfo.nxDepartmentName,
        })         

      }
    }

    this._getAccountBills();
   
  },





 _getAccountBills(){
  var data = {
    disId : this.data.disId,
    depFatherId : this.data.depFatherId,
   }
   load.showLoading("获取账单")
   sellerAndBuyerGetAccountBills(data).then(res => {
    load.hideLoading()
    if(res.result.code == 0){
      var total = 0;
      for(var i = 0; i < res.result.data.arr.length; i++){
        total = total + res.result.data.arr[i].arr.length;
      }
      console.log(res)
      this.setData({
        accountBillArr: res.result.data.arr,
        totalSettle: res.result.data.total,
        totalArr: total
      })
    }else{
      wx.showToast({
        title:  res.result.msg,
        icon: "none"
      })
    }
  })
 },



openAccountBill(e){
  this.setData({
    selAmount: 0,
    selectArr: [],
    total: 0,
  })
  wx.navigateTo({
    url: '../issuePage/issuePage?billId=' + e.currentTarget.dataset.id
    + '&depName=' + this.data.depInfo.nxDepartmentName,
  })
},

toSettleBills(e){
  wx.navigateTo({
    url: '../issuePage/issuePage?billId=' + e.currentTarget.dataset.id 
        + '&depName=' + this.data.depName + '&depFatherId=' + this.data.depFatherId,
  })
},


toBack(){
  wx.navigateBack({
    delta: 1,
  })
}






})