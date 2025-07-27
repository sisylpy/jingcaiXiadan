

var load = require('../../lib/load.js');

const globalData = getApp().globalData;

import {

  getBillApplys
} from '../../lib/apiRestraunt'



Page({

  /**
   * 页面的初始数据
   */
  data: {
    depHasSubs: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      billId: options.billId,
      depName: options.depName,
      depFatherId: options.depFatherId

    })
    var depInfoValue = wx.getStorageSync('depInfo');

    if(depInfoValue){
      this.setData({
        depInfo: depInfoValue,
       
      })
     if(depInfoValue.fatherDepartmentEntity !== null){
       this.setData({
        depHasSubs: depInfoValue.fatherDepartmentEntity.nxDepartmentSubAmount
       })
     }
  
      }
     


    this._getAccountBillApplys();


  
  },

  _getAccountBillApplys(){
   var data  ={
     billId: this.data.billId,
     depFatherId: this.data.depFatherId
   }
    getBillApplys(data).then(res =>{
      console.log(res)
      if(res.result.code == 0){
        this.setData({
          applyArr: res.result.data.arr,
          bill: res.result.data.bill,
        })
      }
    })
  },

 toBack(){
  wx.navigateBack({
    delta: 1,
  })
 },



  






})