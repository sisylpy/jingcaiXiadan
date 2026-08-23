var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../utils/dateUtil');

import apiUrl from '../../../config.js'

import {
  getDepPurGoodsStatistics,
} from '../../../lib/apiRestraunt.js'

Page({

  onShow(){
    if(this.data.update){
      this._getDepStatistics();
    }
  },

  data: {
    showAllGoods: false, // 是否显示所有商品（采购次数）
    showAllSubtotalGoods: false, // 是否显示所有采购金额商品
    showAllPriceGoods: false, // 是否显示所有单价波动商品
    topTimesGoods: [],
    topSubtotalGoods: [],
    topGoodsPrice: [],
  },

  onLoad: function (options) {
    // 从缓存读取饭店用户信息获取depFatherId
    var depUserInfo = wx.getStorageSync('userInfo');
    var depFatherId = options.depFatherId || (depUserInfo && depUserInfo.nxDepartmentFatherId) || -1;
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      depFatherId: depFatherId,
    })
    var myDate = wx.getStorageSync('myDate');
      if(myDate){
          // 如果是自定义日期，传递具体的开始和结束日期
       var dateRange;
       if (myDate.name === 'custom' ) {
         dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
       } else {
         dateRange = dateUtils.getDateRange(myDate.name);
       }
       this.setData({
         startDate: dateRange.startDate,
         stopDate: dateRange.stopDate,
         dateType: myDate.dateType,
         hanzi: myDate.hanzi || dateRange.name,
       })
 
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
          hanzi:  "本月",
        })
      }

 
    this._getDepStatistics();
  },


  // 获取饭店采购统计信息
  _getDepStatistics() {
    var data = {
      depFatherId: this.data.depFatherId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
    };
    load.showLoading("获取数据中");
    getDepPurGoodsStatistics(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("========== 饭店采购分析数据结构 ==========");
          console.log("返回数据的所有字段:", Object.keys(res.result.data));
          console.log("purTotal:", res.result.data.purTotal);
          console.log("topTimesGoods:", res.result.data.topTimesGoods, "长度:", res.result.data.topTimesGoods?.length || 0);
          console.log("topSubtotalGoods:", res.result.data.topSubtotalGoods, "长度:", res.result.data.topSubtotalGoods?.length || 0);
          console.log("topGoodsPrice:", res.result.data.topGoodsPrice, "长度:", res.result.data.topGoodsPrice?.length || 0);
          if (res.result.data.topGoodsPrice && res.result.data.topGoodsPrice.length > 0) {
            const priceItem = res.result.data.topGoodsPrice[0];
            console.log("topGoodsPrice[0]:", priceItem);
          }
          console.log("topSubtotalGoodsSubtotal:", res.result.data.topSubtotalGoodsSubtotal);
          console.log("topSubtotalGoodsPercent:", res.result.data.topSubtotalGoodsPercent);
          console.log("=============================================");
          
          // 确保所有字段都有默认值
          const data = res.result.data || {};
          this.setData({
            purTotal: data.purTotal || "0",
            topTimesGoods: Array.isArray(data.topTimesGoods) ? data.topTimesGoods : [],
            topSubtotalGoods: Array.isArray(data.topSubtotalGoods) ? data.topSubtotalGoods : [],
            topSubtotalGoodsSubtotal: data.topSubtotalGoodsSubtotal || "0",
            topSubtotalGoodsPercent: data.topSubtotalGoodsPercent || "0",
            topGoodsPrice: Array.isArray(data.topGoodsPrice) ? data.topGoodsPrice : [],
            mapEveryDay: data, // 用于判断是否有数据
          });
        } else {
          this.setData({
            mapEveryDay: null
          })
          load.hideLoading();
          load.showToast(res.result.msg || '获取统计信息失败');
        }
      })
      .catch(err => {
        load.hideLoading();
        load.showToast('网络请求失败');
        console.error('统计信息接口失败:', err);
      });
  },



  toDatePageSearch() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  // 获取初始数据
  _getInitData() {
    this._getDepStatistics();
  },


  toGoodsPage(e){
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../../../subPackage-charts/pages/mangement/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id + '&depFatherId=' + this.data.depFatherId,
    })
  },

  // 切换商品列表展开/收起
  toggleGoodsList() {
    this.setData({
      showAllGoods: !this.data.showAllGoods
    });
  },

  // 切换采购金额商品列表展开/收起
  toggleSubtotalGoodsList() {
    this.setData({
      showAllSubtotalGoods: !this.data.showAllSubtotalGoods
    });
  },

  // 切换单价波动商品列表展开/收起
  togglePriceGoodsList() {
    this.setData({
      showAllPriceGoods: !this.data.showAllPriceGoods
    });
  },  

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
  
})