const globalData = getApp().globalData;
import apiUrl from '../../config.js'
var load = require('../../lib/load.js');

import {

  saveNewCustomerLaoDu,
  deleteDepUserWithDep
} from '../../lib/apiRestraunt.js'

Page({

  /**
   * 页面的初始数据
   */
  data: {



  },

  onShow: function () {



  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId || '',
      depUserId: options.depUserId || '',
      machineId: options.machineId || '',
      openId: wx.getStorageSync('openId') || ''
    })   


  },

  //登录按钮
  getPhone(e) {
    console.log(e);
    if (e.detail.errMsg == "getPhoneNumber:ok" && e.detail.code) {
      load.showLoading("保存修改内容")
      var data = {
        phoneCode: e.detail.code,
        openId: this.data.openId,
        machineId: this.data.machineId,
        depUserId: this.data.depUserId
      }
      console.log(data);
      saveNewCustomerLaoDu(data).then((res) => {
        console.log(res.result);
        load.hideLoading();
        if (res.result.code == 0) {
          wx.setStorageSync('userInfo', res.result.data);
          wx.redirectTo({
            url: '/pages/ai/customer/chefOrder/chefOrder',
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '操作失败',
            icon: 'none'
          })
        }
      }).catch((err) => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        })
      })
    } else {
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      });
    }
  },


  toBack() {
    deleteDepUserWithDep(this.data.depUserId).then(res =>{
      if(res.result.code == 0){
        wx.removeStorageSync('depInfo');
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('disInfo');
        wx.redirectTo({
          url: '/pages/index/index',
        })
      } else {
        wx.showToast({
          title: res.result.msg || '操作失败',
          icon: 'none'
        });
      }
    }).catch((err) => {
      wx.showToast({
        title: '网络异常，请重试',
        icon: 'none'
      })
    })
   
  },





})