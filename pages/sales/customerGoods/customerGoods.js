import apiUrl from '../../../config.js'
var load = require('../../../lib/load.js')

const FREQUENCY_GROUPS = [
  {
    key: 'high',
    title: '高频订货',
    range: '每天 / 隔天',
    tone: 'green'
  },
  {
    key: 'regular',
    title: '常购',
    range: '3–7 天',
    tone: 'blue'
  },
  {
    key: 'periodic',
    title: '周期采购',
    range: '8–15 天',
    tone: 'orange'
  },
  {
    key: 'occasional',
    title: '偶尔采购',
    range: '15 天以上',
    tone: 'gray'
  },
  {
    key: 'unknown',
    title: '记录不足',
    range: '暂未形成周期',
    tone: 'light'
  }
]

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    url: apiUrl.server,
    depFatherId: null,
    editDepAttrName: '',
    searchKeyword: '',
    groupedGoods: [],
    stats: {
      total: 0,
      requirement: 0,
      stable: 0,
      recent: 0
    },
    loading: true
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const depFatherId = Number(options.departmentId)
    const customerName = options.customerName
      ? decodeURIComponent(options.customerName)
      : ''

    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1),
      windowHeight: (globalData.windowHeight || 0) * (globalData.rpxR || 1),
      depFatherId,
      editDepAttrName: customerName || '客户'
    })

    this._allGoods = []
    this._loadGoods()
  },

  onPullDownRefresh() {
    this._loadGoods(true)
  },

  _fetchProfile(depFatherId) {
    return new Promise((resolve, reject) => {
      getApp().salesRequest({
        url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetDepGoodsProfile/' + depFatherId,
        method: 'GET',
        success: res => resolve({ result: res.data }),
        fail: err => reject(err)
      })
    })
  },

  _loadGoods(fromPullDown) {
    if (!this.data.depFatherId) {
      this.setData({
        loading: false,
        groupedGoods: []
      })
      if (fromPullDown) wx.stopPullDownRefresh()
      return
    }

    if (!fromPullDown) load.showLoading('获取数据')

    this._fetchProfile(this.data.depFatherId)
      .then(res => {
        const result = res && res.result ? res.result : {}
        if (result.code !== 0) {
          wx.showToast({
            title: result.msg || '读取失败',
            icon: 'none'
          })
          this.setData({
            loading: false,
            groupedGoods: []
          })
          this._allGoods = []
          return
        }

        const allGoods = this._normalizeGoods(result.data || [])
        this._allGoods = allGoods
        this.setData({
          loading: false,
          stats: this._buildStats(allGoods)
        })
        this._applyFilter()
      })
      .catch(() => {
        wx.showToast({
          title: '读取失败，请稍后重试',
          icon: 'none'
        })
        this.setData({
          loading: false,
          groupedGoods: []
        })
        this._allGoods = []
      })
      .finally(() => {
        load.hideLoading()
        if (fromPullDown) wx.stopPullDownRefresh()
      })
  },

  _normalizeGoods(profiles) {
    const normalized = profiles.map(item => {
      const intervalDays = this._toNumber(item.averageOrderIntervalDays)
      const lastOrder = this._lastOrderView(item.lastOrderDate)
      const requirementCount = this._toInteger(item.requirementCount)
      const imageCount = this._toInteger(item.standardImageCount)
      const customerGoodsName = this._text(item.goodsName) || '未命名商品'

      return {
        relationId: item.relationId,
        goodsId: item.goodsId,
        goodsName: customerGoodsName,
        originalGoodsName: this._text(item.originalGoodsName),
        spec: this._text(item.specification),
        categoryName: this._text(item.categoryName),
        customerName: this._text(item.customerName) || this.data.editDepAttrName,
        intervalDays,
        intervalText: intervalDays === null ? '—' : this._formatNumber(intervalDays),
        frequencyKey: this._frequencyKey(intervalDays),
        lastOrderDate: lastOrder.date,
        lastOrderText: lastOrder.text,
        lastOrderDays: lastOrder.days,
        orderDayCount: this._toInteger(item.orderDayCount),
        ordersLast30Days: this._toInteger(item.ordersLast30Days),
        requirementCount,
        imageCount,
        hasRequirement: requirementCount > 0,
        imageUrl: this._imageUrl(item.imagePath),
        imagePath: this._text(item.imagePath),
        initials: customerGoodsName.slice(0, 1)
      }
    })

    return normalized.sort((a, b) => {
      const aInterval = a.intervalDays === null ? Number.MAX_SAFE_INTEGER : a.intervalDays
      const bInterval = b.intervalDays === null ? Number.MAX_SAFE_INTEGER : b.intervalDays
      if (aInterval !== bInterval) return aInterval - bInterval
      if (a.lastOrderDays !== b.lastOrderDays) return a.lastOrderDays - b.lastOrderDays
      return a.goodsName.localeCompare(b.goodsName, 'zh-CN')
    })
  },

  _buildStats(goods) {
    return {
      total: goods.length,
      requirement: goods.filter(item => item.hasRequirement).length,
      stable: goods.filter(item => item.intervalDays !== null && item.intervalDays <= 15).length,
      recent: goods.filter(item => item.lastOrderDays !== null && item.lastOrderDays <= 7).length
    }
  },

  _applyFilter() {
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase()
    const allGoods = this._allGoods || []
    const goods = keyword
      ? allGoods.filter(item => {
        return [
          item.goodsName,
          item.originalGoodsName,
          item.spec,
          item.categoryName
        ].some(value => (value || '').toLowerCase().includes(keyword))
      })
      : allGoods

    const groupedGoods = FREQUENCY_GROUPS.map(group => {
      const items = goods.filter(item => item.frequencyKey === group.key)
      return Object.assign({}, group, {
        count: items.length,
        collapsed: !!(this._collapsedMap && this._collapsedMap[group.key]),
        items
      })
    }).filter(group => group.count > 0)

    this.setData({ groupedGoods })
  },

  toggleGroup(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return

    const groupedGoods = this.data.groupedGoods.map(group => {
      if (group.key !== key) return group
      const collapsed = !group.collapsed
      this._collapsedMap = this._collapsedMap || {}
      this._collapsedMap[key] = collapsed
      return Object.assign({}, group, { collapsed })
    })

    this.setData({ groupedGoods })
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value || ''
    })
    this._applyFilter()
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this._applyFilter()
  },

  back() {
    wx.navigateBack()
  },

  toCustomerGoodsStandard(e) {
    const item = this._findGoods(e.currentTarget.dataset.id)
    if (!item || !item.relationId) return

    wx.navigateTo({
      url: '../customerGoodsStandard/customerGoodsStandard' +
        '?relationId=' + encodeURIComponent(item.relationId) +
        '&goodsName=' + encodeURIComponent(item.originalGoodsName || item.goodsName) +
        '&customerName=' + encodeURIComponent(item.goodsName)
    })
  },

  _frequencyKey(intervalDays) {
    if (intervalDays === null) return 'unknown'
    if (intervalDays <= 2) return 'high'
    if (intervalDays <= 7) return 'regular'
    if (intervalDays <= 15) return 'periodic'
    return 'occasional'
  },

  _lastOrderView(value) {
    if (!value) {
      return {
        date: '',
        days: null,
        text: '暂无记录'
      }
    }

    const normalized = String(value).replace(/\./g, '-').replace(/\//g, '-').slice(0, 10)
    const parts = normalized.split('-').map(Number)
    if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) {
      return {
        date: normalized,
        days: null,
        text: normalized
      }
    }

    const orderDate = new Date(parts[0], parts[1] - 1, parts[2])
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const days = Math.max(0, Math.round((today.getTime() - orderDate.getTime()) / 86400000))

    return {
      date: normalized,
      days,
      text: days === 0 ? '今天' : days + '天前'
    }
  },

  _findGoods(relationId) {
    const id = Number(relationId)
    return (this._allGoods || []).find(item => Number(item.relationId) === id)
  },

  _imageUrl(value) {
    const path = this._text(value)
    if (!path) return ''
    if (/^https?:\/\//.test(path)) return path
    return apiUrl.server + path
  },

  _formatNumber(value) {
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(1).replace(/\.0$/, '')
  },

  _toNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : null
  },

  _toInteger(value) {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
  },

  _text(value) {
    return value === null || value === undefined ? '' : String(value).trim()
  }
})
