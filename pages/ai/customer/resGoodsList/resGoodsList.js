const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import {
  queryDisGoodsByQuickSearchWithDepId,
  disSaveStandard,
  disDeleteStandard,
}
from '../../../../lib/apiRestraunt'

import {
  saveOrder,
  updateOrder,
  deleteOrder,
  saveCash,
  saveOrderBefore,
  saveCashBefore,
} from '../../../../lib/apiRestraunt.js'


import {
  downDisGoods,
} from '../../../../lib/apiRestraunt'


Page({

  /**
   * 页面的初始数据
   */
  data: {

    fatherId: null,
    showArr: [],
    toSearch: true,
    bottom: 0,
    keyBordHeight: 0,
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    item: "",
    maskHeight: "",
    scrollViewTop: 0,
    searchStr: "",
    item: null,
    strArr: [],
    level: "1",

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {


   
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId,
      depFatherId: options.depFatherId,
      depId: options.depId,
      depName: options.depName,
      redFatherId: options.resFatherId,
      gbDepFatherId: options.gbDepFatherId,
      depSettleType: options.depSettleType,
      beforeId: options.beforeId
    })

  },



  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })

  },

  /**
   * 删除申请
   */
  deleteApply() {
    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      // deleteShow: true,
      // show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperation: false,
    })
  },

  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      this.deleteApplyApi()
    }
  },

  deleteStandardApi() {
    var that = this;
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
        })

        that.setData({
          itemDis: res.result.data,
          item: res.result.data,
          // editApply: true,
          show: true,

        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 删除申请
   */
  delApply() {
    if (this.data.applyItem.nxDoDepartmentId !== -1) {

      if (this.data.applyItem.nxDoPurchaseStatus == 3) {

        if (this.data.applyItem.purchaseGoodsEntity.nxDpgPayType == 1) {
          wx.showToast({
            title: '请采购员先删除采购记账数据',
            icon: 'none'
          })
        }

      } else {
        this.setData({
          warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
          deleteShow: true,
          show: false,

          popupType: 'deleteOrder',
          showPopupWarn: true,
          showOperationGoods: false,
          showOperationLinshi: false
        })
      }
      this.setData({
        showOperationGoods: false,
        showOperationLinshi: false
      })
      this.hideModal();
    } else {
      wx.showToast({
        title: '不能修改客户订单',
        icon: 'none'
      })
      this.setData({
        showOperationGoods: false,
        showOperationLinshi: false
      })
      this.hideModal();
    }

  },


  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
    })

    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        var arr = that.data.showArr;
        arr.splice(that.data.index, 1);
        that.setData({
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true,
          showArr: arr,
          editApply: false,
          deleteShow: false,
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  closeWarn() {
    this.setData({
      applyItem: "",
      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: true,
    })
  },




  bindkeyboardheightchange(e) {
    this.setData({
      keyBordHeight: e.detail.height * globalData.rpxR,
    })
  },


  getSearchString(e) {
    this.setData({
      isSearching: true,
    })

    if (e.detail.value.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: e.detail.value,
        depId: this.data.depId,
      }
      this.setData({
        searchStr: e.detail.value,
      })

      queryDisGoodsByQuickSearchWithDepId(data).then(res => {
        if (res.result.code == 0) {
          if (res.result.data.nxArr == -1) {
            this.setData({
              strArr: res.result.data.disArr,
              nxArr: [],
              count: res.result.data.disArr.length,
            })

          } else {
            if (res.result.data.nxArr !== -2) {
              this.setData({
                nxArr: res.result.data.nxArr,
                count: res.result.data.nxArr.length,
                strArr: [],
              })
            } else {
              this.setData({
                strArr: [],
                nxArr: [],
                count: 0
              })
            }

          }
        }
      })
    } else {
      this.setData({
        searchArr: [],
        isSearching: false,
        searchStr: "",
      })
    }

  },





  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      itemDis: item,
      depGoods: item.departmentDisGoodsEntity,

    })
    if (this.data.depSettleType == 0) {
      this.setData({
        showCash: true
      })
    } else if (this.data.depSettleType == 1) {
      this.setData({
        show: true
      })
    }
    
    if (item.departmentDisGoodsEntity !== null) {
      var depGoodsStand = item.departmentDisGoodsEntity.nxDdgOrderStandard;
      if (depGoodsStand !== null) {
        this.setData({
          applyStandardName: item.departmentDisGoodsEntity.nxDdgOrderStandard,
          applyRemark: item.departmentDisGoodsEntity.nxDdgOrderRemark,
          level: item.departmentDisGoodsEntity.nxDdgOrderPriceLevel,
        })
      } else {
        this.setData({
          applyStandardName: item.nxDgGoodsStandardname,
          level: "1"
        })
      }
    } else {
      this.setData({
        applyStandardName: item.nxDgGoodsStandardname,
      })
    }
  },

  tishi() {
    wx.showToast({
      title: '下架商品不能订货',
      icon: 'none'
    })

  },


  toEditApply() {

    var applyItem = this.data.applyItem;
    this.hideModal();
    if (this.data.depSettleType == 0) {
      console.log("cashshhshshshhshh")
      this.setData({
        showCash: true
      })
    } else if (this.data.depSettleType == 1) {
      this.setData({
        show: true
      })
    }
    this.setData({
      showOperation: false,
      applyStandardName: applyItem.nxDoStandard,
      itemDis: this.data.applyItem.nxDistributerGoodsEntity,
      item: this.data.applyItem.nxDepartmentDisGoodsEntity,
      editApply: true,
      applyNumber: applyItem.nxDoQuantity,
      applyRemark: applyItem.nxDoRemark,
      printStandard: applyItem.nxDoPrintStandard,
    })
  },



  confirm: function (e) {
    console.log("cofnirmmmm", e)
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      this._saveFillOrder(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      level: "",
      printStandard: "",
      showMyIndependent: false,
      showOperation: false,
      showAdd: false
    })
  },


  /**
   * 保存配送申请
   * @param {*} 
   */
  _saveFillOrder: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = null;
    var weight = null;
    var subtotal = null;
    var printStandard = null;
    var costSubtotal = null;
    var profitSubtotal = 0;
    var profitScale = 0;
    var costPrice = 0;
    var costPriceUpdate = 0;
    var level = this.data.level;

   
    console.log("levee", e);
    //是否给weight赋值
    if (level == "1") {
      console.log("lev11111111111111");
      costPrice = this.data.itemDis.nxDgBuyingPriceOne;
      costPriceUpdate = this.data.itemDis.nxDgBuyingPriceOneUpdate;
      price = this.data.itemDis.nxDgWillPriceOne;
      printStandard = this.data.itemDis.nxDgGoodsStandardname;
     
      if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
        weight = e.detail.applyNumber;
        subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
        costSubtotal = (Number(costPrice) * Number(e.detail.applyNumber)).toFixed(1);
        profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
        profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
      } 
      
    } else if (level == "2") {
      console.log("lev2222222222222222");
      printStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
      weight = e.detail.applyNumber;
      costPriceUpdate = this.data.itemDis.nxDgBuyingPriceTwoUpdate;
      costPrice = this.data.itemDis.nxDgBuyingPriceTwo;
      price = this.data.itemDis.nxDgWillPriceTwo;
      subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
      profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
      profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
    }

    console.log("pridicieie", price, "subtotota,", subtotal);
    // 是否有部门商品
    if (this.data.itemDis.departmentDisGoodsEntity !== null) {
      depDisGoodsId = this.data.itemDis.departmentDisGoodsEntity.nxDepartmentDisGoodsId;
      if (e.detail.applyStandardName == this.data.itemDis.departmentDisGoodsEntity.nxDdgOrderStandard) {
        
          price = this.data.itemDis.departmentDisGoodsEntity.nxDdgOrderPrice;
          weight = e.detail.applyNumber;
          subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
          costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
          profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
          profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
        
        console.log("esubtotalsubtotal", subtotal)
      }
    }

    var dg = {
      nxDoOrderUserId: -1,
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
      nxDoCostPriceUpdate: costPriceUpdate,
      nxDoCostPrice: costPrice,
      nxDoPurchaseGoodsId: this.data.itemDis.nxDgPurchaseAuto,
      nxDoCostSubtotal: costSubtotal,
      nxDoProfitSubtotal: profitSubtotal,
      nxDoProfitScale: profitScale,
      nxDoNxGoodsId: this.data.itemDis.nxDgNxGoodsId,
      nxDoNxGoodsFatherId: this.data.itemDis.nxDgNxFatherId,
      nxDoGoodsType: this.data.itemDis.nxDgPurchaseAuto,
      nxDoPurchaseUserId: this.data.beforeId,
      nxDoPrintStandard: printStandard,
      nxDoCostPriceLevel: level
    };

    var that = this;
    if (this.data.beforeId !== '-1') {
      saveOrderBefore(dg).then(res => {
        if (res.result.code == 0) {
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2]; //上一个页面
          prevPage.setData({
            orderItem: res.result.data,
            addOrder: true,
          })
          wx.navigateBack({
            delta: 1
          })

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    } else {
      saveOrder(dg).then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '保存成功',
          })

          // 设置刷新标记，确保返回时刷新订单数据
          wx.setStorageSync('needRefreshOrderData', true);

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
          var arr = this.data.showArr;
          arr.push(res.result.data);
          that.setData({
            showArr: arr,
          })
        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    }

  },

  cancle() {
    console.log("cancle....")
    this.setData({
      item: "",
      applyStandardName: "",
      show: false,
      editApply: false,
      applyItem: "",
      applyNumber: "",
      depStandardArr: [],

    })

    if (this.data.isSearching) {
      this.setData({
        isSearching: false,
        searchStr: ""
      })
    }
  },



  inputFocus(e) {
    this.setData({
      bottom: e.detail.height
    })
  },

  inputBlur() {
    this.setData({
      bottom: 20
    })
  },

  /**
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      applyItem: e.currentTarget.dataset.item,
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.item.nxDistributerGoodsEntity,
      goodsName: e.currentTarget.dataset.item.nxDistributerGoodsEntity.nxDgGoodsName,
    })
    this.chooseSezi();

  },

  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()

    })
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },



  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
    })
    this.hideModal();

  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      level: e.detail.level,
    })
    if (e.detail.level == "1") {
      this.setData({
        printStandard: this.data.itemDis.nxDgGoodsStandardname,

      })
    } else {
      this.setData({
        printStandard: this.data.itemDis.nxDgWillPriceTwoStandard
      })
    }
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
      priceLevel: this.data.level,
    };
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var data = "showArr[" + this.data.index + "]";
        this.setData({
          [data]: res.result.data,
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true
        })

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },


  _againSearchString(e) {

    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr,
      depId: this.data.depId,
    }

    queryDisGoodsByQuickSearchWithDepId(data).then(res => {
      console.log(res)
      if (res.result.code == 0) {
        if (res.result.data.nxArr == -1) {
          this.setData({
            strArr: res.result.data.disArr,
            nxArr: [],
          })

        } else {
          if (res.result.data.nxArr !== -1) {
            this.setData({
              nxArr: res.result.data.nxArr,
              strArr: [],
            })
          } else {
            this.setData({
              strArr: [],
              nxArr: []
            })
          }

        }
      }
    })

  },



  onUnload() {
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      updateOrder: true
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
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  /**
   * 保存批发商商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgPurchaseAuto: this.data.purchaseAuto,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            showType: 0,
          })
          this._againSearchString();
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },


  toAddGoods() {
    if (this.data.searchStr.length > 0) {
      console.log(this.data.searchStr);
      wx.navigateTo({
        url: '../../../subPackage/pages/goods/disAddGoodsLinshi/disAddGoodsLinshi?goodsName=' + this.data.searchStr + '&from=resGoods',
      })
    }
  },



  toBack() {
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      updateOrder: true
    })
    wx.navigateBack({
      delta: 1,
    })
  },



  // 保存订货订单
  confirmCash: function (e) {
    if (this.data.editApply) {
      this._updateDisOrderCash(e);
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

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrderCash(e) {
    console.log("updadatecakkskskskksks")

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };

    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var data = "showArr[" + this.data.index + "]";
        this.setData({
          [data]: res.result.data,
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true
        })

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },


  _saveOrderCash: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = "";
    if (this.data.itemDis.nxDgWillPriceOne !== null) {
      price = this.data.itemDis.nxDgWillPriceOne;
    } else {
      price = 0;
    }

    var weight = null;
    var subtotal = null;
    var costSubtotal = 0;
    var profitSubtotal = 0;
    var profitScale = 0;

    var costPrice = this.data.itemDis.nxDgBuyingPrice;

    //是否给weight赋值
    if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
      weight = e.detail.applyNumber;
      costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
      subtotal = (Number(price) * Number(weight)).toFixed(1);
      profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
      profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
    }

    // 是否有部门商品
    if (this.data.depGoods !== null) {
      depDisGoodsId = this.data.depGoods.nxDepartmentDisGoodsId;
    }
 
    var dg = {
      nxDoOrderUserId: -1,
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
      nxDoPurchaseUserId: this.data.beforeId,
      nxDoPrintStandard: e.detail.applyStandardName,
      nxDoExpectPrice: this.data.itemDis.nxDgWillPriceOne,
    };
    console.log(dg);
    var that = this;
    if (this.data.beforeId !== '-1') {
      saveCashBefore(dg).then(res => {
        if (res.result.code == 0) {
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2]; //上一个页面
          prevPage.setData({
            orderItem: res.result.data,
            addOrder: true,
          })
          wx.navigateBack({
            delta: 1
          })

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })

    } else {
      saveCash(dg).then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '保存成功',
          })
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
          var arr = this.data.showArr;
          arr.push(res.result.data);
          that.setData({
            showArr: arr,
          })

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    }

  },


})