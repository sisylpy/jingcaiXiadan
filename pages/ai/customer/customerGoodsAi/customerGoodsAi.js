const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
var dateUtils = require('../../../../utils/dateUtil');

import {
  
  disGetSubDepAiOrder,
  saveOrder, 

}
from '../../../../lib/apiRestraunt'



Page({


  onShow() {

    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,

    });



    

  },
  /**
   * 页面的初始数据
   */
  data: {
    depGoodsArr: [],
  currentPage: 1,
  limit: 20,
  totalPage: 0,
  totalCount: 0,
  hasMore: true,  // 是否还有更多数据
  isLoading: false, // 是否正在加载
   

  showSkeleton: true,
  dots: '',
  loadingTimer: null,
  fadeAnimation: {}


  },

 

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      depId: options.depId,
    })

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

    var orderDepInfo = wx.getStorageSync('orderDepInfo');
    if(orderDepInfo){
      this.setData({
        orderDepInfo: orderDepInfo
      })
    }

    let dotCount = 0;

    const timer = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      this.setData({ dots: '.'.repeat(dotCount) });
    }, 400);
  
    const anim = wx.createAnimation({ duration: 1000, timingFunction: 'ease-in-out' });
    anim.opacity(0.3).step().opacity(1).step();
  
    this.setData({ loadingTimer: timer, fadeAnimation: anim.export() });
  
    setTimeout(() => {
      clearInterval(timer);
      this.setData({ showSkeleton: false });
    }, 2200);



    this._getResGoodsWithOrders();
   

  },

  _getResGoodsWithOrders() {
    if (!this.data.hasMore || this.data.isLoading) {
      return;
    }
  
    this.setData({
      isLoading: true
    });
    
    load.showLoading("获取数据");
    var data = {
      depId: this.data.depId,
      page: this.data.currentPage,
      limit: this.data.limit,
    }
    
    disGetSubDepAiOrder(data)
      .then(res => {
        load.hideLoading();
        this.setData({
          isLoading: false
        });
        console.log(res.result.page);
        if (res.result.code == 0) {
          const pageData = res.result.page;
          const newData = pageData.list || [];
          if( pageData.currPage < pageData.totalPage){
            this.setData({
              hasMore: true,
            })
          }else{
            this.setData({
              hasMore: false
            })
          }
          // 如果是第一页，直接设置数据
          if (this.data.currentPage === 1) {
            this.setData({
              depGoodsArr: newData,
              totalCount: pageData.totalCount,  // 保存总记录数
              totalPage: pageData.totalPage,
              currentPage: pageData.currPage,     // 保存总页数
            });
          } else {       
            // 如果不是第一页，追加数据
            this.setData({
              depGoodsArr: [...this.data.depGoodsArr, ...newData],
               // 保存总页数
            });
          }
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          });
          this.setData({
            depGoodsArr: this.data.page === 1 ? [] : this.data.depGoodsArr,
            hasMore: false
          });
        }
      })
      .catch(err => {
        load.hideLoading();
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      });
  },


  

// 添加下拉刷新方法
onPullDownRefresh() {
  this.setData({
    currentPage: 1,
    hasMore: true,
    depGoodsArr: []
  }, () => {
    this._getResGoodsWithOrders();
    wx.stopPullDownRefresh();
  });
},

// 添加上拉加载更多方法
//
onReachBottom() {
  if (this.data.hasMore && !this.data.isLoading) {
    this.setData({
      currentPage: this.data.currentPage + 1
    }, () => {
      this._getResGoodsWithOrders();
    });
  }
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
    var levelTwoStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
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

applyGoodsDep(e) {
  var depGoods = e.currentTarget.dataset.depgoods;
  this.setData({
    index: e.currentTarget.dataset.index,
    itemDis: e.currentTarget.dataset.disgoods,
    depGoods: e.currentTarget.dataset.depgoods,
    show: true,
    applyNumber: depGoods.aiOrderQuantity,
    applyStandardName: depGoods.nxDdgOrderStandard,
    applyRemark: depGoods.nxDdgOrderRemark,
    canSave: true,
  })

},
  /**
   * 保存配送申请
   * @param {*} 
   */
  confirm: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var price = null;
    var weight = null;
    var subtotal = null;
    var printStandard = null;
    var costSubtotal = null;
    var profitSubtotal = 0;
    var profitScale = 0;
    var costPrice = 0;
    var costPriceUpdate = 0;
    var level = this.data.depGoods.nxDdgOrderPriceLevel;

   
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
    
    var userId = -1;
    if(this.data.userInfo !== null){
      userId  = this.data.userInfo.nxDepartmentUserId;
    }

    var dg = {
      nxDoOrderUserId: userId,
      nxDoDepDisGoodsId: this.data.depGoods.nxDepartmentDisGoodsId, //
      nxDoDisGoodsFatherId: this.data.itemDis.nxDgDfgGoodsFatherId,
      nxDoDisGoodsGrandId: this.data.itemDis.nxDgDfgGoodsGrandId,
      nxDoDisGoodsId: this.data.itemDis.nxDistributerGoodsId, //1
      nxDoDepartmentId: this.data.depGoods.nxDdgDepartmentId,
      nxDoDistributerId: this.data.itemDis.nxDgDistributerId,
      nxDoDepartmentFatherId: this.data.depGoods.nxDdgDepartmentFatherId,
      nxDoQuantity: e.detail.applyNumber,
      nxDoPrice: price,
      nxDoWeight: weight,
      nxDoSubtotal: subtotal,
      nxDoStandard: e.detail.applyStandardName,
      nxDoRemark: e.detail.applyRemark,
      nxDoIsAgent: 0,
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
      nxDoPrintStandard: printStandard,
      nxDoCostPriceLevel: level
    };

    console.log(dg);

    load.showLoading("保存订单");
    saveOrder(dg).then(res => {
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        
        const newArr = this.data.depGoodsArr.filter((_, i) => i !== this.data.index);
        this.setData({ depGoodsArr: newArr });
      
        load.hideLoading();
       
      } else {
        wx.showToast({
          title: '订单保存失败',
          icon: 'none'
        })
      }
    })

  },




  toBack(){
    wx.navigateBack({delta: 1})
  },


})