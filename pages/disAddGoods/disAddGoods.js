
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
    
    // 解码URL参数（如果被编码了）
    const goodsName = options.goodsName ? decodeURIComponent(options.goodsName) : options.goodsName;
    
    console.log('=== onLoad 页面参数 ===');
    console.log('原始 options.goodsName:', options.goodsName);
    console.log('解码后 goodsName:', goodsName);
    console.log('disId:', options.disId);
     
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId,
      goods: {
        nxDgGoodsId: "-1",
        nxDgPullOff: 0,
        nxDgGoodsStatus: 0,
        nxDgBuyingPrice: "1",
        nxDgBuyingPriceUpdate: dateUtils.getArriveDate(0),
        nxDgDistributerId: options.disId,
        nxDgGoodsName: goodsName,
        nxDgGoodsStandardname: "",
        nxDgGoodsInventoryType: 1,
        nxDgNxGoodsFatherColor: "#20afb8",
        nxDgGoodsFile: 'goodsImage/logo.jpg',
        nxDistributerStandardEntities: [],
        nxDgGoodsDetail: "",
        nxDgPurchaseAuto: 1,

      },
      fatherName:"临时添加",
    })
  },

  toGreatGrandGoods(){
    console.log("toGreatGrandGoods")
    wx.navigateTo({
      url: '../../goods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId,
    })
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
    if (this.data.goods.nxDgGoodsName != null  && this.data.goods.nxDgGoodsName.length > 0  && this.data.standard != null && this.data.standard.length > 0  && this.data.fatherName != null && this.data.goods.nxDgBuyingPrice > 0) {
      this.setData({
        canSave: true
      })
    }else{
      this.setData({
        canSave: false
      })
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
        // 确保 disId 是数字类型
        var disId = parseInt(this.data.disId) || this.data.disId;
        var standard = this.data.goods.nxDgGoodsStandardname;
        var detail = this.data.goods.nxDgGoodsDetail;
        
        console.log('=== saveDisGoodsWithFile 参数 ===');
        console.log('filePathList:', filePathList);
        console.log('filePathList[0]:', filePathList[0]);
        console.log('userName (原始):', userName);
        console.log('userName (解码):', decodeURIComponent(userName || ''));
        console.log('disId:', disId, '类型:', typeof disId);
        console.log('standard:', standard);
        console.log('detail:', detail);
        
        saveLinshiGoods(filePathList, userName, standard, detail, disId).then(res => {
        load.hideLoading();
        
        console.log('=== saveLinshiGoods 响应 ===');
        console.log('res:', res);
        console.log('res.result:', res.result);
      
       var item = JSON.parse(res.result) ;
       var id = item.nxDistributerGoodsId;
       
       console.log('解析后的 item:', item);
       console.log('商品ID:', id);
   
        if (id > 0 ) {       
          console.log('保存成功，商品ID:', id);
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
          console.log('保存失败，返回ID无效:', id);
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      }).catch(err => {
        console.log('=== saveLinshiGoods 请求异常 ===');
        console.log('错误信息:', err);
        load.hideLoading();
        wx.showToast({
          title: '保存失败，请重试',
          icon: "none"
        })
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