import { getSalesProfile, logoutSales } from '../../../lib/apiSales.js'

const app = getApp()

Page({
  data: { loading: true, profile: null },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
  },

  onShow() {
    if (!app.hasUsableSalesToken()) return
    this.setData({ loading: true })
    getSalesProfile().then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '资料加载失败', icon: 'none' })
        return
      }
      wx.setStorageSync('salesProfile', body.data)
      this.setData({ profile: body.data })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '资料加载失败'), icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/sales/home/home' })
    }
  },

  logout() {
    wx.showModal({
      title: '退出销售助手',
      content: '退出后需要重新登录业务员账号。',
      success: result => {
        if (!result.confirm) return
        logoutSales().catch(() => null).finally(() => {
          app.clearSalesLoginState()
          wx.reLaunch({ url: '/pages/ai/customer/chefOrder/chefOrder' })
        })
      }
    })
  }
})
