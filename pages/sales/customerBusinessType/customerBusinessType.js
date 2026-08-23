import {
  getSalesBusinessTypes,
  getSalesCustomerBusinessTypes,
  setSalesCustomerBusinessTypes
} from '../../../lib/apiSales.js'

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
    customerId: null,
    customerName: '',
    categories: [],
    activeCategory: '',
    visibleTypes: [],
    selectedBusinessTypeId: null,
    originalBusinessTypeId: null,
    selectedBusinessTypeName: '',
    inherited: false
  },

  onLoad(options) {
    let customerName = options.customerName || ''
    try { customerName = decodeURIComponent(customerName) } catch (error) {}
    const customerId = Number(options.customerId)
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      customerId,
      customerName
    })
    if (!customerId) {
      wx.showToast({ title: '客户参数不正确', icon: 'none' })
      return
    }
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true })
    Promise.all([
      getSalesBusinessTypes(),
      getSalesCustomerBusinessTypes(this.data.customerId)
    ]).then(results => {
      const typeResult = results[0].result || {}
      const customerResult = results[1].result || {}
      if (typeResult.code !== 0 || customerResult.code !== 0) {
        throw { businessMessage: typeResult.msg || customerResult.msg || '客户业态加载失败' }
      }
      const types = typeResult.data || []
      const relationData = customerResult.data || {}
      const customerTypes = relationData.types || []
      const primaryType = customerTypes.find(item => Number(item.isPrimary) === 1)
        || customerTypes[0] || null
      const categories = this.buildCategories(types)
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
        visibleTypes: this.typesForCategory(types, activeCategory),
        selectedBusinessTypeId: primaryType ? primaryType.businessTypeId : null,
        originalBusinessTypeId: primaryType ? primaryType.businessTypeId : null,
        selectedBusinessTypeName: primaryType ? primaryType.typeName : '',
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

  typesForCategory(types, category) {
    return (types || []).filter(item => (item.typeCategory || 'OTHER') === category)
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
    this.setData({
      selectedBusinessTypeId: selected.businessTypeId,
      selectedBusinessTypeName: selected.typeName
    })
  },

  save() {
    if (this.data.saving) return
    const selectedId = this.data.selectedBusinessTypeId
    if (selectedId === null || selectedId === undefined) {
      wx.showToast({ title: '请选择一个客户业态', icon: 'none' })
      return
    }
    if (Number(selectedId) === Number(this.data.originalBusinessTypeId)) {
      wx.navigateBack()
      return
    }
    this.setData({ saving: true })
    setSalesCustomerBusinessTypes(this.data.customerId, selectedId).then(res => {
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
    const changed = this.data.selectedBusinessTypeId !== null
      && Number(this.data.selectedBusinessTypeId) !== Number(this.data.originalBusinessTypeId)
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
  }
})
