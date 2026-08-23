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
  subDepGetApplyAiFather
} from '../../../../lib/apiRestraunt'

import {
  disSaveStandard,
  getDepInfo,
} from '../../../../lib/apiRestraunt'

import { chefOrderBenefitMethods } from './chefOrderBenefit'
import { chefOrderRegistrationMethods } from './chefOrderRegistration'
import { chefOrderSearchMethods } from './chefOrderSearch'

Page({
  data: {
    isSubDep: false,
    isSalesAgent: false,
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
    const isCustomerInvite = options.entry === 'customerInvite';
    const isSalesAgent = !isCustomerInvite
      && String(options.isAgent || '') === '1'
      && Number(wx.getStorageSync('salesActingCustomerId')) === Number(depFatherId);

    // 2. 没有参数则用缓存
    if (!depFatherId) depFatherId = wx.getStorageSync('depFatherId') || null;
    if (!disId) disId = wx.getStorageSync('disId') || null;

    if (options.depFatherId && !isSalesAgent) {
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
      isCustomerInvite,
      isSalesAgent,
      url: apiUrl.server,
    });

    var cachedUserInfo = wx.getStorageSync('userInfo');
    if (isSalesAgent) {
      cachedUserInfo = {
        nxDepartmentUserId: -1,
        nxDuDepartmentId: Number(depFatherId),
        nxDuDepartmentFatherId: Number(depFatherId),
        nxDuDistributerId: Number(disId),
        nxDuAdmin: 0,
        nxDuWxNickName: wx.getStorageSync('salesActingCustomerName') || '客户订货',
        nxDuWxAvartraUrl: 'userImage/say.png'
      };
      wx.setStorageSync('userInfo', cachedUserInfo);
    }
    if (!cachedUserInfo) {
      this.setData({
        userInfo: null,
        // 等自动登录确认用户不存在、门店资料加载完成后再显示注册框，避免重复闪现。
        showPage: false,
      });
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
    if (isSalesAgent) {
      this._getDepInfo();
    } else {
      this.attemptLogin();
    }

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
    const item = (e.detail && e.detail.item) || e.currentTarget.dataset.item;
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

  backFromSalesAgent() {
    if (!this.data.isSalesAgent) return;
    getApp().clearShopLoginState();
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      wx.reLaunch({ url: '/pages/sales/home/home' });
    }
  },



  attemptLogin() {

    wx.login({
      success: (res) => {
        console.log("loginloginlogin", res)
        depUserLoginDaoDu(res.code)
          .then((response) => {
            const loginData = response.result && response.result.data;
            if (response.result.code === 0 && loginData
                && loginData.loginMode === 'SALES') {
              wx.reLaunch({ url: '/pages/sales/home/home' });
              return;
            }
            if (response.result.code === 0 && loginData
                && loginData.loginMode === 'BOTH') {
              const skipPrompt = wx.getStorageSync('skipIdentityPromptOnce');
              if (skipPrompt) {
                wx.removeStorageSync('skipIdentityPromptOnce');
              } else {
                wx.showModal({
                  title: '选择登录身份',
                  content: '这个微信同时是客户订货账号和业务员账号。',
                  confirmText: '业务员',
                  cancelText: '客户订货',
                  success: result => {
                    if (result.confirm) {
                      wx.reLaunch({ url: '/pages/sales/home/home' });
                    }
                  }
                });
              }
            }
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
              getApp().clearShopLoginState();
              if (this.data.disId && this.data.depFatherId) {
                console.log("用户不存在，执行_getDepInfo和_checkIfShowPage");
                wx.removeStorageSync('userInfo');
                this.setData({ userInfo: null, showPage: false });
                // 新用户没有订货端凭证，此时只能读取公开的门店资料。
                // 订单数据要等注册成功并取得凭证后再加载。
                this._getDepInfo({ loadOrders: false }).then(() => {
                  this._checkIfShowPage();
                });
              } else {
                wx.redirectTo({
                  url: '../../../loginWarn/loginWarn',
                })
              }

            }
          })
          .catch((error) => {
            load.hideLoading();
            console.error('订货端自动登录失败:', error);
            if (!getApp().hasUsableShopToken()) {
              this.setData({ userInfo: null, showPage: true });
            }
            this._aaa();
            wx.showToast({
              title: getApp().describeShopRequestError(error, '自动登录失败，请重试'),
              icon: 'none',
              duration: 3500
            });
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


  ...chefOrderRegistrationMethods,

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
    const disInfo = this.data.disInfo || {};
    const share = {
      title: '"' + (disInfo.nxDistributerName || '') + '下单小程序',
      path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId
        + '&disId=' + this.data.disId
        + '&entry=customerInvite'
    };
    if (disInfo.nxDistributerImg) {
      share.imageUrl = this.data.url + disInfo.nxDistributerImg;
    }
    return share;
  },

  _getDepInfo(options = {}) {
    const loadOrders = options.loadOrders !== false;
    return new Promise((resolve, reject) => {
      getDepInfo(this.data.depFatherId).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var depInfo = res.result.data;
          console.log("getDepInfogetDepInfo", res.result.data);
          console.log('[chefOrder][_getDepInfo] nxDepartmentSettleType =', depInfo.nxDepartmentSettleType);
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

          if (loadOrders) {
            if (this.data.showType === 'time') {
              this._initData();
            } else if (this.data.showType === 'category') {
              this._initDataByFather();
            }
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

  ...chefOrderBenefitMethods,
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
      showChoice: false,
    })
    if (this.data.openType == 'paste') {
      wx.navigateTo({
        url: '../paste/paste?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId +
          '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType + '&disId=' + this.data.disId,
      })
    } else if (this.data.openType == 'books') {
      this._openGoodsCatalog();

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
    var type = (e.detail && e.detail.type) || e.currentTarget.dataset.type;
    console.log(type)
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
        this._openGoodsCatalog();
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

  _openGoodsCatalog() {
    // 游客同样使用公开接口已经查到的当前部门资料，不能固定进入某一种结算页面。
    const currentDepartment = wx.getStorageSync('orderDepInfo') || this.data.depInfo || {};
    const settleType = Number(currentDepartment.nxDepartmentSettleType);
    if (settleType === 0) {
      wx.navigateTo({
        url: '../../../resGoodsLessCash/resGoodsLessCash',
      });
    } else if (settleType === 1) {
      wx.navigateTo({
        url: '../../../resGoodsLess/resGoodsLess',
      });
    } else {
      wx.showToast({
        title: '未获取到部门结算方式',
        icon: 'none'
      });
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
    var dataset = (e.detail && e.detail.order) ? e.detail : e.currentTarget.dataset;
    var goodsId = dataset.id;
    var name = dataset.name;
    this.setData({
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: dataset.goods,
      applyItem: dataset.order,
      subName: dataset.subname,
      priceLevel: dataset.order.nxDoCostPriceLevel,
      printStandard: dataset.order.nxDoPrintStandard,

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

  ...chefOrderSearchMethods,

})
