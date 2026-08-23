import { getSalesCustomers } from '../../../lib/apiSales.js'

const app = getApp()

Page({
  data: {
    loading: true,
    keyword: '',
    allCustomers: [],
    customers: []
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadCustomers()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/sales/home/home' })
    }
  },

  loadCustomers() {
    this.setData({ loading: true })
    getSalesCustomers().then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '客户加载失败', icon: 'none' })
        return
      }
      const data = body.data || {}
      const customers = (data.settleTypeOne || []).concat(data.settleTypeTwo || [])
        .map(item => Object.assign({}, item, {
          avatarText: String(item.nxDepartmentName || '客').slice(0, 1),
          departmentCount: (item.nxDepartmentEntities || item.nxSubDepartments || []).length
        }))
      this.setData({
        allCustomers: customers,
        customers: this.filterCustomers(customers, this.data.keyword)
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '客户加载失败'), icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  filterCustomers(customers, keyword) {
    const value = String(keyword || '').trim().toLowerCase()
    if (!value) return customers || []
    return (customers || []).filter(item => [
      item.nxDepartmentName,
      item.nxDepartmentAttrName,
      item.nxDepartmentOrderCode,
      item.nxDepartmentAddress
    ].some(text => String(text || '').toLowerCase().indexOf(value) >= 0))
  },

  onKeywordInput(e) {
    const keyword = e.detail.value || ''
    this.setData({
      keyword,
      customers: this.filterCustomers(this.data.allCustomers, keyword)
    })
  },

  clearSearch() {
    this.setData({ keyword: '', customers: this.data.allCustomers })
  },

  openCustomer(e) {
    wx.navigateTo({
      url: '/pages/sales/customerDetail/customerDetail?customerId=' + e.currentTarget.dataset.id
    })
  },

  addCustomer() {
    wx.navigateTo({ url: '/pages/sales/customerAdd/customerAdd' })
  }
})
