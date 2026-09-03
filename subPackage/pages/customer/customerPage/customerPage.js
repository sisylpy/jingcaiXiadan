import { getSalesAfterSalesBills } from '../../../../lib/apiSales.js'

const app = getApp()

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function money(value, fallback) {
  const source = value === null || value === undefined || value === '' ? fallback : value
  const number = Number(source)
  if (isNaN(number)) return '0'
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function decorateBill(item) {
  const row = Object.assign({}, item)
  row.displayAmount = money(row.payAmount, row.totalAmount)
  row.statusLabel = Number(row.status) === 0 ? '未结账' : '已结账'
  row.statusClass = Number(row.status) === 0 ? 'unsettled' : 'settled'
  row.settlementLabel = row.settlementType === 'CASH' ? '现金' :
    (row.settlementType === 'ACCOUNT' ? '记账' : '')
  row.showOrderDepartment = row.orderDepartmentName && row.departmentName &&
    row.orderDepartmentName !== row.departmentName
  return row
}

Page({
  data: {
    statusBarHeight: 0,
    selectedDate: today(),
    bills: [],
    loading: false
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 0 })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadBills()
  },

  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value }, () => this.loadBills())
  },

  loadBills() {
    if (this.data.loading) return
    this.setData({ loading: true })
    getSalesAfterSalesBills(this.data.selectedDate).then(res => {
      const result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '账单加载失败')
      this.setData({ bills: (result.data || []).map(decorateBill) })
    }).catch(error => {
      wx.showToast({
        title: app.describeSalesRequestError(error, error.message || '账单加载失败'),
        icon: 'none'
      })
    }).finally(() => this.setData({ loading: false }))
  },

  openBill(e) {
    wx.navigateTo({
      url: '../issuePage/issuePage?billId=' + e.currentTarget.dataset.id
    })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
