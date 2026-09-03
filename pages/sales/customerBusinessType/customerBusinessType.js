import {
  getSalesBusinessTypes,
  getSalesDepartmentBusinessTypes,
  setSalesDepartmentBusinessTypes
} from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'

const app = getApp()
const CATEGORY_ORDER = [
  'CUISINE', 'HOTPOT', 'BBQ', 'NOODLE_RICE',
  'BREAKFAST', 'SNACK', 'WESTERN', 'OTHER'
]
const CATEGORY_NAMES = {
  CUISINE: '菜系',
  HOTPOT: '火锅',
  BBQ: '烧烤',
  NOODLE_RICE: '面饭粉',
  BREAKFAST: '早餐',
  SNACK: '单品小吃',
  WESTERN: '异国/西餐',
  OTHER: '其他'
}

Page({
  data: {
    loading: true,
    saving: false,
    departmentId: null,
    customerName: '',
    categories: [],
    activeCategory: '',
    visibleTypes: [],
    primaryBusinessTypeId: null,
    originalPrimaryBusinessTypeId: null,
    selectedBusinessTypeIds: [],
    originalBusinessTypeIds: [],
    selectedBusinessTypeNames: '',
    inherited: false
  },

  onLoad(options) {
    let customerName = options.customerName || ''
    try { customerName = decodeURIComponent(customerName) } catch (error) {}
    const departmentId = Number(options.departmentId)
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      departmentId,
      customerName
    })
    if (!departmentId) {
      wx.showToast({ title: '客户参数不正确', icon: 'none' })
      return
    }
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true })
    Promise.all([
      getSalesBusinessTypes(),
      getSalesDepartmentBusinessTypes(this.data.departmentId)
    ]).then(results => {
      const typeResult = results[0].result || {}
      const customerResult = results[1].result || {}
      if (typeResult.code !== 0 || customerResult.code !== 0) {
        throw { businessMessage: typeResult.msg || customerResult.msg || '客户业态加载失败' }
      }
      const types = (typeResult.data || []).map(item => this.decorateType(item))
      const relationData = customerResult.data || {}
      const customerTypes = relationData.types || []
      const primaryType = customerTypes.find(item => Number(item.isPrimary) === 1)
        || customerTypes[0] || null
      const categories = this.buildCategories(types)
      const selectedIds = customerTypes.map(item => Number(item.businessTypeId))
      const selectedType = primaryType
        ? types.find(item => Number(item.businessTypeId) === Number(primaryType.businessTypeId))
        : null
      const activeCategory = selectedType
        ? (selectedType.typeCategory || 'OTHER')
        : (categories[0] ? categories[0].category : '')
      this._allTypes = types
      this.setData({
        categories,
        activeCategory,
        visibleTypes: this.typesForCategory(types, activeCategory, selectedIds,
          primaryType ? primaryType.businessTypeId : null),
        primaryBusinessTypeId: primaryType ? primaryType.businessTypeId : null,
        originalPrimaryBusinessTypeId: primaryType ? primaryType.businessTypeId : null,
        selectedBusinessTypeIds: selectedIds,
        originalBusinessTypeIds: selectedIds,
        selectedBusinessTypeNames: this.selectedNames(types, selectedIds),
        inherited: !!relationData.inherited
      })
    }).catch(error => wx.showToast({
      title: error.businessMessage
        || app.describeSalesRequestError(error, '客户业态加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  buildCategories(types) {
    const counts = {}
    ;(types || []).forEach(item => {
      const category = item.typeCategory || 'OTHER'
      counts[category] = (counts[category] || 0) + 1
    })
    const categories = CATEGORY_ORDER.filter(category => counts[category]).map(category => ({
      category,
      name: CATEGORY_NAMES[category] || '其他'
    }))
    Object.keys(counts).filter(category => CATEGORY_ORDER.indexOf(category) < 0)
      .forEach(category => categories.push({ category, name: CATEGORY_NAMES[category] || '其他' }))
    return categories
  },

  decorateType(item) {
    const absolute = path => !path ? '' : (/^https?:\/\//.test(path) ? path : apiUrl.server + path.replace(/^\//, ''))
    return Object.assign({}, item, {
      iconUrl: absolute(item.iconRef),
      activeIconUrl: absolute(item.activeIconRef || item.iconRef),
      bannerUrl: absolute(item.bannerImageRef)
    })
  },

  typesForCategory(types, category, selectedIds, primaryId) {
    const selected = selectedIds || this.data.selectedBusinessTypeIds || []
    const primary = primaryId === undefined ? this.data.primaryBusinessTypeId : primaryId
    return (types || []).filter(item => (item.typeCategory || 'OTHER') === category)
      .map(item => Object.assign({}, item, {
        selected: selected.some(id => Number(id) === Number(item.businessTypeId)),
        primary: Number(primary) === Number(item.businessTypeId)
      }))
  },

  selectedNames(types, selectedIds) {
    return (types || []).filter(item => (selectedIds || []).some(id =>
      Number(id) === Number(item.businessTypeId))).map(item => item.typeName).join('、')
  },

  selectCategory(e) {
    const activeCategory = e.currentTarget.dataset.category
    this.setData({
      activeCategory,
      visibleTypes: this.typesForCategory(this._allTypes, activeCategory)
    })
  },

  selectBusinessType(e) {
    if (this.data.saving) return
    const selected = (this._allTypes || []).find(item =>
      Number(item.businessTypeId) === Number(e.currentTarget.dataset.id))
    if (!selected) return
    let selectedIds = this.data.selectedBusinessTypeIds.slice()
    const index = selectedIds.findIndex(id => Number(id) === Number(selected.businessTypeId))
    let primaryId = this.data.primaryBusinessTypeId
    if (index >= 0) {
      selectedIds.splice(index, 1)
      if (Number(primaryId) === Number(selected.businessTypeId)) {
        primaryId = selectedIds.length ? selectedIds[0] : null
      }
    } else {
      selectedIds.push(selected.businessTypeId)
      if (primaryId === null || primaryId === undefined) primaryId = selected.businessTypeId
    }
    this.setData({
      selectedBusinessTypeIds: selectedIds,
      primaryBusinessTypeId: primaryId,
      selectedBusinessTypeNames: this.selectedNames(this._allTypes, selectedIds),
      visibleTypes: this.typesForCategory(this._allTypes, this.data.activeCategory,
        selectedIds, primaryId)
    })
  },

  setPrimaryBusinessType(e) {
    if (this.data.saving) return
    const id = Number(e.currentTarget.dataset.id)
    const selectedIds = this.data.selectedBusinessTypeIds.slice()
    if (!selectedIds.some(item => Number(item) === id)) selectedIds.push(id)
    this.setData({
      selectedBusinessTypeIds: selectedIds,
      primaryBusinessTypeId: id,
      selectedBusinessTypeNames: this.selectedNames(this._allTypes, selectedIds),
      visibleTypes: this.typesForCategory(this._allTypes, this.data.activeCategory,
        selectedIds, id)
    })
  },

  save() {
    if (this.data.saving) return
    const selectedId = this.data.primaryBusinessTypeId
    if (selectedId === null || selectedId === undefined) {
      wx.showToast({ title: '请至少选择一个客户业态', icon: 'none' })
      return
    }
    if (!this.selectionChanged()) {
      wx.navigateBack()
      return
    }
    this.setData({ saving: true })
    setSalesDepartmentBusinessTypes(this.data.departmentId, selectedId,
      this.data.selectedBusinessTypeIds).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '客户业态保存失败' }
      wx.showToast({ title: '客户业态已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 350)
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '保存失败'),
      icon: 'none'
    })).finally(() => this.setData({ saving: false }))
  },

  back() {
    const changed = this.selectionChanged()
    if (!changed) {
      wx.navigateBack()
      return
    }
    wx.showModal({
      title: '还没有保存',
      content: '是否放弃本次选择？',
      confirmText: '放弃',
      confirmColor: '#d9534f',
      success: result => { if (result.confirm) wx.navigateBack() }
    })
  },

  selectionChanged() {
    const current = this.data.selectedBusinessTypeIds.map(Number).sort((a, b) => a - b).join(',')
    const original = this.data.originalBusinessTypeIds.map(Number).sort((a, b) => a - b).join(',')
    return current !== original || Number(this.data.primaryBusinessTypeId)
      !== Number(this.data.originalPrimaryBusinessTypeId)
  }
})
