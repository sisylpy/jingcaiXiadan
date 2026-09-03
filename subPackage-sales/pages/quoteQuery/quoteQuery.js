import Promise from '../../../lib/bluebird'
import {
  getSalesProfile,
  getSalesBusinessTypesUsedByDepartments,
  getSalesBusinessTypeRecommendations
} from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'

const app = getApp()

function absoluteUrl(path, fallback) {
  if (!path) return fallback || ''
  if (/^https?:\/\//.test(path)) return path
  return apiUrl.server + String(path).replace(/^\//, '')
}

function priceLabel(item) {
  if (item.priceStatus !== 'PRICE_AVAILABLE'
      || item.displayPrice === null || item.displayPrice === undefined
      || item.displayPrice === '') return '价格待确认'
  return '¥' + item.displayPrice
}

function categorySort(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 999999
}

function buildCatalog(source) {
  const categoryMap = {}
  const items = (source || []).map(item => {
    const key = item.greatCategoryId === null || item.greatCategoryId === undefined
      ? 'uncategorized' : String(item.greatCategoryId)
    if (!categoryMap[key]) {
      categoryMap[key] = {
        key,
        name: item.greatCategoryName || '其他商品',
        sort: categorySort(item.greatCategorySort),
        count: 0
      }
    }
    categoryMap[key].count += 1
    return Object.assign({}, item, {
      categoryKey: key,
      imageUrl: absoluteUrl(item.imagePath, '/images/logo.jpg'),
      priceLabel: priceLabel(item)
    })
  })
  const groups = Object.keys(categoryMap).map(key => categoryMap[key])
    .sort((a, b) => a.sort - b.sort || String(a.name).localeCompare(String(b.name), 'zh-CN'))
  return {
    items,
    categories: [{ key: 'all', name: '全部', count: items.length }].concat(groups)
  }
}

function publicRequest(params) {
  return new Promise((resolve, reject) => {
    app.shopRequest({
      url: apiUrl.apiUrl + 'public/sales/quote-catalog',
      method: 'GET',
      data: params,
      success: res => resolve(res.data || {}),
      fail: reject
    })
  })
}

Page({
  data: {
    loading: true,
    publicMode: false,
    statusBarHeight: 20,
    disId: null,
    salesUserId: null,
    profile: null,
    distributor: null,
    salesperson: null,
    businessTypes: [],
    businessTypeId: null,
    businessTypeName: '',
    businessTypeThemeColor: '#7bc52b',
    bannerImageUrl: '',
    sourceLabel: '',
    items: [],
    visibleItems: [],
    categories: [],
    activeCategoryKey: 'all',
    shareReady: false,
    errorMessage: ''
  },

  onLoad(options) {
    const publicMode = String(options.public || '') === '1'
    this.setData({
      publicMode,
      statusBarHeight: app.globalData.statusBarHeight || 20,
      disId: Number(options.disId) || null,
      salesUserId: Number(options.salesUserId) || null,
      businessTypeId: Number(options.businessTypeId) || null
    })
    if (publicMode) {
      this.loadPublicPage()
      return
    }
    if (!app.hasUsableSalesToken()) {
      wx.reLaunch({ url: '/pages/entry/entry' })
      return
    }
    this.loadSalesPage()
  },

  loadSalesPage() {
    this.setData({ loading: true, errorMessage: '' })
    Promise.all([getSalesProfile(), getSalesBusinessTypesUsedByDepartments()])
      .then(results => {
        const profileBody = results[0].result || {}
        const typeBody = results[1].result || {}
        if (profileBody.code !== 0) throw new Error(profileBody.msg || '业务员资料加载失败')
        if (typeBody.code !== 0) throw new Error(typeBody.msg || '客户业态加载失败')
        const profile = profileBody.data || {}
        const types = this.presentBusinessTypes(typeBody.data || [])
        if (!types.length) throw new Error('请先给正式客户设置经营业态')
        const selectedId = this.pickBusinessTypeId(types, this.data.businessTypeId)
        this.setData({
          profile,
          distributor: this.privateDistributor(profile.disInfo || {}),
          salesperson: this.privateSalesperson(profile.salesInfo || {}),
          disId: profile.disInfo && profile.disInfo.nxDistributerId,
          salesUserId: profile.salesInfo && profile.salesInfo.nxDistributerUserId,
          businessTypes: types,
          businessTypeId: selectedId
        })
        return this.loadPrivateCatalog(selectedId)
      }).catch(error => this.showLoadError(error, '报价目录加载失败'))
      .finally(() => this.setData({ loading: false }))
  },

  loadPublicPage() {
    if (!this.data.disId) {
      this.showLoadError(new Error('分享链接缺少配送商信息'), '分享链接无效')
      return
    }
    this.setData({ loading: true, errorMessage: '' })
    publicRequest({
      disId: this.data.disId,
      salesUserId: this.data.salesUserId || '',
      businessTypeId: this.data.businessTypeId || '',
      limit: 50
    }).then(body => {
      if (body.code !== 0) throw new Error(body.msg || '公开报价加载失败')
      const data = body.data || {}
      const types = this.presentBusinessTypes(data.businessTypes || [])
      const catalog = data.catalog || {}
      this.setData({
        distributor: data.distributor || null,
        salesperson: data.salesperson || null,
        businessTypes: types,
        businessTypeId: Number(catalog.businessTypeId) || this.data.businessTypeId,
        shareReady: true
      })
      this.presentCatalog(catalog)
    }).catch(error => this.showLoadError(error, '公开报价加载失败'))
      .finally(() => this.setData({ loading: false }))
  },

  loadPrivateCatalog(businessTypeId) {
    return getSalesBusinessTypeRecommendations(businessTypeId, 50).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '报价商品加载失败')
      this.presentCatalog(body.data || {})
      this.setData({ shareReady: !!(this.data.disId && this.data.salesUserId) })
    })
  },

  presentCatalog(data) {
    const catalog = buildCatalog(data.items || [])
    const businessTypeId = Number(data.businessTypeId) || this.data.businessTypeId
    const businessType = (this.data.businessTypes || [])
      .find(item => Number(item.businessTypeId) === Number(businessTypeId)) || {}
    this.setData({
      businessTypeId,
      businessTypeName: data.businessTypeName || businessType.typeName || '',
      businessTypeThemeColor: data.themeColor || businessType.themeColor || '#7bc52b',
      bannerImageUrl: absoluteUrl(data.bannerImageRef || businessType.bannerImageRef, ''),
      sourceLabel: data.sourceLabel || '',
      items: catalog.items,
      categories: catalog.categories,
      activeCategoryKey: 'all',
      visibleItems: catalog.items
    })
  },

  presentBusinessTypes(types) {
    return (types || []).map(item => Object.assign({}, item, {
      iconUrl: absoluteUrl(item.iconRef, '/images/logo.jpg'),
      activeIconUrl: absoluteUrl(item.activeIconRef || item.iconRef, '/images/logo.jpg')
    }))
  },

  pickBusinessTypeId(types, requested) {
    const matched = types.find(item => Number(item.businessTypeId) === Number(requested))
    return Number((matched || types[0]).businessTypeId)
  },

  selectBusinessType(e) {
    const businessTypeId = Number(e.currentTarget.dataset.id)
    if (!businessTypeId || businessTypeId === Number(this.data.businessTypeId)) return
    this.setData({ businessTypeId, loading: true, errorMessage: '' })
    if (this.data.publicMode) {
      this.loadPublicPage()
      return
    }
    this.loadPrivateCatalog(businessTypeId)
      .catch(error => this.showLoadError(error, '报价商品加载失败'))
      .finally(() => this.setData({ loading: false }))
  },

  selectCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    this.setData({
      activeCategoryKey: key,
      visibleItems: key === 'all' ? this.data.items
        : this.data.items.filter(item => item.categoryKey === key)
    })
  },

  privateDistributor(source) {
    return {
      id: source.nxDistributerId,
      name: source.nxDistributerShowName || source.nxDistributerName,
      address: source.nxDistributerAddress,
      phone: source.nxDistributerPhone
    }
  },

  privateSalesperson(source) {
    return {
      id: source.nxDistributerUserId,
      name: source.nxDiuWxNickName,
      phone: source.nxDiuWxPhone || source.nxDiuLoginPhone
    }
  },

  showLoadError(error, fallback) {
    const message = error && error.message ? error.message : fallback
    this.setData({ loading: false, errorMessage: message })
    wx.showToast({ title: message, icon: 'none' })
  },

  retry() {
    if (this.data.publicMode) this.loadPublicPage()
    else this.loadSalesPage()
  },

  back() { wx.navigateBack() },

  onShareAppMessage() {
    const name = this.data.businessTypeName || '常用食材'
    const distributorName = this.data.distributor && this.data.distributor.name
      ? this.data.distributor.name : '新鲜食材报价'
    return {
      title: distributorName + '｜' + name + '常用食材报价',
      path: '/subPackage-sales/pages/quoteQuery/quoteQuery?public=1&disId='
        + encodeURIComponent(this.data.disId || '')
        + '&salesUserId=' + encodeURIComponent(this.data.salesUserId || '')
        + '&businessTypeId=' + encodeURIComponent(this.data.businessTypeId || ''),
      imageUrl: this.data.bannerImageUrl || '/images/sales-home-hero-v1.jpg'
    }
  },

  onShareTimeline() {
    const data = this.onShareAppMessage()
    return {
      title: data.title,
      query: data.path.split('?')[1] || '',
      imageUrl: data.imageUrl
    }
  }
})
