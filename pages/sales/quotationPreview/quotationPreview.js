import { getSalesQuotationPreview } from '../../../lib/apiSales.js'

const app = getApp()

function dateLabel(value) {
  if (!value) return '-'
  if (typeof value === 'number') {
    const date = new Date(value)
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
      + '-' + String(date.getDate()).padStart(2, '0')
  }
  return String(value).slice(0, 10)
}

Page({
  data: {
    loading: true,
    shopName: '',
    validUntil: '',
    items: []
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
    const quotationId = Number(options.quotationId)
    if (!quotationId) {
      wx.showToast({ title: '报价参数不正确', icon: 'none' })
      return
    }
    getSalesQuotationPreview(quotationId).then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '报价预览加载失败', icon: 'none' })
        return
      }
      const data = body.data || {}
      this.setData({
        shopName: data.shopName || '',
        validUntil: dateLabel(data.validUntil),
        items: (data.items || []).map(item => Object.assign({}, item, {
          priceLabel: item.ourQuotePrice == null
            ? '价格待确认' : '¥' + item.ourQuotePrice
        }))
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '报价预览加载失败'), icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  back() { wx.navigateBack() }
})
