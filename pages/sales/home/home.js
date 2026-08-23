import {
  getSalesProfile,
  getSalesCustomers,
  getSalesBusinessTypes
} from '../../../lib/apiSales.js'

const app = getApp()

Page({
  data: {
    loading: true,
    profile: null,
    customers: [],
    allCustomers: [],
    keyword: '',
    businessTypes: [],
    showVisitSheet: false,
    visitTarget: null
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
    if (!app.hasUsableSalesToken()) {
      wx.reLaunch({ url: '/pages/ai/customer/chefOrder/chefOrder' })
    }
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadData()
  },

  loadData() {
    this.setData({ loading: true })
    Promise.all([
      getSalesProfile(),
      getSalesCustomers(),
      getSalesBusinessTypes()
    ]).then(results => {
      const profileResult = results[0].result || {}
      const customerResult = results[1].result || {}
      const typeResult = results[2].result || {}
      const failed = [profileResult, customerResult, typeResult]
        .find(item => item.code !== 0)
      if (failed) {
        wx.showToast({ title: failed.msg || '工作台加载失败', icon: 'none' })
        return
      }
      const customerData = customerResult.data || {}
      const customers = (customerData.settleTypeOne || [])
        .concat(customerData.settleTypeTwo || [])
      wx.setStorageSync('salesProfile', profileResult.data)
      this.setData({
        profile: profileResult.data,
        allCustomers: customers,
        customers: this.filterCustomers(customers, this.data.keyword),
        businessTypes: typeResult.data || []
      })
    }).catch(error => {
      wx.showToast({
        title: app.describeSalesRequestError(error, '工作台加载失败'),
        icon: 'none'
      })
    }).finally(() => this.setData({ loading: false }))
  },

  filterCustomers(customers, keyword) {
    const value = (keyword || '').trim().toLowerCase()
    if (!value) return []
    return (customers || []).filter(item => {
      return String(item.nxDepartmentName || '').toLowerCase().indexOf(value) >= 0
        || String(item.nxDepartmentAddress || '').toLowerCase().indexOf(value) >= 0
    }).slice(0, 8)
  },

  onKeywordInput(e) {
    const keyword = e.detail.value || ''
    this.setData({
      keyword,
      customers: this.filterCustomers(this.data.allCustomers, keyword)
    })
  },

  startVisit() {
    this.setData({ visitTarget: null, showVisitSheet: true })
  },

  openCustomers() { wx.navigateTo({ url: '/pages/sales/customers/customers' }) },
  openQuotationCenter() { wx.navigateTo({ url: '/pages/sales/quotationCenter/quotationCenter' }) },
  openFollowUp() { wx.navigateTo({ url: '/pages/sales/leads/leads' }) },
  openProfile() { wx.navigateTo({ url: '/pages/sales/profile/profile' }) },

  closeVisitSheet() {
    this.setData({ showVisitSheet: false, visitTarget: null })
  },

  onVisitSaved() {
    this.closeVisitSheet()
  },

  addCustomer() {
    wx.navigateTo({ url: '/pages/sales/customerAdd/customerAdd' })
  },

  openCustomer(e) {
    wx.navigateTo({
      url: '/pages/sales/customerDetail/customerDetail?customerId='
        + e.currentTarget.dataset.id
    })
  }
})
