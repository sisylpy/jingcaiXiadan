
const globalData = getApp().globalData;
var load = require('../../lib/load.js');

import apiUrl from '../../config.js'

import {
  getDepUsersByDepId,
  deleteDepUser,

} from '../../lib/apiRestraunt'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    showOperation: false,
    toOpenMini: false,
    isTishi: false,
    toSharePurchase: false,
  },

  onShow: function () {

    if (this.data.update) {
      this._initData();
      
    }
    // if(this.data.toSharePurchase){
    //   this.setData({
    //     isTishi: true
    //   })
    // }

  },

  /**
   * 生命周期函数--监听页面加载 pages/depUserEdit/depUserEdit
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      imgUrl: 'userImage/say.png',

    })

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
      })
    }
    var depValue = wx.getStorageSync('depInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        subAmount: depValue.nxDepartmentSubAmount,
        disId: depValue.nxDepartmentDisId,
        depName: depValue.nxDepartmentName,
        depId: depValue.nxDepartmentId,
        depFatherId: depValue.nxDepartmentId,
      })
      if(depValue.fatherDepartmentEntity !== null){
        this.setData({
          subAmount: depValue.fatherDepartmentEntity.nxDepartmentSubAmount,
          depName: depValue.fatherDepartmentEntity.nxDepartmentName,
          depId: depValue.fatherDepartmentEntity.nxDepartmentId,
          depFatherId: depValue.fatherDepartmentEntity.nxDepartmentId,
        })
      }
      this._initData();
    }

  },

  

  
  onShareAppMessage: function (options) {
    var shareObj = {
     imageUrl: '', 
   }
   if (options.from == 'button') {
     console.log("depFatherId=0&depId=" + this.data.depId+ '&depName=' + this.data.depName + '&disId=' + this.data.disId)
       if(this.data.subAmount == 0){
        shareObj.title = "注册订货小程序"
        shareObj.path = '/pages/groupUserRegister/groupUserRegister?depFatherId=0&depId=' + this.data.depId+ '&depName=' + this.data.depName + '&disId=' + this.data.disId;
        shareObj.imageUrl = this.data.url +  this.data.imgUrl;
       }
       if(this.data.subAmount > 0){
        shareObj.title = "注册每日订货小程序"
        shareObj.path = '/pages/depUserRegister/depUserRegister?depFatherId=' + this.data.depId+ '&depName=' + this.data.depName + '&disId=' + this.data.disId + '&disName=' + this.data.disName;
        shareObj.imageUrl = this.data.url +  this.data.imgUrl;
       }
     }
   // 返回shareObj
   return shareObj;
 },

  // 初始化数据
  _initData() {
    load.showLoading("获取群用户")
    getDepUsersByDepId(this.data.depInfo.nxDepartmentId).then(res => {
      if (res.result.data) {

        load.hideLoading();
        
        this.setData({
          userArr: res.result.data,
        })

        // 获取页面总高度
        var that = this;
        var query = wx.createSelectorQuery();
        query.select('#mjltest').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight: res[0].height * globalData.rpxR
          })
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        })
      }
    })
  },


  /**
   * 显示蒙版
   * @param {*} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      selectUserId: e.currentTarget.dataset.id,
    })
  },


  /**
   * 关闭蒙版
   */
  hideMask() {
    this.setData({
      showOperation: false,
    })
  },

  /**
   * 删除用户
   */
  delUser() {
    load.showLoading("删除用户")
    deleteDepUser(this.data.selectUserId).then(res => {
      if (res.result.code !== -1) {
        load.hideLoading();
        this._initData();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
        })
      }
    })
  },


  /**
   * 打开修改订货群名称页面
   */
  editGroup() {
    wx.navigateTo({
      url: '../depGroupEdit/depGroupEdit',
    })
  },
  editUser(){
    wx.navigateTo({
      url: '../depUserEdit/depUserEdit',
    })
  },


  toSharePurchase(){
    this.setData({
      toSharePurchase:  true
    })

  },
  
  closeMask(){
    this.setData({
      toOpenMini:  false,
      isTishi: false,
      toSharePurchase: false
    })
  },

  openBillList(){
    console.log(this.data.depInfo.nxDepartmentSettleType);
    if(this.data.depInfo.nxDepartmentSettleType  == 0){
      wx.navigateTo({
        url: '../billList/billList?depFatherId=' + this.data.depFatherId ,
      })
    }
    if(this.data.depInfo.nxDepartmentSettleType  == 1){
      wx.navigateTo({
        url: '../accountList/accountList?depFatherId=' + this.data.depFatherId ,
      })
    }
  },


  toBack(){
      wx.navigateBack({
        delta: 1
      })
  },




  









})