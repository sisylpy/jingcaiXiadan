
var app = getApp();

const globalData = getApp().globalData;
import apiUrl from '../../config.js'
var load = require('../../lib/load.js');
var dateUtils = require('../../utils/dateUtil');


import {
  saveNxDisGoods,
  saveLinshiGoods
} from '../../lib/apiRestraunt'


Page({


  onShow(){
  
  },

  /**
   * 页面的初始数据
   */
  data: {
   
    src: "",
    
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
     
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      
      goods: {
        nxDgGoodsId: "-1",
        nxDgPullOff: 0,
        nxDgGoodsStatus: 0,
        nxDgBuyingPriceIsGrade: 0,
        nxDgBuyingPrice: "1",
        nxDgBuyingPriceUpdate: dateUtils.getArriveDate(0),
        nxDgDistributerId: options.disId,
        nxDgGoodsName: options.goodsName,
        nxDgGoodsStandardname: "",
        nxDgGoodsInventoryType: 1,
        nxDgNxGoodsFatherColor: "#20afb8",
        nxDgGoodsFile: 'goodsImage/logo.jpg',
        nxDistributerStandardEntities: [],
        nxDgGoodsDetail: "",
        nxDgPurchaseAuto: 1,

      },
      fatherName:"临时添加",
      isGrade: 0,
    })
  },

  toGreatGrandGoods(){
    console.log("toGreatGrandGoods")
    wx.navigateTo({
      url: '../../goods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId,
    })
  },


  radioChange(e){
    console.log(e.detail.value);
    var gradeData = "goods.nxDgBuyingPriceIsGrade"
      this.setData({    
        [gradeData]: e.detail.value,
        isGrade: e.detail.value
      })
      this._ifCanSave();
    },

    getBuyingPrice(e){
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
      if(type == 0){
        this.setData({
          [gradeData]: 0,
          [priceData]: e.detail.value,
          [priceUpdateData]: this.data.upTime,
          [priceOneData]: null,
          [priceTwoData]: null,
          [priceThreeData]: null,
          [priceOneUpdateData]:null,
          [priceTwoUpdateData]:null,
          [priceThreeUpdateData]:null,

        })
      }
      if(type == 1){
        this.setData({
          [gradeData]: 1,
          [priceData]: null,
          [priceUpdateData]: null,
          [priceOneData]: e.detail.value,
          [priceOneUpdateData]: this.data.upTime,
        })
      }
      if(type == 2){
        this.setData({
          [gradeData]: 1,
          [priceData]: null,
          [priceTwoData]: e.detail.value,
          [priceTwoUpdateData]: this.data.upTime,
        })
      }
      if(type == 3){
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

  _ifCanSave(){
    console.log("_ifCanSave")
    if(this.data.isGrade == 0){
      if (this.data.goods.nxDgGoodsName != null  && this.data.goods.nxDgGoodsName.length > 0  && this.data.standard != null && this.data.standard.length > 0  && this.data.fatherName != null && this.data.goods.nxDgBuyingPrice > 0) {
        this.setData({
          canSave: true
        })
      }else{
        this.setData({
          canSave: false
        })
      }
    }
    if(this.data.isGrade == 1){
      console.log("changeRaidododo")
      if (this.data.name != null && this.data.standard != null  && this.data.fatherName != null  && this.data.goods.nxDgBuyingPriceOne > 0 
        && this.data.goods.nxDgBuyingPriceTwo > 0  && this.data.goods.nxDgBuyingPriceThree > 0 ) {
        this.setData({
          canSave: true
        })
      }else{
        this.setData({
          canSave: false
        })
      }
    }
  },

   //选择图片
   choiceImg: function (e) {
    var _this = this;
    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
          isSelectImg: true,
        })
      },
      fail: function () {

      },
      complete: function () {
      }
    })
  },

  delPic(){
    this.setData({
      src: ""
    })
  
  },

  saveDisGoods(){

    if(this.data.src.length > 0){
      this.saveDisGoodsWithFile();
    }else{
      this.saveDisGoodsName();
    }

  },

  saveDisGoodsWithFile() {
   
    if (this.data.canSave) {
        load.showLoading("保存商品")
      
        var filePathList = this.data.src;
        var userName = this.data.goods.nxDgGoodsName;
        var disId = this.data.disId;
        var standard = this.data.goods.nxDgGoodsStandardname;
        var detail = this.data.goods.nxDgGoodsDetail;
        saveLinshiGoods(filePathList, userName, standard, detail, disId).then(res => {
        load.hideLoading();
      
       var item = JSON.parse(res.result) ;
       var id = item.nxDistributerGoodsId;
   
        if (id > 0 ) {       
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];//上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        item: item,
        itemDis: item,
        show: true,
        isSearching: false,
        applyStandardName:  item.nxDgGoodsStandardname,
        addNewGoods: true
      })
  
          wx.navigateBack({
            delta: 1,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
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

  
  saveDisGoodsName() {
   
    if (this.data.canSave) {
        load.showLoading("保存商品")
        console.log(this.data.goods)
        saveNxDisGoods(this.data.goods).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {  
        var goodsId = "goods.nxDistributerGoodsId";
        this.setData({
          [goodsId]: res.result.data,
        })
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];//上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        item: res.result.data,
        itemDis: res.result.data,
        isSearching: false,
        show: true,
        applyStandardName:  res.result.data.nxDgGoodsStandardname,
        addNewGoods: true
      })
  
          wx.navigateBack({
            delta: 1,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
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


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },




 




})