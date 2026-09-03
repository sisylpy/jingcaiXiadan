import { loginShopMini } from '../../lib/apiIdentity.js'

const LAST_ROLE_KEY = 'shopMiniLastRole'

Page({
  data: {
    statusBarHeight: 20,
    message: '正在确认登录身份…',
    retryVisible: false
  },

  onLoad() {
    const app = getApp()
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 })
    this.resolveEntry()
  },

  resolveEntry() {
    const app = getApp()
    const customerReady = app.hasUsableCustomerToken()
      && !!wx.getStorageSync('userInfo')
      && !!wx.getStorageSync('depInfo')
    const salesReady = app.hasUsableSalesToken()
      && !!wx.getStorageSync('salesUserInfo')

    if (customerReady && salesReady) {
      const lastRole = wx.getStorageSync(LAST_ROLE_KEY)
      if (lastRole === 'SALES' || lastRole === 'CUSTOMER') {
        this.openRole(lastRole)
      } else {
        this.chooseRole()
      }
      return
    }
    if (salesReady) {
      this.openRole('SALES')
      return
    }
    if (customerReady) {
      this.openRole('CUSTOMER')
      return
    }
    this.login()
  },

  login() {
    this.setData({ message: '正在登录…', retryVisible: false })
    wx.login({
      success: result => {
        if (!result.code) {
          this.showRetry('微信登录失败，请重试')
          return
        }
        loginShopMini(result.code).then(body => {
          const data = body && body.data
          if (!body || body.code !== 0 || !data) {
            wx.reLaunch({ url: '/pages/loginWarn/loginWarn' })
            return
          }
          this.cacheCustomer(data)
          if (data.loginMode === 'BOTH') {
            const lastRole = wx.getStorageSync(LAST_ROLE_KEY)
            if (lastRole === 'SALES' || lastRole === 'CUSTOMER') {
              this.openRole(lastRole)
            } else {
              this.chooseRole()
            }
            return
          }
          this.openRole(data.loginMode === 'SALES' ? 'SALES' : 'CUSTOMER')
        }).catch(error => {
          console.error('[entry] 自动登录失败:', error)
          this.showRetry(getApp().describeShopRequestError(error, '自动登录失败，请重试'))
        })
      },
      fail: () => this.showRetry('微信登录失败，请重试')
    })
  },

  cacheCustomer(data) {
    if (!data || !data.userInfo || !data.depInfo) return
    const depInfo = data.depInfo
    const fatherId = Number(depInfo.nxDepartmentFatherId) === 0
      ? depInfo.nxDepartmentId
      : depInfo.nxDepartmentFatherId
    wx.setStorageSync('userInfo', data.userInfo)
    wx.setStorageSync('depInfo', depInfo)
    wx.setStorageSync('depFatherId', fatherId)
    wx.setStorageSync('disId', depInfo.nxDepartmentDisId)
  },

  chooseRole() {
    this.setData({ message: '请选择进入的工作台' })
    wx.showModal({
      title: '选择登录身份',
      content: '这个微信同时是客户订货账号和业务员账号。',
      confirmText: '业务员',
      cancelText: '客户订货',
      success: result => this.openRole(result.confirm ? 'SALES' : 'CUSTOMER'),
      fail: () => this.showRetry('请选择登录身份')
    })
  },

  openRole(role) {
    wx.setStorageSync(LAST_ROLE_KEY, role)
    if (role === 'SALES') {
      wx.reLaunch({ url: '/pages/sales/home/home' })
      return
    }
    wx.reLaunch({
      url: '/pages/ai/customer/chefOrder/chefOrder?entry=identityResolved'
    })
  },

  showRetry(message) {
    this.setData({ message, retryVisible: true })
  },

  retry() {
    this.resolveEntry()
  }
})
