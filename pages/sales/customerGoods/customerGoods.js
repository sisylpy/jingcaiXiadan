import {
  getSalesCustomer,
  getSalesCustomerGoods,
  searchSalesCatalog,
  addSalesCustomerGoods,
  deleteSalesCustomerGoods
} from '../../../lib/apiSales.js'

const app = getApp()

Page({
  data: {
    categories: [],
    filteredCategories: [],
    goods: [],
    listSearchKeyword: '',
    selectedCategoryKey: '',
    scrollIntoView: '',
    departments: [],
    departmentIndex: 0,
    showAdd: false,
    searchKeyword: '',
    searchResults: [],
    searching: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      customerId: Number(options.customerId),
      customerName: decodeURIComponent(options.customerName || '')
    })
  },

  onShow() { this.loadData() },

  loadData() {
    wx.showLoading({ title: '正在加载' })
    Promise.all([
      getSalesCustomer(this.data.customerId),
      getSalesCustomerGoods(this.data.customerId)
    ]).then(results => {
      const customerResult = results[0].result
      const goodsResult = results[1].result
      if (customerResult.code !== 0 || goodsResult.code !== 0) {
        wx.showToast({ title: customerResult.msg || goodsResult.msg || '加载失败', icon: 'none' })
        return
      }
      const customer = customerResult.data
      const departments = [{
        nxDepartmentId: customer.nxDepartmentId,
        nxDepartmentName: customer.nxDepartmentName
      }].concat(customer.nxDepartmentEntities || customer.nxSubDepartments || [])
      const categories = goodsResult.data || []
      const goods = []
      const normalizedCategories = categories.map((category, categoryIndex) => {
        const categoryName = category.nxDfgFatherGoodsName || '未分类'
        const categoryKey = String(category.nxDistributerFatherGoodsId || ('index-' + categoryIndex))
        const categoryGoods = (category.nxDepartmentDisGoodsEntities || []).map(item => {
          const disGoods = item.nxDistributerGoodsEntity || {}
          const department = item.nxDepartmentEntity || {}
          const normalized = Object.assign({}, item, {
            categoryName,
            categoryKey,
            sourceGoodsName: disGoods.nxDgGoodsName || '',
            displayName: item.nxDdgOrderGoodsName
              || item.nxDdgDepGoodsName
              || disGoods.nxDgGoodsName
              || '未命名商品',
            goodsDetail: disGoods.nxDgGoodsDetail || item.nxDdgDepGoodsDetail || '',
            goodsStandard: item.nxDdgOrderStandard
              || item.nxDdgDepGoodsStandardname
              || disGoods.nxDgGoodsStandardname
              || '规格待补充',
            departmentName: department.nxDepartmentAttrName
              || department.nxDepartmentName
              || '总部门'
          })
          goods.push(normalized)
          return normalized
        })
        return Object.assign({}, category, {
          categoryName,
          categoryKey,
          categoryDomId: 'sales-category-' + categoryKey,
          allGoods: categoryGoods,
          visibleGoods: categoryGoods
        })
      })
      this.setData({ customer, departments, categories: normalizedCategories, goods }, () => {
        this._filterCustomerGoods(this.data.listSearchKeyword)
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '商品资料加载失败'), icon: 'none'
    })).finally(() => wx.hideLoading())
  },

  openAdd() { this.setData({ showAdd: true, searchKeyword: '', searchResults: [] }) },
  closeAdd() { this.setData({ showAdd: false }) },
  onDepartmentChange(e) { this.setData({ departmentIndex: Number(e.detail.value) }) },
  onSearchInput(e) { this.setData({ searchKeyword: e.detail.value }) },

  onListSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ listSearchKeyword: keyword })
    this._filterCustomerGoods(keyword)
  },

  onListSearchConfirm(e) {
    const keyword = e.detail.value
    this.setData({ listSearchKeyword: keyword })
    this._filterCustomerGoods(keyword)
  },

  clearListSearch() {
    this.setData({ listSearchKeyword: '' })
    this._filterCustomerGoods('')
  },

  selectCategory(e) {
    const categoryKey = String(e.currentTarget.dataset.key || '')
    const category = (this.data.filteredCategories || [])
      .find(item => item.categoryKey === categoryKey)
    if (category) this._selectCategory(category)
  },

  _selectCategory(category) {
    this.setData({
      selectedCategoryKey: category.categoryKey,
      scrollIntoView: category.categoryDomId
    })
    setTimeout(() => this.setData({ scrollIntoView: '' }), 500)
  },

  _filterCustomerGoods(keyword) {
    const value = String(keyword || '').trim().toLowerCase()
    const filteredCategories = (this.data.categories || []).map(category => {
      const categoryMatched = category.categoryName.toLowerCase().indexOf(value) >= 0
      const visibleGoods = !value || categoryMatched
        ? category.allGoods
        : category.allGoods.filter(item => [
          item.displayName,
          item.sourceGoodsName,
          item.goodsDetail,
          item.goodsStandard,
          item.departmentName
        ].some(text => String(text || '').toLowerCase().indexOf(value) >= 0))
      return Object.assign({}, category, { visibleGoods })
    }).filter(category => category.visibleGoods.length > 0)

    const current = filteredCategories.find(category =>
      category.categoryKey === this.data.selectedCategoryKey)
    this.setData({ filteredCategories })
    if (current) {
      this.setData({ selectedCategoryKey: current.categoryKey })
    } else if (filteredCategories.length > 0) {
      this._selectCategory(filteredCategories[0])
    } else {
      this.setData({ selectedCategoryKey: '', scrollIntoView: '' })
    }
  },

  search() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) return
    this.setData({ searching: true })
    searchSalesCatalog(keyword).then(res => {
      if (res.result.code === 0) this.setData({ searchResults: res.result.data || [] })
      else wx.showToast({ title: res.result.msg || '搜索失败', icon: 'none' })
    }).finally(() => this.setData({ searching: false }))
  },

  addGoods(e) {
    const department = this.data.departments[this.data.departmentIndex]
    const disGoodsId = Number(e.currentTarget.dataset.id)
    if (!department || !disGoodsId) return
    addSalesCustomerGoods(this.data.customerId, {
      departmentId: department.nxDepartmentId,
      disGoodsId
    }).then(res => {
      if (res.result.code === 0) {
        wx.showToast({ title: '已加入客户商品', icon: 'success' })
        this.closeAdd()
        this.loadData()
      } else wx.showToast({ title: res.result.msg || '添加失败', icon: 'none' })
    })
  },

  removeGoods(e) {
    const relationId = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '移除订货商品',
      content: '只有没有订单、没有客户要求记录的商品才能移除。',
      success: result => {
        if (!result.confirm) return
        deleteSalesCustomerGoods(this.data.customerId, relationId).then(res => {
          if (res.result.code === 0) this.loadData()
          else wx.showToast({ title: res.result.msg || '不能移除', icon: 'none' })
        })
      }
    })
  },

  openStandard(e) {
    const item = e.currentTarget.dataset.item
    wx.navigateTo({
      url: '/pages/sales/customerGoodsStandard/customerGoodsStandard?relationId='
        + item.nxDepartmentDisGoodsId
        + '&goodsName=' + encodeURIComponent(item.displayName || '')
        + '&customerName=' + encodeURIComponent(this.data.customerName || '')
    })
  },

  back() { wx.navigateBack() }
})
