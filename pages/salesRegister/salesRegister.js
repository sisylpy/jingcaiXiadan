import { registerSalesUser } from '../../lib/apiRestraunt.js'
import { persistSalesAuth } from '../../lib/shopRequest.js'

const app = getApp()

Page({
  data: {
    inviteCode: '',
    disName: '',
    nickName: '',
    phone: '',
    phoneValid: false,
    avatarUrl: '/images/user.png',
    submitting: false,
    registered: false
  },

  onLoad(options) {
    var globalData = app.globalData
    this.setData({
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      inviteCode: options.inviteCode || '',
      disName: options.disName || ''
    })
    this.refreshWxCode()
  },

  refreshWxCode() {
    wx.login({
      success: res => this.setData({ code: res.code }),
      fail: () => wx.showToast({ title: '微信登录失败，请重试', icon: 'none' })
    })
  },

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  onNameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  onPhoneInput(e) {
    var phone = e.detail.value || ''
    this.setData({
      phone: phone,
      phoneValid: /^1[3-9][0-9]{9}$/.test(phone)
    })
  },

  submit() {
    if (this.data.submitting || this.data.registered) return
    if (!this.data.inviteCode) {
      wx.showToast({ title: '邀请已失效，请让老板重新邀请', icon: 'none' })
      return
    }
    if (!this.data.nickName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!this.data.phoneValid) {
      wx.showToast({ title: '请输入正确的手机号码', icon: 'none' })
      return
    }
    if (this.data.avatarUrl === '/images/user.png') {
      wx.showToast({ title: '请选择头像', icon: 'none' })
      return
    }
    if (!this.data.code) {
      this.refreshWxCode()
      wx.showToast({ title: '正在刷新微信登录信息，请再试一次', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '注册中', mask: true })
    registerSalesUser(this.data.avatarUrl, this.data.nickName.trim(), this.data.phone,
      this.data.code, this.data.inviteCode).then(res => {
      var result = res.result
      try { result = typeof result === 'string' ? JSON.parse(result) : result } catch (e) {}
      wx.hideLoading()
      if (result && result.code == 0) {
        if (!persistSalesAuth(result)) {
          this.setData({ submitting: false })
          wx.showToast({ title: '业务员会话创建失败，请重新登录', icon: 'none' })
          return
        }
        this.setData({ submitting: false, registered: true })
        wx.showModal({
          title: '注册成功',
          content: '你已成为业务员，现在可以进入业务员工作台。',
          showCancel: false,
          success: () => wx.reLaunch({
            url: '/pages/sales/home/home'
          })
        })
        return
      }
      this.setData({ submitting: false })
      this.refreshWxCode()
      wx.showToast({
        title: (result && result.msg) || '注册失败，请让老板重新邀请',
        icon: 'none',
        duration: 3500
      })
    }).catch(error => {
      wx.hideLoading()
      this.setData({ submitting: false })
      this.refreshWxCode()
      wx.showToast({
        title: app.describeShopRequestError(error, '注册失败，请检查网络'),
        icon: 'none',
        duration: 3500
      })
    })
  },

  onShareAppMessage() {
    return {
      title: (this.data.disName || '配送商') + '邀请你注册业务员',
      path: '/pages/salesRegister/salesRegister?inviteCode=' + encodeURIComponent(this.data.inviteCode)
        + '&disName=' + encodeURIComponent(this.data.disName || '')
    }
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})
