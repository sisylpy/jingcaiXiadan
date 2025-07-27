var load = require('../../lib/load.js');

const globalData = getApp().globalData;
var dateUtils = require('../../utils/dateUtil');
import apiUrl from '../../config.js'
let windowWidth = 0;
let itemWidth = 0;
let heightArr = [0];

import {
  saveCash,
  updateOrder,
  deleteOrder,
  queryDepDisGoodsByQuickSearch,
  disSaveStandard,
} from '../../lib/apiRestraunt';


Page({
  data: {
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    applySubtotal: "",
    item: {},
    itemDis: null,
    maskHeight: "",
    statusBarHeight: "",
    windowHeight: "",
    windowWidth: "",
    deleteShow: false,
    tab1IndexSearch: 0,
    itemIndexSearch: 0,
    sliderOffsetSearch: 0,
    sliderOffsetsSearch: [],
    sliderLeftSearch: 0,
    tabsSearch: [{
      id: 0,
      amount: 0,
      words: "常订商品"
    }, {
      id: 1,
      amount: 0,
      words: "商品目录"
    }],
    isSearching: true,
    searchResult: false,
    placeHolder: "输入商品名称或拼音字母、首字母",
    itemDis: "",
    depGoods: null,
    orderCount: 0,
    editApply: false,


  },
 onShow(){
  this.setData({
    windowWidth: globalData.windowWidth * globalData.rpxR,
    windowHeight: globalData.windowHeight * globalData.rpxR,
    statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    url: apiUrl.server,
  })
 },

  onLoad: function (options) {
   
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,
        disId: value.nxDuDistributerId,
      })
    } else {
      this.setData({
        userInfo: null,
      })
    }

    var depValue = wx.getStorageSync('orderDepInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.nxDepartmentId,
        disId: depValue.nxDepartmentDisId,
      })
      if (this.data.depInfo.nxDepartmentFatherId == 0) {
        this.setData({
          depFatherId: this.data.depInfo.nxDepartmentId,
        })
      } 
      else {
        this.setData({
          depFatherId: this.data.depInfo.nxDepartmentFatherId,
         
        })

      }
    }
    this.clueOffsetSearch();
  

  },

  showDialogBtn: function (e) {

    console.log("showDialogBtnshowDialogBtn")
    this.setData({
      item: e.currentTarget.dataset.item,
      showInd: true,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth

    })

  },


  
  // !!!!!!!!!!!!!!!!!!!search--------------------------------------
  /**
   * 计算偏移量
   */
  clueOffsetSearch() {
    var that = this;

    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabsSearch.length);
        let tempArr = [];
        for (let i in that.data.tabsSearch) {
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsetsSearch: tempArr,
          sliderOffsetSearch: tempArr[that.data.tab1IndexSearch],
          sliderLeftSearch: globalData.windowWidth / 8 ,
         
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1ClickSearch(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[index],
      tab1IndexSearch: index,
      itemIndexSearch: index,
      showOperation: false
    })
    this.clueOffsetSearch();
  },

  swiperChangeSearch(event) {
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[event.detail.current],
      tab1IndexSearch: event.detail.current,
      itemIndexSearch: event.detail.current,
    })
   
  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
 
  changeStandard: function (e) {

    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    })
    var levelTwoStandard = "";
    if(this.data.itemDis != null){
       levelTwoStandard =  this.data.itemDis.nxDgWillPriceTwoStandard;
    }else{
      levelTwoStandard =  this.data.depGoods.nxDgWillPriceTwoStandard;
    }
  
    if(this.data.applyStandardName == levelTwoStandard){
      this.setData({
        printStandard: levelTwoStandard
      })
    }else{
      this.setData({
        printStandard: this.data.itemDis.nxDgGoodsStandardname
      })
    }
    console.log("thisdaprinfir", this.data.printStandard)
  },



  toEditApply(e) {
    
    console.log("contoEditApplytoEditApply")
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.nxDoPurchaseStatus;
    if (itemStatus  == 4) {
      wx.showModal({
        title: "不能修改",
        content: "订单在配送中，如果有变化，请与采购员联系.",
        showCancel: false,
        confirmText: "知道了",
        success: function (res) {
          if (res.cancel) {
            //点击取消           
          } else if (res.confirm) {}
        }
      })
    } else {
      this.setData({
        placeHolder: this.data.searchString,
        applyItem: e.currentTarget.dataset.order,
        showCash: true,
        goodsName: e.currentTarget.dataset.disgoods.nxDgGoodsName,
        applyStandardName: applyItem.nxDoStandard,
        itemDis: e.currentTarget.dataset.disgoods,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        index: e.currentTarget.dataset.index,
        printStandard: applyItem.nxDoPrintStandard,
        priceLevel: applyItem.nxDoCostPriceLevel

      })

      if (this.data.applyItem.nxDoSubtotal !== null) {
        console.log("eidididiiidid");
        this.setData({
          applySubtotal: applyItem.nxDoSubtotal + "元"
        })

      }

    }
  },


  // 保存订货订单
  confirmCash: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      this._saveOrderCash(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
    })
  },

  _saveOrderCash: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    // var price = "";
   

    // var weight = null;
    // var subtotal = null;
    // var costSubtotal = 0;

    // var costPrice = this.data.itemDis.nxDgBuyingPrice;

    // //是否给weight赋值
    // if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
    //   weight = e.detail.applyNumber;
    //   costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
    //   subtotal = (Number(price) * Number(weight)).toFixed(1);
    //   profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
    //   profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
    // }

    // 是否有部门商品
    if (this.data.depGoods  && this.data.depGoods !== null) {
      depDisGoodsId = this.data.depGoods.nxDepartmentDisGoodsId;
    }
    var userId = -1;
    if(this.data.userInfo !== null){
       userId = this.data.userInfo.nxDepartmentUserId;
    }
    var dg = {
      nxDoOrderUserId: userId,
      nxDoDepDisGoodsId: depDisGoodsId, //
      nxDoDisGoodsFatherId: this.data.itemDis.nxDgDfgGoodsFatherId,
      nxDoDisGoodsGrandId: this.data.itemDis.nxDgDfgGoodsGrandId,
      nxDoDisGoodsId: this.data.itemDis.nxDistributerGoodsId, //1
      nxDoDepartmentId: this.data.depId,
      nxDoDistributerId: this.data.disId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoQuantity: e.detail.applyNumber,
     
      nxDoStandard: e.detail.applyStandardName,
      nxDoRemark: e.detail.applyRemark,
      nxDoIsAgent: 4,
      nxDoArriveDate: arriveDate,
      nxDoArriveWeeksYear: weekYear,
      nxDoArriveOnlyDate: arriveOnlyDate,
      nxDoArriveWhatDay: week,
      nxDoCostPriceUpdate: this.data.itemDis.nxDgBuyingPriceUpdate,
      nxDoCostPrice: this.data.itemDis.nxDgBuyingPrice,
      nxDoPurchaseGoodsId: this.data.itemDis.nxDgPurchaseAuto,
      nxDoNxGoodsId: this.data.itemDis.nxDgNxGoodsId,
      nxDoNxGoodsFatherId: this.data.itemDis.nxDgNxFatherId,
      nxDoGoodsType: this.data.itemDis.nxDgPurchaseAuto,
      nxDoPrintStandard: this.data.itemDis.nxDgGoodsStandardname,
    };

    console.log("savcash",dg);
    var that  = this;
    saveCash(dg).then(res => {
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        
        const newOrderInfo = {
          nxDepartmentDisGoodsId: depDisGoodsId,
          nxDistributerGoodsId: res.result.data.nxDoDisGoodsId,
          nxDepartmentOrdersEntity: res.result.data
        };
        wx.setStorageSync('newOrderInfo', newOrderInfo);
        wx.setStorageSync('needRefreshOrderData', true);
        that.setData({
          isSearching: true,
          searchString: "",
          canSave: false,
          searchResult: false,
         
        })
        that.getSearchStringPlaceHolder();
        this.setData({
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true,
          show: false,
          editApply: false,
          applyItem: "",
          item: "",
          applyNumber: "",
          applyStandardName: "",
          showMyIndependent: false,
          showOperation: false,
          showAdd: false,
        })


      } else {
        wx.showToast({
          title: '订单保存失败',
          icon: 'none'
        })
      }
    })

  },


  // 保存订货订单
  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      this._saveOrder(e);
    }

  var ordercount = this.data.orderCount;
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      itemDis: "",
      applyNumber: "",
      applyStandardName: "",
      orderCount: ordercount + 1
    })
    console.log("this.daordocudnnd", this.data.orderCount)
  },

  showTishi() {
    wx.showModal({
      title: "不能修改",
      content: "订单在配送中，如果有变化，请与采购员联系.",
      showCancel: false,
      confirmText: "知道了",
      success: function (res) {
        if (res.cancel) {
          //点击取消           
        } else if (res.confirm) {}
      }

    })
  },


  // 
  applyGoodsDep(e) {
    console.log("applyGoodsDepapplyGoodsDep")
    var depGoods = e.currentTarget.dataset.depgoods;
    this.setData({
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.disgoods,
      depGoods: e.currentTarget.dataset.depgoods,
      showCash: true,
      applyStandardName: depGoods.nxDdgOrderStandard,
      applyRemark: depGoods.nxDdgOrderRemark,
      priceLevel: e.currentTarget.dataset.level,
      canSave: true,
      placeHolder: this.data.searchString,
    })

  },

  applyGoods(e) {
    console.log(e.currentTarget.dataset);
    var itemDis = e.currentTarget.dataset.item;
    this.setData({
      placeHolder: this.data.searchString,
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.item,
      showCash: true,
      applyStandardName: itemDis.nxDgGoodsStandardname,
      applySubtotal: "0.0元",
      depGoods: e.currentTarget.dataset.depgoods,
      priceLevel: e.currentTarget.dataset.level,
    })
  },

  _saveOrder: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = null;
    var weight = null;
    var subtotal = null;
    var costSubtotal = 0;
    var profitSubtotal = 0;
    var profitScale = 0;
    var costPrice = 0;
 //是否给weight赋值
 if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
  weight = e.detail.applyNumber;
}
    if (this.data.depGoods !== null) {
      price = this.data.depGoods.nxDdgOrderPrice;
      depDisGoodsId = this.data.depGoods.nxDepartmentDisGoodsId;
      if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
        subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
      }

      if (this.data.itemDis.nxDgBuyingPrice !== null) {
       var costPrice = this.data.itemDis.nxDgBuyingPrice;
        costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
        profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
        profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
      }      
    }
    var userId = "";
    if(this.data.userInfo !== null){
      userId  = this.data.userInfo.nxDepartmentUserId;
    }
 
    var dg = {
      nxDoOrderUserId: userId,
      nxDoDepDisGoodsId: depDisGoodsId, //
      nxDoDisGoodsFatherId: this.data.itemDis.nxDgDfgGoodsFatherId,
      nxDoDisGoodsGrandId: this.data.itemDis.nxDgDfgGoodsGrandId,
      nxDoDisGoodsId: this.data.itemDis.nxDistributerGoodsId, //1
      nxDoDepartmentId: this.data.depId,
      nxDoDistributerId: this.data.disId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoQuantity: e.detail.applyNumber,
      nxDoPrice: price,
      nxDoWeight: weight,
      nxDoSubtotal: subtotal,
      nxDoStandard: e.detail.applyStandardName,
      nxDoRemark: e.detail.applyRemark,
      nxDoIsAgent: 2,
      nxDoArriveDate: arriveDate,
      nxDoArriveWeeksYear: weekYear,
      nxDoArriveOnlyDate: arriveOnlyDate,
      nxDoArriveWhatDay: week,
      nxDoCostPriceUpdate: this.data.itemDis.nxDgBuyingPriceUpdate,
      nxDoCostPrice: this.data.itemDis.nxDgBuyingPrice,
      nxDoPurchaseGoodsId: this.data.itemDis.nxDgPurchaseAuto,
      nxDoCostSubtotal: costSubtotal,
      nxDoProfitSubtotal: profitSubtotal,
      nxDoProfitScale: profitScale,
      nxDoNxGoodsId: this.data.itemDis.nxDgNxGoodsId,
      nxDoNxGoodsFatherId: this.data.itemDis.nxDgNxFatherId,
      nxDoGoodsType: this.data.itemDis.nxDgPurchaseAuto,
      nxDoPrintStandard: this.data.itemDis.nxDgGoodsStandardname,
    };
    console.log(dg);
    var that = this;
    saveOrder(dg).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: '保存成功',
        })

        
        // 存储新订单信息到本地存储，供返回上个页面时使用
        const newOrderInfo = {
          nxDepartmentDisGoodsId: depDisGoodsId,
          nxDistributerGoodsId: res.result.data.nxDoDisGoodsId,
          nxDepartmentOrdersEntity: res.result.data
        };
        wx.setStorageSync('newOrderInfo', newOrderInfo);
        wx.setStorageSync('needRefreshOrderData', true);
        that.setData({
          isSearching: true,
          searchString: "",
          canSave: false,
          searchResult: false,
         
        })
        that.getSearchStringPlaceHolder();
      } else {
        wx.showToast({
          title: '订单保存失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.priceLevel
    };

    var that = this;

    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {

          // 新增：本地存储
    const newOrderInfo = {
      nxDepartmentDisGoodsId: res.result.data.nxDoDepDisGoodsId,
      nxDistributerGoodsId: res.result.data.nxDoDisGoodsId,
      nxDepartmentOrdersEntity: res.result.data
    };
    wx.setStorageSync('newOrderInfo', newOrderInfo);
    wx.setStorageSync('needRefreshOrderData', true);
        this.setData({
          isSearching: true,
        })
        load.hideLoading();
        // that.getSearchStringPlaceHolder();
        that.setData({
          isSearching: true,
          searchString: "",
          canSave: false,
          searchResult: false,
         
        })
        that.getSearchStringPlaceHolder();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },


  toAddGoods() {
     this.setData({
       placeHolder: this.data.searchString
     })
    wx.navigateTo({
      url: '../disAddGoods/disAddGoods?goodsName=' + this.data.searchString + "&disId=" + this.data.disId,
    })

  },


  confirmStandard(e) {
   
    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.itemDis.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 删除订货
   */
  delApply() {
    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      showDep: false,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })
  },

  confirmWarn() {
    this.deleteYes()
  },

  closeWarn() {
    this.setData({

      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },




  delSearch() {
    var str = this.data.searchString;
    if (str.length > 0) {
      this.setData({
        searchString: str.slice(0, -1),

      })
      this.getSearchString()
    }

  },


  searchApplyDisGoods(e) {
    var pullOff = e.currentTarget.dataset.pulloff;
    if (pullOff == 1) {
      wx.showToast({
        title: '暂时不能订货',
        icon: 'none'
      })
    } else {
      this.setData({
        showCash: true,
        index: e.currentTarget.dataset.index,
        itemDis: e.currentTarget.dataset.item,
        applyStandardName: e.currentTarget.dataset.item.nxDgGoodsStandardname,
      })
      if (this.data.tab1IndexSearch == 0) {
        this.setData({
          depGoods: e.currentTarget.dataset.depgoods,
        })
      } else {
        this.setData({
          depGoods: e.currentTarget.dataset.item.departmentDisGoodsEntity,
        })
      }
    }
  },


  getString(e){
    console.log("searchindindidnid");
   
      var string = e.detail.value;
      string = string.replace(/\s*/g, "");
      if(string.length > 0){
        this.setData({
          searchString: string
        })
      }else{
        this.setData({
          searchString: ""
        })
      }

  },

  getSearchString(e) {
   

    if (this.data.searchString.length > 0) {
      var data = {
        disId: this.data.depInfo.nxDepartmentDisId,
        searchStr: this.data.searchString,
        depId: this.data.depInfo.nxDepartmentId
      }
      load.showLoading("搜索商品中...")
      queryDepDisGoodsByQuickSearch(data).then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
      
          var depTabCount = "tabsSearch[0].amount";
          var disTabCount = "tabsSearch[1].amount";
          var depGoodsLength = res.result.data.dep.length;

          this.setData({
            disSearchArr: res.result.data.dis,
            depSearchArr: res.result.data.dep,
            searchResult: true,
            [depTabCount]: res.result.data.dep.length,
            [disTabCount]: res.result.data.dis.length,
          })
         if(depGoodsLength == 0){
           this.setData({
             tab1IndexSearch: 1,
             itemIndexSearch: 1
           })
         }else{
          this.setData({
            tab1IndexSearch: 0,
            itemIndexSearch: 0
          })
         }
          
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })

        }
      })
    } else {
     
      load.hideLoading();
      var resCom = "tabsSearch[1].amount";
      var res = "tabsSearch[0].amount";
      that.setData({
        disSearchArr: [],
        depSearchArr: [],
        [resCom]: "0",
        [res]: "0",
        searchResult: false,
        searchString: ""
      })
    }
  },




  deleteYes() {
    this.setData({
      deleteShow: false,
    })
    var that = this;
    
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
      
              // 新增：本地存储
    const newOrderInfo = {
      nxDepartmentDisGoodsId: this.data.applyItem.nxDoDepDisGoodsId,
      nxDistributerGoodsId: this.data.applyItem.nxDoDisGoodsId,
      nxDepartmentOrdersEntity: null
    };
        wx.setStorageSync('newOrderInfo', newOrderInfo);
           this.setData({
             searchString: "",
             applyItem: "",
             editApply: false,
             isSearching: true,
           })
          that.getSearchStringPlaceHolder();
          wx.setStorageSync('needRefreshOrderData', true);
      }
    })
  },

  deleteNo() {
    this.setData({
      applyItem: "",
      deleteShow: false,
    })
  },


  /**
   * 修改配送商品申请
   */
  editApply() {
    var applyItem = this.data.applyItem;
    this.setData({
      showCash: true,
      applyStandardName: applyItem.nxDoStandard,
      itemDis: this.data.applyItem.nxDistributerGoodsEntity,
      editApply: true,
      applyNumber: applyItem.nxDoQuantity,
      applyRemark: applyItem.nxDoRemark,

    })
    if (applyItem.nxDoSubtotal !== null) {
      console.log("eidididiiidid");
      this.setData({
        applySubtotal: applyItem.nxDoSubtotal + "元"
      })

    }
  },


  _cancle() {
    this.setData({
      show: false,
      applyStandardName: "",
      itemDis: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: ""
    })
  },

  // no use


  getSearchStringPlaceHolder() {

    var that = this;
    if (that.data.placeHolder.length > 0 ) {
      var data = {
        disId: this.data.depInfo.nxDepartmentDisId,
        searchStr: this.data.placeHolder,
        depId: this.data.depInfo.nxDepartmentId
      }
      load.showLoading("搜索商品中...")
      queryDepDisGoodsByQuickSearch(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          var depTabCount = "tabsSearch[0].amount";
          var disTabCount = "tabsSearch[1].amount";
          this.setData({
            disSearchArr: res.result.data.dis,
            depSearchArr: res.result.data.dep,
            searchResult: true,
            [depTabCount]: res.result.data.dep.length,
            [disTabCount]: res.result.data.dis.length,
          })
      
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })

        }
      })
    } else {
      var resCom = "tabsSearch[1].amount";
      var res = "tabsSearch[0].amount";
      that.setData({
        [resCom]: 0,
        [res]: 0,
        depSearchArr: [],
        disSearchArr: [],
        searchResult: false,
        isSearching: true,

      })

    }
  },



  hideMask() {
    this.setData({
      showOperation: false,
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  onUnload(){
    if(this.data.orderCount > 0){
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2]; //上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        update: true
      })
    }
  }

})
