var load = require('../../lib/load.js');

const globalData = getApp().globalData;
var dateUtils = require('../../utils/dateUtil');
import apiUrl from '../../config.js'

import {
  depGetDepDisGoodsCata,
  depGetDepGoodsPage,
  depGetDepGoodsByIds,
  saveOrder,
  updateOrder,
  deleteOrder,
  nxDepGetDisCataGoods,
  nxDepGetDisFatherGoods,
  nxDepGetDisFatherGoodsByGrandId,
} from '../../lib/apiRestraunt';


Page({


  onShow() {

    // 获取窗口真实宽高（px），并根据 rpxR 换算
    const windowInfo = wx.getWindowInfo();
    const {
      rpxR,
      navBarHeight,
      statusBarHeight
    } = globalData;

    const windowWidth = windowInfo.windowWidth * rpxR;
    const windowHeight = windowInfo.windowHeight * rpxR;
    const leftTopHeight = navBarHeight * rpxR + 80 * rpxR; // 80rpx 为左侧标题区高度

    this.setData({
      windowWidth,
      windowHeight,
      navBarHeight: navBarHeight * rpxR,
      statusBarHeight: statusBarHeight * rpxR,
      leftTopHeight,
      url: apiUrl.server,
    });


    if (this.data.update) {
      if (this.data.itemIndex == 0) {
        this._getInitDataDep();
      } else {
        this.initDisData();
      }
    }

  },


  data: {
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    applySubtotal: "",
    item: {},
    maskHeight: "",
    statusBarHeight: "",
    windowHeight: "",
    windowWidth: "",
    tab1Index: 0,
    itemIndex: 0,
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    depGoodsArrAi: [],
    deleteShow: false,
   
    // 新增字段用于记录ID查询进度
    lastQueryEndIndex: 0,  // 上次查询结束的位置
    hasMoreGoods: true,    // 是否还有更多商品
    currentQueryIds: [],   // 当前正在查询的ID列表
    processedIds: new Set(), // 已经处理过的ID集合，避免重复查询
   
    tabs: [{
      id: 0,
      words: "我的商品"
    }, {
      id: 1,
      words: "配送商品"
    }],

    grandList: [],
    fatherArr: [],
    leftGreatId: "",
    greatName: "",

    totalPage: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    isLoading: false,
    leftIndex: 0,


    selectedSub: 0, // 选中的分类
    scrollHeight: 0, // 滚动视图的高度
    toView: 'position0', // 滚动视图跳转的位置
    scrollTopLeft: 0,

    showGoodsModal: false,
    showInd: false,
    item: "",
    depGoods: null,
    update: false,
    editApply: false,
    goodsList: [],
    index: "",
    showAllSubCat: false,
    activeSubCatId: '', // 当前激活的分类ID
    scrollIntoView: '', // 滚动到指定分类
    categoryPositions: [], // 存储分类位置信息
    goodsListHeight: 0, // 新增内容区高度
    leftScrollTopNx: 0, // 左侧菜单 scroll-view 的 scrollTop

    // 新增的部门商品相关状态
    showAllSubCatDep: false, // 是否展开二级分类
    activeSubCatIdDep: '', // 当前选中的二级分类ID
    subcatScrollIntoViewDep: '', // 二级分类横向滚动位置
    scrollIntoViewDep: '', // 商品列表滚动位置

    depGoodsScrollTop: 0,

    getDepIdsLimit: 40,

  },


  onLoad: function (options) {
  
    var depValue = wx.getStorageSync('orderDepInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.nxDepartmentId,
        disId: depValue.nxDepartmentDisId,
        depFatherId: depValue.nxDepartmentFatherId
      })

    }

    this._getInitDataDep();
 
  },



  //部门商品获取二级分类
  _getInitDataDep() {
    load.showLoading("获取分类");
    var data = {
      disId: this.data.disId,
      depId: this.data.depInfo.nxDepartmentId
    }
    depGetDepDisGoodsCata(data).then(res => {
      load.hideLoading();
      console.log("depGetDepDisGoodsCata", res.result);
      if (res.result.code === 0 && res.result.data.cataArr.length > 0) {
        const firstSubCat = res.result.data.cataArr[0].fatherGoodsEntities[0];

        // 重置查询状态
        this.setData({
          depGoodsCataArr: res.result.data.cataArr,
          sortDepGoodsArr: res.result.data.depGoodsArr,
          lastQueryEndIndex: 0,
          hasMoreGoods: true,
          currentQueryIds: [],
          processedIds: new Set(),
          activeSubCatIdDep: firstSubCat.nxDistributerFatherGoodsId,
          subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.nxDistributerFatherGoodsId}`,
          fatherArr: res.result.data.cataArr[0].fatherGoodsEntities,
          depGoodsArrAi: [],
        }, () => {
          // 初始化时获取第一批ID
          this._prepareNextBatchIds();
        });
      }
    });
  },

  // 准备下一批要查询的ID
  _prepareNextBatchIds(isRefresh = false) {
    console.log('[prepareNextBatchIds] 开始准备新批次:', {
      hasMoreGoods: this.data.hasMoreGoods,
      lastQueryEndIndex: this.data.lastQueryEndIndex,
      sortDepGoodsArrLength: this.data.sortDepGoodsArr.length,
      getDepIdsLimit: this.data.getDepIdsLimit,
      isRefresh
    });

    if (!this.data.hasMoreGoods) {
      console.log('[prepareNextBatchIds] 没有更多商品了');
      return;
    }

    const startIndex = this.data.lastQueryEndIndex;
    const endIndex = Math.min(startIndex + this.data.getDepIdsLimit, this.data.sortDepGoodsArr.length);
    
    console.log('[prepareNextBatchIds] 计算索引:', {
      startIndex,
      endIndex,
      totalLength: this.data.sortDepGoodsArr.length
    });
    
    // 获取新的ID批次
    const newIds = this.data.sortDepGoodsArr
      .slice(startIndex, endIndex)
      .map(item => item.nxDepartmentDisGoodsId)
      .filter(id => !this.data.processedIds.has(id));

    console.log('[prepareNextBatchIds] 新批次ID:', {
      newIds,
      processedIds: Array.from(this.data.processedIds),
      filteredCount: newIds.length
    });

    if (newIds.length === 0) {
      console.log('[prepareNextBatchIds] 没有新的ID可查询');
      this.setData({ hasMoreGoods: false });
      return;
    }

    this.setData({
      currentQueryIds: newIds,
      lastQueryEndIndex: endIndex,
      hasMoreGoods: endIndex < this.data.sortDepGoodsArr.length
    }, () => {
      console.log('[prepareNextBatchIds] setData后状态:', {
        currentQueryIds: this.data.currentQueryIds,
        lastQueryEndIndex: this.data.lastQueryEndIndex,
        hasMoreGoods: this.data.hasMoreGoods,
        isRefresh
      });
      this._getInitDataByDepIds(isRefresh);
    });
  },

  // 修改获取商品数据的方法
  _getInitDataByDepIds(isRefresh = false, callback) {
    console.log('[getInitDataByDepIds] 开始查询:', {
      isLoading: this.data.isLoading,
      currentQueryIds: this.data.currentQueryIds,
      isRefresh,
      processedIds: Array.from(this.data.processedIds)
    });

    if (this.data.isLoading || !this.data.currentQueryIds.length) {
      console.log('[getInitDataByDepIds] 不满足查询条件:', {
        isLoading: this.data.isLoading,
        currentQueryIdsLength: this.data.currentQueryIds.length
      });
      return;
    }
    
    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品…");

    // 将当前批次的ID转换为JSON字符串
    const idsArray = this.data.currentQueryIds;
    console.log('[getInitDataByDepIds] 准备发送请求:', {
      idsArray,
      idsArrayLength: idsArray.length,
      isRefresh
    });

    depGetDepGoodsByIds({
      depGoodsIds: JSON.stringify(idsArray)
    }).then(res => {
      load.hideLoading();
      this.setData({
        isLoading: false
      });

      if (res.result.code !== 0) {
        console.log('[getInitDataByDepIds] 请求失败:', res.result.msg);
        return wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }

      // 1) 获取商品列表
      const list = res.result.page || [];
      console.log('[getInitDataByDepIds] 获取到商品列表:', {
        listLength: list.length,
        responseData: res.result,
        isRefresh
      });

      // 2) 生成 viewId，让 id 唯一且连续
      const base = isRefresh ? 0 : this.data.depGoodsArrAi.length;
      list.forEach((item, idx) => {
        item.viewId = 'goods_' + (base + idx);
      });

      // 3) 处理商品数据，添加 isFirstInCategory
      const processedList = this.processGoodsListDep(list);

      // 4) 合并或替换
      const merged = isRefresh ? processedList : this.data.depGoodsArrAi.concat(processedList);

      // 新增：合并后按 sortDepGoodsArr 顺序排序
      const idOrder = this.data.sortDepGoodsArr.map(item => item.nxDepartmentDisGoodsId);
      const sortedArr = merged.slice().sort((a, b) => {
        return idOrder.indexOf(a.nxDepartmentDisGoodsId) - idOrder.indexOf(b.nxDepartmentDisGoodsId);
      });

      // 5) 更新已处理的ID集合
      const newProcessedIds = new Set([...this.data.processedIds, ...this.data.currentQueryIds]);

      // 6) 写入数据
      this.setData({
        depGoodsArrAi: sortedArr, // 用排序后的数组
        processedIds: newProcessedIds,
        currentQueryIds: [] // 清空当前查询的ID
      }, () => {
        console.log('[getInitDataByDepIds] 数据更新完成:', {
          mergedLength: merged.length,
          sortedArrLength: sortedArr.length,
          processedIdsSize: newProcessedIds.size,
          currentQueryIds: this.data.currentQueryIds,
          depGoodsArrAiLength: this.data.depGoodsArrAi.length,
          isRefresh
        });
        if (typeof callback === 'function') {
          setTimeout(callback, 50);
        }
      });
    });
  },

  // 修改滚动到底部的处理
  onReachBottomDep() {
    if (this.data.isLoading || !this.data.hasMoreGoods) return;
    this._prepareNextBatchIds(false);
  },

  

// 滚动
  scrollToDep() {
    const threshold = this.data.leftTopHeight;

    wx.createSelectorQuery()
      .selectAll('.goods-item').boundingClientRect()
      .selectViewport().scrollOffset()
      .exec(([items, viewport]) => {
        const scrollTop = viewport.scrollTop;

        // 找出最后一个相对 top <= threshold 的下标
        let activeIdx = 0;
        for (let i = 0; i < items.length; i++) {
          const relativeTop = items[i].top - scrollTop;
          if (relativeTop <= threshold) {
            activeIdx = i;
          } else {
            break;
          }
        }

        // 拿到对应的大类 id
        const cataId = this.data.depGoodsArrAi[activeIdx].nxDdgDisGoodsGreatId;
        const subIndex = this.data.depGoodsCataArr.findIndex(
          c => c.nxDistributerFatherGoodsId === cataId
        );

        // 只有切换了才更新
        if (subIndex !== -1 && subIndex !== this.data.selectedSub) {
          // 把它滚到左侧菜单中部
          const itemHeight = 120 * globalData.rpxR; // 每行高度 120rpx 转 px
          const containerHeight = this.data.windowHeight - this.data.leftTopHeight;
          const centerOffset = containerHeight / 2 - itemHeight / 2;

          let scrollTopLeft = subIndex * itemHeight - centerOffset;
          if (scrollTopLeft < 0) scrollTopLeft = 0;
          var len = this.data.depGoodsCataArr[subIndex].fatherGoodsEntities.length;
          this.setData({
            selectedSub: subIndex,
            fatherArr: this.data.depGoodsCataArr[subIndex].fatherGoodsEntities,
      activeSubCatIdDep: this.data.depGoodsCataArr[subIndex].fatherGoodsEntities[len - 1].nxDistributerFatherGoodsId,
      subcatScrollIntoViewDep: `subcat-dep-${len - 1}`,
            scrollTopLeft
          });
        }
      });
  },


  showDialogBtn: function (e) {
    console.log("showoowdisbetn", e);
    this.setData({
      item: e.currentTarget.dataset.item,
      showInd: true,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth
    })
  },

  hideModal: function () {
    this.setData({
      showGoodsModal: false
    });

  },



  /**
   * tabItme点击
   */

  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,
    })
  },

  swiperChange(event) {
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
      totalCount: "",
      totalPage: "",
      leftGreatId: "",
      leftIndex: 0,
      currentPage: 1,
      searchFather: false,
      searchId: "",

    })
    if (this.data.tab1Index == 0) {
      this._getInitDataDep();
    }
    if (this.data.tab1Index == 1) {
      this.initDisData();

    }
  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName
    })
  },


  // 
  applyGoodsDep(e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    this.setData({
      fatherIndex: e.currentTarget.dataset.fatherindex,
      index: e.currentTarget.dataset.index,
      selectedSub: e.currentTarget.dataset.fatherindex,
      itemDis: e.currentTarget.dataset.disgoods,
      depGoods: e.currentTarget.dataset.depgoods,
      show: true,
      applyStandardName: depGoods.nxDdgOrderStandard,
      applyRemark: depGoods.nxDdgOrderRemark,
      canSave: true,
    })

  },


  // 
  applyGoods(e) {
    var item = e.currentTarget.dataset.disgoods;
    this.setData({
      fatherIndex: e.currentTarget.dataset.fatherindex,
      grandIndex: e.currentTarget.dataset.grandindex,
      index: e.currentTarget.dataset.index,
      item: e.currentTarget.dataset.item,
      itemDis: e.currentTarget.dataset.disgoods,
      show: true,
      applyStandardName: item.nxDgGoodsStandardname,
      applySubtotal: "0.0元",
      depGoods: e.currentTarget.dataset.depgoods,
      canSave: false,
    })
  },


  toEditApplyDep(e) {
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.nxDoPurchaseStatus;
    if (itemStatus > 1) {
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
        fatherIndex: e.currentTarget.dataset.fatherindex,
        index: e.currentTarget.dataset.index,
        applyItem: e.currentTarget.dataset.order,
        show: true,
        applyStandardName: applyItem.nxDoStandard,

        itemDis: e.currentTarget.dataset.disgoods,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        depgoods: e.currentTarget.dataset.depgoods,
      })


    }
  },


  toEditApply(e) {
    var goodsId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    this.setData({
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      applyItem: e.currentTarget.dataset.order,
      depId: e.currentTarget.dataset.depid,
      subName: e.currentTarget.dataset.subname,
    })

    if (this.data.applyItem.nxDoPurchaseStatus < 5) {
      var applyItem = this.data.applyItem;
      if (this.data.depInfo.nxDepartmentSettleType == 0) {
        this.setData({
          showCash: true,
          applySubtotal: applyItem.nxDoSubtotal,
        })
      } else if (this.data.depInfo.nxDepartmentSettleType == 1) {
        this.setData({
          show: true
        })
      }

      this.setData({
        applyStandardName: applyItem.nxDoStandard,
        printStandard: applyItem.nxDoPrintStandard,
        itemDis: this.data.applyItem.nxDistributerGoodsEntity,
        item: this.data.applyItem.nxDepartmentDisGoodsEntity,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        priceLevel: applyItem.nxDoCostPriceLevel
      })
    } else {
      wx.showToast({
        title: '请供货商修改订单状态',
        icon: 'none'
      })

    }
    this.hideModal();
    this.setData({
      showOperationGoods: false
    })
  },



  // 保存订货订单
  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      this._saveOrder(e);
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

      // if (this.data.depInfo.nxDistributerEntity.nxDistributerType > 0) {
      if (this.data.itemDis.nxDgBuyingPrice !== null) {
        var costPrice = this.data.itemDis.nxDgBuyingPrice;
        costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
        profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
        profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
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
      nxDoIsAgent: 0,
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
    saveOrder(dg).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: '保存成功',
        })
        if (this.data.tab1Index == 0) {
          var data = "depGoodsArrAi[" + this.data.fatherIndex + "].nxDepartmentDisGoodsEntities[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data]: res.result.data
          })
          var data2 = "depGoodsArrAi[" + this.data.fatherIndex + "].newOrderCount";
          var count = this.data.depGoodsArrAi[this.data.fatherIndex].newOrderCount;
          this.setData({
            [data2]: count + 1,
          })
        }
        if (this.data.tab1Index == 1) {
          var data = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data]: res.result.data
          })
          var data2 = "grandList[" + this.data.leftIndex + "].newOrderCount";
          var count = this.data.grandList[this.data.leftIndex].newOrderCount;
          this.setData({
            [data2]: count + 1,
          })

          var delFatherId = this.data.itemDis.nxDgDfgGoodsGrandId;
          var fatherArr = this.data.fatherArr;
          for (var i = 0; i < fatherArr.length; i++) {
            console.log("idididiidiidiididiidiid")
            var id = fatherArr[i].nxDistributerFatherGoodsId;
            if (id == delFatherId) {
              var data3 = "fatherArr[" + i + "].newOrderCount";
              var count2 = this.data.fatherArr[i].newOrderCount;
              this.setData({
                [data3]: count2 + 1
              })
            }
          }
        }
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
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        this._initData();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },


  initDisData() {
    load.showLoading("获取商品")
    var that = this;
    var data = {
      nxDisId: this.data.disId,
      depId: this.data.depId,
    }
    nxDepGetDisCataGoods(data).then(res => {
      if (res.result.code == 0) {
        console.log(res.result.data);
        load.hideLoading();
        var newId = res.result.data[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId;

        this.setData({
          grandList: res.result.data,
          fatherArr: res.result.data[0].fatherGoodsEntities,
          leftGreatId: res.result.data[0].nxDistributerFatherGoodsId,
          selectedSubCategoryId: res.result.data[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
          greatName: res.result.data[0].nxDfgFatherGoodsName,
          fatherSonsIndex: 0,
          activeSubCatId: newId,
        })
        that._getFatherGoodsDis();
      }
    })
  },


  changeGreatGrandDis(e) {
    const index = e.currentTarget.dataset.index;
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      leftGreatId: categoryId,
      leftIndex: e.currentTarget.dataset.index,
      goodsList: [],
      currentPage: 1,
      totalPage: 1,
      isLoading: false,
      greatName: e.currentTarget.dataset.name,
      fatherArr: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities,
      selectedSubCategoryId: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
      activeSubCatId: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,

    }, () => {
      // 用 this.createSelectorQuery() 保证作用域
      const query = this.createSelectorQuery();
      query.select(`#left-cat-${categoryId}`).boundingClientRect();
      query.select('#leftScroll').boundingClientRect(); // ← 改这里
      query.select('#leftScroll').scrollOffset(); // ← 和这里
      query.exec(res => {
        const [itemRect, scrollRect, scrollOffset] = res;
        const itemTop = itemRect.top;
        const itemH = itemRect.height;
        const listTop = scrollRect.top;
        const listH = scrollRect.height;
        const scrollTop0 = scrollOffset.scrollTop;

        const targetScrollTop = scrollTop0 + itemTop - listTop - (listH / 2) + (itemH / 2);
        this.setData({
          leftScrollTopNx: targetScrollTop
        });
      });
    });
    this._getFatherGoodsDis();
  },


  _getFatherGoodsDis() {
    const data = {
      depId: this.data.depId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
    };

    nxDepGetDisFatherGoods(data).then(res => {
      if (res.result.code == 0) {
        const processedList = this.processGoodsListDis(res.result.page.list);
        var subCatId = this.data.activeSubCatId;
        this.setData({
          goodsList: processedList,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,

          subcatScrollIntoView: `subcat-${subCatId}`,
          scrollIntoView: `cat-${subCatId}` // 右侧商品区锚点
        }, () => {
          // 数据更新后计算分类位置
          this.calculateCategoryPositionsDis();
        });
      }
    });
  },


  calculateSubCategoryHeightsDis() {
    const query = wx.createSelectorQuery();
    query.selectAll('.product-item').boundingClientRect();
    query.exec((res) => {
      if (res && res[0]) {
        const heights = [];
        let accumulatedHeight = 0;
        res[0].forEach((item) => {
          accumulatedHeight += item.height;
          heights.push(accumulatedHeight);
        });
        this.setData({
          subCategoryHeights: heights,
        });
      }
    });
  },



  onScrollToLowerDis: function () {
    // 防止重复请求
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      searchFather,
      leftGreatId,
      depFatherId,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if (currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        depId: depFatherId,
        fatherId: leftGreatId,
      };

      nxDepGetDisFatherGoods(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            const updatedGoodsList = [...this.data.goodsList, ...newItems];

            // 更新当前页和商品列表
            this.setData({
              goodsList: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              isLoading: false,
            });

            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCount) {
              this.setData({
                isLoading: false
              });
            }

            // 重新计算右侧商品高度
            this.calculateSubCategoryHeightsDis();
          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
            this.setData({
              isLoading: false
            });
          }
        })
        .catch(() => {
          wx.showToast({
            title: '加载错误，请稍后再试',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },



  onGoodsScrollDis(e) {
    // 节流略
    const query = wx.createSelectorQuery();
    query.selectAll('.product-item').boundingClientRect();
    query.select('.goods-list').boundingClientRect();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const productRects = res[0];
        const listRect = res[1];
        // 找到第一个可见商品
        let minDiff = Infinity;
        let firstVisibleIndex = 0;
        for (let i = 0; i < productRects.length; i++) {
          const diff = productRects[i].top - listRect.top;
          if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            firstVisibleIndex = i;
          }
        }
        const firstVisibleItem = this.data.goodsList[firstVisibleIndex];
        if (firstVisibleItem) {
          const activeId = firstVisibleItem.nxDgDfgGoodsGrandId;
          if (activeId && activeId !== this.data.activeSubCatId) {
            this.setData({
              activeSubCatId: activeId,
              subcatScrollIntoView: `subcat-${activeId}`
            });
          }
        }
      }
    });
  },


  toggleSubCatDis() {
    this.setData({
      showAllSubCat: !this.data.showAllSubCat
    });
  },


  // Dis点击标签事件
  onSubCatTapDis(e) {
    const subCatId = e.currentTarget.dataset.id;
    const hasGoods = this.data.goodsList.some(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));
    this.setData({
      showAllSubCat: false,
      activeSubCatId: String(subCatId),
      subcatScrollIntoView: `subcat-${subCatId}`
    });
    if (hasGoods) {
      // 已有商品，直接滚动
      this.setData({
        scrollIntoView: `cat-${subCatId}`
      });
    } else {

      this.loadGoodsBySubCatIdDis(subCatId, this.data.currentPage, this.data.goodsList);

    }
  },


  loadGoodsBySubCatIdDis(subCatId, page = 1, accumulatedGoods = []) {
    console.log('[拉取二级分类商品] subCatId:', subCatId, 'page:', page);
    nxDepGetDisFatherGoods({
      depId: this.data.depId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: page
    }).then(res => {
      console.log('[拉取二级分类商品] 接口返回:', res);
      if (res.result.code == 0) {
        const newGoods = res.result.page.list || [];
        const allGoods = accumulatedGoods.concat(newGoods);
        // 累计目标父类商品
        const targetGoods = allGoods.filter(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));
        const hasEnough = targetGoods.length >= this.data.limit;
        console.log('[拉取二级分类商品] 当前累计目标商品数:', targetGoods.length, 'limit:', this.data.limit, 'hasEnough:', hasEnough);

        if (hasEnough) {
          // 拉够一页，渲染并滚动
          const processed = this.processGoodsListDis(allGoods);
          this.setData({
            goodsList: processed,
            currentPage: page + 1,
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount,
            scrollIntoView: `cat-${subCatId}`
          });
          setTimeout(() => this.calculateCategoryPositionsDis(), 100);
        } else if (page < res.result.page.totalPage) {
          // 没拉够且还有下一页，递归拉取
          this.loadGoodsBySubCatIdDis(subCatId, page + 1, allGoods);
        } else {
          // 全部拉完也没拉够
          this.setData({
            goodsList: this.processGoodsListDis(allGoods),
            currentPage: page + 1,
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount
          });
          wx.showToast({
            title: '该分类下商品不足一页',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: '商品加载失败',
          icon: 'none'
        });
      }
    });
  },


  // 处理商品数据，添加分类信息
  processGoodsListDis(list) {
    // 先按分类ID排序
    list.sort((a, b) => a.nxDgDfgGoodsGrandId - b.nxDgDfgGoodsGrandId);
    let currentCategory = null;
    return list.map(item => {
      if (item.nxDgDfgGoodsGrandId !== currentCategory) {
        currentCategory = item.nxDgDfgGoodsGrandId;
        return {
          ...item,
          isFirstInCategory: true,
          categoryName: this.getCategoryNameDis(item.nxDgDfgGoodsGrandId)
        };
      }
      return {
        ...item,
        isFirstInCategory: false,
        categoryName: this.getCategoryNameDis(item.nxDgDfgGoodsGrandId)
      };
    });
  },

  // 计算分类位置
  calculateCategoryPositionsDis() {
    const query = wx.createSelectorQuery();
    query.selectAll('.goods-category-title').boundingClientRect();
    query.select('.goods-list').boundingClientRect();

    query.exec((res) => {
      if (res[0] && res[1]) {
        const listRect = res[1];
        const positions = res[0].map(item => ({
          id: item.id.replace('cat-', ''),
          top: item.top - listRect.top
        }));

        this.setData({
          categoryPositions: positions
        });
      }
    });
  },

  // 获取分类名称
  getCategoryNameDis(categoryId) {
    const category = this.data.fatherArr.find(item =>
      item.nxDistributerFatherGoodsId === categoryId
    );
    return category ? category.nxDfgFatherGoodsName : '';
  },

  


  //编辑订单

  confirmStandard(e) {
    console.log(e);
    console.log("confirmStandardconfirmStandardconfirmStandard")
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
   * 删除订货
   */
  delApply() {
    this.setData({
      deleteShow: true,
      showOperation: true,
      show: false
    })
  },


  toSearch() {
    wx.navigateTo({
      url: '../resGoodsSearch/resGoodsSearch',
    })
  },



  deleteYes() {
    this.setData({
      deleteShow: false,
    })
    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        if (that.data.tab1Index == 0) {

          var data1 = "depGoodsArrAi[" + this.data.fatherIndex + "].nxDepartmentDisGoodsEntities[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data1]: null
          })

          var data2 = "depGoodsArrAi[" + this.data.fatherIndex + "].newOrderCount";
          var count = this.data.depGoodsArrAi[this.data.fatherIndex].newOrderCount;
          this.setData({
            [data2]: count - 1,
          })

        }
        if (that.data.tab1Index == 1) {
          var data1 = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data1]: null
          })

          var data2 = "grandList[" + this.data.leftIndex + "].newOrderCount";
          var count = this.data.grandList[this.data.leftIndex].newOrderCount;
          this.setData({
            [data2]: count - 1,
          })
          var delFatherId = this.data.itemDis.nxDgDfgGoodsGrandId;
          var fatherArr = this.data.fatherArr;
          for (var i = 0; i < fatherArr.length; i++) {
            var id = fatherArr[i].nxDistributerFatherGoodsId;
            if (id == delFatherId) {
              var data3 = "fatherArr[" + i + "].newOrderCount";
              var count2 = this.data.fatherArr[i].newOrderCount;
              this.setData({
                [data3]: count2 - 1
              })
            }
          }

        }
        that._cancle()

      }
    })
  },

  deleteNo() {
    this.setData({
      applyItem: "",
      deleteShow: false,
    })
  },


  _cancle() {
    this.setData({
      show: false,
      applyStandardName: "",
      item: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: ""
    })
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

  onSubCatTapDep(e) {
    const subCatId = e.currentTarget.dataset.id;
    this.setData({
      activeSubCatIdDep: subCatId,
      subcatScrollIntoViewDep: `subcat-dep-${subCatId}`,
      showAllSubCatDep: false,
    });
  
    const hasGoods = this.data.depGoodsArrAi.some(item => String(item.nxDdgDisGoodsGrandId) === String(subCatId));
    if (hasGoods) {
      // 动态计算 scrollTop
      wx.createSelectorQuery()
        .select(`#cat-dep-${subCatId}`)
        .boundingClientRect(rect => {
          if (rect) {
            // 这里可以根据你的吸顶高度做补偿，比如 navBarHeight
            const navBarHeight = this.data.navBarHeight || 0;
            this.setData({
              depGoodsScrollTop: rect.top + this.data.depGoodsScrollTop - navBarHeight
            });
          }
        })
        .exec();
    } else {
      // 没有商品，加载数据
      this.loadGoodsBySubCatIdDep(subCatId, 1, this.data.depGoodsArrAi);
    }
  },

  // 加载指定二级分类的商品
  loadGoodsBySubCatIdDep(subCatId, page = 1, accumulatedGoods = []) {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    console.log('[拉取二级分类商品] subCatId:', subCatId, 'page:', page);
    
    depGetDepGoodsPage({
      depId: this.data.depId,
      limit: this.data.limit,
      page: page
    }).then(res => {
      this.setData({ isLoading: false });
      console.log('[拉取二级分类商品] 接口返回:', res);
      
      if (res.result.code == 0) {
        const newGoods = res.result.page.list || [];
        // 只保留当前一级分类下的商品
        const currentGreatId = this.data.depGoodsCataArr[this.data.selectedSub].nxDistributerFatherGoodsId;
        const filteredNewGoods = newGoods.filter(item => 
          String(item.nxDdgDisGoodsGreatId) === String(currentGreatId)
        );
        const allGoods = accumulatedGoods.concat(filteredNewGoods);
        
        // 累计目标父类商品
        const targetGoods = allGoods.filter(item => 
          String(item.nxDdgDisGoodsGrandId) === String(subCatId)
        );
        const hasEnough = targetGoods.length >= this.data.limit;
        const totalCount = res.result.page.totalCount || 0;
        
        console.log('[拉取二级分类商品] 当前累计目标商品数:', targetGoods.length, 'limit:', this.data.limit, 'hasEnough:', hasEnough, 'totalCount:', totalCount);

        if (hasEnough || page >= res.result.page.totalPage || allGoods.length >= totalCount) {
          // 拉够一页或已到最后一页或已达到总数，渲染并滚动
          const processed = this.processGoodsListDep(allGoods);
          this.setData({
            depGoodsArrAi: processed,
            currentPage: page + 1,
            totalPage: res.result.page.totalPage,
            totalCount: totalCount,
            scrollIntoViewDep: `cat-dep-${subCatId}`
          });
          
          if (!hasEnough) {
            wx.showToast({
              title: '该分类下商品不足一页',
              icon: 'none'
            });
          }
        } else {
          // 没拉够且还有下一页且未达到总数，递归拉取
          this.loadGoodsBySubCatIdDep(subCatId, page + 1, allGoods);
        }
      } else {
        wx.showToast({
          title: '商品加载失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载错误，请稍后再试',
        icon: 'none'
      });
    });
  },

  // 处理商品数据，添加分类信息
  processGoodsListDep(list) {
    // 先按分类ID排序
    list.sort((a, b) => a.nxDdgDisGoodsGrandId - b.nxDdgDisGoodsGrandId);
    let currentCategory = null;
    const result = list.map(item => {
      if (item.nxDdgDisGoodsGrandId !== currentCategory) {
        currentCategory = item.nxDdgDisGoodsGrandId;
        const obj = {
          ...item,
          isFirstInCategory: true,
          categoryName: this.getCategoryNameDep(item.nxDdgDisGoodsGrandId)
        };
        console.log('[processGoodsListDep] isFirstInCategory:true', obj.nxDdgDisGoodsGrandId, obj.nxDepartmentDisGoodsId);
        return obj;
      }
      const obj = {
        ...item,
        isFirstInCategory: false,
        categoryName: this.getCategoryNameDep(item.nxDdgDisGoodsGrandId)
      };
      console.log('[processGoodsListDep] isFirstInCategory:false', obj.nxDdgDisGoodsGrandId, obj.nxDepartmentDisGoodsId);
      return obj;
    });
    return result;
  },

  // 获取分类名称
  getCategoryNameDep(categoryId) {
    const category = this.data.fatherArr.find(item =>
      item.nxDistributerFatherGoodsId === categoryId
    );
    return category ? category.nxDfgFatherGoodsName : '';
  },

  // 切换二级分类展开/收起状态
  toggleSubCatDep() {
    this.setData({
      showAllSubCatDep: !this.data.showAllSubCatDep
    });
  },

  // 阻止遮罩层滚动
  stopScroll() {
    return false;
  },

  // 部门端商品滚动时联动二级分类高亮
  onGoodsScrollDep(e) {
    const query = wx.createSelectorQuery();
    query.selectAll('.goods-item-dep').boundingClientRect();
    query.select('.goods-list-dep').boundingClientRect();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const productRects = res[0];
        const listRect = res[1];
        // 找到第一个可见商品
        let minDiff = Infinity;
        let firstVisibleIndex = 0;
        for (let i = 0; i < productRects.length; i++) {
          const diff = productRects[i].top - listRect.top;
          if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            firstVisibleIndex = i;
          }
        }
        console.log('[onGoodsScrollDep] firstVisibleIndex', firstVisibleIndex);
        const firstVisibleItem = this.data.depGoodsArrAi[firstVisibleIndex];
        console.log('[onGoodsScrollDep] firstVisibleItem', firstVisibleItem);
        if (firstVisibleItem) {
          const activeId = firstVisibleItem.nxDdgDisGoodsGrandId;
          const greatId = firstVisibleItem.nxDdgDisGoodsGreatId;
          console.log('[onGoodsScrollDep] activeId', activeId, '当前activeSubCatIdDep', this.data.activeSubCatIdDep);
          
          // 更新二级分类状态&& activeId !== this.data.activeSubCatIdDep
          if (activeId ) {
            this.setData({
              activeSubCatIdDep: activeId,
              subcatScrollIntoViewDep: `subcat-dep-${activeId}`
            }, () => {
              console.log('[onGoodsScrollDep] 更新二级分类状态:', {
                activeId,
                subcatScrollIntoViewDep: `subcat-dep-${activeId}`
              });
            });
          }

          // 更新一级分类状态
          if (greatId) {
            const subIndex = this.data.depGoodsCataArr.findIndex(
              c => c.nxDistributerFatherGoodsId === greatId
            );
            console.log('[onGoodsScrollDep] 一级分类ID:', greatId, '当前选中索引:', this.data.selectedSub, '新索引:', subIndex);
            if (subIndex !== -1 && subIndex !== this.data.selectedSub) {
              this.setData({
                selectedSub: subIndex,
                fatherArr: this.data.depGoodsCataArr[subIndex].fatherGoodsEntities
              });
              console.log('[onGoodsScrollDep] setData selectedSub', subIndex);
            }
          }
        }
      } else {
        console.log('[onGoodsScrollDep] query结果无效', res);
      }
    });
  },

})