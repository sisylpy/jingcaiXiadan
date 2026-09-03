import { getSalesQuotations } from '../../../lib/apiSales.js'

const app = getApp()
const BASKET_KEY = 'salesQuotationBasket'
const OCR_TRANSFER_KEY = 'salesOcrQuoteTransfer'

function statusLabel(status) {
  return { DRAFT: '草稿', FINALIZED: '已定稿', EXPIRED: '已过期', CLOSED: '已关闭' }[status]
    || status || '未知状态'
}

function timeLabel(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '-'
}

function targetTypeLabel(item) {
  if (item.departmentId) return '正式客户'
  if (item.leadId) return '销售线索'
  if (item.visitId) return '拜访门店'
  return '匿名客户'
}

function targetName(item) {
  if (item.shopNameSnapshot) return item.shopNameSnapshot
  if (item.departmentId) return '已关联正式客户'
  if (item.leadId || item.visitId) return '已关联门店'
  return '匿名报价'
}

Page({
  data: {
    loading: true,
    statusBarHeight: 0,
    swiperHeight: 500,
    quoteSwiperIndex: 0,
    drafts: [],
    history: []
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    const rpxToPx = sys.windowWidth / 750
    const headerHeight = sys.statusBarHeight + 26 * rpxToPx + 56 * rpxToPx + 48 * rpxToPx
    const otherHeight = (20 + 62 + 6 + 62 + 15 + 40 - 24) * rpxToPx
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      swiperHeight: Math.floor(sys.windowHeight - headerHeight - otherHeight - 20)
    })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadData()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/sales/home/home' })
    }
  },

  loadData() {
    this.setData({ loading: true })
    getSalesQuotations({ limit: 100 }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        throw { businessMessage: body.msg || '报价中心加载失败' }
      }
      const quotations = (body.data || []).map(item => Object.assign({}, item, {
        statusLabel: statusLabel(item.statusCode),
        targetTypeLabel: targetTypeLabel(item),
        targetName: targetName(item),
        createdTimeLabel: timeLabel(item.createdAt),
        updatedTimeLabel: timeLabel(item.updatedAt),
        amountLabel: item.totalAmount === null || item.totalAmount === undefined
          ? '金额待确认' : '¥' + item.totalAmount
      }))
      this.setData({
        drafts: quotations.filter(item => item.statusCode === 'DRAFT'),
        history: quotations.filter(item => item.statusCode !== 'DRAFT')
      })
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '报价中心加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  startQuotation() {
    wx.removeStorageSync(BASKET_KEY)
    wx.removeStorageSync(OCR_TRANSFER_KEY)
    wx.navigateTo({
      url: '/pages/sales/quotation/quotation'
    })
  },

  switchQuoteTab(e) {
    const quoteTab = e.currentTarget.dataset.tab
    this.setData({ quoteSwiperIndex: quoteTab === 'draft' ? 0 : 1 })
  },

  onSwiperChange(e) {
    this.setData({ quoteSwiperIndex: e.detail.current })
  },

  openQuotation(e) {
    wx.navigateTo({
      url: '/pages/sales/quotation/quotation?quotationId=' + e.currentTarget.dataset.id
    })
  },

  requestDeleteQuotation() {
    wx.showModal({
      title: '删除报价',
      content: '前端删除入口已准备，后台暂未提供报价删除接口，因此当前不会删除这张报价。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})
