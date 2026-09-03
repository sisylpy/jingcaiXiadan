import { getSalesQuotationPreview } from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'
import {
  buildSalesGoodsCatalog,
  filterSalesGoodsCatalog
} from '../../../utils/salesGoodsCatalog.js'

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

function imageUrl(path) {
  if (!path) return '/images/logo.jpg'
  return /^https?:\/\//.test(path) ? path : apiUrl.server + path
}

Page({
  data: {
    loading: true,
    shopName: '',
    validUntil: '',
    businessTypeName: '',
    businessTypeBannerUrl: '',
    businessTypeThemeColor: '#176b4d',
    items: [],
    categories: [],
    subCategories: [],
    visibleItems: [],
    activeGreatCategoryKey: '',
    activeSubCategoryKey: 'all',
    goodsScrollTop: 0
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
      const items = (data.items || []).map(item => Object.assign({}, item, {
        imageUrl: imageUrl(item.imagePath),
        priceLabel: item.ourQuotePrice == null
          ? '价格待确认' : '¥' + item.ourQuotePrice
      }))
      const catalog = buildSalesGoodsCatalog(items)
      const firstCategory = catalog.categories[0] || null
      this.setData({
        shopName: data.shopName || '',
        validUntil: dateLabel(data.validUntil),
        businessTypeName: data.businessTypeName || '',
        businessTypeBannerUrl: this.assetUrl(data.businessTypeBannerRef),
        businessTypeThemeColor: data.businessTypeThemeColor || '#176b4d',
        items: catalog.items,
        categories: catalog.categories,
        subCategories: firstCategory ? firstCategory.subCategories : [],
        visibleItems: firstCategory ? filterSalesGoodsCatalog(
          catalog.items, firstCategory.key, 'all') : [],
        activeGreatCategoryKey: firstCategory ? firstCategory.key : '',
        activeSubCategoryKey: 'all'
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '报价预览加载失败'), icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  assetUrl(path) {
    if (!path) return ''
    return /^https?:\/\//.test(path) ? path : apiUrl.server + path.replace(/^\//, '')
  },

  selectGreatCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    const category = this.data.categories.find(item => item.key === key)
    if (!category) return
    this.setData({
      activeGreatCategoryKey: key,
      activeSubCategoryKey: 'all',
      subCategories: category.subCategories,
      visibleItems: filterSalesGoodsCatalog(this.data.items, key, 'all'),
      goodsScrollTop: 1
    }, () => this.setData({ goodsScrollTop: 0 }))
  },

  selectSubCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    this.setData({
      activeSubCategoryKey: key,
      visibleItems: filterSalesGoodsCatalog(
        this.data.items, this.data.activeGreatCategoryKey, key),
      goodsScrollTop: 1
    }, () => this.setData({ goodsScrollTop: 0 }))
  },

  back() { wx.navigateBack() }
})
