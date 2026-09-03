const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
var dateUtils = require('../../../../utils/dateUtil');

import {
  depGetApplyAiByTime,
  saveOrder,
  subDepGetApplyAiByTime
}
from '../../../../lib/apiRestraunt'

import {
  getDepartmentGoodsOrderCatalog,
  getOrderReminderCatalog,
  getOrderReminderForecast
}
from '../../../../lib/apiPrediction'

const BASELINE = 'V8_REPLENISHMENT_STATE';

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
    var value = wx.getStorageSync('userInfo');
    var orderDepInfo = wx.getStorageSync('orderDepInfo') || {};
    var depId = Number(options.depId || orderDepInfo.nxDepartmentId);
    var depFatherId = Number(orderDepInfo.nxDepartmentFatherId || depId);
    var disId = Number(options.disId
      || (value && value.nxDuDistributerId)
      || orderDepInfo.nxDepartmentDisId);
    this._forecastGoods = null;
    this.setData({
      depId: depId,
      depFatherId: depFatherId,
      disId: disId,
      userInfo: value || null,
      orderDepInfo: orderDepInfo
    })

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

  async _getResGoodsWithOrders() {
    if (!this.data.hasMore || this.data.isLoading) {
      return;
    }

    if (this._forecastGoods) {
      this._appendForecastPage();
      return;
    }

    this.setData({
      isLoading: true
    });

    load.showLoading("获取数据");
    try {
      if (!this.data.depId || !this.data.disId) {
        throw new Error('部门或配送商信息不完整');
      }
      var catalog = this._requireData(
        await getOrderReminderCatalog(this.data.disId),
        '预测日期读取失败'
      );
      if (!catalog.businessDate) {
        throw new Error('服务端没有返回当前营业日');
      }

      var result = await Promise.all([
        getOrderReminderForecast({
          distributerId: this.data.disId,
          departmentId: this.data.depId,
          predictionDate: catalog.businessDate,
          predictionEndDate: catalog.businessDate,
          historyWindowDays: 30,
          algorithmVersion: BASELINE
        }),
        getDepartmentGoodsOrderCatalog(this.data.depId, this.data.disId),
        this._loadActualOrders()
      ]);

      var forecast = this._requireData(result[0], 'AI 推算订单读取失败');
      var departmentGoods = this._requireData(result[1], '部门商品读取失败');
      var actualOrders = this._requireData(result[2], '当天订单读取失败');
      this._forecastGoods = this._buildForecastGoods(
        forecast,
        departmentGoods,
        actualOrders
      );
      this._appendForecastPage();
    } catch (err) {
      console.error('AI 推算订单读取失败:', err);
      this._forecastGoods = [];
      this.setData({
        depGoodsArr: [],
        hasMore: false,
        showSkeleton: false
      });
      wx.showToast({
        title: err && err.message ? err.message : '获取数据失败',
        icon: 'none'
      });
    } finally {
      load.hideLoading();
      this.setData({ isLoading: false });
    }
  },

  _loadActualOrders() {
    if (Number(this.data.depId) === Number(this.data.depFatherId)) {
      return depGetApplyAiByTime(this.data.depFatherId);
    }
    return subDepGetApplyAiByTime(this.data.depId);
  },

  _buildForecastGoods(forecast, departmentGoods, actualOrderPayload) {
    var relationsByGoodsId = {};
    (Array.isArray(departmentGoods) ? departmentGoods : []).forEach(relation => {
      if (Number(relation.nxDdgDepartmentId) !== Number(this.data.depId)) {
        return;
      }
      var goodsId = Number(relation.nxDdgDisGoodsId
        || (relation.nxDistributerGoodsEntity
          && relation.nxDistributerGoodsEntity.nxDistributerGoodsId));
      if (goodsId > 0) {
        if (!relationsByGoodsId[goodsId]) relationsByGoodsId[goodsId] = [];
        relationsByGoodsId[goodsId].push(relation);
      }
    });

    var orderedGoodsIds = this._actualOrderGoodsIds(actualOrderPayload);
    var seenGoodsIds = {};
    var rows = [];
    (forecast && Array.isArray(forecast.items) ? forecast.items : []).forEach(item => {
      var goodsId = Number(item.goodsId);
      var forecastUnit = String(item.predictedUnit || item.unit || '').trim();
      var relations = relationsByGoodsId[goodsId] || [];
      var relation = forecastUnit
        ? relations.find(candidate => this._relationUnit(candidate) === forecastUnit)
        : relations[0];
      var quantity = Number(item.predictedQuantity);
      var level = item.policy && item.policy.level;
      var lifecycle = item.replenishmentLifecycleStatus
        || (item.channelEvidence && item.channelEvidence.REPLENISHMENT_LIFECYCLE
          && item.channelEvidence.REPLENISHMENT_LIFECYCLE.status);
      if (!relation || seenGoodsIds[goodsId] || orderedGoodsIds[goodsId]
        || level !== 'LEVEL_A' || !Number.isFinite(quantity) || quantity <= 0
        || lifecycle === 'NOT_DUE' || lifecycle === 'ANOMALOUS') {
        return;
      }

      var relationUnit = this._relationUnit(relation);
      forecastUnit = forecastUnit || relationUnit;

      var state = item.channelEvidence && item.channelEvidence.REPLENISHMENT_STATE || {};
      var lifecycleEvidence = item.channelEvidence
        && item.channelEvidence.REPLENISHMENT_LIFECYCLE || {};
      var daysSinceLast = lifecycleEvidence.daysSinceLast;
      if (daysSinceLast === null || daysSinceLast === undefined) {
        daysSinceLast = state.daysSinceLast;
      }
      seenGoodsIds[goodsId] = true;
      rows.push(Object.assign({}, relation, {
        aiOrderQuantity: this._numberText(quantity),
        aiOrderStandard: forecastUnit || relationUnit,
        // 新预测接口不提供旧页面这两个库存口径，不能用预测量反推伪造。
        aiDailyUsage: '—',
        aiSafetyStock: '—',
        aiDaysSinceLastOrder: daysSinceLast === null || daysSinceLast === undefined
          ? '—' : String(daysSinceLast),
        _candidateRank: Number(item.candidateRank) || 999999
      }));
    });
    rows.sort((left, right) => left._candidateRank - right._candidateRank);
    return rows;
  },

  _relationUnit(relation) {
    if (!relation) return '';
    return String(relation.nxDdgOrderStandard
      || relation.nxDdgDepGoodsStandardname
      || (relation.nxDistributerGoodsEntity
        && relation.nxDistributerGoodsEntity.nxDgGoodsStandardname)
      || '').trim();
  },

  _actualOrderGoodsIds(payload) {
    var result = {};
    var source = payload && Array.isArray(payload.arr)
      ? payload.arr : (Array.isArray(payload) ? payload : []);
    var orders = [];
    source.forEach(item => {
      if (Array.isArray(item.depOrders)) {
        orders = orders.concat(item.depOrders);
      } else {
        orders.push(item);
      }
    });
    orders.forEach(order => {
      var goodsId = Number(order.nxDoDisGoodsId
        || (order.nxDistributerGoodsEntity
          && order.nxDistributerGoodsEntity.nxDistributerGoodsId));
      if (goodsId > 0) result[goodsId] = true;
    });
    return result;
  },

  _appendForecastPage() {
    var page = Number(this.data.currentPage) || 1;
    var limit = Number(this.data.limit) || 20;
    var start = (page - 1) * limit;
    var rows = this._forecastGoods || [];
    var pageRows = rows.slice(start, start + limit);
    this.setData({
      depGoodsArr: page === 1
        ? pageRows : this.data.depGoodsArr.concat(pageRows),
      totalCount: rows.length,
      totalPage: Math.ceil(rows.length / limit),
      hasMore: start + pageRows.length < rows.length
    });
  },

  _numberText(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  },

  _requireData(response, fallback) {
    var result = response && response.result;
    if (!result || Number(result.code) !== 0) {
      throw new Error(result && result.msg ? result.msg : fallback);
    }
    return result.data;
  },


  

// 添加下拉刷新方法
onPullDownRefresh() {
  this._forecastGoods = null;
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
