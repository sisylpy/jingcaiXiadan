var load = require('../../../../lib/load.js')
import {
  depUserLoginDaoDu,
  depOrderUserSaveWithFileLaodu
} from '../../../../lib/apiRestraunt'

const REGISTRATION_POPUP_DELAY_MS = 36 * 60 * 60 * 1000

export const chefOrderRegistrationMethods = {
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
          .catch((error) => {
            load.hideLoading();
            console.error('订货端登录失败:', error);
            wx.showToast({
              title: getApp().describeShopRequestError(error, '登录失败，请重试'),
              icon: 'none',
              duration: 3500
            });
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
    // if(!this.data.userInfo){
    //   wx.showToast({
    //     title: '请先登录或注册',
    //     icon: 'none'
    //   })
    //   return;
    // }
    if(this.data.bill !== -1){
      wx.showToast({
        title: '支付需要用户openId，请注册',
        icon: 'none'
      })

    }else{
      const timestamp = Date.now();
      wx.setStorageSync('firstVisitTimestamp', timestamp);
      this.setData({
        forceRegistration: false,
        showPage: false,
      })
    }

  },


  _checkIfShowPage() {
    if (this.data.userInfo == null && this.data.disId && this.data.depFatherId) {
      let firstVisitTimestamp = Number(wx.getStorageSync('firstVisitTimestamp'))
      if (!Number.isFinite(firstVisitTimestamp) || firstVisitTimestamp <= 0) {
        firstVisitTimestamp = Date.now()
        wx.setStorageSync('firstVisitTimestamp', firstVisitTimestamp)
      }

      const shouldShowRegistration = this.data.forceRegistration
        || Date.now() - firstVisitTimestamp >= REGISTRATION_POPUP_DELAY_MS
      this.setData({
        showPage: shouldShowRegistration,
      })
      if (!shouldShowRegistration) return

      const depInfo = this.data.depInfo || {}
      const departments = depInfo.nxDepartmentEntities || []
      if(departments.length > 0){
        this.setData({
          selDepId: departments[0].nxDepartmentId,

        })
      }else{
        this.setData({
          selDepId: depInfo.nxDepartmentId,
        })
      }
      this._aaa()
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

  selectWorkScope(e) {
    const scope = (e.detail && e.detail.scope) || e.currentTarget.dataset.scope;
    this.setData({
      workScope: scope,
      // 如果选择负责所有部门，清空部门选择
      selDepId: scope === 'all' ? '' : this.data.selDepId,
      selDepartmentName: scope === 'all' ? '' : this.data.selDepartmentName
    }, () => {
      this.checkFormValid();
    });
  },
}
