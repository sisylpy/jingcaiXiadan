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
  deleteDepGoods
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

    const goodsList = this.data.goodsList;

    // 遍历goodsList中的所有商品
    for (let i = 0; i < goodsList.length; i++) {
      const goods = goodsList[i];
      console.log(`检查goodsList[${i}]:`, {
        goodsId: goods.nxDistributerGoodsId,
        goodsName: goods.nxDgGoodsName,
        currentOrder: goods.nxDepartmentOrdersEntity
      });

      if (goods.nxDistributerGoodsId === nxDistributerGoodsId) {
        // 找到对应商品，更新其nxDepartmentOrdersEntity
        const updatePath = `goodsList[${i}].nxDepartmentOrdersEntity`;

        this.setData({
          [updatePath]: nxDepartmentOrdersEntity
        });
        updated = true;
        break;
      }
    }


  },



  data: {
    priceLevel: "",
    item: "",
    url: "",

    editApply: false,
    editOrderIndex: "",
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
    limit: 15,
    currentPage: 1,
    fatherArr: [],
    scrollTopLeft: 0,
    depGoodsArrAi: [],
    selectedSub: 0, // 选中的分类

    totalPageDis: 0,
    totalCountDis: 0,
    limit: 15,
    currentPageDis: 1,
    grandList: [],
    fatherArrDis: [],
    sortDepGoodsArrDis: [],
    goodsList: [],
    leftGreatId: "",
    greatName: "",
    leftIndex: 0,

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

    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
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
  },


  // 
  applyGoodsDep(e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    this.setData({
      editOrderIndex: e.currentTarget.dataset.index,
      depGoods: e.currentTarget.dataset.depgoods,
      applyStandardName: e.currentTarget.dataset.standard,
      applyRemark: depGoods.nxDdgOrderRemark,
      applyStandardName: depGoods.nxDdgOrderStandard,
      priceLevel: e.currentTarget.dataset.level,
      canSave: true,
      showCashDep: true,
      applySubtotal: "0",
    })
    

  },


  // 
  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      fatherIndex: e.currentTarget.dataset.fatherindex,
      grandIndex: e.currentTarget.dataset.grandindex,
      editOrderIndex: e.currentTarget.dataset.index,
    
      itemDis: e.currentTarget.dataset.item,
      applyStandardName: e.currentTarget.dataset.standard,
      applySubtotal: "0.0元",
      depGoods: e.currentTarget.dataset.depgoods,
      canSave: false,
      showCash: true,
      applySubtotal: "0",
      priceLevel: e.currentTarget.dataset.level,
    })
    
  },



  //depGoodsEdit
  toEditApplyDep(e) {
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
        goodsName: e.currentTarget.dataset.depgoods.nxDdgDepGoodsName,
        applyStandardName: applyItem.nxDoStandard,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        depGoods: e.currentTarget.dataset.depgoods,
        priceLevel: applyItem.nxDoCostPriceLevel,
        printStandard: applyItem.nxDoPrintStandard,
      })
    }
  },


  //nxDisEdit
  toEditApply(e) {
   

    if (e.currentTarget.dataset.order.nxDoPurchaseStatus < 5) {
      var applyItem = e.currentTarget.dataset.order;
      this.setData({
        applyItem: e.currentTarget.dataset.order,
        editOrderIndex: e.currentTarget.dataset.index,
        showCash: true,
        applySubtotal: applyItem.nxDoSubtotal,
        applyStandardName: applyItem.nxDoStandard,
        printStandard: applyItem.nxDoPrintStandard,
        itemDis: e.currentTarget.dataset.item,
        depGoods: e.currentTarget.dataset.depgoods,
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
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
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


  _saveOrderCash: function (e) {
    console.log("_saveOrderCash_saveOrderCash_saveOrderCash")
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = "";
   

    var weight = null;
    var subtotal = null;
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
    saveCash(dg).then(res => {
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        
        wx.showToast({
          title: '保存成功',
        })

        var data = "goodsList[" + this.data.editOrderIndex + "].nxDepartmentOrdersEntity";
        this.setData({
          [data]: res.result.data
        })
       
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
    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.priceLevel
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
            const updatePath = `goodsList[${i}].nxDepartmentOrdersEntity`;
            this.setData({
              [updatePath]: updatedOrder
            });
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
    var price = null;
    var weight = null;
    var subtotal = null;
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
      nxDoPrintStandard: this.data.printStandard,
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
            const updatePath = `goodsList[${i}].nxDepartmentOrdersEntity`;
            console.log('找到匹配，更新路径:', updatePath, '更新内容:', updatedOrder);
            this.setData({
              [updatePath]: updatedOrder
            });
         
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
            const updatePath = `goodsList[${i}].nxDepartmentOrdersEntity`;
            this.setData({
              [updatePath]: updatedOrder
            });
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
          sortDepGoodsArrDis: res.result.data.depGoodsArr,
          fatherArrDis: res.result.data.cataArr[0].fatherGoodsEntities,
          leftGreatId: res.result.data.cataArr[0].nxDistributerFatherGoodsId,
          selectedSubCategoryId: res.result.data.cataArr[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
          greatName: res.result.data.cataArr[0].nxDfgFatherGoodsName,
          fatherSonsIndex: 0,
          activeSubCatId: newId,
        })
        that._getFatherGoodsDis();


      }
    })
  },


  _getFatherGoodsDis() {
    const data = {
      depId: this.data.depId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPageDis,
    };

    nxDepGetDisFatherGoods(data).then(res => {
      if (res.result.code == 0) {

        const processedList = this.processGoodsListDis(res.result.page.list);

        var subCatId = this.data.activeSubCatId;
        this.setData({
          goodsList: processedList,
          currentPageDis: this.data.currentPageDis,
          totalPageDis: res.result.page.totalPage,
          totalCountDis: res.result.page.totalCount,

          subcatScrollIntoView: `subcat-${subCatId}`,
          scrollIntoView: `cat-${subCatId}` // 右侧商品区锚点
        }, () => {
          // 数据更新后计算分类位置
          this.calculateCategoryPositionsDis();

        });
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
    // 调用接口获取商品ID列表
    this._getGoodsIdsByGreatId();
    this._getFatherGoodsDis();
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
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCountDis) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPageDis,
      totalPageDis,
      searchFather,
      leftGreatId,
      depId,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if (currentPageDis <= totalPageDis) {
      // 先设置下一页页码
      const nextPage = currentPageDis + 1;
      this.setData({
        currentPageDis: nextPage
      });

      const data = {
        limit: limit,
        page: nextPage, // 使用下一页页码请求数据
        depId: depId,
        fatherId: leftGreatId,
      };


      nxDepGetDisFatherGoods(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            const updatedGoodsList = [...this.data.goodsList, ...newItems];

            // 更新商品列表和分页信息
            this.setData({
              goodsList: updatedGoodsList,
              totalPageDis: res.result.page.totalPage,
              totalCountDis: res.result.page.totalCount,
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



  onSubCatTapDis(e) {
    const subCatId = e.currentTarget.dataset.id;

    const hasGoods = this.data.goodsList.some(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));
    

    this.setData({
      showAllSubCat: false,
      activeSubCatId: String(subCatId),
      subcatScrollIntoView: `subcat-${subCatId}`
    }, () => {
    });

    if (hasGoods) {
      this.setData({
        scrollIntoView: ''
      }, () => {
        setTimeout(() => {
          this.setData({
            scrollIntoView: `cat-${subCatId}`
          }, () => {
          });
        }, 50);
      });
    } else {
      this.startLoadingGoodsForSubCat(subCatId);
    }
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
    // 排序
    list.sort((a, b) => {
      if (a.nxDgDfgGoodsGrandId === b.nxDgDfgGoodsGrandId) return 0;
      return a.nxDgDfgGoodsGrandId > b.nxDgDfgGoodsGrandId ? 1 : -1;
    });
    // 去重
    const goodsMap = new Map();
    list.forEach(item => {
      goodsMap.set(String(item.nxDistributerGoodsId), item);
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
    wx.navigateTo({
      url: '../resGoodsCashSearch/resGoodsCashSearch',
    })
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
            console.log(`找到匹配的 goodsList[${i}]，清空订单`);
            const updatePath = `goodsList[${i}].nxDepartmentOrdersEntity`;
            this.setData({
              [updatePath]: null
            });
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
      applyStandardName: "",
      item: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: ""

    })
  },




  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})