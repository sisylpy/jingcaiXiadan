const globalData = getApp().globalData;
import apiUrl from '../../config.js'
var load = require('../../lib/load.js');

import {
  depUserLoginDaoDu,
  cashRegisterLaodu
} from '../../lib/apiRestraunt.js'

Page({



  /**
   * 页面的初始数据
   */
  data: {

    canSave: false,
    avatarUrl: "/images/user.png",
    depName: "",

  },

  onShow() {
    var userInfo = wx.getStorageSync('userInfo');
   if(userInfo){
    //  wx.redirectTo({
    //    url: '../ai/customer/chefOrder/chefOrder',
    //  })
   }

  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: "56",
      machineId: options.machineId
    })

  },



  onChooseAvatar(e) {
    const {
      avatarUrl
    } = e.detail
    this.setData({
      avatarUrl,
    })
    this._canSave();

  },


  _canSave() {
    var url = this.data.avatarUrl;
    if (url !== "/images/user.png" && this.data.depName.length > 0) {
      this.setData({
        canSave: true,
      })
    } else {
      this.setData({
        canSave: false
      })
    }
  },


  getName(e) {
    if (e.detail.value.length > 0) {
      this.setData({
        depName: e.detail.value,
      })
    } else {
      this.setData({
        depName: "",
      })
    }
    this._canSave();

  },

  formSubmit(e) {
    console.log('form发生了submit事件，携带数据为：', e.detail.value)
    var that = this;
    that.setData({
      depName: e.detail.value.input,
    })
    this._canSave();
  },



  save() {

   
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: resUser => {
        wx.login({
          success: (res) => {

            load.showLoading("注册小程序订货客户")
            var depName = this.data.depName;
            var disId = this.data.disId;
            load.showLoading("保存修改内容");
            var that = this;
            console.log(this.data.avatarUrl, depName, res.code, disId);
            cashRegisterLaodu(this.data.avatarUrl, depName, res.code, disId).then((res) => {
            load.hideLoading();
            console.log("res", res);
              if (res.result == '{"code":0}') {
              
                that._login();

              } else {
                load.hideLoading();
                wx.showToast({
                  title: "请直接登陆",
                  icon: 'none'
                })
              }

            })
          },
          fail: (res => {
            wx.showToast({
              title: '请重新操作',
            })
          })
        })
      },
      fail: res => {
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
          duration: 2000
        })
      }
    })



  },


  _login() {
    var that = this;
    wx.login({
      success: (res) => {
        depUserLoginDaoDu(res.code)
          .then((res) => {
            console.log(res.result.data)
            if (res.result.code !== -1) {
              //缓存用户信息
              //缓存用户id
              wx.setStorageSync('userInfo', res.result.data.userInfo);
              wx.setStorageSync('depInfo', res.result.data.depInfo);
              wx.setStorageSync('disInfo', res.result.data.userInfo.departmentEntity.nxDistributerEntity);
              that.setData({
                userInfo: res.result.data.userInfo,
                depInfo: res.result.data.depInfo,
                disInfo: res.result.data.userInfo.departmentEntity.nxDistributerEntity
              })

              wx.navigateTo({
                url: '../getPhone/getPhone?depUserId=' + res.result.data.userInfo.nxDepartmentUserId + '&disId=' + this.data.disId + '&machineId=' + this.data.machineId,
              })
              //跳转到首页
            } else {

              wx.navigateTo({
                url: '../register/register?disId=56',
              })
            }
          })
      }
    })
  },



  toBack() {
    wx.reLaunch({
      url: '../ai/customer/chefOrder/chefOrder',
    })
  },

})