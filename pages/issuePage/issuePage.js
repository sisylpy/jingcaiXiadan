

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
        var bill = res.result.data.bill;
        var feeView = this._buildBillFeeView(bill);
        this.setData({
          applyArr: res.result.data.arr,
          bill: bill,
          showDeliveryFee: feeView.showDeliveryFee,
          showCouponDiscount: feeView.showCouponDiscount,
          billDeliveryFee: feeView.billDeliveryFee,
          billCouponDiscount: feeView.billCouponDiscount,
        })
      }
    })
  },

  _buildBillFeeView(bill) {
    if (!bill) {
      return {
        showDeliveryFee: false,
        showCouponDiscount: false,
        billDeliveryFee: '0.00',
        billCouponDiscount: '0.00',
      };
    }
    var deliveryFee = bill.nxDbDeliveryFee || '0';
    var couponDiscount = bill.nxDbCouponDiscountAmount || '0';
    var deliveryNum = Number(deliveryFee);
    var couponNum = Number(couponDiscount);
    return {
      showDeliveryFee: !isNaN(deliveryNum) && deliveryNum > 0,
      showCouponDiscount: !isNaN(couponNum) && couponNum > 0,
      billDeliveryFee: isNaN(deliveryNum) ? '0.00' : deliveryNum.toFixed(2),
      billCouponDiscount: isNaN(couponNum) ? '0.00' : couponNum.toFixed(2),
    };
  },

 toBack(){
  wx.navigateBack({
    delta: 1,
  })
 },



  






})