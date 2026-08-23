var load = require('../../lib/load.js');

const globalData = getApp().globalData;
var dateUtils = require('../../utils/dateUtil');
import apiUrl from '../../config.js'

import {
  depGetDepDisGoodsCata,
  depGetDepGoodsPage,

  nxDepSaveApply,
  updateOrder,
  deleteOrder,
  nxDepGetDisCataGoods,
  getNxGoodsIdsByGreatId,
  nxDepGetDisFatherGoods,
  saveCash,
  disSaveStandard,
  deleteDepGoods,
  getGoodsTierPriceList
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

    // 检查是否有新保存的订单需要更新
    this._checkAndUpdateOrderData();

  },

  /**
   * 检查并更新订单数据
   * 如果页面保存了新订单，则根据nxDepartmentDisGoodsId更新对应商品的nxDepartmentOrdersEntity
   */
  
  _checkAndUpdateOrderData() {
    console.log('=== 开始检查订单数据更新 ===');

    // 从本地存储获取新保存的订单信息
    const newOrderInfo = wx.getStorageSync('newOrderInfo');
    console.log('从本地存储获取的订单信息:', newOrderInfo);

    if (newOrderInfo && newOrderInfo.nxDepartmentDisGoodsId) {
      const {
        nxDepartmentDisGoodsId,
        nxDistributerGoodsId,
        nxDepartmentOrdersEntity
      } = newOrderInfo;
      console.log('解析的订单信息:', {
        nxDepartmentDisGoodsId,
        nxDistributerGoodsId,
        nxDepartmentOrdersEntity
      });

      // 在depGoodsArrAi中查找对应的商品
      const depGoodsArrAi = this.data.depGoodsArrAi;


      const targetIndex = depGoodsArrAi.findIndex(goods =>
        goods.nxDepartmentDisGoodsId === nxDepartmentDisGoodsId
      );

      if (targetIndex !== -1) {
        // 找到商品，更新 depGoodsDepOrderList 里的对应订单
        const orderList = this.data.depGoodsArrAi[targetIndex].depGoodsDepOrderList || [];
        const updatedOrder = nxDepartmentOrdersEntity;
        const orderId = updatedOrder.nxDepartmentOrdersId;
        let found = false;
        for (let j = 0; j < orderList.length; j++) {
          if (orderList[j].nxDepartmentOrdersId === orderId) {
            const updatePath = `depGoodsArrAi[${targetIndex}].depGoodsDepOrderList[${j}]`;
            console.log('更新depGoodsArrAi路径:', updatePath);
            this.setData({
              [updatePath]: updatedOrder
            });
            found = true;
            break;
          }
        }
        if (!found) {
          // 如果没找到，说明是新增订单，直接 push
          const updatePath = `depGoodsArrAi[${targetIndex}].depGoodsDepOrderList`;
          orderList.push(updatedOrder);
          this.setData({
            [updatePath]: orderList
          });
          console.log('depGoodsArrAi 新增订单:', updatePath);
        }
      }

      if (nxDistributerGoodsId && this.data.goodsList && this.data.goodsList.length > 0) {
        this._updateGoodsListOrder(nxDistributerGoodsId, nxDepartmentOrdersEntity);
      }


      // 清除本地存储的订单信息
      wx.removeStorageSync('newOrderInfo');
    }

  },
  /**
   * 更新goodsList中对应商品的订单信息
   */
  _updateGoodsListOrder(nxDistributerGoodsId, nxDepartmentOrdersEntity) {
    const goodsList = this.data.goodsList || [];
    for (let i = 0; i < goodsList.length; i++) {
      if (goodsList[i].nxDistributerGoodsId === nxDistributerGoodsId) {
        this._upsertGoodsListOrder(i, nxDepartmentOrdersEntity);
        break;
      }
    }
  },

  _isLargeUnitOrder(order, item) {
    if (!order || !item) {
      return false;
    }
    if (Number(order.nxDoCostPriceLevel) === 2) {
      return true;
    }
    if (order.nxDoStandard === item.nxDgWillPriceTwoStandard) {
      return true;
    }
    if (item.nxDgCartonUnit && order.nxDoStandard === item.nxDgCartonUnit) {
      return true;
    }
    return false;
  },

  _normalizeDisGoodsOrders(item) {
    var orders = [];
    if (item.disGoodsDepOrderList && item.disGoodsDepOrderList.length) {
      orders = item.disGoodsDepOrderList;
    } else if (item.nxDepartmentOrdersEntities && item.nxDepartmentOrdersEntities.length) {
      orders = item.nxDepartmentOrdersEntities;
    } else if (item.nxDepartmentOrdersEntity) {
      orders = [item.nxDepartmentOrdersEntity];
    }
    var map = new Map();
    orders.forEach(function (o) {
      if (o && o.nxDepartmentOrdersId != null) {
        map.set(o.nxDepartmentOrdersId, o);
      }
    });
    return Array.from(map.values());
  },

  _attachDisGoodsOrders(item) {
    var list = this._normalizeDisGoodsOrders(item);
    item.disGoodsDepOrderList = list;
    item.nxDepartmentOrdersEntities = list;
    item.nxDepartmentOrdersEntity = list.length > 0 ? list[0] : null;
    item._hasSmallOrder = list.some(o => !this._isLargeUnitOrder(o, item));
    item._hasLargeOrder = list.some(o => this._isLargeUnitOrder(o, item));
    return item;
  },

  _upsertGoodsListOrder(goodsIndex, order) {
    if (goodsIndex == null || goodsIndex < 0 || !order) {
      return;
    }
    var goods = this.data.goodsList[goodsIndex];
    if (!goods) {
      return;
    }
    var list = this._normalizeDisGoodsOrders(goods);
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].nxDepartmentOrdersId === order.nxDepartmentOrdersId) {
        list[i] = order;
        found = true;
        break;
      }
    }
    if (!found) {
      list.push(order);
    }
    this.setData({
      ['goodsList[' + goodsIndex + '].disGoodsDepOrderList']: list,
      ['goodsList[' + goodsIndex + '].nxDepartmentOrdersEntities']: list,
      ['goodsList[' + goodsIndex + '].nxDepartmentOrdersEntity']: list[0] || null,
      ['goodsList[' + goodsIndex + ']._hasSmallOrder']: list.some(o => !this._isLargeUnitOrder(o, goods)),
      ['goodsList[' + goodsIndex + ']._hasLargeOrder']: list.some(o => this._isLargeUnitOrder(o, goods)),
    });
  },

  _removeGoodsListOrder(goodsIndex, orderId) {
    if (goodsIndex == null || goodsIndex < 0 || orderId == null) {
      return;
    }
    var goods = this.data.goodsList[goodsIndex];
    if (!goods) {
      return;
    }
    var list = this._normalizeDisGoodsOrders(goods).filter(function (o) {
      return o.nxDepartmentOrdersId !== orderId;
    });
    this.setData({
      ['goodsList[' + goodsIndex + '].disGoodsDepOrderList']: list,
      ['goodsList[' + goodsIndex + '].nxDepartmentOrdersEntities']: list,
      ['goodsList[' + goodsIndex + '].nxDepartmentOrdersEntity']: list[0] || null,
      ['goodsList[' + goodsIndex + ']._hasSmallOrder']: list.some(o => !this._isLargeUnitOrder(o, goods)),
      ['goodsList[' + goodsIndex + ']._hasLargeOrder']: list.some(o => this._isLargeUnitOrder(o, goods)),
    });
  },



  data: {
    guestMode: false,
    priceLevel: "",
    item: "",
    url: "",

    editApply: false,
    editOrderIndex: "",
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    applySubtotal: "",
    applySubtotalPending: false,
    applyPriceStandard: "",
    item: {},
    itemDis: null,
    maskHeight: "",
    statusBarHeight: "",
    windowHeight: "",
    windowWidth: "",
    tab1Index: 0,
    itemIndex: 0,
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,

    showInd: false,
    item: "",
    depGoods: null,

    tabs: [{
      id: 0,
      words: "我的商品"
    }, {
      id: 1,
      words: "配送手册"
    }],


    totalPages: 0,
    totalCount: 0,
    limit: 30,
    currentPage: 1,
    fatherArr: [],
    scrollTopLeft: 0,
    depGoodsArrAi: [],
    selectedSub: 0, // 选中的分类

    totalPageDis: 0,
    totalCountDis: 0,
    limit: 30,
    currentPageDis: 1,
    grandList: [],
    fatherArrDis: [],
    sortDepGoodsArrDis: [],
    goodsList: [],
    leftGreatId: "",
    greatName: "",
    leftIndex: 0,
    disGoodsScrollTop: 0,
    manualFilterGrandId: null,
    manualRequestSeq: 0,

    isLoading: false,

    update: false,

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

    tierSaleRule: null,
    tierPrices: [],
    tierDisplayUnit: '',
    showTierPricing: false,
    applyCurrentUnitPrice: '',
    tierPriceCache: {},
    tierPriceRequestSeq: 0,
    activeTierId: '',
    orderModalClosing: false,

  },


  onLoad: function (options) {

    const guestMode = String(options.guest || '') === '1';

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
        depFatherId: depValue.nxDepartmentFatherId === 0 ?
          depValue.nxDepartmentId : depValue.nxDepartmentFatherId
      })

      if(depValue.nxDepartmentFatherId !== 0){
        console.log("duodudodo")
        var depName = '"' + depValue.nxDepartmentName +'"'+ '的商品';
         var data = "tabs";
        var dataItem =  
         [{
          id: 0,
          words:  depName
        }, {
          id: 1,
          words: "配送手册"
        }];
        this.setData({
          [data]: dataItem
        })
      }

    }

    if (guestMode) {
      const guestDepartment = depValue || {
        nxDepartmentId: Number(options.depId || options.depFatherId),
        nxDepartmentFatherId: Number(options.depFatherId || 0),
        nxDepartmentDisId: Number(options.disId),
        nxDepartmentSettleType: Number(options.depSettleType),
        nxDepartmentWorkingStatus: 0
      };
      this.setData({
        guestMode: true,
        userInfo: null,
        depInfo: guestDepartment,
        // 游客读取配送手册时不携带部门 id，避免带出部门订单数据。
        depId: '-1',
        disId: options.disId || guestDepartment.nxDepartmentDisId,
        depFatherId: options.depFatherId || guestDepartment.nxDepartmentId,
        tab1Index: 1,
        itemIndex: 1,
      }, () => this.initDisData());
      return;
    }

    this._getInitDataDep();

  },


  //部门商品
  _getInitDataDep() {
    load.showLoading("获取分类");
    var data = {
      disId: this.data.disId,
      depId: this.data.depInfo.nxDepartmentId
    }
    depGetDepDisGoodsCata(data).then(res => {
      load.hideLoading();
      if (res.result.code === 0 && res.result.data.cataArr.length > 0) {
        const firstSubCat = res.result.data.cataArr[0].fatherGoodsEntities[0];
        this.setData({

          depGoodsCataArr: res.result.data.cataArr,
          sortDepGoodsArr: res.result.data.depGoodsArr,
          lastQueryEndIndex: 0,
          hasMoreGoods: true,
          activeSubCatIdDep: firstSubCat.nxDistributerFatherGoodsId,
          subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.nxDistributerFatherGoodsId}`,
          fatherArr: res.result.data.cataArr[0].fatherGoodsEntities,
          depGoodsArrAi: [],
        }, () => {
          this._getInitDataPageDep(true);
        });
      }
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

      // 3) 合并数据
      const merged = this.data.depGoodsArrAi.concat(list);

      // 4) 合并后按 sortDepGoodsArr 顺序排序
      const idOrder = (this.data.sortDepGoodsArr || []).map(String);

      const sortedArr = merged.slice().sort((a, b) => {
        const idxA = idOrder.indexOf(String(a.nxDepartmentDisGoodsId));
        const idxB = idOrder.indexOf(String(b.nxDepartmentDisGoodsId));
        return (idxA === -1 ? 99999 : idxA) - (idxB === -1 ? 99999 : idxB);
      });

      // 5) 处理商品数据，添加 isFirstInCategory（对全量商品处理）
      const finalArr = this.processGoodsListDep(sortedArr);

      // 5) 写入并可回调滚动
      this.setData({
        depGoodsArrAi: finalArr,
        totalPages: totalPages,
        totalCount: totalCount,
        currentPage: this.data.currentPage,

      }, () => {
        this.calculateCategoryPositionsDep();
        if (typeof callback === 'function') {
          setTimeout(callback, 50);
        }
      });
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


  /**
   * 
   */
  // 点击左侧分类
  leftMenuClickDep(e) {
    const idx = e.currentTarget.dataset.index;
    const firstSubCat = this.data.depGoodsCataArr[idx].fatherGoodsEntities[0];
    this.setData({
      selectedSub: idx,
      fatherArr: this.data.depGoodsCataArr[idx].fatherGoodsEntities,
      activeSubCatIdDep: firstSubCat.nxDistributerFatherGoodsId,
      subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.nxDistributerFatherGoodsId}`,
    }, () => {
      // 检查当前已加载的商品中是否有该二级分类的商品
      const goodsArr = this.data.depGoodsArrAi;
      const hasGoods = goodsArr.some(
        item => String(item.nxDdgDisGoodsGrandId) === String(firstSubCat.nxDistributerFatherGoodsId)
      );

      if (hasGoods) {
        this.setData({
          scrollIntoViewDep: `cat-dep-${firstSubCat.nxDistributerFatherGoodsId}`
        }, () => {

        });
      } else {
        // 直接调用loadGoodsBySubCatIdDep方法，请求特定分类的商品
        this.loadGoodsBySubCatIdDep(firstSubCat.nxDistributerFatherGoodsId, this.data.currentPage + 1, goodsArr);
      }
    });
  },


  onSubCatTapDep(e) {
    const subCatId = e.currentTarget.dataset.id;
    this.setData({
      activeSubCatIdDep: subCatId,
      subcatScrollIntoViewDep: `subcat-dep-${subCatId}`,
      showAllSubCatDep: false,
    });

    // 修正：统计该二级分类商品数量
    const goodsArr = this.data.depGoodsArrAi;

    const hasGoods = goodsArr.some(
      item => String(item.nxDdgDisGoodsGrandId) === String(subCatId)
    );
    if (hasGoods) {
      wx.createSelectorQuery()
        .select(`#cat-dep-${subCatId}`)
        .boundingClientRect(rect => {
          if (rect) {
            this.setData({
              scrollIntoViewDep: 'cat-dep-' + subCatId
            });
          }
        })
        .exec();
    } else {
      // 递归请求接口，page 参数递增
      this.loadGoodsBySubCatIdDep(subCatId, this.data.currentPage + 1, goodsArr);
    }
  },

  // 加载指定二级分类的商品
  loadGoodsBySubCatIdDep(subCatId, page = 1, accumulatedGoods = []) {
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品")
    depGetDepGoodsPage({
      depId: this.data.depId,
      limit: this.data.limit,
      page: page,
    }).then(res => {
      this.setData({
        isLoading: false
      });
      load.hideLoading();
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


        // 3) 合并数据
        const merged = this.data.depGoodsArrAi.concat(list);

        // 4) 合并后按 sortDepGoodsArr 顺序排序
        const idOrder = (this.data.sortDepGoodsArr || []).map(String);

        const sortedArr = merged.slice().sort((a, b) => {
          const idxA = idOrder.indexOf(String(a.nxDepartmentDisGoodsId));
          const idxB = idOrder.indexOf(String(b.nxDepartmentDisGoodsId));
          return (idxA === -1 ? 99999 : idxA) - (idxB === -1 ? 99999 : idxB);
        });

        // 5) 处理商品数据，添加 isFirstInCategory（对全量商品处理）
        const finalArr = this.processGoodsListDep(sortedArr);

        // 5) 写入并可回调滚动
        this.setData({
          depGoodsArrAi: finalArr,
          currentPage: page,
          totalPages: totalPages,
          totalCount: totalCount,
        }, () => {
          // 新增：数据加载后自动滚动到目标分类商品
          const goodsArr = this.data.depGoodsArrAi;
          const idx = goodsArr.findIndex(item => String(item.nxDdgDisGoodsGrandId) === String(subCatId));

          if (idx !== -1) {
            wx.createSelectorQuery()
              .select(`#cat-dep-${subCatId}`)
              .boundingClientRect(rect => {
                if (rect) {
                  this.setData({
                    scrollIntoViewDep: 'cat-dep-' + subCatId
                  }, () => {

                  });
                } else {
                  console.warn('[loadGoodsBySubCatIdDep] 未找到目标商品锚点', subCatId);
                }
              })
              .exec();
          } else {
            // 如果还有下一页，继续请求
            if (page < totalPages) {
              // 递归调用自身，请求下一页
              this.loadGoodsBySubCatIdDep(subCatId, page + 1, goodsArr);
            } else {}
          }
          this.calculateCategoryPositionsDep();
        });

      } else {
        wx.showToast({
          title: '商品加载失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({
        isLoading: false
      });
      wx.showToast({
        title: '加载错误，请稍后再试',
        icon: 'none'
      });
    });
  },

  // 处理商品数据，添加分类信息
  processGoodsListDep(list) {
    // 先按分类ID排序
    // list.sort((a, b) => a.nxDdgDisGoodsGrandId - b.nxDdgDisGoodsGrandId);
    let currentCategory = null;
    const result = list.map(item => {
      const priceItem = this._attachDepPriceCompare(item);
      if (item.nxDdgDisGoodsGrandId !== currentCategory) {
        currentCategory = item.nxDdgDisGoodsGrandId;
        const obj = {
          ...priceItem,
          isFirstInCategory: true,
          categoryName: this.getCategoryNameDep(item.nxDdgDisGoodsGrandId)
        };

        return obj;
      }
      const obj = {
        ...priceItem,
        isFirstInCategory: false,
        categoryName: this.getCategoryNameDep(item.nxDdgDisGoodsGrandId)
      };

      return obj;
    });
    return result;
  },

  _toValidPrice(value) {
    if (value === null || value === undefined || value === '' || value === 'null') {
      return null;
    }
    var n = Number(value);
    if (!n || n <= 0 || n === 0.1) {
      return null;
    }
    return n;
  },

  _formatDisplayPrice(value) {
    var n = this._toValidPrice(value);
    if (n === null) {
      return '';
    }
    return String(Number(n.toFixed(2)));
  },

  _getDepGoodsDisGoods(depGoods) {
    return depGoods && depGoods.nxDistributerGoodsEntity ? depGoods.nxDistributerGoodsEntity : (depGoods || {});
  },

  // 按计价级别统一解析商品的大小包装单位名（oneStd / twoStd 的唯一来源）
  _getDisGoodsStandardByLevel(disGoods, priceLevel) {
    if (Number(priceLevel) === 2) {
      return String(disGoods.nxDgWillPriceTwoStandard || disGoods.nxDgCartonUnit || '').trim();
    }
    return String(disGoods.nxDgWillPriceOneStandard || disGoods.nxDgGoodsStandardname || '').trim();
  },

  _getDepGoodsBasePriceInfo(depGoods) {
    var disGoods = this._getDepGoodsDisGoods(depGoods);
    var depStandard = String((depGoods && (depGoods.nxDdgOrderStandard || depGoods.nxDdgDepGoodsStandardname)) || '').trim();
    var oneStd = this._getDisGoodsStandardByLevel(disGoods, 1);
    var twoStd = this._getDisGoodsStandardByLevel(disGoods, 2);
    var price = null;
    var standard = depStandard || oneStd;

    if (depStandard && oneStd && depStandard === oneStd) {
      price = this._toValidPrice(disGoods.nxDgWillPriceOne);
      standard = oneStd;
    } else if (depStandard && twoStd && depStandard === twoStd) {
      price = this._toValidPrice(disGoods.nxDgWillPriceTwo);
      standard = twoStd;
    } else {
      price = this._toValidPrice(disGoods.nxDgWillPriceOne);
      standard = oneStd || depStandard;
    }

    return {
      price: price,
      standard: standard,
    };
  },

  _getDepGoodsFinalPrice(depGoods, goodsPrice) {
    var depPrice = this._toValidPrice(depGoods && depGoods.nxDdgOrderPrice);
    // 允许传入已算好的 basePrice，避免对同一商品重复计算 _getDepGoodsBasePriceInfo
    if (goodsPrice === undefined) {
      goodsPrice = this._getDepGoodsBasePriceInfo(depGoods).price;
    }
    if (depPrice !== null && goodsPrice !== null) {
      return Math.min(depPrice, goodsPrice);
    }
    return depPrice !== null ? depPrice : goodsPrice;
  },

  _attachDepPriceCompare(item) {
    var depPrice = this._toValidPrice(item.nxDdgOrderPrice);
    var goodsPriceInfo = this._getDepGoodsBasePriceInfo(item);
    var goodsPrice = goodsPriceInfo.price;
    var finalPrice = this._getDepGoodsFinalPrice(item, goodsPrice);
    return Object.assign({}, item, {
      _depPriceText: this._formatDisplayPrice(depPrice),
      _goodsPriceText: this._formatDisplayPrice(goodsPrice),
      _finalPriceText: this._formatDisplayPrice(finalPrice),
      _goodsPriceStandard: goodsPriceInfo.standard || item.nxDdgOrderStandard || item.nxDdgDepGoodsStandardname,      _showGoodsPrice: goodsPrice !== null && (depPrice === null || goodsPrice !== depPrice),
      _strikeGoodsPrice: goodsPrice !== null && depPrice !== null && goodsPrice > depPrice,
      _strikeDepPrice: goodsPrice !== null && depPrice !== null && depPrice > goodsPrice,
      _useGoodsPrice: goodsPrice !== null && depPrice !== null && depPrice > goodsPrice,
      _hasDepOrder: !!(item.depGoodsDepOrderList && item.depGoodsDepOrderList.length),
    });
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
    // 精准高亮二级分类，并联动一级分类
    const scrollTop = e && e.detail && typeof e.detail.scrollTop === 'number' ? e.detail.scrollTop : 0;
    const positions = this.data.categoryPositionsDep || [];
    let activeId = '';
    for (let i = positions.length - 1; i >= 0; i--) {
      if (scrollTop >= positions[i].top) {
        activeId = positions[i].id;
        break;
      }
    }
    // 边界兜底：如果没找到，默认第一个
    if (!activeId && positions.length > 0) {
      activeId = positions[0].id;
    }
    // 二级分类高亮
    if (activeId && activeId !== this.data.activeSubCatIdDep) {
      this.setData({
        activeSubCatIdDep: activeId,
        subcatScrollIntoViewDep: `subcat-dep-${activeId}`
      });
    } else {}
    // 联动一级分类高亮
    if (activeId && this.data.depGoodsCataArr) {
      // 找到当前二级分类对应的一级分类id
      let greatId = '';
      const item = this.data.depGoodsArrAi.find(g => String(g.nxDdgDisGoodsGrandId) === String(activeId));
      if (item) {
        greatId = item.nxDdgDisGoodsGreatId;
      }
      // 在 depGoodsCataArr 里找 greatId 的索引
      const subIndex = this.data.depGoodsCataArr.findIndex(
        c => String(c.nxDistributerFatherGoodsId) === String(greatId)
      );

      if (subIndex !== -1 && subIndex !== this.data.selectedSub) {
        this.setData({
          selectedSub: subIndex,
          fatherArr: this.data.depGoodsCataArr[subIndex].fatherGoodsEntities
        });
      } else {}
    }
  },

  // 1. 新增：部门端商品分类锚点位置缓存
  calculateCategoryPositionsDep() {
    const query = wx.createSelectorQuery();
    query.selectAll('.goods-category-title-dep').boundingClientRect();
    query.select('.goods-list-dep').boundingClientRect();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const listRect = res[1];
        // 先计算所有原始 top
        let rawPositions = res[0].map(item => ({
          id: item.id.replace('cat-dep-', ''),
          top: item.top - listRect.top
        }));
        // 取第一个的 top 作为基准
        const baseTop = rawPositions.length > 0 ? rawPositions[0].top : 0;
        // 重新计算所有 top，让第一个为 0
        let positions = rawPositions.map((item, idx) => ({
          id: item.id,
          top: item.top - baseTop
        }));
        // 按 top 从小到大排序
        positions.sort((a, b) => a.top - b.top);
        this.setData({
          categoryPositionsDep: positions
        });

      } else {}
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

  showDialogBtnDep: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
      showIndDep: true,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth
    })
  },


  /**
   * tabItme点击
   */

  onTab1Click(event) {
    if (this.data.guestMode) return;
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,
    })
  },

  swiperChange(event) {
    if (this.data.guestMode) {
      if (event.detail.current !== 1) {
        this.setData({ tab1Index: 1, itemIndex: 1 });
      }
      return;
    }
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,

      searchId: "",

    })
    if (this.data.tab1Index == 0 && this.data.depGoodsArrAi.length == 0) {
      this._getInitDataDep();
    }
    if (this.data.tab1Index == 1 && this.data.goodsList.length == 0) {
      this.initDisData();

    }
  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */

  changeStandard: function (e) {
    var name = e.detail ? e.detail.applyStandardName : e.currentTarget.dataset.name;
    this.setData({
      applyStandardName: name,
      priceLevel: e.detail ? e.detail.level : this.data.priceLevel,
    })
    var levelTwoStandard = "";
    if (this.data.itemDis != null) {
      levelTwoStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
      if (this.data.applyStandardName == levelTwoStandard) {
        this.setData({
          printStandard: levelTwoStandard
        })
      } else {
        this.setData({
          printStandard: this.data.itemDis.nxDgGoodsStandardname
        })
      }
    } else {
      levelTwoStandard = this.data.depGoods.nxDgWillPriceTwoStandard;
      if (this.data.applyStandardName == levelTwoStandard) {
        this.setData({
          printStandard: levelTwoStandard
        })
      } else {
        this.setData({
          printStandard: this.data.depGoods.nxDdgDepGoodsStandardname
        })
      }
    }
    this._refreshTierRangeText();
    this._updateShowTierPricing(() => {
      this._recalcApplySubtotal();
    });
  },


  // 
  applyGoodsDep(e) {
    if (this._promptGuestRegistration()) return;
    this._cancelOrderModalCloseTimer();
    var depGoods = e.currentTarget.dataset.depgoods;
    var standard = depGoods.nxDdgDepGoodsStandardname;
    this.setData({
      editOrderIndex: e.currentTarget.dataset.index,
      depGoods: depGoods,
      itemDis: null,
      applyStandardName: standard,
      applyRemark: depGoods.nxDdgOrderRemark || '',
      applyNumber: '1',
      priceLevel: e.currentTarget.dataset.level || 1,
      editApply: false,
      canSave: true,
      showCashDep: true,
      showCash: false,
      orderModalClosing: false,
    }, () => {
      this._openOrderModalWithTierPrice();
    });
  },


  // 
  applyGoods(e) {
    if (this._promptGuestRegistration()) return;
    this._cancelOrderModalCloseTimer();
    var item = e.currentTarget.dataset.item;
    this.setData({
      fatherIndex: e.currentTarget.dataset.fatherindex,
      grandIndex: e.currentTarget.dataset.grandindex,
      editOrderIndex: e.currentTarget.dataset.index,
      itemDis: item,
      applyStandardName: e.currentTarget.dataset.standard,
      depGoods: e.currentTarget.dataset.depgoods,
      applyNumber: '1',
      applyRemark: '',
      editApply: false,
      canSave: true,
      showCash: true,
      showCashDep: false,
      orderModalClosing: false,
      priceLevel: e.currentTarget.dataset.level,
    }, () => {
      this._openOrderModalWithTierPrice();
    });
  },



  //depGoodsEdit
  toEditApplyDep(e) {
    this._cancelOrderModalCloseTimer();
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.nxDoPurchaseStatus;
    console.log("orderitmememememe", applyItem);
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

        editOrderIndex: e.currentTarget.dataset.index,
        applyItem: e.currentTarget.dataset.order,
        showCashDep: true,
        showCash: false,
        orderModalClosing: false,
        itemDis: null,
        goodsName: e.currentTarget.dataset.depgoods.nxDdgDepGoodsName,
        applyStandardName: applyItem.nxDoStandard,
        editApply: true,
        applyNumber: String(applyItem.nxDoQuantity),
        applyRemark: applyItem.nxDoRemark,
        depGoods: e.currentTarget.dataset.depgoods,
        priceLevel: applyItem.nxDoCostPriceLevel,
        printStandard: applyItem.nxDoPrintStandard,
      }, () => {
        this._openOrderModalWithTierPrice();
      })
    }
  },


  //nxDisEdit
  toEditApply(e) {
    this._cancelOrderModalCloseTimer();
   

    if (e.currentTarget.dataset.order.nxDoPurchaseStatus < 5) {
      var applyItem = e.currentTarget.dataset.order;
      this.setData({
        applyItem: e.currentTarget.dataset.order,
        editOrderIndex: e.currentTarget.dataset.index,
        showCash: true,
        showCashDep: false,
        orderModalClosing: false,
        applySubtotal: applyItem.nxDoSubtotal,
        applyStandardName: applyItem.nxDoStandard,
        printStandard: applyItem.nxDoPrintStandard,
        itemDis: e.currentTarget.dataset.item,
        depGoods: e.currentTarget.dataset.depgoods,
        editApply: true,
        applyNumber: String(applyItem.nxDoQuantity),
        applyRemark: applyItem.nxDoRemark,
        priceLevel: e.currentTarget.dataset.level || applyItem.nxDoCostPriceLevel,
        printStandard: applyItem.nxDoPrintStandard,
      }, () => {
        this._openOrderModalWithTierPrice();
      })

     
    } else {
      wx.showToast({
        title: '请供货商修改订单状态',
        icon: 'none'
      })

    }

    this.setData({
      showOperationGoods: false
    })
  },


  // 保存订货订单
  confirmCashDep: function (e) {
    if (this.data.editApply) {
      this._updateDisOrderCash(e);
    } else {
      this._saveOrderDep(e);
    }

    this.setData({
      showCashDep: false,
      showCash: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      applySubtotal: "",
      applySubtotalPending: false,
      applyPriceStandard: "",
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
      showCash: false,
      showCashDep: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      applySubtotal: "",
      applySubtotalPending: false,
      applyPriceStandard: "",
    })
  },


  _saveOrderCash: function (e) {
    console.log("_saveOrderCash_saveOrderCash_saveOrderCash")
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = this._getSubmitUnitPrice();
   

    var weight = null;
    var subtotal = price && price !== '0.1' && this._canCalculateApplySubtotal()
      ? (Number(price) * Number(e.detail.applyNumber || 0)).toFixed(1)
      : null;
    var costSubtotal = 0;
    var profitSubtotal = 0;
    var costPrice = this.data.itemDis.nxDgBuyingPrice;

    //是否给weight赋值
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
      nxDoPrice: price && price !== '0.1' ? String(price) : null,
      nxDoWeight: weight,
      nxDoSubtotal: subtotal,
     
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
      nxDoCostPriceLevel: this.data.priceLevel,
      nxDoPrintStandard: this.data.printStandard || e.detail.applyStandardName,
    };

    console.log("savcash",dg);
    saveCash(dg).then(res => {
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        
        wx.showToast({
          title: '保存成功',
        })

        this._upsertGoodsListOrder(this.data.editOrderIndex, res.result.data);
       
        // 新增：同步更新 depGoodsArrAi
        if (res.result.data.nxDoDepDisGoodsId !== -1) {
          const depGoodsArrAi = this.data.depGoodsArrAi || [];
          const depDisGoodsId = res.result.data.nxDoDepDisGoodsId;
          for (let i = 0; i < depGoodsArrAi.length; i++) {
            if (depGoodsArrAi[i].nxDepartmentDisGoodsId === depDisGoodsId) {
              // 使用新的数据结构：depGoodsDepOrderList
              let orderList = depGoodsArrAi[i].depGoodsDepOrderList || [];
              orderList.push(res.result.data);
              const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList`;
              this.setData({
                [updatePath]: orderList
              });
              break;
            }
          }
        }

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


  _updateDisOrderCash(e){
    var price = this._getSubmitUnitPrice();
    var subtotal = price && this._canCalculateApplySubtotal()
      ? (Number(price) * Number(e.detail.applyNumber || 0)).toFixed(1)
      : null;
    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard || this.data.applyPriceStandard || e.detail.applyStandardName,
      priceLevel: this.data.priceLevel,
      price: price,
      subtotal: subtotal
    };
    console.log("updatate", dg);
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        
        load.hideLoading();
        this._cancle();
         
        const updatedOrder = res.result.data; // 新的订单对象
        const depDisGoodsId = updatedOrder.nxDoDepDisGoodsId;
        const orderId = updatedOrder.nxDepartmentOrdersId;
        const nxDistributerGoodsId = updatedOrder.nxDoDisGoodsId;
        
        console.log('=== _updateDisOrder 开始同步更新数据 ===');
        console.log('订单数据:', updatedOrder);
        console.log('depDisGoodsId:', depDisGoodsId);
        console.log('orderId:', orderId);
        console.log('nxDistributerGoodsId:', nxDistributerGoodsId);

        // 1. 更新 depGoodsArrAi 中的订单
        if (depDisGoodsId !== -1) {
          const depGoodsArrAi = this.data.depGoodsArrAi || [];
          console.log('depGoodsArrAi 长度:', depGoodsArrAi.length);
          
          for (let i = 0; i < depGoodsArrAi.length; i++) {
            if (depGoodsArrAi[i].nxDepartmentDisGoodsId === depDisGoodsId) {
              console.log(`找到匹配的 depGoodsArrAi[${i}]`);
              let orderList = depGoodsArrAi[i].depGoodsDepOrderList || [];
              
              // 查找并更新现有订单
              let orderFound = false;
              for (let j = 0; j < orderList.length; j++) {
                if (orderList[j].nxDepartmentOrdersId === orderId) {
                  console.log(`找到匹配的订单，更新 depGoodsArrAi[${i}].depGoodsDepOrderList[${j}]`);
                  const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList[${j}]`;
                  this.setData({
                    [updatePath]: updatedOrder
                  });
                  orderFound = true;
                  break;
                }
              }
              
              if (!orderFound) {
                console.log('未找到匹配的订单，添加新订单到 depGoodsArrAi');
                orderList.push(updatedOrder);
                const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList`;
                this.setData({
                  [updatePath]: orderList
                });
              }
              break;
            }
          }
        }

        // 2. 更新 goodsList 中的订单
        const goodsList = this.data.goodsList || [];
        console.log('goodsList 长度:', goodsList.length);
        
        for (let i = 0; i < goodsList.length; i++) {
          if (goodsList[i].nxDistributerGoodsId === nxDistributerGoodsId) {
            console.log(`找到匹配的 goodsList[${i}]`);
            this._upsertGoodsListOrder(i, updatedOrder);
            break;
          }
        }

        console.log('=== _updateDisOrder 数据同步完成 ===');


      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })

  },





  _saveOrderDep: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var priceNum = this._getDepGoodsFinalPrice(this.data.depGoods);
    var price = priceNum !== null ? String(priceNum) : null;
    var weight = null;
    var subtotal = priceNum !== null && this._canCalculateApplySubtotal() ? (Number(priceNum) * Number(e.detail.applyNumber || 0)).toFixed(1) : null;
    var userId = -1;
    if(this.data.userInfo !== null){
       userId = this.data.userInfo.nxDepartmentUserId;
    }
    var dg = {
      nxDoOrderUserId: userId,
      nxDoDepDisGoodsId: this.data.depGoods.nxDepartmentDisGoodsId,
      nxDoDisGoodsId: this.data.depGoods.nxDdgDisGoodsId, //1
      nxDoDepartmentId: this.data.depId,
      nxDoDistributerId: this.data.disId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoQuantity: e.detail.applyNumber,
      nxDoPrice: price,
      nxDoWeight: weight,
      nxDoSubtotal: subtotal,
      nxDoStandard: e.detail.applyStandardName,
      nxDoRemark: e.detail.applyRemark,
      nxDoIsAgent: 3,
      nxDoArriveDate: arriveDate,
      nxDoArriveWeeksYear: weekYear,
      nxDoArriveOnlyDate: arriveOnlyDate,
      nxDoArriveWhatDay: week,
      nxDoCostPriceLevel: this.data.priceLevel,
      nxDoPrintStandard: this.data.printStandard || e.detail.applyStandardName,
    };
   console.log("dg",dg);
    nxDepSaveApply(dg).then(res => {
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        
        wx.showToast({
          title: '保存成功',
        })
        const newOrder = res.result.data;
        const depDisGoodsId = newOrder.nxDoDepDisGoodsId;
        const depGoodsArrAi = this.data.depGoodsArrAi || [];

        for (let i = 0; i < depGoodsArrAi.length; i++) {
          if (depGoodsArrAi[i].nxDepartmentDisGoodsId === depDisGoodsId) {
            let orderList = depGoodsArrAi[i].depGoodsDepOrderList || [];
            orderList.push(newOrder);
            const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList`;
            this.setData({
              [updatePath]: orderList
            });
            break;
          }
        }


        // 新增：同步更新 goodsList
        const updatedOrder = res.result.data;
        const nxDistributerGoodsId = updatedOrder.nxDoDisGoodsId;
        const goodsList = this.data.goodsList || [];
        console.log('准备同步更新 goodsList，目标 nxDistributerGoodsId:', nxDistributerGoodsId);
        console.log('当前 goodsList 长度:', goodsList.length);
      
        for (let i = 0; i < goodsList.length; i++) {
          console.log(`检查 goodsList[${i}].nxDistributerGoodsId:`, goodsList[i].nxDistributerGoodsId);
          if (goodsList[i].nxDistributerGoodsId === nxDistributerGoodsId) {
            console.log('找到匹配，upsert 订单:', updatedOrder);
            this._upsertGoodsListOrder(i, updatedOrder);
            break;
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
        this._cancle();
      

        const updatedOrder = res.result.data; // 新的订单对象
        const depDisGoodsId = updatedOrder.nxDoDepDisGoodsId;
        const orderId = updatedOrder.nxDepartmentOrdersId;
        const nxDistributerGoodsId = updatedOrder.nxDoDisGoodsId;
        
        console.log('=== _updateDisOrder 开始同步更新数据 ===');
        console.log('订单数据:', updatedOrder);
        console.log('depDisGoodsId:', depDisGoodsId);
        console.log('orderId:', orderId);
        console.log('nxDistributerGoodsId:', nxDistributerGoodsId);

        // 1. 更新 depGoodsArrAi 中的订单
        if (depDisGoodsId !== -1) {
          const depGoodsArrAi = this.data.depGoodsArrAi || [];
          console.log('depGoodsArrAi 长度:', depGoodsArrAi.length);
          
          for (let i = 0; i < depGoodsArrAi.length; i++) {
            if (depGoodsArrAi[i].nxDepartmentDisGoodsId === depDisGoodsId) {
              console.log(`找到匹配的 depGoodsArrAi[${i}]`);
              let orderList = depGoodsArrAi[i].depGoodsDepOrderList || [];
              
              // 查找并更新现有订单
              let orderFound = false;
              for (let j = 0; j < orderList.length; j++) {
                if (orderList[j].nxDepartmentOrdersId === orderId) {
                  console.log(`找到匹配的订单，更新 depGoodsArrAi[${i}].depGoodsDepOrderList[${j}]`);
                  const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList[${j}]`;
                  this.setData({
                    [updatePath]: updatedOrder
                  });
                  orderFound = true;
                  break;
                }
              }
              
              if (!orderFound) {
                console.log('未找到匹配的订单，添加新订单到 depGoodsArrAi');
                orderList.push(updatedOrder);
                const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList`;
                this.setData({
                  [updatePath]: orderList
                });
              }
              break;
            }
          }
        }

        // 2. 更新 goodsList 中的订单
        const goodsList = this.data.goodsList || [];
        console.log('goodsList 长度:', goodsList.length);
        
        for (let i = 0; i < goodsList.length; i++) {
          if (goodsList[i].nxDistributerGoodsId === nxDistributerGoodsId) {
            console.log(`找到匹配的 goodsList[${i}]`);
            this._upsertGoodsListOrder(i, updatedOrder);
            break;
          }
        }

        console.log('=== _updateDisOrder 数据同步完成 ===');


      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },


  //获取dis数据
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

        var newId = res.result.data.cataArr[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId;
        this.setData({
          grandList: res.result.data.cataArr,
          sortDepGoodsArrDis: [],
          fatherArrDis: res.result.data.cataArr[0].fatherGoodsEntities,
          leftGreatId: res.result.data.cataArr[0].nxDistributerFatherGoodsId,
          selectedSubCategoryId: res.result.data.cataArr[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
          greatName: res.result.data.cataArr[0].nxDfgFatherGoodsName,
          fatherSonsIndex: 0,
          activeSubCatId: newId,
          manualFilterGrandId: null,
          goodsList: [],
          currentPageDis: 1,
          totalPageDis: 0,
          totalCountDis: 0,
          disGoodsScrollTop: 0,
          scrollIntoView: '',
          subcatScrollIntoView: '',
        })
        that._getFatherGoodsDis(true);


      }
    })
  },


  _getFatherGoodsDis(isRefresh, options) {
    options = options || {};
    const requestSeq = (this.data.manualRequestSeq || 0) + 1;
    this.setData({
      manualRequestSeq: requestSeq,
      isLoading: true,
    });
    const data = {
      depId: this.data.depId,
      disId: this.data.disId,
      fatherId: this.data.leftGreatId,
      grandId: this.data.manualFilterGrandId,
      limit: this.data.limit,
      page: this.data.currentPageDis,
    };

    nxDepGetDisFatherGoods(data).then(res => {
      if (requestSeq !== this.data.manualRequestSeq) return;
      if (res.result.code == 0) {

        const newItems = res.result.page.list || [];
        const rawList = isRefresh ? newItems : this.data.goodsList.concat(newItems);
        const processedList = this.processGoodsListDis(rawList);

        this.setData({
          goodsList: processedList,
          currentPageDis: this.data.currentPageDis,
          totalPageDis: res.result.page.totalPage,
          totalCountDis: res.result.page.totalCount,
          isLoading: false,
        }, () => {
          if (options.autoFill) {
            this._autoFillNextSubCatDis(options.autoFillCount || 0);
          }
        });
      } else {
        this.setData({ isLoading: false });
      }
    }).catch(() => {
      if (requestSeq === this.data.manualRequestSeq) {
        this.setData({ isLoading: false });
      }
    });
  },


  _getGoodsIdsByGreatId(){
    console.log("huoquxinidididiidssss")
     getNxGoodsIdsByGreatId(this.data.leftGreatId).then(res =>{
       if(res.result.code == 0){
         this.setData({
           sortDepGoodsArrDis: res.result.data
         })
       }
     })
 },

  changeGreatGrandDis(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      leftGreatId: categoryId,
      leftIndex: e.currentTarget.dataset.index,
      goodsList: [],
      currentPageDis: 1,
      totalPageDis: 0,
      isLoading: false,
      greatName: e.currentTarget.dataset.name,
      fatherArrDis: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities,
      selectedSubCategoryId: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
      activeSubCatId: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
      manualFilterGrandId: null,
      disGoodsScrollTop: 0,
      scrollIntoView: '',
      subcatScrollIntoView: '',

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
      this._getFatherGoodsDis(true);
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
    if (this.data.isLoading) return;
    if (this.data.currentPageDis >= this.data.totalPageDis) {
      if (this.data.manualFilterGrandId) {
        this._loadNextSubCatDis(false, 0);
      }
      return;
    }
    this.setData({
      currentPageDis: this.data.currentPageDis + 1,
    }, () => {
      this._getFatherGoodsDis(false);
    });
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



  onSubCatTapDis(e) {
    const subCatId = e.currentTarget.dataset.id;
    this.setData({
      showAllSubCat: false,
      activeSubCatId: String(subCatId),
      subcatScrollIntoView: `subcat-${subCatId}`,
      manualFilterGrandId: subCatId,
      goodsList: [],
      currentPageDis: 1,
      totalPageDis: 0,
      totalCountDis: 0,
      disGoodsScrollTop: 0,
      scrollIntoView: '',
    }, () => {
      this._getFatherGoodsDis(true, { autoFill: true, autoFillCount: 0 });
    });
  },

  _getCurrentSubCatIndexDis() {
    var list = this.data.fatherArrDis || [];
    var currentId = String(this.data.manualFilterGrandId || '');
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].nxDistributerFatherGoodsId) === currentId) {
        return i;
      }
    }
    return -1;
  },

  _loadNextSubCatDis(autoFill, autoFillCount) {
    var list = this.data.fatherArrDis || [];
    var idx = this._getCurrentSubCatIndexDis();
    var next = idx >= 0 ? list[idx + 1] : null;
    if (!next) {
      return false;
    }
    var nextId = next.nxDistributerFatherGoodsId;
    this.setData({
      activeSubCatId: String(nextId),
      subcatScrollIntoView: 'subcat-' + nextId,
      manualFilterGrandId: nextId,
      currentPageDis: 1,
      totalPageDis: 0,
      totalCountDis: 0,
    }, () => {
      this._getFatherGoodsDis(false, {
        autoFill: !!autoFill,
        autoFillCount: autoFillCount || 0,
      });
    });
    return true;
  },

  _autoFillNextSubCatDis(autoFillCount) {
    if (!this.data.manualFilterGrandId) {
      return;
    }
    if (autoFillCount >= 3) {
      return;
    }
    if (this.data.currentPageDis < this.data.totalPageDis) {
      return;
    }
    if ((this.data.goodsList || []).length >= 8) {
      return;
    }
    this._loadNextSubCatDis(true, autoFillCount + 1);
  },

  async startLoadingGoodsForSubCat(subCatId) {
    if (this.data.isLoading) {
      return;
    }

    if (this.data.currentPageDis >= this.data.totalPageDis) {
      wx.showToast({
        title: '没有更多商品了',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isLoading: true
    });

    wx.showLoading({
      title: '正在加载商品...',
      mask: true
    });

    try {
      await this.loadGoodsBySubCatIdDis(subCatId, this.data.currentPageDis + 1, this.data.goodsList);
    } catch (error) {
      console.error('[startLoadingGoodsForSubCat] 加载异常:', error);
    } finally {
      this.setData({
        isLoading: false
      });
      wx.hideLoading();
    }
  },

  async loadGoodsBySubCatIdDis(subCatId, page, loadedGoods) {
    const { limit, depId, leftGreatId } = this.data;
    const data = {
      limit: limit,
      page: page,
      depId: depId,
      fatherId: leftGreatId,
    };

    try {
      const res = await nxDepGetDisFatherGoods(data);
      if (res.result.code === 0) {
        const newItems = res.result.page.list || [];
        const merged = loadedGoods.concat(newItems);

        // 排序
        const idOrder = (this.data.sortDepGoodsArrDis || []).map(String);
        const sortedArr = merged.slice().sort((a, b) => {
          const idxA = idOrder.indexOf(String(a.nxDistributerGoodsId));
          const idxB = idOrder.indexOf(String(b.nxDistributerGoodsId));
          return (idxA === -1 ? 99999 : idxA) - (idxB === -1 ? 99999 : idxB);
        });

        // 处理商品数据
        const processedGoods = this.processGoodsListDis(sortedArr);

        const hasGoodsInNewItems = newItems.some(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));

        if (hasGoodsInNewItems) {
          this.setData({
            goodsList: processedGoods,
            currentPageDis: page,
            totalPageDis: res.result.page.totalPage,
            totalCountDis: res.result.page.totalCount,
            isLoading: false,
          }, () => {
            setTimeout(() => {
              this.setData({
                scrollIntoView: `cat-${subCatId}`
              }, () => {
              });
            }, 100);
          });
        } else if (page <= this.data.totalPageDis) {
          // 递归加载
          await this.loadGoodsBySubCatIdDis(subCatId, page + 1, sortedArr);
        } else {
          this.setData({
            goodsList: processedGoods,
            currentPageDis: page,
            totalPageDis: res.result.page.totalPage,
            totalCountDis: res.result.page.totalCount,
            isLoading: false,
          });
          wx.showToast({
            title: '未找到该分类商品',
            icon: 'none'
          });
        }
      } else {
        console.error(`[loadGoodsBySubCatIdDis] 第 ${page} 页商品获取失败:`, res.result.msg);
        this.setData({ isLoading: false });
        wx.showToast({ title: '获取商品失败', icon: 'none' });
      }
    } catch (error) {
      console.error(`[loadGoodsBySubCatIdDis] 请求第 ${page} 页商品时发生异常:`, error);
      this.setData({ isLoading: false });
      throw error;
    }
  },

  processGoodsListDis(list) {
    // 后端已按配送商商品 sort 分页返回；这里不能再按分类 id 重排，否则会打乱商品管理里的顺序。
    const goodsMap = new Map();
    list.forEach(item => {
      const id = String(item.nxDistributerGoodsId);
      const normalized = this._attachDisGoodsOrders(Object.assign({}, item));
      if (!goodsMap.has(id)) {
        goodsMap.set(id, normalized);
      } else {
        const existing = goodsMap.get(id);
        const merged = this._normalizeDisGoodsOrders(existing).concat(this._normalizeDisGoodsOrders(normalized));
        const deduped = this._attachDisGoodsOrders({ disGoodsDepOrderList: merged });
        Object.assign(existing, deduped);
      }
    });
    const uniqueList = Array.from(goodsMap.values());
    let currentCategory = null;
    const result = uniqueList.map(item => {
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
   
    return result;
  },

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

  getCategoryNameDis(categoryId) {
    const category = this.data.fatherArrDis.find(item =>
      item.nxDistributerFatherGoodsId === categoryId
    );
    return category ? category.nxDfgFatherGoodsName : '';
  },


  confirmStandardDep(e) {
    var data = {
      nxDsDisGoodsId: this.data.depGoods.nxDdgDisGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.depGoods.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "depGoods.nxDistributerStandardEntities";
        var goodsData = "depGoodsArrAi[" + this.data.editOrderIndex + "].nxDistributerStandardEntities";
        this.setData({
          [goodsData]: standardArr,
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
        var standards = "itemDis.nxDistributerStandardEntities";
        var goodsData = "goodsList[" + this.data.editOrderIndex + "].nxDistributerStandardEntities";
        this.setData({
          [goodsData]: standardArr,
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

  delDepGoods(e){
    console.log(e);
    
    var depGoods = e.currentTarget.dataset.item;
    if(depGoods.depGoodsDepOrderList.length == 0){
      this.setData({
        depGoods: depGoods,
        editOrderIndex: e.currentTarget.dataset.index,
        warnContent: depGoods.nxDdgDepGoodsName ,
        showDep: false,
        show: false,
        popupType: 'deleteGoods',
        showPopupWarn: true,
      })

    }else{
      wx.showModal({
        title: '不能删除商品',
        content: '有未完成订单，请等待订单完成配送后，如果您确定不需要此商品，再进行删除。',
        showCancel: false,
        confirmText: '好的',
        complete: (res) => {
          if (res.confirm) {
            
          }
        }
      })
    }
  },


  /**
   * 删除订货
   */
  delApply() {
    this.setData({
      warnContent: this.data.applyItem.nxDoGoodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      showDep: false,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })
  },

  confirmWarn() {
    if(this.data.popupType == 'deleteOrder'){
      this.deleteYes()
    }else if(this.data.popupType == 'deleteGoods'){
     this._delteDepGoods();
    }
 
  },

  _delteDepGoods(){

   var id = this.data.depGoods.nxDepartmentDisGoodsId;
    deleteDepGoods(id).then(res =>{
      if(res.result.code == 0){
         var arr = this.data.depGoodsArrAi;
         wx.setStorageSync('needRefreshOrderData', true);
         arr.splice(this.data.editOrderIndex, 1);
         this.setData({
          depGoodsArrAi: arr
         })
      }
    })

  },


  closeWarn() {
    this.setData({

      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },


  toSearch() {
    if (this.data.guestMode) {
      wx.showToast({
        title: '游客可按分类浏览，注册后可搜索下单',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '../resGoodsCashSearch/resGoodsCashSearch',
    })
  },

  _promptGuestRegistration() {
    if (!this.data.guestMode) return false;
    const pages = getCurrentPages();
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;
    if (previousPage && previousPage.route === 'pages/ai/customer/chefOrder/chefOrder') {
      previousPage.setData({ showPopup: false, showPage: true });
      wx.navigateBack({ delta: 1 });
    } else {
      wx.reLaunch({
        url: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId
          + '&disId=' + this.data.disId
          + '&entry=customerInvite'
      });
    }
    return true;
  },



  deleteYes() {

    var that = this;
  
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        
        const deletedOrder = this.data.applyItem;
        const depDisGoodsId = deletedOrder.nxDoDepDisGoodsId;
        const orderId = deletedOrder.nxDepartmentOrdersId;
        const nxDistributerGoodsId = deletedOrder.nxDoDisGoodsId;
        
        console.log('=== deleteYes 开始同步删除数据 ===');
        console.log('删除的订单信息:', deletedOrder);
        console.log('depDisGoodsId:', depDisGoodsId);
        console.log('orderId:', orderId);
        console.log('nxDistributerGoodsId:', nxDistributerGoodsId);

        // 1. 从 depGoodsArrAi 中删除订单
        if (depDisGoodsId !== -1) {
          const depGoodsArrAi = this.data.depGoodsArrAi || [];
          console.log('depGoodsArrAi 长度:', depGoodsArrAi.length);
          
          for (let i = 0; i < depGoodsArrAi.length; i++) {
            if (depGoodsArrAi[i].nxDepartmentDisGoodsId === depDisGoodsId) {
              console.log(`找到匹配的 depGoodsArrAi[${i}]`);
              let orderList = depGoodsArrAi[i].depGoodsDepOrderList || [];
              
              for (let j = 0; j < orderList.length; j++) {
                if (orderList[j].nxDepartmentOrdersId === orderId) {
                  console.log(`找到匹配的订单，从 depGoodsArrAi[${i}].depGoodsDepOrderList[${j}] 删除`);
                  orderList.splice(j, 1); // 删除该订单
                  const updatePath = `depGoodsArrAi[${i}].depGoodsDepOrderList`;
                  this.setData({
                    [updatePath]: orderList
                  });
                  break;
                }
              }
              break;
            }
          }
        }

        // 2. 从 goodsList 中清空订单
        const goodsList = this.data.goodsList || [];
        console.log('goodsList 长度:', goodsList.length);
        
        for (let i = 0; i < goodsList.length; i++) {
          if (goodsList[i].nxDistributerGoodsId === nxDistributerGoodsId) {
            console.log(`找到匹配的 goodsList[${i}]，删除订单 ${orderId}`);
            this._removeGoodsListOrder(i, orderId);
            break;
          }
        }

        console.log('=== deleteYes 数据同步删除完成 ===');
        that._cancle();

      }
    })
  },





  _cancle() {
    this.setData({
      show: false,
      showDep: false,
      showCash: false,
      showCashDep: false,
      applyStandardName: "",
      item: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: "",
      applySubtotalPending: false,
      applyPriceStandard: "",
    })
  },

  closeOrderModal() {
    if (this.data.orderModalClosing) {
      return;
    }
    if (this._orderModalCloseTimer) {
      clearTimeout(this._orderModalCloseTimer);
    }
    this.setData({
      orderModalClosing: true,
    });
    this._orderModalCloseTimer = setTimeout(() => {
      this.setData({
        showCash: false,
        showCashDep: false,
        orderModalClosing: false,
        editApply: false,
        applyNumber: '',
        applyRemark: '',
        canSave: false,
        tierSaleRule: null,
        tierPrices: [],
        tierDisplayUnit: '',
        showTierPricing: false,
        applyCurrentUnitPrice: '',
        applySubtotal: '',
        applySubtotalPending: false,
        applyPriceStandard: '',
        activeTierId: '',
      });
      this._orderModalCloseTimer = null;
    }, 180);
  },

  _cancelOrderModalCloseTimer() {
    if (this._orderModalCloseTimer) {
      clearTimeout(this._orderModalCloseTimer);
      this._orderModalCloseTimer = null;
    }
  },

  _resetOrderModalState() {
    this.setData({
      editApply: false,
      applyNumber: '',
      applyRemark: '',
      canSave: false,
      tierSaleRule: null,
      tierPrices: [],
      tierDisplayUnit: '',
      showTierPricing: false,
      applyCurrentUnitPrice: '',
      applySubtotal: '',
      applySubtotalPending: false,
      applyPriceStandard: '',
      activeTierId: '',
    });
  },

  orderModalDont() {},

  _shouldShowTierPricing() {
    var rule = this.data.tierSaleRule;
    if (!rule || !(this.data.tierPrices && this.data.tierPrices.length)) {
      return false;
    }
    var unitType = String(rule.tierPriceUnitType || '').toUpperCase();
    var level = Number(this.data.priceLevel);
    if (level === 2) {
      return unitType === 'OUTER_PACKAGE';
    }
    if (level === 1) {
      return unitType === 'GOODS_STANDARD';
    }
    return false;
  },

  _updateShowTierPricing(callback) {
    this.setData({
      showTierPricing: this._shouldShowTierPricing(),
    }, callback);
  },

  _getLargeUnitName() {
    var item = this._getModalDisGoods();
    return item ? this._getDisGoodsStandardByLevel(item, 2) : '';
  },

  _isLargeUnitName(name) {
    var std = String(name || '').trim();
    if (!std) {
      return false;
    }
    var largeUnit = this._getLargeUnitName();
    if (largeUnit && std === largeUnit) {
      return true;
    }
    var rule = this.data.tierSaleRule;
    if (rule && String(rule.tierPriceUnitType).toUpperCase() === 'OUTER_PACKAGE' && rule.saleUnit) {
      return std === String(rule.saleUnit).trim();
    }
    return false;
  },

  _getTierDisplayUnit() {
    var rule = this.data.tierSaleRule;
    if (rule && rule.saleUnit) {
      return String(rule.saleUnit).trim();
    }
    return this.data.applyStandardName || '';
  },

  _isOuterPackageUnit(standard) {
    var std = String(standard || '').trim();
    if (!std) {
      return false;
    }
    var rule = this.data.tierSaleRule;
    if (rule && rule.saleUnit && std === String(rule.saleUnit).trim()) {
      return true;
    }
    return this._isCartonStandard(std, this._getModalDisGoods());
  },

  _applyTierDefaultStandard(rule, callback) {
    var level = Number(this.data.priceLevel);
    if (level === 2) {
      var item = this._getModalDisGoods();
      var largeStandard = item && item.nxDgWillPriceTwoStandard
        ? String(item.nxDgWillPriceTwoStandard).trim()
        : '';
      if (rule && String(rule.tierPriceUnitType).toUpperCase() === 'OUTER_PACKAGE' && rule.saleUnit) {
        largeStandard = String(rule.saleUnit).trim();
      }
      if (largeStandard) {
        this.setData({
          applyStandardName: largeStandard,
          tierDisplayUnit: largeStandard,
        }, callback);
        return;
      }
    }
    if (callback) {
      callback();
    }
  },

  _getModalDisGoods() {
    if (this.data.itemDis) {
      return this.data.itemDis;
    }
    if (this.data.depGoods && this.data.depGoods.nxDistributerGoodsEntity) {
      return this.data.depGoods.nxDistributerGoodsEntity;
    }
    return null;
  },

  _getModalDisGoodsId() {
    if (this.data.itemDis && this.data.itemDis.nxDistributerGoodsId) {
      return this.data.itemDis.nxDistributerGoodsId;
    }
    if (this.data.depGoods) {
      return this.data.depGoods.nxDdgDisGoodsId || (this.data.depGoods.nxDistributerGoodsEntity
        ? this.data.depGoods.nxDistributerGoodsEntity.nxDistributerGoodsId
        : null);
    }
    return null;
  },

  _openOrderModalWithTierPrice() {
    var goodsId = this._getModalDisGoodsId();
    this._loadTierPriceForModal(goodsId, () => {
      this._updateShowTierPricing(() => {
        this._recalcApplySubtotal();
      });
    });
  },

  _refreshTierRangeText() {
    var unit = this._getTierDisplayUnit();
    var tiers = (this.data.tierPrices || []).map(function (t) {
      var rangeText = t.maxQuantity == null
        ? (t.minQuantity + unit + ' 以上')
        : (t.minQuantity + '～' + t.maxQuantity + unit);
      return Object.assign({}, t, { _rangeText: rangeText });
    });
    this.setData({
      tierPrices: tiers,
      tierDisplayUnit: unit,
    });
  },

  _loadTierPriceForModal(distributerGoodsId, callback) {
    var emptyTier = { saleRule: null, tierPrices: [] };
    if (!distributerGoodsId) {
      this._applyTierPriceDataForModal(emptyTier, callback);
      return;
    }
    var cacheKey = String(distributerGoodsId);
    var cache = this.data.tierPriceCache || {};
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      this._applyTierPriceDataForModal(cache[cacheKey], callback);
      return;
    }
    var requestSeq = (this.data.tierPriceRequestSeq || 0) + 1;
    this.setData({ tierPriceRequestSeq: requestSeq });
    getGoodsTierPriceList(distributerGoodsId).then((res) => {
      if (requestSeq !== this.data.tierPriceRequestSeq) {
        return;
      }
      if (res.result.code !== 0 || !res.result.data) {
        this.setData({
          ['tierPriceCache.' + cacheKey]: emptyTier,
        }, () => {
          this._applyTierPriceDataForModal(emptyTier, callback);
        });
        return;
      }
      this.setData({
        ['tierPriceCache.' + cacheKey]: res.result.data,
      }, () => {
        this._applyTierPriceDataForModal(res.result.data, callback);
      });
    }).catch(() => {
      if (requestSeq !== this.data.tierPriceRequestSeq) {
        return;
      }
      this.setData({
        ['tierPriceCache.' + cacheKey]: emptyTier,
      }, () => {
        this._applyTierPriceDataForModal(emptyTier, callback);
      });
    });
  },

  _applyTierPriceDataForModal(data, callback) {
    var rule = data && data.saleRule;
    var tiers = data && data.tierPrices ? data.tierPrices : [];
    var that = this;
    if (!rule || (rule.status !== 'ACTIVE' && rule.ruleStatus !== 'ACTIVE')) {
      this.setData({ tierSaleRule: null, tierPrices: [], tierDisplayUnit: '', showTierPricing: false }, callback);
      return;
    }
    var unitType = String(rule.tierPriceUnitType || '').toUpperCase();
    var displayUnit = unitType === 'OUTER_PACKAGE' && rule.saleUnit
      ? String(rule.saleUnit).trim()
      : (this.data.applyStandardName || '');
    tiers = tiers.filter(function (t) {
      return t.status === 'ACTIVE' || t.tierStatus === 'ACTIVE';
    }).map(function (t) {
      var rangeText = t.maxQuantity == null
        ? (t.minQuantity + displayUnit + ' 以上')
        : (t.minQuantity + '～' + t.maxQuantity + displayUnit);
      return Object.assign({}, t, { _rangeText: rangeText });
    });
    this.setData({
      tierSaleRule: rule,
      tierPrices: tiers,
      tierDisplayUnit: displayUnit,
    }, function () {
      that._applyTierDefaultStandard(rule, callback);
    });
  },

  _isCartonStandard(standard, disGoods) {
    if (!standard || !disGoods || !disGoods.nxDgCartonUnit) {
      return false;
    }
    var orderStd = String(standard).trim();
    var carton = String(disGoods.nxDgCartonUnit).trim();
    if (!orderStd || !carton) {
      return false;
    }
    if (orderStd === carton) {
      return true;
    }
    var groups = [
      ['件', '箱'],
      ['袋', '包', '代']
    ];
    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      if (group.indexOf(orderStd) >= 0 && group.indexOf(carton) >= 0) {
        return true;
      }
    }
    return false;
  },

  _matchesTierUnitType(tierPriceUnitType) {
    if (!tierPriceUnitType) {
      return false;
    }
    var unitType = String(tierPriceUnitType).trim().toUpperCase();
    var currentStd = String(this.data.applyStandardName || '').trim();
    var isOuterPackage = this._isOuterPackageUnit(currentStd);
    if (unitType === 'OUTER_PACKAGE') {
      return isOuterPackage;
    }
    if (unitType === 'GOODS_STANDARD') {
      return !isOuterPackage;
    }
    return false;
  },

  _parseTierQuantity(raw) {
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    var qty = Number(String(raw).trim());
    if (!qty || qty <= 0) {
      return null;
    }
    return Math.floor(qty);
  },

  _findMatchingTierPrice(quantity) {
    var tier = this._findMatchingTier(quantity);
    return tier ? tier.unitPrice : null;
  },

  _findMatchingTier(quantity) {
    if (!this._shouldShowTierPricing()) {
      return null;
    }
    var tiers = this.data.tierPrices || [];
    var rule = this.data.tierSaleRule;
    if (!rule || !tiers.length || !this._matchesTierUnitType(rule.tierPriceUnitType)) {
      return null;
    }
    for (var i = 0; i < tiers.length; i++) {
      var tier = tiers[i];
      var min = Number(tier.minQuantity);
      var max = tier.maxQuantity == null ? Number.MAX_SAFE_INTEGER : Number(tier.maxQuantity);
      if (quantity >= min && quantity <= max) {
        return tier;
      }
    }
    return null;
  },

  _getTierId(tier) {
    if (!tier) {
      return '';
    }
    return String(tier.id || tier.tierPriceId || '');
  },

  _getOrderQtyStep() {
    var rule = this.data.tierSaleRule;
    if (rule && Number(rule.incrementStep) > 0) {
      return Number(rule.incrementStep);
    }
    var standard = this.data.applyStandardName || '';
    return standard === '斤' ? 0.1 : 1;
  },

  _getOrderQtyMin() {
    var rule = this.data.tierSaleRule;
    if (rule && Number(rule.minOrderQuantity) > 0) {
      return Number(rule.minOrderQuantity);
    }
    return this._getOrderQtyStep();
  },

  _formatOrderQty(qty) {
    var step = this._getOrderQtyStep();
    if (step < 1) {
      return Number(qty).toFixed(1);
    }
    return String(Math.round(Number(qty)));
  },

  _getBaseUnitPrice() {
    if (this.data.showCashDep && this.data.depGoods) {
      var depFinalPrice = this._getDepGoodsFinalPrice(this.data.depGoods);
      return depFinalPrice !== null ? String(depFinalPrice) : this.data.depGoods.nxDdgOrderPrice;
    }
    if (!this.data.itemDis) {
      return '0';
    }
    if (Number(this.data.priceLevel) === 2) {
      return this.data.itemDis.nxDgWillPriceTwo;
    }
    return this.data.itemDis.nxDgWillPriceOne;
  },

  _getModalUnitPrice() {
    var basePrice = this._getBaseUnitPrice();
    if (basePrice === '0.1') {
      return basePrice;
    }
    var tierQty = this._parseTierQuantity(this.data.applyNumber);
    if (tierQty != null) {
      var tierPrice = this._findMatchingTierPrice(tierQty);
      if (this._toValidPrice(tierPrice) !== null) {
        return String(tierPrice);
      }
    }
    return basePrice;
  },

  _getSubmitUnitPrice() {
    var shownPrice = this._toValidPrice(this.data.applyCurrentUnitPrice);
    if (shownPrice !== null) {
      return String(shownPrice);
    }
    var modalPrice = this._toValidPrice(this._getModalUnitPrice());
    if (modalPrice !== null) {
      return String(modalPrice);
    }
    return null;
  },

  _getModalPriceStandard() {
    if (this.data.showCashDep && this.data.depGoods) {
      var depGoods = this.data.depGoods;
      var depPrice = this._toValidPrice(depGoods.nxDdgOrderPrice);
      var goodsPriceInfo = this._getDepGoodsBasePriceInfo(depGoods);
      var goodsPrice = goodsPriceInfo.price;
      if (goodsPrice !== null && (depPrice === null || goodsPrice < depPrice)) {
        return goodsPriceInfo.standard || '';
      }
      return depGoods.nxDdgOrderStandard || depGoods.nxDdgDepGoodsStandardname || '';
    }
    if (!this.data.itemDis) {
      return '';
    }
    return this._getDisGoodsStandardByLevel(this.data.itemDis, this.data.priceLevel);
  },

  _canCalculateApplySubtotal() {
    var orderStandard = String(this.data.applyStandardName || '').trim();
    var priceStandard = String(this._getModalPriceStandard() || '').trim();
    return !!orderStandard && !!priceStandard && orderStandard === priceStandard;
  },

  _recalcApplySubtotal() {
    var price = this._getModalUnitPrice();
    var priceStandard = this._getModalPriceStandard();
    var qty = Number(this.data.applyNumber);
    if (!qty || qty <= 0 || price === '0.1') {
      this.setData({
        applySubtotal: price === '0.1' ? '-' : '0',
        applySubtotalPending: false,
        applyPriceStandard: priceStandard,
        applyCurrentUnitPrice: price === '0.1' ? '-' : price,
        canSave: false,
        activeTierId: '',
      });
      return;
    }
    var matchedTier = this._findMatchingTier(this._parseTierQuantity(qty));
    if (!this._canCalculateApplySubtotal()) {
      this.setData({
        applyCurrentUnitPrice: price,
        applyPriceStandard: priceStandard,
        applySubtotal: '',
        applySubtotalPending: true,
        canSave: true,
        activeTierId: this._getTierId(matchedTier),
      });
      return;
    }
    this.setData({
      applyCurrentUnitPrice: price,
      applyPriceStandard: priceStandard,
      applySubtotal: (Number(price) * qty).toFixed(1),
      applySubtotalPending: false,
      canSave: true,
      activeTierId: this._getTierId(matchedTier),
    });
  },

  orderQtyReduce() {
    var step = this._getOrderQtyStep();
    var min = this._getOrderQtyMin();
    var qty = Number(this.data.applyNumber || 0) - step;
    if (qty < min) {
      qty = min;
    }
    this.setData({
      applyNumber: this._formatOrderQty(qty),
    }, () => {
      this._recalcApplySubtotal();
    });
  },

  orderQtyAdd() {
    var step = this._getOrderQtyStep();
    var qty = Number(this.data.applyNumber || 0) + step;
    if (qty > 9999) {
      wx.showToast({
        title: '最大不能超过9999',
        icon: 'none',
      });
      return;
    }
    this.setData({
      applyNumber: this._formatOrderQty(qty),
    }, () => {
      this._recalcApplySubtotal();
    });
  },

  onSelectTierPrice(e) {
    var tier = e.currentTarget.dataset.tier;
    if (!tier) {
      return;
    }
    var minQty = Number(tier.minQuantity);
    if (!minQty || minQty <= 0) {
      return;
    }
    this.setData({
      applyNumber: this._formatOrderQty(minQty),
      activeTierId: this._getTierId(tier),
    }, () => {
      this._recalcApplySubtotal();
    });
  },

  onApplyRemarkInput(e) {
    if (e.detail.value.length < 15) {
      this.setData({
        applyRemark: e.detail.value,
      });
    } else {
      wx.showToast({
        title: '最多输入15个字符。',
        icon: 'none',
      });
    }
  },

  onSelectStandard(e) {
    var name = e.currentTarget.dataset.name;
    if (Number(this.data.priceLevel) === 1 && this._isLargeUnitName(name)) {
      return;
    }
    this.setData({
      applyStandardName: name,
    });
    var levelTwoStandard = '';
    if (this.data.itemDis != null) {
      levelTwoStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
      this.setData({
        printStandard: name === levelTwoStandard ? levelTwoStandard : this.data.itemDis.nxDgGoodsStandardname,
      });
    } else if (this.data.depGoods != null) {
      levelTwoStandard = this.data.depGoods.nxDgWillPriceTwoStandard;
      this.setData({
        printStandard: name === levelTwoStandard ? levelTwoStandard : this.data.depGoods.nxDdgDepGoodsStandardname,
      });
    }
    this._refreshTierRangeText();
    this._updateShowTierPricing(() => {
      this._recalcApplySubtotal();
    });
  },

  confirmOrderModal() {
    if (!this.data.canSave || !this.data.applyNumber || Number(this.data.applyNumber) <= 0) {
      wx.showToast({
        title: '请填写有效数量',
        icon: 'none',
      });
      return;
    }
    var detail = {
      applyNumber: this.data.applyNumber,
      applyStandardName: this.data.applyStandardName,
      applyRemark: this.data.applyRemark,
    };
    if (this.data.showCashDep) {
      this.confirmCashDep({ detail: detail });
    } else {
      this.confirmCash({ detail: detail });
    }
  },




  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})
