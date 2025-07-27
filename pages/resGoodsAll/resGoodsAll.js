var load = require('../../lib/load.js');

const globalData = getApp().globalData;
var dateUtils = require('../../utils/dateUtil');
import apiUrl from '../../config.js'

import {
 
  nxDepGetDisCataGoods,
  nxDepGetDisFatherGoods,
  depUserLoginDaoDu
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



  },


  data: {
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
    disId: '56',
    depId: '-1',
    depFatherId: '-1'

  },


  onLoad: function (options) {
    this._login();

   

  },


  _login() {
    var that = this;
    wx.login({
      success: (res) => {
        load.hideLoading();
        depUserLoginDaoDu(res.code)
          .then((response) => {
            // 登录成功的判断：code===0 且 userInfo 存在
            if (response.result.code === 0) {
              wx.redirectTo({
                url: '../ai/customer/chefOrder/chefOrder',
              })

            } else {
              this.initDisData();
           

            }
          })
      },
      fail: (res => {
        load.hideLoading();
        wx.showModal({
          title: res.result.msg,
          showCancel: false,
          confirmText: "知道了",
        })
      })
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
    console.log('>>> initDisData - depId:', this.data.depId, 'data:', data);
    nxDepGetDisCataGoods(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        console.log(res.result.data);
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



  applyGoodsToLogin(){
    wx.navigateTo({
      url: '../registerCusomer/registerCusomer',
    })
  },


  _getFatherGoodsDis() {
    const data = {
      depId: this.data.depId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPageDis,
    };
    console.log('>>> _getFatherGoodsDis - depId:', this.data.depId, 'data:', data);

    nxDepGetDisFatherGoods(data).then(res => {
      if (res.result.code == 0) {
        console.log(`>>> _getFatherGoodsDis: 初始获取 ${res.result.page.list.length} 个商品`);
        console.log(`>>> _getFatherGoodsDis: 初始商品IDs:`, res.result.page.list.map(i => i.nxDistributerGoodsId));

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
          const idOrder = (this.data.sortDepGoodsArrDis || []).map(String);
          console.log('sortDepGoodsArrInit:', idOrder);
          console.log('merged ids--Initt:', processedList.map(i => i.nxDistributerGoodsId));
          const hasGoodsInNewItems = idOrder.some(item => String(item) === String(25394));
          console.log("hasGoodsInNewItemshasGoodsInNewItems",hasGoodsInNewItems)

        });
      }
    });
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
      console.log('>>> onScrollToLowerDis - depId:', depId, 'data:', data);
      

      nxDepGetDisFatherGoods(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            console.log(`>>> onScrollToLowerDis: 第 ${nextPage} 页获取 ${newItems.length} 个商品`);
            console.log(`>>> onScrollToLowerDis: 新商品IDs:`, newItems.map(i => i.nxDistributerGoodsId));
            console.log(`>>> onScrollToLowerDis: 原有商品数量: ${this.data.goodsList.length}`);
            console.log(`>>> onScrollToLowerDis: 原有商品IDs:`, this.data.goodsList.map(i => i.nxDistributerGoodsId));
            
            const updatedGoodsList = [...this.data.goodsList, ...newItems];
            console.log(`>>> onScrollToLowerDis: 合并后总数量: ${updatedGoodsList.length}`);
            console.log(`>>> onScrollToLowerDis: 合并后所有IDs:`, updatedGoodsList.map(i => i.nxDistributerGoodsId));

            // 更新商品列表和分页信息
            this.setData({
              goodsList: updatedGoodsList,
              totalPageDis: res.result.page.totalPage,
              totalCountDis: res.result.page.totalCount,
              isLoading: false,
            });

            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCountDis) {
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
      console.log(`>>> onSubCatTapDis: 即将为分类 ${subCatId} 加载商品。当前页码: ${this.data.currentPageDis}`);
      this.startLoadingGoodsForSubCat(subCatId);
    }
  },

  async startLoadingGoodsForSubCat(subCatId) {
    if (this.data.isLoading) {
      console.log('>>> 操作过于频繁，正在加载数据，请稍候...');
      return;
    }

    if (this.data.currentPageDis >= this.data.totalPageDis) {
      console.log('>>> 已经到达最后一页，没有更多商品了。');
      wx.showToast({
        title: '没有更多商品了',
        icon: 'none'
      });
      return;
    }

    console.log(`>>> startLoadingGoodsForSubCat: 开始为分类 ${subCatId} 加载商品...`);
    this.setData({
      isLoading: true
    });
    
    // 显示loading提示
    wx.showLoading({
      title: '正在加载商品...',
      mask: true
    });

    try {
      console.log(`>>> startLoadingGoodsForSubCat: 即将从 page ${this.data.currentPageDis + 1} 开始加载`);
      // 修复：传入现有的goodsList数据，而不是空数组
      await this.loadGoodsBySubCatIdDis(subCatId, this.data.currentPageDis + 1, this.data.goodsList);
      console.log(`<<< 分类 ${subCatId} 商品加载完成。`);
    } catch (error) {
      console.error(`<<< 分类 ${subCatId} 商品加载失败:`, error);
    } finally {
      this.setData({
        isLoading: false
      });
      // 隐藏loading提示
      wx.hideLoading();
    }
  },

  async loadGoodsBySubCatIdDis(subCatId, page, loadedGoods) {
    const {
      limit,
      depId,
      leftGreatId
    } = this.data;
    const data = {
      limit: limit,
      page: page,
      depId: depId,
      fatherId: leftGreatId,
    };
    console.log('>>> loadGoodsBySubCatIdDis - depId:', depId, 'data:', data);

    try {
      console.log(`>>> loadGoodsBySubCatIdDis: 正在请求第 ${page} 页商品...`);
      console.log(`>>> loadedGoods 初始长度: ${loadedGoods.length}`);
      console.log(`>>> loadedGoods 初始IDs:`, loadedGoods.map(i => i.nxDistributerGoodsId));
      
      const res = await nxDepGetDisFatherGoods(data);
      if (res.result.code === 0) {
        const newItems = res.result.page.list || [];
        console.log(`>>> 第 ${page} 页成功获取 ${newItems.length} 个商品。`);
        console.log(`>>> 新获取的商品IDs:`, newItems.map(i => i.nxDistributerGoodsId));
        
        const merged = loadedGoods.concat(newItems);
        console.log(`>>> 合并后总长度: ${merged.length}`);
        console.log(`>>> 合并后所有IDs:`, merged.map(i => i.nxDistributerGoodsId));
     
        // 4) dis合并后按 sortDepGoodsArr 顺序排序
        const idOrder = (this.data.sortDepGoodsArrDis || []).map(String);
        console.log('sortDepGoodsArr:', idOrder);
        console.log('merged ids:', merged.map(i => i.nxDistributerGoodsId));
        const sortedArr = merged.slice().sort((a, b) => {
          const idxA = idOrder.indexOf(String(a.nxDistributerGoodsId));
          const idxB = idOrder.indexOf(String(b.nxDistributerGoodsId));
          return (idxA === -1 ? 99999 : idxA) - (idxB === -1 ? 99999 : idxB);
        });
        console.log(`>>> 排序后长度: ${sortedArr.length}`);
        console.log(`>>> 排序后IDs:`, sortedArr.map(i => i.nxDistributerGoodsId));

       
        const hasGoodsInNewItems = newItems.some(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));

        if (hasGoodsInNewItems) {
          console.log(`>>> 在第 ${page} 页找到目标商品，准备渲染...`);
          const processedGoods = this.processGoodsListDis(sortedArr);
          console.log(`>>> processGoodsListDis 处理后长度: ${processedGoods.length}`);
          console.log(`>>> processGoodsListDis 处理后IDs:`, processedGoods.map(i => i.nxDistributerGoodsId));
          
          this.setData({
            goodsList: processedGoods,
            currentPageDis: page,
            totalPageDis: res.result.page.totalPage,
            totalCountDis: res.result.page.totalCount,
            isLoading: false, // 找到目标商品后关闭loading
          });

          setTimeout(() => {
            this.setData({
              scrollIntoView: `cat-${subCatId}`
            });
            this.calculateSubCategoryHeightsDis();
            console.log(`>>> 已滚动到分类 ${subCatId}。`);
          }, 100);

        } else if (page <= this.data.totalPageDis) {
          console.log(`>>> 第 ${page} 页未找到商品，继续加载下一页(page ${page + 1})...`);
          console.log(`>>> 递归调用前 sortedArr 长度: ${sortedArr.length}`);
          // 继续递归加载，保持loading状态
          await this.loadGoodsBySubCatIdDis(subCatId, page + 1, sortedArr);
        } else {
          console.log('>>> 已到达最后一页，未找到更多商品。');
          const processedGoods = this.processGoodsListDis(sortedArr);
          console.log(`>>> 最后一页 processGoodsListDis 处理后长度: ${processedGoods.length}`);
          console.log(`>>> 最后一页 processGoodsListDis 处理后IDs:`, processedGoods.map(i => i.nxDistributerGoodsId));
          
          this.setData({
            goodsList: processedGoods,
            currentPageDis: page,
            totalPageDis: res.result.page.totalPage,
            totalCountDis: res.result.page.totalCount,
            isLoading: false, // 加载完所有页面后关闭loading
          });
          this.calculateSubCategoryHeightsDis();
          
          // 提示用户未找到目标分类商品
          wx.showToast({
            title: '未找到该分类商品',
            icon: 'none'
          });
        }
      } else {
        console.error(`>>> 第 ${page} 页商品获取失败:`, res.result.msg);
        this.setData({
          isLoading: false // 请求失败时也要关闭loading
        });
        wx.showToast({
          title: '获取商品失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error(`>>> 请求第 ${page} 页商品时发生异常:`, error);
      this.setData({
        isLoading: false // 异常时也要关闭loading
      });
      throw error;
    }
  },

  // 处理商品数据，添加分类信息
  processGoodsListDis(list) {
    console.log(`>>> processGoodsListDis 输入长度: ${list.length}`);
    console.log(`>>> processGoodsListDis 输入IDs:`, list.map(i => i.nxDistributerGoodsId));
    
    // 去重处理：确保每个商品ID只出现一次
    const goodsMap = new Map();
    list.forEach(item => {
      goodsMap.set(String(item.nxDistributerGoodsId), item);
    });
    const uniqueList = Array.from(goodsMap.values());
    
    console.log(`>>> 去重后长度: ${uniqueList.length}`);
    console.log(`>>> 去重后IDs:`, uniqueList.map(i => i.nxDistributerGoodsId));
    
    // 根据您的反馈，此处的排序是多余的，因此将其注释掉。
    // uniqueList.sort((a, b) => a.nxDgDfgGoodsGrandId - b.nxDgDfgGoodsGrandId);
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
    
    console.log(`>>> processGoodsListDis 最终输出长度: ${result.length}`);
    console.log(`>>> processGoodsListDis 最终输出IDs:`, result.map(i => i.nxDistributerGoodsId));
    
    return result;
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
        var goodsData = "depGoodsArrAi[" + this.data.editOrderIndex +"].nxDistributerStandardEntities";
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
        var goodsData = "goodsList[" + this.data.editOrderIndex +"].nxDistributerStandardEntities";
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


  toSearch() {
    wx.navigateTo({
      url: '../resGoodsSearch/resGoodsSearch',
    })
  },



  deleteYes() {
   
    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        if (that.data.tab1Index == 0) {

          var data1 = "depGoodsArrAi[" + this.data.editOrderIndex + "].nxDepartmentOrdersEntity";
          this.setData({
            [data1]: null,

            // shode
          })

        }
        if (that.data.tab1Index == 1) {
          var data1 = "goodsList[" + this.data.editOrderIndex + "].nxDepartmentOrdersEntity";
          this.setData({
            [data1]: null,
            editApply: false
          })
        }
        that._cancle()

      }
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




  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})