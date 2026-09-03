import { getSalesAfterSalesBill } from '../../../../lib/apiSales.js'

const app = getApp()

function money(value, fallback) {
  const source = value === null || value === undefined || value === '' ? fallback : value
  const number = Number(source)
  if (isNaN(number)) return '0'
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function decorateOrder(order) {
  const goods = order.nxDistributerGoodsEntity || {}
  return Object.assign({}, order, {
    historyOrderId: order.nxDepartmentOrdersId,
    departmentId: order.nxDoDepartmentId,
    departmentDisGoodsId: order.nxDoDepDisGoodsId,
    goodsName: order.nxDoGoodsName || goods.nxDgGoodsName || '商品',
    brand: goods.nxDgGoodsBrand || '',
    standard: order.nxDoPrintStandard || order.nxDoStandard || goods.nxDgGoodsStandardname || '',
    quantity: order.nxDoWeight || order.nxDoQuantity || '',
    price: money(order.nxDoPrice, 0),
    subtotal: money(order.nxDoSubtotal, 0),
    canCreateAfterSales: !!order.nxDoDepDisGoodsId
  })
}

Page({
  data: {
    statusBarHeight: 0,
    billId: null,
    loading: true,
    billInfo: null,
    bill: null,
    orderGroups: [],
    displayPayAmount: '0',
    displayGoodsAmount: '0',
    displayDeliveryFee: '0',
    displayCouponDiscount: '0',
    showDeliveryFee: false,
    showCouponDiscount: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 0,
      billId: Number(options.billId)
    })
  },

  onShow() {
    if (this.data.billId) this.loadBill()
  },

  loadBill() {
    this.setData({ loading: true })
    getSalesAfterSalesBill(this.data.billId).then(res => {
      const result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '账单加载失败')
      const data = result.data || {}
      const bill = data.bill || {}
      const groups = (data.orderGroups || []).map(group => Object.assign({}, group, {
        orders: (group.orders || []).map(decorateOrder)
      }))
      const deliveryFee = Number(data.deliveryFee || bill.nxDbDeliveryFee || 0)
      const couponDiscount = Number(data.couponDiscountAmount || bill.nxDbCouponDiscountAmount || 0)
      this.setData({
        billInfo: data,
        bill,
        orderGroups: groups,
        displayPayAmount: money(data.payAmount || bill.nxDbPayAmount, data.totalAmount || bill.nxDbTotal),
        displayGoodsAmount: money(data.goodsAmount || bill.nxDbGoodsAmount, data.totalAmount || bill.nxDbTotal),
        displayDeliveryFee: money(deliveryFee, 0),
        displayCouponDiscount: money(couponDiscount, 0),
        showDeliveryFee: !isNaN(deliveryFee) && deliveryFee > 0,
        showCouponDiscount: !isNaN(couponDiscount) && couponDiscount > 0
      })
    }).catch(error => {
      wx.showToast({
        title: app.describeSalesRequestError(error, error.message || '账单加载失败'),
        icon: 'none'
      })
    }).finally(() => this.setData({ loading: false }))
  },

  startAfterSales(e) {
    const orderId = Number(e.currentTarget.dataset.id)
    let selected = null
    let selectedGroup = null
    this.data.orderGroups.forEach(group => {
      ;(group.orders || []).forEach(order => {
        if (Number(order.historyOrderId) === orderId) {
          selected = order
          selectedGroup = group
        }
      })
    })
    if (!selected || !selected.canCreateAfterSales) {
      wx.showToast({ title: '该商品缺少客户商品关系，不能提交售后', icon: 'none' })
      return
    }
    const candidates = (selectedGroup.orders || []).filter(order => {
      return order.canCreateAfterSales && Number(order.departmentId) === Number(selected.departmentId)
    }).map(order => ({
      historyOrderId: order.historyOrderId,
      departmentId: order.departmentId,
      departmentDisGoodsId: order.departmentDisGoodsId,
      goodsName: order.goodsName,
      quantity: order.quantity,
      standard: order.standard,
      selected: Number(order.historyOrderId) === orderId
    }))
    wx.setStorageSync('salesAfterSalesCreateDraft', {
      billId: this.data.billId,
      anchorHistoryOrderId: selected.historyOrderId,
      routeDate: this.data.billInfo.billDate || this.data.bill.nxDbDate || '',
      customerName: this.data.billInfo.departmentName || '客户',
      departmentName: selectedGroup.departmentName || '',
      orders: candidates,
      createdAt: Date.now()
    })
    wx.navigateTo({ url: '../afterSalesCreate/afterSalesCreate' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
