
const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');
import {
  getDisLinshiGoods,
} from '../../../../lib/apiDistributer.js'


Page({

  onShow() {
    this._initData()
  },

  /**
   * 页面的初始数据
   */
  data: {
    goodsId: null,
    showImageModal: false,
    currentImage: '',
    currentGoods: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,     
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      disId: options.disId,
      goodsId: options.goodsId,
      url: apiUrl.server,

    
    })

   
   
  },

  _initData() {
    
    load.showLoading("获取商品中")
    getDisLinshiGoods(this.data.disId).
    then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          goodsList: res.result.data,
        })

      } else {
        load.hideLoading();
        wx.showToast({
          title: '获取商品失败',
          icon: 'none'
        })
      }
    })
  },


  toAlias(e){
    wx.setStorageSync('linshiGoods', e.currentTarget.dataset.item)
    wx.navigateTo({
      url: '../ailasGoodsList/ailasGoodsList?name=' + e.currentTarget.dataset.name
       + '&id=' + e.currentTarget.dataset.id + '&type=' + e.currentTarget.dataset.type
       + '&standard=' + e.currentTarget.dataset.standard,
    })
  },

  //跳转客服
  toCustomerServicePages: function () {
    console.log("kefu")
    try {
      wx.openCustomerServiceChat({
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/kfc016b04fed31d2375' //客服ID
        },
        corpId: 'ww9778dea409045fe6', //企业微信ID
        success(res) {}
      })
    } catch (error) {
      showToast("请更新至微信最新版本")
    }
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  // 显示图片弹窗
  shwoIImage: function(e) {
    const goods = e.currentTarget.dataset.goods;
    const imageUrl = this.data.url + goods.nxDgGoodsFileLarge;
    
    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods
    });
  },

  // 隐藏图片弹窗
  hideImageModal: function() {
    this.setData({
      showImageModal: false,
      currentImage: '',
      currentGoods: null
    });
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    // 阻止事件冒泡，防止点击内容区域时关闭弹窗
  },

  // 图片加载成功
  onImageLoad: function() {
    console.log('图片加载成功');
  },

  // 图片加载失败
  onImageError: function() {
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  }
});