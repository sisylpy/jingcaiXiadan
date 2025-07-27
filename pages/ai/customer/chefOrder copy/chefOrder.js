const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'

import {

  updateOrder,
  deleteOrder,
  restrauntCashPayLaodu,
  depGetApplyAiByTime,
  depUserLoginDaoDu,
  subDepGetApplyAiByTime,
  depOrderUserSaveWithFileLaodu,

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

    // 新增：数据刷新控制
    lastRefreshTime: 0,
    refreshInterval: 30000, // 30秒内不重复刷新

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
        this._initDataSub();
      } else {
        this._initData();
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

    if (depFatherId && disId) {
      // 3. 有参数或缓存，先尝试用户登录
      wx.setStorageSync('depFatherId', depFatherId);
       wx.setStorageSync('disId', disId); 
    }    
      this.attemptLogin();

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
    this._initDataSub();
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
                depSettleType: depInfo.nxDepartmentSettleType,
                depFatherId: depInfo.nxDepartmentFatherId  == 0 ? depInfo.nxDepartmentId : depInfo.nxDepartmentFatherId ,
                depId: depInfo.nxDepartmentId,
                depHasSubs: depInfo.nxDepartmentSubAmount,
              });

              if (depInfo.nxDepartmentFatherId !== 0) {
                this.setData({
                  isSubDep: true,
                })
                this._initDataSub();

              } else {
                this.setData({
                  isSubDep: false,
                })
                this._initData();
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
              if(this.data.disId && this.data.depFatherId){
                console.log("用户不存在，执行_getDepInfo和_checkIfShowPage");
                this._getDepInfo().then(() => {
                this._checkIfShowPage();
                // this._initData();
              });
              }else{
                wx.redirectTo({
                  url: '../../../loginWarn/loginWarn',
                })
              }
              
            }
          })
          
      },
     
    });
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
    var that = this;
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
                depFatherId: depInfo.nxDepartmentId,
                depId: depInfo.nxDepartmentId,
                depHasSubs: depInfo.nxDepartmentSubAmount,
                showPage: false
              });
              wx.removeStorageSync('firstVisitTimestamp');
              if (depInfo.nxDepartmentFatherId !== 0) {
                this.setData({
                  isSubDep: true,
                })
                this._initDataSub();

              } else {
                this.setData({
                  isSubDep: false,
                })
                this._initData();
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
      title: '一起下订货单吧！', // 默认是小程序的名称(可以写slogan等)
      path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId + '&disId=' +
        this.data.disId,
      imageUrl: this.data.url + this.data.imgUrl,
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

          this._initData();
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
    subDepGetApplyAiByTime(this.data.depId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData", res.result.data);
        if (res.result.code == 0) {
          this.setData({
            applyArr: res.result.data.arr,
            bill: res.result.data.bill,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
      .catch(() => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        });
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
            })
          } else {
            this.setData({
              applyArr: res.result.data.arr,
              bill: res.result.data.bill,
              depInfo: res.result.data.depInfo
            })
            wx.setStorageSync('depInfo',  res.result.data.depInfo);
          }

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
     
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
        
        if (this.data.isSubDep) {
          this._initDataSub();
        } else {
          this._initData();
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

    var that = this;

    load.showLoading("删除订单")
    deleteOrder(e.currentTarget.dataset.id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        // 设置刷新标记，确保返回时刷新订单数据
        wx.setStorageSync('needRefreshOrderData', true);

        if (this.data.isSubDep) {
          this._initDataSub();
        } else {
          this._initData();
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
      
        if(applyItem.nxDepartmentDisGoodsEntity !== null){
          console.log("eeeetoEditApply", applyItem.nxDepartmentDisGoodsEntity);
          this.setData({
            showCashDep: true,
            depGoods: applyItem.nxDepartmentDisGoodsEntity,
            applySubtotal: applyItem.nxDoSubtotal,
          })
        }else{
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

        // 根据部门类型刷新数据
        if (this.data.isSubDep) {
          this._initDataSub();
        } else {
          this._initData();
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
    var code = this.data.code;
    var depId = this.data.workScope === 'all' ? this.data.depFatherId : this.data.selDepId; // 根据工作范围调整部门ID
    var depFatherId = this.data.depFatherId;
    var disId = this.data.disId;
    var admin = this.data.workScope === 'all' ? 1 : 0; // 负责所有部门订货时admin=1（管理人员），否则admin=0
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
    const timestamp = Date.now();
    wx.setStorageSync('firstVisitTimestamp', timestamp);
    this.setData({
      showPage: false,
    })
  },


  _checkIfShowPage() {

    const firstVisitTimestamp = wx.getStorageSync('firstVisitTimestamp');
    if (!firstVisitTimestamp) {
      wx.redirectTo({
        url: '../../../loginWarn/loginWarn',
      })
    }

    // 简化的时间计算
    const now = Date.now();
    const timeDiff = now - firstVisitTimestamp;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    // 超过48小时才显示登录弹窗
    const shouldShowLogin = hoursDiff >= 36;
    this.setData({
      showPage: shouldShowLogin,
    });

    if (this.data.userInfo == null && this.data.disId && this.data.depFatherId && shouldShowLogin) {
      this.setData({
        selDepId: this.data.depInfo.nxDepartmentEntities[0].nxDepartmentId,
        
      })
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
                  that._initDataSub();
                } else {
                  that._initData();
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

})