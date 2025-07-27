var load = require('../../lib/load.js');

const globalData = getApp().globalData;
var dateUtils = require('../../utils/dateUtil');
import apiUrl from '../../config.js'
const createRecycleContext = require('miniprogram-recycle-view');

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
  onReady() {
    setTimeout(() => {
      this.checkCategoryHighlight();
    }, 400); // 等待页面渲染（或你可以用 wx.nextTick）
  },
  
  
  onUnload() {
    if (this.categoryHighlighterTimer) {
      clearInterval(this.categoryHighlighterTimer);
      console.log('[Highlighter] onUnload, clear highlighter timer');
    }
  },
  _startCategoryHighlighter() {
    if (this.categoryHighlighterTimer) {
      clearInterval(this.categoryHighlighterTimer);
    }
    this.categoryHighlighterTimer = setInterval(() => {
      this.checkCategoryHighlight();
    }, 200);
    console.log('[Highlighter] Timer started');
  },
  
  checkCategoryHighlight() {
    const that = this;
    wx.createSelectorQuery().selectAll('[id^=category-]').boundingClientRect(function(rects){
      console.log('[Highlighter] Found category anchors:', rects);
      if (!rects || rects.length === 0) {
        console.warn('[Highlighter] No category anchors found');
        return;
      }
      let minDiff = Infinity, activeCategoryId = null;
      rects.forEach(rect => {
        // rect.top 是相对屏幕顶部的距离
        const diff = Math.abs(rect.top);
        console.log(`[Highlighter] Anchor id: ${rect.id}, top: ${rect.top}, diff: ${diff}`);
        if (diff < minDiff) {
          minDiff = diff;
          activeCategoryId = rect.id.split('-')[1];
        }
      });
      console.log('[Highlighter] Calculated activeCategoryId:', activeCategoryId, 'Current:', that.data.activeSubCatIdDep);
      if (activeCategoryId && activeCategoryId !== that.data.activeSubCatIdDep) {
        that.setData({
          activeSubCatIdDep: activeCategoryId
        }, () => {
          console.log('[Highlighter] Updated activeSubCatIdDep:', activeCategoryId);
        });
      }
    }).exec();
  },


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
    this.initRecycleView();

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

    getDepIdsLimit: 10,
    

  },

  onLoad: function (options) {
  
    var depValue = wx.getStorageSync('orderDepInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.nxDepartmentId,
        disId: depValue.nxDepartmentDisId,
        depFatherId: depValue.nxDepartmentFatherId  ? 0 : depValue.nxDepartmentId
      })
    
    }

    this._getInitDataDep();
    this.initRecycleView();
 
  },

  initRecycleView() {
    if (!this.ctx && this.data.depGoodsArrAi.length) {
      this.ctx = createRecycleContext({
        id: 'recycleId',
        dataKey: 'depGoodsArrAi',
        page: this,
        itemSize: {
          width: wx.getSystemInfoSync().windowWidth,
          height: 300 // 你的商品卡片高度
        }
      });
      this.ctx.append(this.data.depGoodsArrAi);
    }
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
        this.setData({
          // depGoodsCataArr: res.result.data.cataArr,
          // sortDepGoodsArr: res.result.data.depGoodsArr,
          // activeSubCatIdDep: firstSubCat.nxDistributerFatherGoodsId,
          // subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.nxDistributerFatherGoodsId}`,
          // fatherArr: res.result.data.cataArr[0].fatherGoodsEntities,
          // currentPage: 1,
          // depGoodsArrAi: []

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

          // 1，从 sortDepGoodsArr 中获取getDepIdsLimit 个字段nxDepartmentDisGoodsId
          // 2，给queryDepGoodsIds 从字段数组中赋值。
          // 3， 准备按 depIds 获取商品接口

        }, () => {
          this._getInitDataPageDep(true);
          // this._getInitDataByDepIds(true);
        });
      }
    });
  },



  // 全类别分页（跨分类补全）
  _getInitDataByDepIds(isRefresh = false, callback) {
    if (this.data.isLoading) return;
    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品…");

    depGetDepGoodsByIds({
     
     depGoodsIds: this.data.queryDepGoodsIds
    }).then(res => {
      load.hideLoading();
      this.setData({
        isLoading: false
      });

      if (res.result.code !== 0) {
        return wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }

      // 1) 拿到这一页数据
      const list = res.result.page.list || [];
      const totalPages = res.result.page.totalPage || 1;
      const totalCount = res.result.page.totalCount || 0;

      // 2) 生成 viewId，让 id 唯一且连续
      const base = isRefresh ? 0 : this.data.depGoodsArrAi.length;
      list.forEach((item, idx) => {
        item.viewId = 'goods_' + (base + idx);
      });

      // 3) 处理商品数据，添加 isFirstInCategory
      const processedList = this.processGoodsListDep(list);

      // 4) 合并或替换
      const merged = isRefresh ? processedList : this.data.depGoodsArrAi.concat(processedList);

      // 5) 写入并可回调滚动
      this.setData({
        depGoodsArrAi: merged,
        totalPages: totalPages,
        totalCount: totalCount
      }, () => {
         // 关键：每次数据变更后 append 到 recycle-view
         if (this.ctx) {
          this.ctx.append(this.data.depGoodsArrAi);
        }
       
        if (typeof callback === 'function') {
          setTimeout(callback, 50);
        }
      });
    });
  },


  // 全类别分页（跨分类补全）
  _getInitDataPageDep(isRefresh = false, callback) {
    if (this.data.isLoading) return;
    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品…");

    depGetDepGoodsPage({
      limit: this.data.limit,
      page: this.data.currentPage,
      depId: this.data.depInfo.nxDepartmentId
    }).then(res => {
      load.hideLoading();
      this.setData({
        isLoading: false
      });

      if (res.result.code !== 0) {
        return wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }

      // 1) 拿到这一页数据
      const list = res.result.page.list || [];
      const totalPages = res.result.page.totalPage || 1;
      const totalCount = res.result.page.totalCount || 0;

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
        const idOrder = this.data.sortDepGoodsArr; // 现在是整数数组
        const sortedArr = merged.slice().sort((a, b) => {
          return idOrder.indexOf(a.nxDepartmentDisGoodsId) - idOrder.indexOf(b.nxDepartmentDisGoodsId);
        });
        
      // 5) 写入并可回调滚动
      this.setData({
        depGoodsArrAi: sortedArr,
        totalPages: totalPages,
        totalCount: totalCount
      }, () => {
        if (typeof callback === 'function') {
          setTimeout(callback, 50);
        }
      });
    });
  },

  
  /**
   * 
   */
  // 点击左侧分类
  leftMenuClickDep(e) {
    const idx = e.currentTarget.dataset.index;
    const greatId = this.data.depGoodsCataArr[idx].nxDistributerFatherGoodsId;
    const firstSubCat = this.data.depGoodsCataArr[idx].fatherGoodsEntities[0];
    
    console.log('[leftMenuClickDep] 点击左侧菜单:', {
      index: idx,
      greatId: greatId,
      firstSubCatId: firstSubCat.nxDistributerFatherGoodsId,
      currentPage: this.data.currentPage,
      totalPages: this.data.totalPages,
      totalCount: this.data.totalCount
    });
    
    this.setData({
      selectedSub: idx,
      fatherArr: this.data.depGoodsCataArr[idx].fatherGoodsEntities,
      activeSubCatIdDep: firstSubCat.nxDistributerFatherGoodsId,
      subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.nxDistributerFatherGoodsId}`,
      currentPage: this.data.currentPage + 1  // 先增加页码
    }, () => {
      console.log('[leftMenuClickDep] setData 后:', {
        selectedSub: this.data.selectedSub,
        activeSubCatIdDep: this.data.activeSubCatIdDep,
        currentPage: this.data.currentPage,
        goodsCount: this.data.depGoodsArrAi.length,
        totalCount: this.data.totalCount
      });

      // 递归加载数据直到找到足够的二级分类商品
      const loadMorePages = () => {
        const hasEnoughGoods = this.data.depGoodsArrAi.some(item => 
          String(item.nxDdgDisGoodsGrandId) === String(firstSubCat.nxDistributerFatherGoodsId)
        );

        if (hasEnoughGoods || this.data.currentPage > this.data.totalPages) {
          console.log('[leftMenuClickDep] 数据加载完成:', {
            currentPage: this.data.currentPage,
            totalPages: this.data.totalPages,
            totalCount: this.data.totalCount,
            goodsCount: this.data.depGoodsArrAi.length,
            hasEnoughGoods
          });

          // 找到目标商品后，滚动到对应位置
          if (hasEnoughGoods) {
         
            this.setData({
              scrollIntoViewDep: `cat-dep-${firstSubCat.nxDistributerFatherGoodsId}`
            }, () => {
              console.log('[leftMenuClickDep] 滚动位置已设置:', {
                scrollIntoViewDep: `cat-dep-${firstSubCat.nxDistributerFatherGoodsId}`
              });
            });
          }
          return;
        }

        this._getInitDataPageDep(false, () => {
          // 继续加载下一页
          this.setData({
            currentPage: this.data.currentPage + 1
          }, () => {
            loadMorePages();
          });
        });
      };

      // 开始加载数据
      loadMorePages();
    });
  },
  

  // 滚动到底加载下一页（全类别模式）
  onReachBottomDep() {
    if (this.data.isLoading || this.data.currentPage >= this.data.totalPages) return;
    this.setData({
      currentPage: this.data.currentPage + 1
    }, () => {
      this._getInitDataPageDep(false);
    });
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
          var data = "depGoodsArrAi[" + this.data.index + "].nxDepartmentOrdersEntity";
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
    nxDepGetDisFatherGoods({
      depId: this.data.depId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: page
    }).then(res => {
    
      if (res.result.code == 0) {
        const newGoods = res.result.page.list || [];
        const allGoods = accumulatedGoods.concat(newGoods);
        // 累计目标父类商品
        const targetGoods = allGoods.filter(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));
        const hasEnough = targetGoods.length >= this.data.limit;
       

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

          var data1 = "depGoodsArrAi[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data1]: null
          })

        }
        if (that.data.tab1Index == 1) {
          var data1 = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data1]: null
          })


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
  
    // 新增：判断目标二级分类商品数量是否足够，并加日志
    const goodsArr = this.data.depGoodsArrAi;
    const limit = this.data.limit;
    // 找到第一个属于目标二级分类的商品的下标
    const idx = goodsArr.findIndex(item => String(item.nxDdgDisGoodsGrandId) === String(subCatId));
    let count = 0;
    if (idx !== -1) {
      for (let i = idx; i < goodsArr.length; i++) {
        if (String(goodsArr[i].nxDdgDisGoodsGrandId) === String(subCatId)) {
          count++;
        }
      }
    }
    console.log('[onSubCatTapDep] subCatId:', subCatId, 'limit:', limit, 'idx:', idx, 'count:', count, 'depGoodsArrAi.length:', goodsArr.length);
    if (count >= limit) {
      console.log('[onSubCatTapDep] 商品足够，直接滚动');
      wx.createSelectorQuery()
        .select(`#cat-dep-${subCatId}`)
        .boundingClientRect(rect => {
          if (rect) {
            const navBarHeight = this.data.navBarHeight || 0;
            this.setData({
              depGoodsScrollTop: rect.top + this.data.depGoodsScrollTop - navBarHeight
            });
          }
        })
        .exec();
    } else {
      console.log('[onSubCatTapDep] 商品不足，继续请求接口');
      this.loadGoodsBySubCatIdDep(subCatId, this.data.currentPage + 1, this.data.depGoodsArrAi);
    }
  },

  // 加载指定二级分类的商品
  loadGoodsBySubCatIdDep(subCatId, page = 1, accumulatedGoods = []) {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    depGetDepGoodsPage({
      depId: this.data.depId,
      limit: this.data.limit,
      page: page
    }).then(res => {
      this.setData({ isLoading: false });
      
      if (res.result.code == 0) {
        // 1) 拿到这一页数据
        const list = res.result.page.list || [];
        const totalPages = res.result.page.totalPage || 1;
        const totalCount = res.result.page.totalCount || 0;

        // 2) 生成 viewId，让 id 唯一且连续
        const base = this.data.depGoodsArrAi.length;
        list.forEach((item, idx) => {
          item.viewId = 'goods_' + (base + idx);
        });

        // 3) 处理商品数据，添加 isFirstInCategory
        const processedList = this.processGoodsListDep(list);

        // 4) 合并数据
        const merged = this.data.depGoodsArrAi.concat(processedList);

         // 新增：合并后按 sortDepGoodsArr 顺序排序
         const idOrder = this.data.sortDepGoodsArr; // 现在是整数数组
         const sortedArr = merged.slice().sort((a, b) => {
           return idOrder.indexOf(a.nxDepartmentDisGoodsId) - idOrder.indexOf(b.nxDepartmentDisGoodsId);
         });
         
     
        // 5) 写入并可回调滚动
        this.setData({
          depGoodsArrAi: sortedArr,
          currentPage: page + 1,
          totalPage: totalPages,
          totalCount: totalCount,
          scrollIntoViewDep: `cat-dep-${subCatId}`
        }, () => {
          // 新增：数据加载后自动滚动到目标分类商品
          const idx = merged.findIndex(item => String(item.nxDdgDisGoodsGrandId) === String(subCatId));
          let count = 0;
          if (idx !== -1) {
            for (let i = idx; i < merged.length; i++) {
              if (String(merged[i].nxDdgDisGoodsGrandId) === String(subCatId)) {
                count++;
              }
            }
          }
          if (count >= this.data.limit) {
            console.log('[loadGoodsBySubCatIdDep] 自动滚动到目标商品', subCatId);
            wx.createSelectorQuery()
              .select(`#cat-dep-${subCatId}`)
              .boundingClientRect(rect => {
                if (rect) {
                  const navBarHeight = this.data.navBarHeight || 0;
                  this.setData({
                    depGoodsScrollTop: rect.top + this.data.depGoodsScrollTop - navBarHeight
                  });
                }
              })
              .exec();
          }
        });
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
      
        return obj;
      }
      const obj = {
        ...item,
        isFirstInCategory: false,
        categoryName: this.getCategoryNameDep(item.nxDdgDisGoodsGrandId)
      };

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
    console.log("ee",e);
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
        const firstVisibleItem = this.data.depGoodsArrAi[firstVisibleIndex];
        if (firstVisibleItem) {
          const activeId = firstVisibleItem.nxDdgDisGoodsGrandId;
          const greatId = firstVisibleItem.nxDdgDisGoodsGreatId;
          
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
         
            if (subIndex !== -1 && subIndex !== this.data.selectedSub) {
              this.setData({
                selectedSub: subIndex,
                fatherArr: this.data.depGoodsCataArr[subIndex].fatherGoodsEntities
              });
            }
          }
        }
      } else {
      }
    });
  },

})