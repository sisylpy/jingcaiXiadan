const load = require('../../lib/load.js');
import { getOwnedCoupons } from '../../lib/apiRestraunt';

Page({
  data: {
    payArr: [],
    loading: true,
    windowWidth: 0,
    windowHeight: 0,
    navBarHeight: 0,
    statusBarHeight: 0,
    disId: null,
    departmentId: null,
  },

  onLoad(options) {
    var windowInfo = wx.getWindowInfo();
    var globalData = getApp().globalData;
    var depInfo = wx.getStorageSync('depInfo') || {};

    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      disId: options.disId || depInfo.nxDepartmentDisId,
      departmentId: this._resolveGroupDepartmentId(depInfo),
    });
    this._initData();
  },

  onPullDownRefresh() {
    this._initData(true);
  },

  _resolveGroupDepartmentId(depInfo) {
    if (!depInfo) {
      return null;
    }
    if (Number(depInfo.nxDepartmentIsGroupDep) === 1) {
      return depInfo.nxDepartmentId;
    }
    if (depInfo.fatherDepartmentEntity && depInfo.fatherDepartmentEntity.nxDepartmentId) {
      return depInfo.fatherDepartmentEntity.nxDepartmentId;
    }
    if (depInfo.nxDepartmentFatherId && depInfo.nxDepartmentFatherId !== 0) {
      return depInfo.nxDepartmentFatherId;
    }
    return depInfo.nxDepartmentId;
  },

  _initData(silent) {
    if (!this.data.disId || !this.data.departmentId) {
      this.setData({ payArr: [], loading: false });
      wx.showToast({ title: '门店信息缺失', icon: 'none' });
      return;
    }
    if (!silent) {
      load.showLoading('获取优惠券中');
    }
    this.setData({ loading: true });
    getOwnedCoupons({
      distributerId: this.data.disId,
      departmentId: this.data.departmentId,
    }).then(function (res) {
      load.hideLoading();
      wx.stopPullDownRefresh();
      if (res.result.code === 0) {
        var list = (res.result.data || []).map(function (item) {
          return Object.assign({}, item, {
            discountPercentLabel: this._formatDiscountPercent(item.discountPercent),
          });
        }.bind(this));
        this.setData({
          payArr: list,
          loading: false,
        });
      } else {
        this.setData({ payArr: [], loading: false });
        wx.showToast({ title: res.result.msg || '获取优惠券失败', icon: 'none' });
      }
    }.bind(this)).catch(function () {
      load.hideLoading();
      wx.stopPullDownRefresh();
      this.setData({ payArr: [], loading: false });
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
    }.bind(this));
  },

  _formatDiscountPercent(percent) {
    if (percent === null || percent === undefined || percent === '') {
      return '';
    }
    var num = Number(percent);
    if (isNaN(num)) {
      return String(percent);
    }
    if (num > 10) {
      return (num / 10).toFixed(1).replace(/\.0$/, '') + '折';
    }
    return String(num).replace(/\.0$/, '') + '折';
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});
