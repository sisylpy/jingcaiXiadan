import { getSalesBusinessTypeRecommendations } from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'

const app = getApp()
const BASKET_KEY = 'salesQuotationBasket'

function imageUrl(path) {
  if (!path) return '/images/logo.jpg'
  if (/^https?:\/\//.test(path)) return path
  return apiUrl.server + path
}

Page({
  data: {
    loading: true,
    businessTypeId: null,
    businessTypeName: '',
    title: '常购原材料',
    sourceLabel: '',
    businessTypeStatisticalClaim: false,
    items: [],
    categories: [],
    subCategories: [],
    visibleItems: [],
    activeGreatCategoryKey: '',
    activeSubCategoryKey: 'all',
    goodsScrollTop: 0,
    basketCount: 0,
    returnToWorkspace: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      businessTypeId: Number(options.businessTypeId),
      businessTypeName: decodeURIComponent(options.businessTypeName || ''),
      returnToWorkspace: String(options.returnToWorkspace || '') === '1'
    })
    this.loadData()
  },

  onShow() {
    this.updateBasketCount()
  },

  loadData() {
    if (!this.data.businessTypeId) {
      wx.showToast({ title: '业态参数不正确', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    getSalesBusinessTypeRecommendations(this.data.businessTypeId, 30)
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) {
          wx.showToast({ title: body.msg || '推荐加载失败', icon: 'none' })
          return
        }
        const data = body.data || {}
        const recommendationItems = (data.items || []).map(item => Object.assign({}, item, {
          imageUrl: imageUrl(item.imagePath),
          priceLabel: item.priceStatus === 'PRICE_AVAILABLE'
            ? '¥' + item.displayPrice : '价格待确认'
        }))
        const catalog = this.buildCatalog(recommendationItems)
        const firstCategory = catalog.categories[0] || null
        this.setData({
          title: data.title || '常购原材料',
          sourceLabel: data.sourceLabel || '',
          businessTypeStatisticalClaim: !!data.businessTypeStatisticalClaim,
          algorithmVersion: data.algorithmVersion,
          items: catalog.items,
          categories: catalog.categories,
          activeGreatCategoryKey: firstCategory ? firstCategory.key : '',
          activeSubCategoryKey: 'all',
          subCategories: firstCategory ? firstCategory.subCategories : [],
          visibleItems: firstCategory
            ? this.filterItems(catalog.items, firstCategory.key, 'all') : []
        })
      }).catch(error => wx.showToast({
        title: app.describeSalesRequestError(error, '推荐加载失败'), icon: 'none'
      })).finally(() => this.setData({ loading: false }))
  },

  buildCatalog(items) {
    const categoryMap = {}
    const normalizedItems = (items || []).map(item => {
      const hasGreatCategory = item.greatCategoryId !== null
        && item.greatCategoryId !== undefined
      const hasSubCategory = item.subCategoryId !== null
        && item.subCategoryId !== undefined
      const greatCategoryKey = hasGreatCategory
        ? String(item.greatCategoryId) : 'uncategorized'
      const subCategoryKey = hasSubCategory
        ? String(item.subCategoryId) : greatCategoryKey + ':other'
      const normalized = Object.assign({}, item, {
        greatCategoryKey,
        subCategoryKey
      })

      if (!categoryMap[greatCategoryKey]) {
        categoryMap[greatCategoryKey] = {
          key: greatCategoryKey,
          id: hasGreatCategory ? item.greatCategoryId : null,
          name: item.greatCategoryName || '未分类',
          sort: this.categorySortValue(item.greatCategorySort),
          count: 0,
          subCategoryMap: {}
        }
      }
      const greatCategory = categoryMap[greatCategoryKey]
      greatCategory.count += 1
      if (!greatCategory.subCategoryMap[subCategoryKey]) {
        greatCategory.subCategoryMap[subCategoryKey] = {
          key: subCategoryKey,
          id: hasSubCategory ? item.subCategoryId : null,
          name: item.subCategoryName || '其他',
          sort: this.categorySortValue(item.subCategorySort),
          count: 0
        }
      }
      greatCategory.subCategoryMap[subCategoryKey].count += 1
      return normalized
    })

    const categories = Object.keys(categoryMap).map(key => {
      const category = categoryMap[key]
      const children = Object.keys(category.subCategoryMap)
        .map(childKey => category.subCategoryMap[childKey])
        .sort(this.compareCategories)
      return {
        key: category.key,
        id: category.id,
        name: category.name,
        sort: category.sort,
        count: category.count,
        subCategories: [{
          key: 'all',
          id: null,
          name: '全部',
          sort: -1,
          count: category.count
        }].concat(children)
      }
    }).sort(this.compareCategories)

    return { items: normalizedItems, categories }
  },

  categorySortValue(value) {
    if (value === null || value === undefined || value === '') return 999999
    const number = Number(value)
    return Number.isFinite(number) ? number : 999999
  },

  compareCategories(a, b) {
    if (a.sort !== b.sort) return a.sort - b.sort
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  },

  filterItems(items, greatCategoryKey, subCategoryKey) {
    return (items || []).filter(item => item.greatCategoryKey === greatCategoryKey
      && (subCategoryKey === 'all' || item.subCategoryKey === subCategoryKey))
  },

  selectGreatCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    const category = (this.data.categories || []).find(item => item.key === key)
    if (!category) return
    this.setData({
      activeGreatCategoryKey: key,
      activeSubCategoryKey: 'all',
      subCategories: category.subCategories,
      visibleItems: this.filterItems(this.data.items, key, 'all'),
      goodsScrollTop: 1
    }, () => this.setData({ goodsScrollTop: 0 }))
  },

  selectSubCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    this.setData({
      activeSubCategoryKey: key,
      visibleItems: this.filterItems(
        this.data.items, this.data.activeGreatCategoryKey, key),
      goodsScrollTop: 1
    }, () => this.setData({ goodsScrollTop: 0 }))
  },

  addToQuotation(e) {
    const goodsId = Number(e.currentTarget.dataset.id)
    const goods = (this.data.items || []).find(item => Number(item.goodsId) === goodsId)
    if (!goods) return
    const basket = wx.getStorageSync(BASKET_KEY) || []
    if (basket.some(item => Number(item.goodsId) === goodsId)) {
      wx.showToast({ title: '该商品已在报价中', icon: 'none' })
      return
    }
    basket.push({
      goodsId: goods.goodsId,
      goodsName: goods.goodsName,
      specification: goods.specification || '',
      unit: goods.unit || '',
      origin: goods.origin || '',
      imagePath: goods.imagePath || '',
      priceStatus: goods.priceStatus,
      ourQuotePrice: goods.displayPrice || '',
      customerCurrentPurchasePrice: '',
      quantity: '1',
      originalSearchName: this.data.businessTypeName || goods.goodsName,
      matchScore: '',
      matchReason: '来自' + (this.data.businessTypeName || '当前业态') + '推荐，业务员已确认',
      algorithmVersion: goods.algorithmVersion || this.data.algorithmVersion,
      sourceType: 'MANUAL',
      salespersonConfirmed: true
    })
    wx.setStorageSync(BASKET_KEY, basket)
    this.updateBasketCount()
    wx.showToast({ title: '已加入报价', icon: 'success' })
  },

  updateBasketCount() {
    const basket = wx.getStorageSync(BASKET_KEY) || []
    this.setData({ basketCount: basket.length })
  },

  goQuotation() {
    if (this.data.returnToWorkspace) {
      wx.navigateBack()
      return
    }
    wx.navigateTo({ url: '/pages/sales/quotation/quotation?resumeBasket=1' })
  },

  back() { wx.navigateBack() }
})
