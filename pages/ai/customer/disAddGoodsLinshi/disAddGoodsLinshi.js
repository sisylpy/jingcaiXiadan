var app = getApp();
var dateUtils = require('../../../../utils/dateUtil');
import {
  saveNxDisLinshiGoods,

} from '../../../../lib/apiRestraunt'

const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

Page({


  onShow() {

  },

  /**
   * 页面的初始数据
   */
  data: {



  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var disInfoValue = wx.getStorageSync('disInfo');
    this.setData({
      disInfo: disInfoValue,
      disId: disInfoValue.nxDistributerId
    })

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      from: options.from,
      goods: {
        nxDgGoodsId: "-1",
        nxDgPullOff: 0,
        nxDgGoodsStatus: 0,
        nxDgBuyingPriceIsGrade: 0,
        nxDgBuyingPrice: "1",
        nxDgBuyingPriceUpdate: dateUtils.getArriveDate(0),
        nxDgDistributerId: this.data.disId,
        nxDgGoodsName: options.goodsName, 
         nxDgGoodsStandardWeight: "-1",
        nxDgGoodsBrand: "-1",
        nxDgGoodsPlace: "-1",
        nxDgGoodsInventoryType: 1,
        nxDgNxGoodsFatherColor: "#20afb8",
        nxDgGoodsFile: 'goodsImage/logo.jpg',
        nxDistributerStandardEntities: []
      },
      fatherName: "临时添加",
      isGrade: 0,
    })

    if(options.standard){
      var data = "goods.nxDgGoodsStandardname";
      this.setData({
       [data]: options.standard,
       canSave: true,
      })
    }else{
      this.setData({
        [data]: "",
        canSave: false,
      })
    }
  },
  

  toGreatGrandGoods() {
    console.log("toGreatGrandGoods")
    wx.navigateTo({
      url: '../../goods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId,
    })
  },


  radioChange(e) {
    console.log(e.detail.value);
    var gradeData = "goods.nxDgBuyingPriceIsGrade"
    this.setData({
      [gradeData]: e.detail.value,
      isGrade: e.detail.value
    })
    this._ifCanSave();
  },

  getBuyingPrice(e) {
    var gradeData = "goods.nxDgBuyingPriceIsGrade";
    var priceData = "goods.nxDgBuyingPrice";
    var priceUpdateData = "goods.nxDgBuyingPriceUpdate";
    var priceOneData = "goods.nxDgBuyingPriceOne";
    var priceOneUpdateData = "goods.nxDgBuyingPriceOneUpdate";
    var priceTwoData = "goods.nxDgBuyingPriceTwo";
    var priceTwoUpdateData = "goods.nxDgBuyingPriceTwoUpdate";
    var priceThreeData = "goods.nxDgBuyingPriceThree";
    var priceThreeUpdateData = "goods.nxDgBuyingPriceThreeUpdate";

    var type = e.currentTarget.dataset.type;
    if (type == 0) {
      this.setData({
        [gradeData]: 0,
        [priceData]: e.detail.value,
        [priceUpdateData]: this.data.upTime,
        [priceOneData]: null,
        [priceTwoData]: null,
        [priceThreeData]: null,
        [priceOneUpdateData]: null,
        [priceTwoUpdateData]: null,
        [priceThreeUpdateData]: null,

      })
    }
    if (type == 1) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceUpdateData]: null,
        [priceOneData]: e.detail.value,
        [priceOneUpdateData]: this.data.upTime,
      })
    }
    if (type == 2) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceTwoData]: e.detail.value,
        [priceTwoUpdateData]: this.data.upTime,
      })
    }
    if (type == 3) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceThreeData]: e.detail.value,
        [priceThreeUpdateData]: this.data.upTime,
      })
    }
    this._ifCanSave();

  },

  getDisGoodsContent(e) {
    var nameData = "goods.nxDgGoodsName";
    var standardData = "goods.nxDgGoodsStandardname";
    var standardWeightData = "goods.nxDgGoodsStandardWeight";
    var brandData = "goods.nxDgGoodsBrand";
    var placeData = "goods.nxDgGoodsPlace";
    var detailData = "goods.nxDgGoodsDetail";


    if (e.currentTarget.dataset.type == 0) {
      this.setData({
        name: e.detail.value,
        [nameData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 1) {
      this.setData({
        standard: e.detail.value,
        [standardData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 2) {
      this.setData({
        [standardWeightData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      this.setData({
        [brandData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 4) {
      this.setData({
        [placeData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 5) {
      this.setData({
        [detailData]: e.detail.value
      })
    }

    this._ifCanSave();


  },

  _ifCanSave() {
    console.log("_ifCanSave")
    if (this.data.isGrade == 0) {
      if (this.data.goods.nxDgGoodsName != null && this.data.goods.nxDgGoodsName.length > 0 && this.data.standard != null && this.data.standard.length > 0 && this.data.fatherName != null && this.data.goods.nxDgBuyingPrice > 0) {
        this.setData({
          canSave: true
        })
      } else {
        this.setData({
          canSave: false
        })
      }
    }
    if (this.data.isGrade == 1) {
      if (this.data.name != null && this.data.standard != null && this.data.fatherName != null && this.data.goods.nxDgBuyingPriceOne > 0 &&
        this.data.goods.nxDgBuyingPriceTwo > 0 && this.data.goods.nxDgBuyingPriceThree > 0) {
        this.setData({
          canSave: true
        })
      } else {
        this.setData({
          canSave: false
        })
      }
    }
  },


  saveDisGoods() {
    if (this.data.canSave) {
      load.showLoading("保存商品")
      saveNxDisLinshiGoods(this.data.goods).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
        
          if(this.data.from == 'resGoods'){

            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            prevPage.setData({
              itemDis: res.result.data,
              goodsId: res.result.data.nxDistributerGoodsId,
              show: true,
              findGoods: true,
              applyStandardName: res.result.data.nxDgGoodsStandardname,
            })
            wx.navigateBack({
              delta: 1,
            })
          }else{
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            prevPage.setData({
              goodsId: res.result.data.nxDistributerGoodsId,
              findGoods: true,
              name: this.data.goods.nxDgGoodsName,
            })
            wx.navigateBack({delta: 1})
    
          }
          

        } else {
         
          wx.showModal({
            title: '保存失败',
            content: '存在相同商品',
            showCancel: false,
            confirmText: "知道了", //默认是“确定”
            confirmColor: 'blac'
            
          })
        }
      })
    } else {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
    }

  },
  
  
  hideMask(){
    this.setData({
      showTishi: false
    })
  },

  orderGoods(e){
    var item = e.currentTarget.dataset.item;
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    prevPage.setData({
      itemDis: item,
      show: true,
      applyStandardName: item.nxDgGoodsStandardname,
    })

    wx.navigateBack({
      delta: 1,
    })
  
  },






  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },









})