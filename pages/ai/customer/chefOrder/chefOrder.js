const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'

import {
  getDisInfo,
  updateOrder,
  deleteOrder,
  restrauntCashPayLaodu,
  depGetApplyAiFather,
  depGetApplyAiByTime,
  depUserLoginDaoDu,
  subDepGetApplyAiByTime,
  subDepGetApplyAiFather,
  depOrderUserSaveWithFileLaodu,
  depSearchTodayOrders,
  orderGroupPreview,
  getClaimableCoupons,
  claimDistributerCoupon
} from '../../../../lib/apiRestraunt'

import {
  disSaveStandard,
  getDepInfo,
} from '../../../../lib/apiRestraunt'


Page({
  data: {
    isSubDep: false,
    bill: -1,
    showPage: false,
    popupAnimation: {},
    depInfo: {
      nxDepartmentEntities: []
    },
    selDepartmentName: '',
    selDepId: '',
    avatarUrl: '/images/User2.png',
    userName: '',
    nameError: '',
    isFormValid: false,
    workScope: 'all', // 新增：工作范围选择，默认为负责所有部门

    gbDepFatherId: -1,
    resFatherId: -1,
    depRecord: false,
    showPopup: false,
    popupAnim: {},

    showDepSwitch: false,
    depSwitchAnim: null,

    // 新增：数据刷新控制  lanxiang 陈 13581698082
    lastRefreshTime: 0,
    refreshInterval: 30000, // 

    showSwitchMenu: false,
    showType: 'time',
    searchArr: null,  // 初始化为null，这样页面打开时不会显示搜索蒙版
    searchValue: '',

    orderPreview: null,
    orderPreviewLoading: false,
    claimableCoupons: [],
    claimableCouponViews: [],
    claimableLoading: false,
    claimingCouponId: null,
    claimingAllCoupons: false,
    showClaimableCouponPopup: false,
    claimCouponPopupDismissed: false,
    billSummary: null,
    showCashSettle: false,
    homeBenefitSummary: null,

  },


  onShow() {
    this.setData({
      windowWidth: wx.getWindowInfo().windowWidth * globalData.rpxR,
      windowHeight: wx.getWindowInfo().windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });

    // 检查是否需要立即刷新（从添加订单页面返回）
    const needImmediateRefresh = wx.getStorageSync('needRefreshOrderData');

    if (needImmediateRefresh) {
      console.log("检测到订单数据变更，立即刷新");
      wx.removeStorageSync('needRefreshOrderData'); // 清除标记

      if (this.data.isSubDep) {
        if(this.data.showType == 'time'){
          this._initDataSub();
        }else if(this.data.showType =='category'){
          this._initSubDepDataByFather();
        }
        
      } else {
        if (this.data.showType == 'time') {
          this._initData();
        } else if (this.data.showType == 'category') {
          this._initDataByFather();
        }

      }
      return;
    }

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 1. 优先用分享参数
    let depFatherId = options.depFatherId || null;
    let disId = options.disId || null;

    // 2. 没有参数则用缓存
    if (!depFatherId) depFatherId = wx.getStorageSync('depFatherId') || null;
    if (!disId) disId = wx.getStorageSync('disId') || null;

    if (options.depFatherId) {
      // 使用 firstVisitTimestamp 存储精确时间戳
      if (!wx.getStorageSync('firstVisitTimestamp')) {
        const timestamp = Date.now();
        wx.setStorageSync('firstVisitTimestamp', timestamp);
        console.log('[日志] 首次通过分享访问，保存精确时间戳:', new Date(timestamp));
      }
    }

    this.setData({
      imgUrl: 'userImage/say.png',
      depFatherId,
      disId,
      url: apiUrl.server,
    });

    var cachedUserInfo = wx.getStorageSync('userInfo');
    if (!cachedUserInfo) {
      this.setData({
        userInfo: null,
        showPage: true,
      });
      this._aaa();
    } else {
      this.setData({
        userInfo: cachedUserInfo,
      });
    }

    if (depFatherId && disId) {
      // 3. 有参数或缓存，先尝试用户登录
      wx.setStorageSync('depFatherId', depFatherId);
      wx.setStorageSync('disId', disId);
      var disInfo = wx.getStorageSync('disInfo');
      if(disInfo){
        this.setData({
          disInfo: disInfo,

        })
      }
    }
    this._getDisInfo();
    this.attemptLogin();

  },



  // 

  _getDisInfo(){

    getDisInfo(this.data.disId).then(res =>{
      if(res.result.code == 0){
        console.log("res==", Number(res.result.data.nxDistributerBuyQuantity))
        this.setData({
          disInfo: res.result.data,
          res: Number(res.result.data.nxDistributerBuyQuantity)
        })
        wx.setStorageSync('disInfo', res.result.data);
      }
    })

  },  
  toSwitchDep() {
    this.setData({
      showDepSwitch: true,
      depSwitchAnim: 'popup-fade-in'
    });
  },

  hideDepSwitch() {
    this.setData({
      showDepSwitch: false
    });
  },

  onSelectDep(e) {
    var father = this.data.depInfo.fatherDepartmentEntity;
    const item = e.currentTarget.dataset.item;
    item.fatherDepartmentEntity = father;
    item.nxDepartmentEntities = [];
    console.log("切换部门:", item);

    // 切换部门逻辑 - 先清理旧数据，再设置新数据
    this.setData({
      depInfo: item,
      depId: item.nxDepartmentId,
      depName: item.nxDepartmentName,
      showDepSwitch: false,
      // 清理旧数据
      applyArr: [],
      depArr: [],
      bill: -1
    });

    // 重新初始化数据
    
    if(this.data.showType == 'time'){
      this._initDataSub();
    }else if(this.data.showType =='category'){
      this._initSubDepDataByFather();
    }
  },

  onNavButtonTap() {
    if (this.data.userInfo == null) {
      this._aaa();
      this.setData({
        showPage: true,
      })
    } else {
      if (this.data.userInfo.nxDuAdmin == 0) {
        wx.navigateTo({
          url: '../../../depUserEdit/depUserEdit',
        })
      } else {
        wx.navigateTo({
          url: '../../../resGroup/resGroup',
        })
      }

    }
  },



  attemptLogin() {

    wx.login({
      success: (res) => {
        console.log("loginloginlogin", res)
        depUserLoginDaoDu(res.code)
          .then((response) => {
            // 登录成功的判断：code===0 且 userInfo 存在
            if (response.result.code === 0 && response.result.data && response.result.data.userInfo) {
              var depInfo = response.result.data.depInfo;
              wx.setStorageSync('depInfo', depInfo);
              wx.setStorageSync('userInfo', response.result.data.userInfo);
              this.setData({
                depInfo,
                disId: depInfo.nxDepartmentDisId,
                userInfo: response.result.data.userInfo,
                showPage: false,
                depSettleType: depInfo.nxDepartmentSettleType,
                depFatherId: depInfo.nxDepartmentFatherId == 0 ? depInfo.nxDepartmentId : depInfo.nxDepartmentFatherId,
                depId: depInfo.nxDepartmentId,
                depHasSubs: depInfo.nxDepartmentSubAmount,
              });

              if (depInfo.nxDepartmentFatherId !== 0) {
                this.setData({
                  isSubDep: true,
                })
                if(this.data.showType == 'time'){
                  this._initDataSub();
                }else if(this.data.showType =='category'){
                  this._initSubDepDataByFather();
                }
              } else {
                this.setData({
                  isSubDep: false,
                })
                if (this.data.showType === 'time') {
                  this._initData();
                } else if (this.data.showType === 'category') {
                  this._initDataByFather();
                }

              }
              if (depInfo.nxDepartmentRecordMinutes !== null && depInfo.nxDepartmentRecordMinutes > 0) {
                this.setData({
                  depRecord: true,
                })
              } else {
                this.setData({
                  depRecord: false,
                })
              }
            } else {
              // 业务逻辑失败，用户不存在，执行_getDepInfo和_checkIfShowPage
              if (this.data.disId && this.data.depFatherId) {
                console.log("用户不存在，执行_getDepInfo和_checkIfShowPage");
                wx.removeStorageSync('userInfo');
                this._getDepInfo().then(() => {
                  this._checkIfShowPage();
                });
              } else {
                wx.redirectTo({
                  url: '../../../loginWarn/loginWarn',
                })
              }

            }
          })

      },

    });
  },


  _initData() {

    load.showLoading("获取数据中");
    depGetApplyAiByTime(this.data.depFatherId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData", res.result.data);
        if (res.result.code == 0) {

          if (this.data.depHasSubs > 0) {
            this.setData({
              depArr: res.result.data.arr,
              bill: res.result.data.bill,
            }, () => this._afterOrderDataLoaded())
          } else {
            this.setData({
              applyArr: res.result.data.arr,
              bill: res.result.data.bill,
              depInfo: res.result.data.depInfo,
            }, () => this._afterOrderDataLoaded())
            wx.setStorageSync('depInfo', res.result.data.depInfo);
          }

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })

  },


  // 点击圆形按钮，弹窗动画展开
  onFabTap() {
    this.setData({
      showPopup: !this.data.showPopup
    }, () => {
      // 动画初始化为缩小
      const anim = wx.createAnimation({
        duration: 0,
        timingFunction: 'ease',
        transformOrigin: '100% 100%'
      });
      anim.scale(0.1).opacity(0.2).step();
      this.setData({
        popupAnim: anim.export()
      }, () => {
        // 再展开
        setTimeout(() => {
          const anim = wx.createAnimation({
            duration: 400,
            timingFunction: 'cubic-bezier(.21,1.02,.73,1)',
            transformOrigin: '100% 100%'
          });
          anim.scale(1).opacity(1).step();
          this.setData({
            popupAnim: anim.export()
          });
        }, 20);
      });
    });
  },

  // 遮罩层/弹窗任意处点击，收起
  onMaskTap() {
    const animation = wx.createAnimation({
      duration: 320,
      timingFunction: 'cubic-bezier(.21,1.02,.73,1)',
      transformOrigin: '90% 90%',
    });
    animation
      .scale(0.1)
      .opacity(0.2)
      .step();
    this.setData({
      popupAnim: animation.export()
    });
    setTimeout(() => {
      this.setData({
        showPopup: false
      });
    }, 320);
  },

  // 如果弹窗点击 Message按钮，也可以收起
  onPopupTap() {
    // 这里可写 Message 业务逻辑
    this.onMaskTap();
  },


  // 获取 yyyy-mm-dd 字符串
  _getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  },


  _login() {
    wx.login({
      success: (res) => {
        load.hideLoading();
        depUserLoginDaoDu(res.code)
          .then((response) => {
            // 登录成功的判断：code===0 且 userInfo 存在
            if (response.result.code === 0 && response.result.data && response.result.data.userInfo) {
              wx.setStorageSync('userInfo', response.result.data.userInfo);
              wx.setStorageSync('depInfo', response.result.data.depInfo);
              var depInfo = response.result.data.depInfo;
              this.setData({
                depInfo,
                disId: depInfo.nxDepartmentDisId,
                userInfo: response.result.data.userInfo,
                depSettleType: depInfo.nxDepartmentSettleType,
                depFatherId: depInfo.nxDepartmentFatherId == 0 ? depInfo.nxDepartmentId : depInfo.nxDepartmentFatherId,
                depId: depInfo.nxDepartmentId,
                depHasSubs: depInfo.nxDepartmentSubAmount,
                showPage: false
              });
              wx.removeStorageSync('firstVisitTimestamp');
              if (depInfo.nxDepartmentFatherId !== 0) {
                this.setData({
                  isSubDep: true,
                })
                if(this.data.showType == 'time'){
                  this._initDataSub();
                }else if(this.data.showType =='category'){
                  this._initSubDepDataByFather();
                }

              } else {
                this.setData({
                  isSubDep: false,
                })
                if (this.data.showType === 'time') {
                  this._initData();
                } else if (this.data.showType === 'category') {
                  this._initDataByFather();
                }

              }


            } else {



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

  onReady() {
    const anim = wx.createAnimation({
      duration: 500,
      timingFunction: 'ease-in-out'
    });
    anim.scale(1.1).step({
      duration: 250
    }).scale(1).step({
      duration: 250
    });
    this.setData({
      fabMainAnimation: anim.export()
    });

  },



  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
    return {
      title: '"' + this.data.disInfo.nxDistributerName  + '下单小程序', 
      path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId + '&disId=' + this.data.disId,
      imageUrl: this.data.url + this.data.disInfo.nxDistributerImg,
    }
  },

  _getDepInfo() {
    return new Promise((resolve, reject) => {
      getDepInfo(this.data.depFatherId).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var depInfo = res.result.data;
          console.log("getDepInfogetDepInfo", res.result.data);
          wx.setStorageSync('depInfo', res.result.data)
          this.setData({
            depInfo: res.result.data,
            depSettleType: depInfo.nxDepartmentSettleType,
            depFatherId: depInfo.nxDepartmentId,
            depId: depInfo.nxDepartmentId,
            depHasSubs: depInfo.nxDepartmentSubAmount,
            depName: depInfo.nxDepartmentName,
          }, resolve); // setData 完成后 resolve
          if (depInfo.nxDepartmentRecordMinutes !== null && depInfo.nxDepartmentRecordMinutes > 0) {
            this.setData({
              depRecord: true,
            })
          } else {
            this.setData({
              depRecord: false,
            })
          }

          if (this.data.showType === 'time') {
            this._initData();
          } else if (this.data.showType === 'category') {
            this._initDataByFather();
          }
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          reject(res.result.msg);
        }
      })
    });
  },


  _initDataSub() {
    load.showLoading("获取数据中");
    return subDepGetApplyAiByTime(this.data.depId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData", res.result.data);
        if (res.result.code == 0) {
          // 计算全局序号
          const applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);

          this.setData({
            applyArr: applyArrWithGlobalIndex,
            bill: res.result.data.bill,
          }, () => this._afterOrderDataLoaded())

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
        return res;
      })
      .catch((error) => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        });
        throw error;
      });
  },

  _initDataByFather() {

    load.showLoading("获取数据中");
    return depGetApplyAiFather(this.data.depFatherId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData", res.result.data);
        if (res.result.code == 0) {

          if (this.data.depHasSubs > 0) {
            // 计算全局序号
            const depArrWithGlobalIndex = this._calculateGlobalOrderIndexForDepArr(res.result.data.arr);

            this.setData({
              depArr: depArrWithGlobalIndex,
              bill: res.result.data.bill,
            }, () => this._afterOrderDataLoaded())
          } else {
            // 计算全局序号
            const applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);

            this.setData({
              applyArr: applyArrWithGlobalIndex,
              bill: res.result.data.bill,
              depInfo: res.result.data.depInfo
            }, () => this._afterOrderDataLoaded())
            wx.setStorageSync('depInfo', res.result.data.depInfo);
          }

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
        return res;
      })
      .catch((error) => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        });
        throw error;
      });

  },
  _initSubDepDataByFather() {

    load.showLoading("获取数据中");
    return subDepGetApplyAiFather(this.data.depId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData_initSubDepDataByFather", res.result.data);
        if (res.result.code == 0) {
          // 计算全局序号
          const applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);

          this.setData({
            applyArr: applyArrWithGlobalIndex,
            bill: res.result.data.bill,
            depInfo: res.result.data.depInfo
          }, () => this._afterOrderDataLoaded())
          wx.setStorageSync('depInfo', res.result.data.depInfo);

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
        return res;
      })
      .catch((error) => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        });
        throw error;
      });
  },

  // 计算单个部门订单的部门内序号
  _calculateGlobalOrderIndex(applyArr) {
    if (!applyArr || !Array.isArray(applyArr)) return applyArr;

    let depOrderIndex = 1;
    return applyArr.map(father => {
      if (father.nxDistributerGoodsEntities && Array.isArray(father.nxDistributerGoodsEntities)) {
        father.nxDistributerGoodsEntities = father.nxDistributerGoodsEntities.map(goods => {
          if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
            goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
              order.globalOrderIndex = depOrderIndex++;
              return order;
            });
          }
          return goods;
        });
      }
      return father;
    });
  },

  // 计算多部门订单的部门内序号（每个部门下所有订单合并编号）
  _calculateGlobalOrderIndexForDepArr(depArr) {
    if (!depArr || !Array.isArray(depArr)) return depArr;
    return depArr.map(dep => {
      let depOrderIndex = 1;
      if (dep.depOrders && Array.isArray(dep.depOrders)) {
        dep.depOrders = dep.depOrders.map(father => {
          if (father.nxDistributerGoodsEntities && Array.isArray(father.nxDistributerGoodsEntities)) {
            father.nxDistributerGoodsEntities = father.nxDistributerGoodsEntities.map(goods => {
              if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
                goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                  order.globalOrderIndex = depOrderIndex++;
                  return order;
                });
              }
              return goods;
            });
          }
          return father;
        });
      }
      return dep;
    });
  },

  _isCashSettle() {
    var depInfo = this.data.depInfo;
    return depInfo && Number(depInfo.nxDepartmentSettleType) === 0;
  },

  _collectAllOrders() {
    var orders = [];
    var applyArr = this.data.applyArr || [];
    var depArr = this.data.depArr || [];

    if (applyArr.length > 0 && applyArr[0].nxDepartmentOrdersId) {
      return applyArr.slice();
    }

    applyArr.forEach(function (father) {
      (father.nxDistributerGoodsEntities || []).forEach(function (goods) {
        (goods.nxDepartmentOrdersEntities || []).forEach(function (order) {
          orders.push(order);
        });
      });
    });

    if (orders.length > 0) {
      return orders;
    }

    depArr.forEach(function (dep) {
      (dep.depOrders || []).forEach(function (father) {
        if (father.nxDepartmentOrdersId) {
          orders.push(father);
          return;
        }
        (father.nxDistributerGoodsEntities || []).forEach(function (goods) {
          (goods.nxDepartmentOrdersEntities || []).forEach(function (order) {
            orders.push(order);
          });
        });
      });
    });

    return orders;
  },

  _collectUnbilledOrderIds() {
    return this._collectAllOrders()
      .filter(function (order) {
        return order && order.nxDepartmentOrdersId != null && (order.nxDoBillId == null || order.nxDoBillId === -1);
      })
      .map(function (order) {
        return order.nxDepartmentOrdersId;
      });
  },

  _collectPreviewOrderIds() {
    var bill = this.data.bill;
    if (bill && bill !== -1) {
      var billOrders = bill.nxDepartmentOrdersEntities || [];
      var billIds = billOrders
        .filter(function (order) {
          return order && order.nxDepartmentOrdersId != null;
        })
        .map(function (order) {
          return order.nxDepartmentOrdersId;
        });
      if (billIds.length) {
        return billIds;
      }
    }
    return this._collectUnbilledOrderIds();
  },

  _resolvePreviewDepartmentId() {
    if (this.data.depId) {
      return this.data.depId;
    }
    var depInfo = this.data.depInfo;
    if (depInfo && depInfo.nxDepartmentId) {
      return depInfo.nxDepartmentId;
    }
    return this.data.depFatherId;
  },

  _resolveGroupDepartmentId() {
    if (this.data.depFatherId) {
      return this.data.depFatherId;
    }
    var depInfo = this.data.depInfo;
    if (!depInfo) {
      return null;
    }
    if (Number(depInfo.nxDepartmentIsGroupDep) === 1) {
      return depInfo.nxDepartmentId;
    }
    if (depInfo.nxDepartmentFatherId && depInfo.nxDepartmentFatherId !== 0) {
      return depInfo.nxDepartmentFatherId;
    }
    return depInfo.nxDepartmentId;
  },

  _canClaimCouponAtStore() {
    var groupId = this._resolveGroupDepartmentId();
    if (!groupId) {
      return false;
    }
    return this._resolvePreviewDepartmentId() === groupId;
  },

  _formatDeliveryModeLabel(mode) {
    if (mode === 'SELF_PICKUP') return '到店自提';
    if (mode === 'DELIVERY') return '配送上门';
    return mode || '配送';
  },

  _buildDeliveryFeeFormula(data) {
    if (!data) return '';
    var mode = data.feeMode || '';
    var deliveryFee = this._moneyText(data.deliveryFee);
    if (mode === 'SELF_PICKUP') return '自提订单，免配送费';
    if (mode === 'NO_RULE') return '';
    if (mode === 'FREE') return '当前运费策略：免运费';
    if (mode === 'FIXED_AMOUNT') {
      var fixed = this._moneyText(data.startFeeAmount || data.deliveryFee);
      return '固定运费 ¥' + fixed;
    }
    if (mode === 'DISTANCE_ONLY') {
      var dist = data.distanceKm || '0';
      var baseKm = data.baseDistanceKm != null && data.baseDistanceKm !== '' ? data.baseDistanceKm : '0';
      var startFee = this._moneyText(data.startFeeAmount || '0');
      var chargeKm = data.chargeableKm != null && data.chargeableKm !== '' ? data.chargeableKm : '0';
      var perKm = this._moneyText(data.pricePerKm || '0');
      var chargeNum = Number(chargeKm);
      if (isNaN(chargeNum) || chargeNum <= 0) {
        return '配送距离 ' + dist + ' km，' + baseKm + ' km 内起步价 ¥' + startFee;
      }
      var extraFee = this._moneyText(chargeNum * Number(perKm));
      return '配送距离 ' + dist + ' km；起步 ' + baseKm + ' km 内 ¥' + startFee
        + '，超出 ' + chargeKm + ' km × ¥' + perKm + '/km = ¥' + extraFee
        + '，合计 ¥' + deliveryFee;
    }
    if (mode === 'WEIGHT_ONLY') {
      var gross = data.grossWeightJin || '0';
      var baseWeight = data.baseWeightJin != null && data.baseWeightJin !== '' ? data.baseWeightJin : (data.baseDistanceKm || '0');
      var start = this._moneyText(data.startFeeAmount || '0');
      var perJin = this._moneyText(data.pricePerJin || data.pricePerJinPerKm || '0');
      var grossNum = Number(gross);
      var baseNum = Number(baseWeight);
      if (isNaN(grossNum) || grossNum <= baseNum) {
        return '商品总重 ' + gross + ' 斤，' + baseWeight + ' 斤内起步价 ¥' + start;
      }
      var extra = this._moneyText((grossNum - baseNum) * Number(perJin));
      return '商品总重 ' + gross + ' 斤；起步 ' + baseWeight + ' 斤内 ¥' + start
        + '，超出 ' + this._moneyText(grossNum - baseNum) + ' 斤 × ¥' + perJin + '/斤 = ¥' + extra
        + '，合计 ¥' + deliveryFee;
    }
    if (mode === 'WEIGHT_DISTANCE') {
      var dist2 = data.distanceKm || '0';
      var gross2 = data.grossWeightJin || '0';
      var baseKm2 = data.baseDistanceKm || '0';
      var chargeKm2 = data.chargeableKm || '0';
      var perJinKm = this._moneyText(data.pricePerJinPerKm || '0');
      var start2 = this._moneyText(data.startFeeAmount || '0');
      var weightFee = this._moneyText(Number(chargeKm2) * Number(gross2) * Number(perJinKm));
      return '距离 ' + dist2 + ' km，商品 ' + gross2 + ' 斤；计费 ' + chargeKm2 + ' km × ' + gross2 + ' 斤 × ¥' + perJinKm + '/斤/km = ¥' + weightFee
        + '，与起步价 ¥' + start2 + ' 取高，合计 ¥' + deliveryFee;
    }
    if (data.distanceKm) {
      return '配送距离 ' + data.distanceKm + ' km，按策略计费 ¥' + deliveryFee;
    }
    return '';
  },

  _formatFeeModeLabel(feeMode) {
    if (feeMode === 'DISTANCE_ONLY') return '按距离计费';
    if (feeMode === 'WEIGHT_DISTANCE') return '按重量和距离计费';
    if (feeMode === 'WEIGHT_ONLY') return '按重量计费';
    if (feeMode === 'FIXED_AMOUNT') return '固定运费';
    if (feeMode === 'FREE') return '免运费';
    if (feeMode === 'SELF_PICKUP') return '自提免运费';
    if (feeMode === 'NO_RULE') return '暂无运费规则';
    return feeMode || '';
  },

  _formatCouponTypeLabel(couponType) {
    if (Number(couponType) === 1) return '折扣券';
    return '满减券';
  },

  _buildCouponBadgeText(coupon) {
    if (!coupon) return '';
    if (coupon.descText) {
      return String(coupon.descText).replace(/\s+/g, '');
    }
    if (Number(coupon.couponType) === 1) {
      var percent = coupon.discountPercent || '0';
      var percentNum = Number(percent);
      var percentLabel = (!isNaN(percentNum) && percentNum > 10)
        ? (percentNum / 10) + '折'
        : percent + '折';
      return '满' + (coupon.thresholdAmount || '0') + '享' + percentLabel;
    }
    return '满' + (coupon.thresholdAmount || '0') + '减' + (coupon.discountAmount || '0') + '元';
  },

  _moneyText(value) {
    var num = Number(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  },

  _buildHomeBenefitSummary(orderPreview, claimableCoupons) {
    if (!orderPreview) {
      return null;
    }
    var goodsAmountNum = Number(orderPreview.goodsAmount);
    if (isNaN(goodsAmountNum) || goodsAmountNum <= 0) {
      return null;
    }

    var coupons = [];
    var seen = {};
    var pushCoupon = function (coupon) {
      if (!coupon) return;
      var key = coupon.userCouponId || coupon.couponId || coupon.couponName || coupon.descText;
      if (key && seen[key]) return;
      if (key) seen[key] = true;
      coupons.push(coupon);
    };

    if (orderPreview) {
      pushCoupon(orderPreview.bestCoupon);
    }

    var couponBadges = coupons.slice(0, 2).map(function (coupon) {
      return this._buildCouponBadgeText(coupon) || coupon.couponName || '优惠券';
    }.bind(this)).filter(function (text) { return !!text; });

    var hasCoupon = couponBadges.length > 0;
    var couponDiscountNum = Number(orderPreview.estimatedDiscount);
    var hasCouponDiscount = !isNaN(couponDiscountNum) && couponDiscountNum > 0;
    var deliveryFeeNum = 0;
    if (orderPreview && orderPreview.showDeliveryFee) {
      deliveryFeeNum = Number(orderPreview.deliveryFee);
    }
    var hasDeliveryFee = !isNaN(deliveryFeeNum) && deliveryFeeNum > 0;
    // 既没有运费也没有优惠券时整块不展示
    var showFeeCard = hasCoupon || hasCouponDiscount || hasDeliveryFee;

    var couponText = '';
    if (hasCoupon) {
      couponText = coupons.length > 1 ? (coupons.length + '张可用') : '可用';
    }

    return {
      goodsAmount: this._moneyText(goodsAmountNum),
      hasCoupon: hasCoupon,
      hasCouponDiscount: hasCouponDiscount,
      couponText: couponText,
      couponBadges: couponBadges,
      couponDiscount: this._moneyText(couponDiscountNum),
      hasDeliveryFee: hasDeliveryFee,
      deliveryFee: this._moneyText(deliveryFeeNum),
      showFeeCard: showFeeCard,
      deliveryFeeEstimate: !!(orderPreview && orderPreview.deliveryFeeEstimate),
      estimatedPayAmount: orderPreview.estimatedPayAmount || this._moneyText(Math.max(0, goodsAmountNum + deliveryFeeNum - (isNaN(couponDiscountNum) ? 0 : couponDiscountNum))),
    };
  },

  _buildClaimableCouponViews(coupons) {
    return (coupons || []).map(function (coupon) {
      var isDiscount = Number(coupon.couponType) === 1;
      var percent = coupon.discountPercent || '0';
      var percentNum = Number(percent);
      var percentLabel = (!isNaN(percentNum) && percentNum > 10)
        ? (percentNum / 10) + '折'
        : percent + '折';
      var amountText = isDiscount ? percentLabel : '¥' + this._moneyText(coupon.discountAmount).replace(/\.00$/, '');
      var thresholdText = this._buildCouponBadgeText(coupon);
      var dateText = coupon.validPeriodText || '';
      if (!dateText && (coupon.startDate || coupon.stopDate)) {
        dateText = (coupon.startDate || '即日起') + '—' + (coupon.stopDate || '长期');
      }
      if (!dateText) {
        dateText = '领取后可用';
      }
      var scopeText = coupon.scopeLabel || '';
      if (!scopeText && coupon.scopeNames && coupon.scopeNames.length) {
        scopeText = coupon.scopeNames.join('、');
      }
      return Object.assign({}, coupon, {
        amountText: amountText,
        thresholdText: thresholdText,
        dateText: dateText,
        scopeText: scopeText,
        displayName: coupon.couponName || thresholdText || '优惠券',
      });
    }.bind(this));
  },

  _buildBillSummary(bill) {
    if (!bill || bill === -1) return null;
    var goodsAmount = bill.nxDbGoodsAmount || bill.nxDbTotal || '0.00';
    var couponDiscount = bill.nxDbCouponDiscountAmount || '0.00';
    var deliveryFee = bill.nxDbDeliveryFee || '0.00';
    var payAmount = bill.nxDbPayAmount || bill.nxDbTotal || '0.00';
    var deliveryMode = bill.nxDbDeliveryMode || 'DELIVERY';
    var isSelfPickup = deliveryMode === 'SELF_PICKUP';
    var couponNum = Number(couponDiscount);
    var deliveryNum = Number(deliveryFee);
    // 是否有运费：存在实际运费(>0) 且 非自提
    var hasFee = !isSelfPickup && deliveryNum > 0;
    // 是否有优惠券：存在实际优惠金额(>0)
    var hasCouponAny = couponNum > 0;
    // 既无运费也无优惠券时整块不展示
    var showFeeCard = hasFee || hasCouponAny;
    return {
      goodsAmount: this._moneyText(goodsAmount),
      couponDiscount: this._moneyText(couponDiscount),
      couponName: bill.nxDbCouponName || '',
      couponBadgeText: bill.nxDbCouponName ? String(bill.nxDbCouponName).replace(/\s+/g, '') : '',
      hasCoupon: couponNum > 0,
      hasCouponDiscount: couponNum > 0,
      deliveryFee: this._moneyText(deliveryFee),
      deliveryMode: deliveryMode,
      deliveryModeLabel: this._formatDeliveryModeLabel(deliveryMode),
      deliveryAddress: bill.nxDbDeliveryAddress || '',
      distanceKm: bill.nxDbDistanceKm || '',
      payAmount: this._moneyText(payAmount),
      showDeliveryFee: !isSelfPickup,
      showDeliveryFeeDetail: !isSelfPickup && (!!(bill.nxDbDeliveryAddress) || !!(bill.nxDbDistanceKm)),
      deliveryFeeEstimate: false,
      showFeeCard: showFeeCard,
    };
  },

  _enrichBillSummaryWithPreview(billSummary, orderPreview) {
    if (!billSummary) {
      return billSummary;
    }
    var summary = Object.assign({}, billSummary);
    if (orderPreview) {
      var badge = orderPreview.couponBadgeText || this._buildCouponBadgeText(orderPreview.bestCoupon);
      if (badge) {
        summary.couponBadgeText = badge;
      }
    }
    return summary;
  },

  _processOrderPreview(data) {
    if (!data) return null;
    var couponPreview = data.couponPreview || {};
    var availableCoupons = (couponPreview.availableCoupons || []).map(function (item) {
      return Object.assign({}, item, {
        couponTypeLabel: item.couponTypeLabel || this._formatCouponTypeLabel(item.couponType),
      });
    }.bind(this));
    var unavailableCoupons = (couponPreview.unavailableCoupons || []).map(function (item) {
      return Object.assign({}, item, {
        couponTypeLabel: item.couponTypeLabel || this._formatCouponTypeLabel(item.couponType),
      });
    }.bind(this));
    var bestCoupon = couponPreview.bestCoupon || null;
    var estimatedDiscount = this._moneyText(couponPreview.estimatedDiscountAmount);
    var deliveryFee = this._moneyText(data.deliveryFee);
    var deliveryMode = data.deliveryMode || 'DELIVERY';
    var isSelfPickup = deliveryMode === 'SELF_PICKUP';
    var deliveryFeeNum = Number(deliveryFee);
    var goodsAmountNum = Number(this._moneyText(data.goodsAmount));
    var estimatedPayFromApi = this._moneyText(couponPreview.estimatedPayAmount);
    var estimatedPayAmount = estimatedPayFromApi;
    if (!estimatedPayAmount || estimatedPayAmount === '0.00') {
      estimatedPayAmount = this._moneyText(Math.max(0, goodsAmountNum + deliveryFeeNum - Number(estimatedDiscount)));
    }
    var hasCouponDiscount = Number(estimatedDiscount) > 0;
    var deliveryFeeFormula = this._buildDeliveryFeeFormula(data);
    var showDeliveryFeeDetail = !isSelfPickup && data.feeMode && data.feeMode !== 'NO_RULE';
    return {
      goodsAmount: this._moneyText(data.goodsAmount),
      deliveryFee: deliveryFee,
      payAmount: this._moneyText(data.payAmount),
      deliveryMode: deliveryMode,
      deliveryModeLabel: this._formatDeliveryModeLabel(deliveryMode),
      deliveryAddress: data.deliveryAddress || '',
      distanceKm: data.distanceKm || '',
      baseDistanceKm: data.baseDistanceKm || '',
      baseWeightJin: data.baseWeightJin || '',
      grossWeightJin: data.grossWeightJin || '',
      startFeeAmount: data.startFeeAmount ? this._moneyText(data.startFeeAmount) : '',
      pricePerKm: data.pricePerKm ? this._moneyText(data.pricePerKm) : '',
      pricePerJin: data.pricePerJin ? this._moneyText(data.pricePerJin) : '',
      pricePerJinPerKm: data.pricePerJinPerKm ? this._moneyText(data.pricePerJinPerKm) : '',
      baseChargeKm: data.baseChargeKm || '',
      chargeableKm: data.chargeableKm || '',
      deliveryFeeFormula: deliveryFeeFormula,
      showDeliveryFeeDetail: showDeliveryFeeDetail,
      feeMode: data.feeMode || '',
      feeModeLabel: data.feeModeLabel || this._formatFeeModeLabel(data.feeMode),
      deliveryFeeEstimate: !!data.deliveryFeeEstimate,
      deliveryFeePending: !isSelfPickup && (data.feeMode === 'NO_RULE' || deliveryFeeNum === 0),
      showDeliveryFee: !isSelfPickup,
      availableCoupons: availableCoupons,
      unavailableCoupons: unavailableCoupons,
      bestCoupon: bestCoupon,
      couponBadgeText: this._buildCouponBadgeText(bestCoupon),
      hasCouponDiscount: hasCouponDiscount,
      estimatedDiscount: estimatedDiscount,
      estimatedPayAmount: estimatedPayAmount,
      hasCoupons: availableCoupons.length > 0 || unavailableCoupons.length > 0,
    };
  },

  _afterOrderDataLoaded() {
    var showCashSettle = this._isCashSettle();
    this.setData({ showCashSettle: showCashSettle });

    if (!showCashSettle) {
      this.setData({
        billSummary: null,
        orderPreview: null,
        orderPreviewLoading: false,
        claimableCoupons: [],
        claimableLoading: false,
        homeBenefitSummary: null,
      });
      return;
    }

    var bill = this.data.bill;
    if (bill && bill !== -1) {
      this.setData({
        billSummary: this._enrichBillSummaryWithPreview(this._buildBillSummary(bill), this.data.orderPreview),
      });
    } else {
      this.setData({ billSummary: null });
    }

    this._loadClaimableCoupons();
    this._refreshOrderPreview();
  },

  _loadClaimableCoupons() {
    if (!this._isCashSettle() || !this.data.disId) {
      this.setData({
        claimableCoupons: [],
        claimableCouponViews: [],
        claimableLoading: false,
        canClaimStoreCoupon: false,
        showClaimableCouponPopup: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
      });
      return;
    }
    var canClaim = this._canClaimCouponAtStore();
    var groupDepartmentId = this._resolveGroupDepartmentId();
    if (!canClaim || !groupDepartmentId) {
      this.setData({
        claimableCoupons: [],
        claimableCouponViews: [],
        claimableLoading: false,
        canClaimStoreCoupon: false,
        showClaimableCouponPopup: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
      });
      return;
    }
    this.setData({ claimableLoading: true, canClaimStoreCoupon: true });
    getClaimableCoupons({
      distributerId: this.data.disId,
      departmentId: groupDepartmentId,
    }).then(function (res) {
      if (res.result && res.result.code === 0) {
        var coupons = res.result.data || [];
        var couponViews = this._buildClaimableCouponViews(coupons);
        this.setData({
          claimableCoupons: coupons,
          claimableCouponViews: couponViews,
          claimableLoading: false,
          showClaimableCouponPopup: couponViews.length > 0 && !this.data.claimCouponPopupDismissed,
          homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, coupons),
        });
      } else {
        this.setData({
          claimableCoupons: [],
          claimableCouponViews: [],
          claimableLoading: false,
          showClaimableCouponPopup: false,
          homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
        });
      }
    }.bind(this)).catch(function () {
      this.setData({
        claimableCoupons: [],
        claimableCouponViews: [],
        claimableLoading: false,
        showClaimableCouponPopup: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
      });
    }.bind(this));
  },

  openClaimableCouponPopup() {
    if (!this.data.claimableCouponViews || !this.data.claimableCouponViews.length) {
      return;
    }
    this.setData({
      showClaimableCouponPopup: true,
      claimCouponPopupDismissed: false,
    });
  },

  closeClaimableCouponPopup() {
    this.setData({
      showClaimableCouponPopup: false,
      claimCouponPopupDismissed: true,
    });
  },

  onClaimCoupon(e) {
    var couponId = e.currentTarget.dataset.id;
    if (!couponId || this.data.claimingCouponId || this.data.claimingAllCoupons) {
      return;
    }
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先登录后再领取', icon: 'none' });
      this.setData({ showPage: true });
      return;
    }
    if (!this._canClaimCouponAtStore()) {
      wx.showToast({ title: '仅门店总部门可领取', icon: 'none' });
      return;
    }
    var groupDepartmentId = this._resolveGroupDepartmentId();
    if (!groupDepartmentId) {
      wx.showToast({ title: '门店信息缺失', icon: 'none' });
      return;
    }
    this.setData({ claimingCouponId: couponId });
    claimDistributerCoupon({
      couponId: couponId,
      distributerId: this.data.disId,
      departmentId: groupDepartmentId,
    }).then(function (res) {
      this.setData({ claimingCouponId: null });
      if (res.result && res.result.code === 0) {
        wx.showToast({ title: '领取成功', icon: 'success' });
        this._loadClaimableCoupons();
        this._refreshOrderPreview();
      } else {
        wx.showToast({
          title: (res.result && res.result.msg) || '领取失败',
          icon: 'none',
        });
      }
    }.bind(this)).catch(function () {
      this.setData({ claimingCouponId: null });
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    }.bind(this));
  },

  claimAllCoupons() {
    var coupons = this.data.claimableCouponViews || [];
    if (!coupons.length || this.data.claimingAllCoupons || this.data.claimingCouponId) {
      return;
    }
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先登录后再领取', icon: 'none' });
      this.setData({ showPage: true });
      return;
    }
    if (!this._canClaimCouponAtStore()) {
      wx.showToast({ title: '仅门店总部门可领取', icon: 'none' });
      return;
    }
    var groupDepartmentId = this._resolveGroupDepartmentId();
    if (!groupDepartmentId) {
      wx.showToast({ title: '门店信息缺失', icon: 'none' });
      return;
    }

    var couponIds = coupons.map(function (item) { return item.couponId; }).filter(function (id) { return !!id; });
    if (!couponIds.length) {
      return;
    }

    this.setData({ claimingAllCoupons: true });
    var chain = Promise.resolve();
    var successCount = 0;
    couponIds.forEach(function (couponId) {
      chain = chain.then(function () {
        return claimDistributerCoupon({
          couponId: couponId,
          distributerId: this.data.disId,
          departmentId: groupDepartmentId,
        }).then(function (res) {
          if (res.result && res.result.code === 0) {
            successCount += 1;
          }
        });
      }.bind(this));
    }.bind(this));

    chain.then(function () {
      this.setData({
        claimingAllCoupons: false,
        showClaimableCouponPopup: false,
        claimCouponPopupDismissed: true,
      });
      wx.showToast({ title: successCount > 0 ? ('已领取' + successCount + '张') : '暂无可领取', icon: 'none' });
      this._loadClaimableCoupons();
      this._refreshOrderPreview();
    }.bind(this)).catch(function () {
      this.setData({ claimingAllCoupons: false });
      wx.showToast({ title: '领取失败，请重试', icon: 'none' });
      this._loadClaimableCoupons();
    }.bind(this));
  },

  _refreshOrderPreview() {
    if (!this._isCashSettle()) {
      this.setData({ orderPreview: null, orderPreviewLoading: false, homeBenefitSummary: null });
      return;
    }

    var orderIds = this._collectPreviewOrderIds();
    if (!orderIds.length || !this.data.disId) {
      this.setData({
        orderPreview: null,
        orderPreviewLoading: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
      });
      return;
    }

    var departmentId = this._resolvePreviewDepartmentId();
    if (!departmentId) {
      this.setData({
        orderPreview: null,
        orderPreviewLoading: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
      });
      return;
    }

    var payload = {
      distributerId: this.data.disId,
      departmentId: departmentId,
      orderIds: orderIds,
    };
    if (this.data.userInfo && this.data.userInfo.nxDepartmentUserId) {
      payload.departmentUserId = this.data.userInfo.nxDepartmentUserId;
    }

    this.setData({
      orderPreviewLoading: true,
      homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
    });
    orderGroupPreview(payload).then(function (res) {
      if (res.result && res.result.code === 0) {
        var orderPreview = this._processOrderPreview(res.result.data);
        var update = {
          orderPreview: orderPreview,
          orderPreviewLoading: false,
          homeBenefitSummary: this._buildHomeBenefitSummary(orderPreview, this.data.claimableCoupons),
        };
        if (this.data.billSummary) {
          update.billSummary = this._enrichBillSummaryWithPreview(this.data.billSummary, orderPreview);
        }
        this.setData(update);
      } else {
        this.setData({
          orderPreview: null,
          orderPreviewLoading: false,
          homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
        });
      }
    }.bind(this)).catch(function () {
      this.setData({
        orderPreview: null,
        orderPreviewLoading: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
      });
    }.bind(this));
  },

  closeCart() {
    this.setData({ bill: -1 });
  },

  delApply() {

    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })

    this.hideModal();

  },


  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      this.deleteApplyApi()
    }
  },

  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
    })

    load.showLoading("删除订单");
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);
        console.log("zhegnzaisousuo ");

        // 检查是否在搜索状态：searchArr不为null且searchValue不为空
        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          // 如果正在搜索，重新搜索
          console.log("[chefOrder] 删除订单后检测到搜索状态，重新搜索");
          this.reSearch();
        } else {
          if (this.data.isSubDep) {

            if(this.data.showType == 'time'){
              this._initDataSub();
            }else if(this.data.showType =='category'){
              this._initSubDepDataByFather();
            }
  
          } else {
            if (this.data.showType === 'time') {

              this._initData();
            } else if(this.data.showType === 'category') {
              this._initDataByFather();
            }
          }
        }
        

        this.setData({
          applyItem: "",
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

      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },



  selectDepartment(e) {
    console.log(e.currentTarget.dataset.item);
    wx.setStorageSync('orderDepInfo', e.currentTarget.dataset.item.depInfo);
    var dep = e.currentTarget.dataset.item.depInfo;
    var depFatherId = dep.nxDepartmentId;
    if (dep.nxDepartmentFatherId > 0) {
      depFatherId = dep.nxDepartmentFatherId;
    }
    var depId = dep.nxDepartmentId;
    this.setData({
      dep: dep,
      depFatherId: depFatherId,
      depId: depId,
      e,
    })
    if (this.data.openType == 'paste') {
      wx.navigateTo({
        url: '../paste/paste?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId +
          '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType + '&disId=' + this.data.disId,
      })
    } else if (this.data.openType == 'books') {
      if (this.data.depInfo.nxDepartmentSettleType == 0) {
        wx.navigateTo({
          url: '../../../resGoodsLessCash/resGoodsLessCash',
        })
      } else if (this.data.depInfo.nxDepartmentSettleType == 1) {
        wx.navigateTo({
          url: '../../../resGoodsLess/resGoodsLess',
        })
      }

    } else if (this.data.openType == 'ai') {
      wx.navigateTo({
        url: '../customerGoodsAi/customerGoodsAi?depId=' + this.data.depId + '&disId=' + this.data.disId,
      })
    } else {
      wx.navigateTo({
        url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType +
          '&beforeId=-1' + '&disId=' + this.data.disId,
      })
    }
  },


  hideOperation() {
    this.setData({
      showOperation: false
    })
  },


  toAddOrder(e) {

    console.log(e.currentTarget.dataset.type)
    var type = e.currentTarget.dataset.type;
    if (this.data.depInfo.nxDepartmentEntities.length > 0) {
      this.setData({
        showChoice: true,
        openType: type,
      })
    } else {

      wx.setStorageSync('orderDepInfo', this.data.depInfo)
      if (type == 'paste') {
        wx.navigateTo({
          url: '../paste/paste?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType + '&disId=' + this.data.disId,
        })

      } else if (type == 'ai') {
        wx.navigateTo({
          url: '../customerGoodsAi/customerGoodsAi?depId=' + this.data.depFatherId + '&disId=' + this.data.disId,
        })
      } else if (type == 'books') {
        if (this.data.depInfo.nxDepartmentSettleType == 0) {
          wx.navigateTo({
            url: '../../../resGoodsLessCash/resGoodsLessCash',
          })
        } else if (this.data.depInfo.nxDepartmentSettleType == 1) {
          wx.navigateTo({
            url: '../../../resGoodsLess/resGoodsLess',
          })
        }
      } else {
        wx.navigateTo({
          url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType +
            '&beforeId=-1' + '&disId=' + this.data.disId,
        })
      }
    }
  },


  toRecord() {
    this.hideOperation();
    wx.navigateTo({
      url: '../record/record?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + this.data.depName +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
    })

  },


  toPasteFromGoods(e) {
    console.log("toPasteFromGoodstoPasteFromGoods")
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../paste/paste?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + this.data.depName +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType + '&disId=' + this.data.disId,
    })

  },

  // /////
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



  delApplyPaste(e) {
    this.setData({
      applyItem: e.currentTarget.dataset.item
    })

    load.showLoading("删除订单")
    deleteOrder(e.currentTarget.dataset.id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);

        if (this.data.isSubDep) {
           if(this.data.showType == 'time'){
          this._initDataSub();
        }else if(this.data.showType =='category'){
          this._initSubDepDataByFather();
        }
        } else {
          if (this.data.searchValue && this.data.searchValue.trim()) {
            // 如果正在搜索，重新搜索并保持搜索状态
            this.reSearch();
          } else if (this.data.showType === 'time') {
            this._initData();
          } else if (this.data.showType === 'category') {
            this._initDataByFather();
          }
        }

        this.setData({
          applyItem: "",
          showOperationLinshi: false
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },



  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,

    })
    var levelTwoStandard = this.data.applyItem.nxDistributerGoodsEntity.nxDgWillPriceTwoStandard;
    if (this.data.applyStandardName == levelTwoStandard) {
      this.setData({
        printStandard: levelTwoStandard
      })
    } else {
      this.setData({
        printStandard: this.data.applyItem.nxDistributerGoodsEntity.nxDgGoodsStandardname
      })
    }
    console.log("thisdaprinfir", this.data.printStandard)
  },

  hideMaskGoods() {
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },

  hideChoiceMask() {
    this.setData({
      showChoice: false,
    })
  },



  /**
   * 修改配送商品申请
   */
  toEditApply(e) {

    var goodsId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    this.setData({
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      applyItem: e.currentTarget.dataset.order,
      subName: e.currentTarget.dataset.subname,
      priceLevel: e.currentTarget.dataset.order.nxDoCostPriceLevel,
      printStandard: e.currentTarget.dataset.order.nxDoPrintStandard,

    })

    if (this.data.applyItem.nxDoPurchaseStatus < 5) {
      var applyItem = this.data.applyItem;
      if (this.data.depInfo.nxDepartmentSettleType == 0) {

        if (applyItem.nxDepartmentDisGoodsEntity !== null) {
          console.log("eeeetoEditApply", applyItem.nxDepartmentDisGoodsEntity);
          this.setData({
            showCashDep: true,
            depGoods: applyItem.nxDepartmentDisGoodsEntity,
            applySubtotal: applyItem.nxDoSubtotal,
          })
        } else {
          console.log("eeeetoEditApplyshowCashshowCashshowCashshowCash");
          this.setData({
            showCash: true,
            applySubtotal: applyItem.nxDoSubtotal,
          })
        }

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
  confirmCash: function (e) {
    this._updateDisOrder(e);

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
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
        console.log(res)
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


  confirm: function (e) {

    this._updateDisOrder(e);

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
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

    console.log("修改订单参数:", dg);

    // 显示加载状态
    load.showLoading("修改订单");

    updateOrder(dg).then(res => {
      load.hideLoading();

      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);

        console.log("订单修改成功，刷新数据");

        // 检查是否在搜索状态：searchArr不为null且searchValue不为空
        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          console.log('[chefOrder] 检测到搜索状态，重新搜索');
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
        } else {
          // 根据部门类型刷新数据
          if (this.data.isSubDep) {
            if(this.data.showType == 'time'){
              this._initDataSub();
            }else if(this.data.showType =='category'){
              this._initSubDepDataByFather();
            }
          } else {
            if (this.data.showType === 'time') {
              this._initData();
            } else if (this.data.showType === 'category') {
              this._initDataByFather();
            }
          }
        }

        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });

      } else {
        console.error("订单修改失败:", res.result.msg);
        wx.showToast({
          title: res.result.msg || '修改失败',
          icon: "none"
        });
      }
    }).catch(error => {
      load.hideLoading();
      console.error("修改订单异常:", error);
      wx.showToast({
        title: '网络异常，请重试',
        icon: "none"
      });
    });
  },



  // 阻止事件冒泡
  noop() {},

  onDepartmentChange(e) {
    const idx = e.detail.value;
    const name = this.data.depInfo.nxDepartmentEntities[idx].nxDepartmentName;
    const id = this.data.depInfo.nxDepartmentEntities[idx].nxDepartmentId;
    this.setData({
      selDepartmentName: name,
      selDepId: id
    }, this.checkFormValid);
  },

  onChooseAvatar(e) {
    console.log('[注册] 选择头像:', e.detail.avatarUrl, e);
    this.setData({
      avatarUrl: e.detail.avatarUrl
    }, this.checkFormValid);
  },

  getName(e) {
    const name = e.detail.value.trim();
    let error = '';
    if (name.length > 20) {
      error = '昵称最长 20 字符';
    }
    console.log('[注册] 输入昵称:', name);
    this.setData({
      userName: name,
      nameError: error
    }, this.checkFormValid);
  },

  // 表单校验
  checkFormValid() {
    const {
      workScope,
      selDepartmentName,
      avatarUrl,
      userName,
      nameError
    } = this.data;

    // 根据工作范围调整验证逻辑
    let valid = avatarUrl !== '/images/User2.png' && userName && !nameError;

    // 如果选择负责一个部门，则需要选择部门
    if (workScope === 'single') {
      valid = valid && !!selDepartmentName;
    }

    this.setData({
      isFormValid: valid
    });
  },

  // 点击"保存"按钮时调用
  toSave() {
    console.log('[注册] 点击注册按钮，当前数据:', this.data);
    if (!this.data.isFormValid || this.data.isLoading) return;
    this.setData({
      isLoading: true
    });
    this.saveUser(this.data.avatarUrl);
  },

  // 异步保存用户信息的方法
  async saveUser(filePathList) {
    var userName = this.data.userName;
    var depId = this.data.workScope === 'all' ? this.data.depFatherId : this.data.selDepId; // 根据工作范围调整部门ID
    var depFatherId = this.data.depFatherId;
    var disId = this.data.disId;
    var admin = this.data.workScope === 'all' ? 1 : 0; // 负责所有部门订货时admin=1（管理人员），否则admin=0

    // code 5 分钟过期，保存时重新获取最新 login code，避免使用过期或未初始化的 code
    var code = '';
    try {
      code = await new Promise(function (resolve) {
        wx.login({
          success: function (res) { resolve(res.code || ''); },
          fail: function () { resolve(''); }
        });
      });
    } catch (e) {
      code = '';
    }

    console.log('保存用户信息:', {
      userName,
      workScope: this.data.workScope,
      depId,
      depFatherId,
      disId,
      admin
    });

    try {
      load.showLoading("保存修改内容");
      console.log(filePathList, userName, code, disId, depId, depFatherId, admin);

      const res = await depOrderUserSaveWithFileLaodu(
        filePathList,
        userName,
        code,
        disId,
        depId,
        depFatherId,
        admin
      );

      load.hideLoading();

      // 处理返回结果
      const resultObj = typeof res.result === 'string' ?
        JSON.parse(res.result) :
        res.result;

      if (resultObj.code === 0) {
        // 保存成功后执行登录
        this._login();
      } else {
        // 业务错误提示
        wx.showToast({
          title: resultObj.message || '请直接登录',
          icon: 'none'
        });
      }
    } catch (error) {
      load.hideLoading();
      console.error('保存修改内容错误:', error);
      wx.showToast({
        title: '网络异常，请稍后重试',
        icon: 'none'
      });
    }
  },

  hidePopup() {
   console.log("hidePopuphidePopup")
    if(!this.data.userInfo){
      wx.showToast({
        title: '请先登录或注册',
        icon: 'none'
      })
      return;
    }
    if(this.data.bill !== -1){
      wx.showToast({
        title: '支付需要用户openId，请注册',
        icon: 'none'
      })

    }else{
      const timestamp = Date.now();
      wx.setStorageSync('firstVisitTimestamp', timestamp);
      this.setData({
        showPage: false,
      })
    }
    
  },


  _checkIfShowPage() {
    if (this.data.userInfo == null && this.data.disId && this.data.depFatherId) {
      if(this.data.depInfo.nxDepartmentEntities.length > 0){
        this.setData({
          selDepId: this.data.depInfo.nxDepartmentEntities[0].nxDepartmentId,
  
        })
      }else{
        this.setData({
          selDepId: this.data.depInfo.nxDepartmentId,
        })
      }
      this.setData({
        showPage: true,
      });
      this._aaa();
    }

  },

  _aaa() {
    wx.login({
      success: (res) => {
        console.log(res);
        this.setData({
          code: res.code
        })
      },
      fail: (res => {
        wx.showToast({
          title: '请重新操作',
          icon: 'none'
        })
      })
    })
  },


  gorRunnerLobby: function () {
    if (this.data.userInfo) {
      var bill = this.data.bill;
      bill.nxUserOpenId = this.data.userInfo.nxDuWxOpenId;
      bill.nxDepartmentOrdersEntities = null;
      console.log("支付账单:", bill);

      load.showLoading("发起支付");

      restrauntCashPayLaodu(bill)
        .then(res => {
          load.hideLoading();
          if (res && res.result && res.result.map) {
            console.log("支付参数:", res.result.map);
            var map = res.result.map;
            var that = this;

            wx.requestPayment({
              nonceStr: map.nonceStr,
              package: map.package,
              signType: "MD5",
              timeStamp: map.timeStamp,
              paySign: map.paySign,
              success: function (res) {
                console.log("支付成功:", res);
                wx.showToast({
                  title: '支付成功',
                  icon: 'success'
                });

                // 使用 that 而不是 this
                if (that.data.isSubDep) {
                  if(that.data.showType == 'time'){
                    that._initDataSub();
                  }else if(that.data.showType =='category'){
                    that._initSubDepDataByFather();
                  }

                } else {
                  if (that.data.showType === 'time') {
                    that._initData();
                  } else if (that.data.showType === 'category') {
                    that._initDataByFather();
                  }
                }
              },
              fail: function (res) {
                console.log("支付失败:", res);
                wx.showToast({
                  title: '支付失败',
                  icon: 'none'
                });
              }
            });
          } else {
            console.error("支付参数异常:", res);
            wx.showToast({
              title: '支付参数异常',
              icon: 'none'
            });
          }
        })
        .catch(error => {
          load.hideLoading();
          console.error("发起支付异常:", error);
          wx.showToast({
            title: '网络异常，请重试',
            icon: 'none'
          });
        });
    } else {
      this._aaa();
      this.setData({
        showPage: true,
        bill: -1
      });
    }
  },


  /**
   * 选择工作范围
   */
  selectWorkScope(e) {
    const scope = e.currentTarget.dataset.scope;
    this.setData({
      workScope: scope,
      // 如果选择负责所有部门，清空部门选择
      selDepId: scope === 'all' ? '' : this.data.selDepId,
      selDepartmentName: scope === 'all' ? '' : this.data.selDepartmentName
    }, () => {
      this.checkFormValid();
    });
  },

  onSortByChange(e) {
    console.log(e);
    const {
      type
    } = e.detail;
    this.setData({
      showType: type,
    })
    if (type === 'time') {
      // TODO: 按时间排序逻辑
      console.log('页面收到：按时间排序');
      if(this.data.isSubDep){
        this._initDataSub();
      }else{
        this._initData();
      }

      
    } else if (type === 'category') {
      // TODO: 按类别排序逻辑
      console.log('页面收到：按类别排序');
     
      if(this.data.isSubDep){
        this._initSubDepDataByFather();
      }else{
        this._initDataByFather();
      }
    }
  },


  onSearchInput(e) {
    const value = e.detail.value;
    console.log('[chefOrder] 收到输入内容:', value);
    console.log('[chefOrder] 事件详情:', e);
    
    this.setData({
      searchValue: value
    });
    
    if (!value) {
      console.log('[chefOrder] 搜索值为空，清空搜索结果');
      this.setData({
        searchArr: null  // 改为null，这样搜索蒙版会消失
      });
      return;
    }
    
    var depId = this.data.depId;
    if(this.data.depHasSubs > 0){
      depId = -1
    }
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: depId,
      searchStr: value
    };
    console.log('[chefOrder] 搜索参数:', data);
    
    depSearchTodayOrders(data).then(res => {
      console.log('[chefOrder] 搜索API返回:', res);
      if (res.result.code == 0) {
        this.setData({
          searchArr: res.result.data || [],  // 确保返回空数组而不是null
        });
        console.log('[chefOrder] 搜索成功，结果数量:', res.result.data ? res.result.data.length : 0);
      } else {
        console.error('[chefOrder] 搜索失败:', res.result.msg);
        // 搜索失败时也显示空结果
        this.setData({
          searchArr: []
        });
      }
    }).catch(error => {
      console.error('[chefOrder] 搜索API异常:', error);
      // 搜索异常时也显示空结果
      this.setData({
        searchArr: []
      });
    });
  },

  
  reSearch() {
    console.log("重新搜索", this.data.searchValue)
    var depId = this.data.depId;
    if(this.data.depHasSubs > 0){
      depId = -1
    }
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: depId,
      searchStr: this.data.searchValue
    };
    console.log("搜索参数:", data);
    
    // 同时执行搜索和页面数据更新
    Promise.all([
      depSearchTodayOrders(data),
      this.updatePageData()
    ]).then(([searchRes, pageRes]) => {
      console.log("搜索API返回:", searchRes);
      if (searchRes.result.code == 0) {
        this.setData({
          searchArr: searchRes.result.data || [],  // 确保返回空数组而不是null
        });
        console.log("搜索成功，结果数量:", searchRes.result.data ? searchRes.result.data.length : 0);
      } else {
        console.error("搜索失败:", searchRes.result.msg);
        // 搜索失败时也显示空结果
        this.setData({
          searchArr: []
        });
      }
    }).catch(error => {
      console.error("搜索API异常:", error);
      // 搜索异常时也显示空结果
      this.setData({
        searchArr: []
      });
    });
  },

  // 更新页面数据的方法
  updatePageData() {
    return new Promise((resolve) => {
      if (this.data.isSubDep) {
        if(this.data.showType == 'time'){
          this._initDataSub();
        }else if(this.data.showType =='category'){
          this._initSubDepDataByFather();
        }
      } else {
        if (this.data.showType === 'time') {
          this._initData();
        } else if (this.data.showType === 'category') {
          this._initDataByFather();
        }
      }
      resolve();
    });
  },

  onSearchCancel() {
    console.log('[chefOrder] 点击取消搜索');
    // 清空搜索结果，恢复原订单列表
    this.setData({
      searchArr: null,  // 改为null，这样搜索蒙版会消失
      searchValue: ''
    });
    
  },

})
