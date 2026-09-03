import {
  createSalesQuotation,
  updateSalesQuotation,
  getSalesQuotation,
  finalizeSalesQuotation,
  closeSalesQuotation,
  getSalesDepartments,
  getSalesVisits,
  downloadSalesQuotationAttachment,
  createSalesNextAction
} from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'
import {
  buildSalesGoodsCatalog,
  filterSalesGoodsCatalog
} from '../../../utils/salesGoodsCatalog.js'

const app = getApp()
const BASKET_KEY = 'salesQuotationBasket'
const BASKET_BUSINESS_TYPE_KEY = 'salesQuotationBusinessType'
const OCR_TRANSFER_KEY = 'salesOcrQuoteTransfer'

function dateAfter(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

function dateLabel(value) {
  if (!value) return ''
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

function statusLabel(status) {
  return { DRAFT: '草稿', FINALIZED: '已定稿', EXPIRED: '已过期', CLOSED: '已关闭' }[status]
    || status || '未知状态'
}

function contextMeta(departmentId, leadId, visitId, shopName) {
  let targetTypeLabel = '匿名客户'
  let fallbackName = '匿名客户'
  if (departmentId) {
    targetTypeLabel = '正式客户'
    fallbackName = '已关联正式客户'
  } else if (visitId) {
    targetTypeLabel = '陌生拜访'
    fallbackName = '已关联拜访门店'
  } else if (leadId) {
    targetTypeLabel = '销售线索'
    fallbackName = '已关联线索门店'
  }
  return {
    isAnonymous: !departmentId && !leadId && !visitId,
    targetTypeLabel,
    targetDisplayName: shopName || fallbackName,
    hasCustomerContext: !!departmentId,
    hasLeadContext: !!leadId,
    hasVisitContext: !!visitId
  }
}

Page({
  data: {
    loading: false,
    saving: false,
    quotationId: null,
    quotationNo: '',
    statusCode: 'DRAFT',
    statusLabel: '草稿',
    locked: false,
    canClose: false,
    departmentId: null,
    leadId: null,
    visitId: null,
    shopName: '',
    targetTypeLabel: '匿名客户',
    targetDisplayName: '匿名客户',
    isAnonymous: true,
    hasCustomerContext: false,
    hasLeadContext: false,
    hasVisitContext: false,
    validUntil: '',
    remark: '',
    selectedBusinessTypeId: null,
    selectedBusinessTypeName: '',
    selectedBusinessTypeBannerUrl: '',
    selectedBusinessTypeThemeColor: '#76B82A',
    items: [],
    quoteCategories: [],
    quoteSubCategories: [],
    quoteVisibleItems: [],
    activeQuoteGreatCategoryKey: '',
    activeQuoteSubCategoryKey: 'all',
    quoteGoodsScrollTop: 0,
    editingIndex: -1,
    quoteTotalLabel: '0.00',
    totalPricePending: false,
    previewToken: '',
    attachments: [],
    showTargetPicker: false,
    targetPickerTab: 'customer',
    targetPickerLoading: false,
    targetKeyword: '',
    formalCustomers: [],
    strangerVisits: [],
    visibleTargets: []
  },

  onLoad(options) {
    const departmentId = options.departmentId ? Number(options.departmentId) : null
    const leadId = options.leadId ? Number(options.leadId) : null
    const visitId = options.visitId ? Number(options.visitId) : null
    const shopName = decodeURIComponent(options.shopName || '')
    const meta = contextMeta(departmentId, leadId, visitId, shopName)
    const storedBusinessType = wx.getStorageSync(BASKET_BUSINESS_TYPE_KEY) || {}
    this.setData(Object.assign({
      statusBarHeight: app.globalData.statusBarHeight,
      departmentId,
      leadId,
      visitId,
      shopName,
      validUntil: dateAfter(7),
      selectedBusinessTypeId: storedBusinessType.businessTypeId || null,
      selectedBusinessTypeName: storedBusinessType.typeName || '',
      selectedBusinessTypeBannerUrl: this.businessTypeAssetUrl(storedBusinessType.bannerImageRef),
      selectedBusinessTypeThemeColor: storedBusinessType.themeColor || '#76B82A'
    }, meta))

    if (options.quotationId) {
      this.loadQuotation(Number(options.quotationId))
    } else {
      if (departmentId || leadId || visitId) {
        wx.removeStorageSync(BASKET_KEY)
        wx.removeStorageSync(BASKET_BUSINESS_TYPE_KEY)
        this.setData({
          selectedBusinessTypeId: null,
          selectedBusinessTypeName: '',
          selectedBusinessTypeBannerUrl: ''
        })
      }
      this.setQuoteItems(wx.getStorageSync(BASKET_KEY) || [], false)
    }
    this._openOcrOnReady = String(options.openOcr || '') === '1'
    this._openIndustryOnReady = String(options.openIndustry || '') === '1'
  },

  onReady() {
    if (this._openIndustryOnReady) {
      this._openIndustryOnReady = false
      this.openGoodsAdder(null, 'industry')
      return
    }
    if (this._openOcrOnReady) {
      this._openOcrOnReady = false
      this.openGoodsAdder(null, 'ocr')
    }
  },

  onShow() {
    this.consumeOcrTransfer()
    this.syncBasketFromStorage()
    this.syncBusinessTypeFromStorage()
  },

  syncBusinessTypeFromStorage() {
    if (this.data.locked) return
    const stored = wx.getStorageSync(BASKET_BUSINESS_TYPE_KEY) || {}
    if (!stored.businessTypeId) return
    this.setData({
      selectedBusinessTypeId: stored.businessTypeId,
      selectedBusinessTypeName: stored.typeName || '',
      selectedBusinessTypeBannerUrl: this.businessTypeAssetUrl(stored.bannerImageRef),
      selectedBusinessTypeThemeColor: stored.themeColor || '#76B82A'
    })
  },

  openGoodsAdder(e, mode) {
    if (this.data.locked) return
    const requestedMode = mode || e && e.currentTarget && e.currentTarget.dataset.mode || ''
    let url = '/subPackage-sales/pages/quotationGoodsAdd/quotationGoodsAdd?targetName='
      + encodeURIComponent(this.data.targetDisplayName || '')
    if (requestedMode) url += '&mode=' + encodeURIComponent(requestedMode)
    wx.navigateTo({ url })
  },

  businessTypeAssetUrl(path) {
    if (!path) return ''
    return /^https?:\/\//.test(path) ? path : apiUrl.server + path.replace(/^\//, '')
  },

  decorateItem(item) {
    const quantity = Number(item.quantity)
    const price = Number(item.ourQuotePrice)
    const hasQuantity = Number.isFinite(quantity) && quantity > 0
    const hasPrice = item.ourQuotePrice !== '' && item.ourQuotePrice !== null
      && item.ourQuotePrice !== undefined && Number.isFinite(price)
    return Object.assign({}, item, {
      imageUrl: imageUrl(item.imagePath),
      subtotalLabel: hasQuantity && hasPrice ? (quantity * price).toFixed(2) : '待确认',
      unitPriceLabel: hasPrice
        ? String(item.ourQuotePrice) + (item.unit ? '/' + item.unit : '')
        : '价格待确认',
      subtotalDisplayLabel: hasQuantity && hasPrice
        ? '¥' + (quantity * price).toFixed(2) : '待确认'
    })
  },

  setQuoteItems(rawItems, persist = true, extraData = {}) {
    const decoratedItems = (rawItems || []).map(item => this.decorateItem(item))
    const catalog = buildSalesGoodsCatalog(decoratedItems)
    const items = catalog.items
    let activeGreatCategoryKey = this.data.activeQuoteGreatCategoryKey
    let activeCategory = catalog.categories.find(
      category => category.key === activeGreatCategoryKey)
    if (!activeCategory) {
      activeCategory = catalog.categories[0] || null
      activeGreatCategoryKey = activeCategory ? activeCategory.key : ''
    }
    let activeSubCategoryKey = this.data.activeQuoteSubCategoryKey || 'all'
    const quoteSubCategories = activeCategory ? activeCategory.subCategories : []
    if (!quoteSubCategories.some(category => category.key === activeSubCategoryKey)) {
      activeSubCategoryKey = 'all'
    }
    let total = 0
    let totalPricePending = false
    items.forEach(item => {
      const quantity = Number(item.quantity)
      const price = Number(item.ourQuotePrice)
      if (item.subtotalLabel === '待确认') {
        totalPricePending = true
      } else if (Number.isFinite(quantity) && Number.isFinite(price)) {
        total += quantity * price
      }
    })
    this.setData(Object.assign({
      items,
      quoteCategories: catalog.categories,
      quoteSubCategories,
      quoteVisibleItems: activeCategory ? filterSalesGoodsCatalog(
        items, activeGreatCategoryKey, activeSubCategoryKey) : [],
      activeQuoteGreatCategoryKey: activeGreatCategoryKey,
      activeQuoteSubCategoryKey: activeSubCategoryKey,
      quoteTotalLabel: total.toFixed(2),
      totalPricePending
    }, extraData))
    if (persist) wx.setStorageSync(BASKET_KEY, items)
  },

  selectQuoteGreatCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    const category = this.data.quoteCategories.find(item => item.key === key)
    if (!category) return
    this.setData({
      activeQuoteGreatCategoryKey: key,
      activeQuoteSubCategoryKey: 'all',
      quoteSubCategories: category.subCategories,
      quoteVisibleItems: filterSalesGoodsCatalog(this.data.items, key, 'all'),
      quoteGoodsScrollTop: 1,
      editingIndex: -1
    }, () => this.setData({ quoteGoodsScrollTop: 0 }))
  },

  selectQuoteSubCategory(e) {
    const key = String(e.currentTarget.dataset.key)
    this.setData({
      activeQuoteSubCategoryKey: key,
      quoteVisibleItems: filterSalesGoodsCatalog(
        this.data.items, this.data.activeQuoteGreatCategoryKey, key),
      quoteGoodsScrollTop: 1,
      editingIndex: -1
    }, () => this.setData({ quoteGoodsScrollTop: 0 }))
  },

  syncBasketFromStorage() {
    if (this.data.locked || this._loadingQuotation) return
    const basket = wx.getStorageSync(BASKET_KEY)
    if (!Array.isArray(basket)) return
    this.setQuoteItems(basket, false)
  },

  consumeOcrTransfer() {
    const transfer = wx.getStorageSync(OCR_TRANSFER_KEY)
    if (!transfer || !Array.isArray(transfer.items) || !transfer.items.length) return
    wx.removeStorageSync(OCR_TRANSFER_KEY)
    const items = this.data.items.slice()
    transfer.items.forEach(item => {
      const index = items.findIndex(existing => Number(existing.goodsId) === Number(item.goodsId))
      if (index >= 0) items[index] = item
      else items.push(item)
    })
    this.setQuoteItems(items, true, {
      previewToken: transfer.previewToken || this.data.previewToken
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const data = { [field]: value }
    if (field === 'shopName' && this.data.isAnonymous) {
      data.targetDisplayName = value.trim() || '匿名客户'
    }
    this.setData(data)
  },

  onDateChange(e) {
    this.setData({ validUntil: e.detail.value })
  },

  onItemInput(e) {
    if (this.data.locked) return
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    const items = this.data.items.slice()
    if (!items[index]) return
    items[index] = Object.assign({}, items[index], { [field]: e.detail.value })
    this.setQuoteItems(items)
  },

  toggleItemEdit(e) {
    if (this.data.locked) return
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ editingIndex: this.data.editingIndex === index ? -1 : index })
  },

  openTargetPicker() {
    if (this.data.locked) return
    this.setData({ showTargetPicker: true, targetKeyword: '' })
    if (this.data.formalCustomers.length || this.data.strangerVisits.length) {
      this.refreshVisibleTargets(this.data.targetPickerTab, '')
      return
    }
    this.loadQuoteTargets()
  },

  closeTargetPicker() {
    this.setData({ showTargetPicker: false })
  },

  loadQuoteTargets() {
    this.setData({ targetPickerLoading: true })
    Promise.all([
      getSalesDepartments(),
      getSalesVisits({ limit: 100 })
    ]).then(results => {
      const customerBody = results[0].result || {}
      const visitBody = results[1].result || {}
      if (customerBody.code !== 0 || visitBody.code !== 0) {
        throw { businessMessage: customerBody.msg || visitBody.msg || '报价对象加载失败' }
      }
      const customerData = customerBody.data || {}
      const formalCustomers = (customerData.settleTypeOne || [])
        .concat(customerData.settleTypeTwo || [])
        .map(item => ({
          targetKey: 'C-' + item.nxDepartmentId,
          targetId: item.nxDepartmentId,
          targetKind: 'customer',
          targetName: item.nxDepartmentAttrName || item.nxDepartmentName || '未命名客户',
          targetSubtitle: item.nxDepartmentAddress || '地址未填写',
          avatarText: String(item.nxDepartmentName || '客').slice(0, 1)
        }))
      const strangerVisits = (visitBody.data || []).filter(item => !item.departmentId)
        .map(item => ({
          targetKey: 'V-' + item.visitId,
          targetId: item.visitId,
          targetKind: 'visit',
          leadId: item.leadId || null,
          targetName: item.shopName || item.shopNameSnapshot || '陌生门店',
          targetSubtitle: item.address || item.addressSnapshot || '地址未填写',
          visitTimeLabel: String(item.visitAt || item.createdAt || '').replace('T', ' ').slice(0, 16),
          avatarText: String(item.shopName || item.shopNameSnapshot || '店').slice(0, 1)
        }))
      this.setData({ formalCustomers, strangerVisits })
      this.refreshVisibleTargets(this.data.targetPickerTab, '')
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '报价对象加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ targetPickerLoading: false }))
  },

  switchTargetPickerTab(e) {
    const targetPickerTab = e.currentTarget.dataset.tab
    this.setData({ targetPickerTab, targetKeyword: '' })
    this.refreshVisibleTargets(targetPickerTab, '')
  },

  onTargetKeywordInput(e) {
    const targetKeyword = e.detail.value || ''
    this.setData({ targetKeyword })
    this.refreshVisibleTargets(this.data.targetPickerTab, targetKeyword)
  },

  refreshVisibleTargets(tab, keyword) {
    const source = tab === 'visit' ? this.data.strangerVisits : this.data.formalCustomers
    const value = String(keyword || '').trim().toLowerCase()
    const visibleTargets = !value ? source : source.filter(item => {
      return [item.targetName, item.targetSubtitle]
        .some(text => String(text || '').toLowerCase().indexOf(value) >= 0)
    })
    this.setData({ visibleTargets })
  },

  selectQuoteTarget(e) {
    if (this.data.locked) return
    const kind = e.currentTarget.dataset.kind
    const id = Number(e.currentTarget.dataset.id)
    const source = kind === 'visit' ? this.data.strangerVisits : this.data.formalCustomers
    const target = source.find(item => Number(item.targetId) === id)
    if (!target) return
    const departmentId = kind === 'customer' ? target.targetId : null
    const visitId = kind === 'visit' ? target.targetId : null
    const leadId = kind === 'visit' ? target.leadId : null
    const meta = contextMeta(departmentId, leadId, visitId, target.targetName)
    this.setData(Object.assign({
      departmentId,
      leadId,
      visitId,
      shopName: target.targetName,
      showTargetPicker: false,
      targetKeyword: ''
    }, meta))
    wx.showToast({ title: '报价对象已选择', icon: 'success' })
  },

  removeItem(e) {
    if (this.data.locked) return
    const items = this.data.items.slice()
    items.splice(Number(e.currentTarget.dataset.index), 1)
    this.setQuoteItems(items, true, { editingIndex: -1 })
  },

  payload() {
    return {
      departmentId: this.data.departmentId || null,
      leadId: this.data.leadId || null,
      visitId: this.data.visitId || null,
      businessTypeId: this.data.selectedBusinessTypeId || null,
      shopName: (this.data.shopName || '').trim(),
      validUntil: this.data.validUntil,
      remark: (this.data.remark || '').trim(),
      items: this.data.items.map(item => ({
        originalSearchName: item.originalSearchName || item.goodsName,
        sourceType: item.sourceType || 'MANUAL',
        sourceRawText: item.sourceRawText || null,
        sourceKeyword: item.sourceKeyword || item.originalSearchName || item.goodsName,
        quotedSpecification: item.specification || null,
        quotedUnit: item.unit || null,
        goodsId: item.goodsId,
        quantity: item.quantity,
        ourQuotePrice: item.ourQuotePrice === '' ? null : item.ourQuotePrice,
        customerCurrentPurchasePrice: item.customerCurrentPurchasePrice === ''
          ? null : item.customerCurrentPurchasePrice,
        matchScore: item.matchScore === '' ? null : item.matchScore,
        matchReason: item.matchReason,
        algorithmVersion: item.algorithmVersion,
        salespersonConfirmed: !!item.salespersonConfirmed
      })),
      previewToken: this.data.previewToken || null
    }
  },

  persistDraft() {
    const action = this.data.quotationId
      ? updateSalesQuotation(this.data.quotationId, this.payload())
      : createSalesQuotation(this.payload())
    return action.then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '报价保存失败' }
      this.applyQuotation(body.data || {})
      return body.data
    })
  },

  saveDraft() {
    if (this.data.saving || this.data.locked) return
    this.setData({ saving: true })
    this.persistDraft().then(() => {
      wx.showToast({ title: '草稿已保存', icon: 'success' })
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '报价保存失败'),
      icon: 'none'
    })).finally(() => this.setData({ saving: false }))
  },

  finalizeQuotation() {
    if (this.data.saving || this.data.locked) return
    if (!this.data.items.length) {
      wx.showToast({ title: '请先添加商品', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认定稿',
      content: '定稿后将锁定本次商品和报价快照，是否继续？',
      confirmText: '确认定稿',
      confirmColor: '#176b4d',
      success: res => {
        if (res.confirm) this.doFinalizeQuotation()
      }
    })
  },

  doFinalizeQuotation() {
    this.setData({ saving: true })
    this.persistDraft().then(() => finalizeSalesQuotation(this.data.quotationId))
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw { businessMessage: body.msg || '定稿失败' }
        this.applyQuotation(body.data || {})
        wx.showToast({ title: '报价已定稿', icon: 'success' })
        const activity = (body.data || {}).activity
        if (activity && activity.activityId) {
          setTimeout(() => this.askQuotationFollowUp(activity), 350)
        }
      }).catch(error => wx.showToast({
        title: error.businessMessage || app.describeSalesRequestError(error, '定稿失败'),
        icon: 'none'
      })).finally(() => this.setData({ saving: false }))
  },

  askQuotationFollowUp(activity) {
    wx.showModal({
      title: '安排下一步',
      content: '是否生成一条3天后的报价跟进任务？',
      cancelText: '暂不安排',
      confirmText: '生成任务',
      confirmColor: '#176b4d',
      success: result => {
        if (!result.confirm) return
        createSalesNextAction(activity.activityId, {
          actionType: 'QUOTE',
          title: '报价跟进',
          description: '询问客户对本次报价的反馈',
          targetAt: dateAfter(3) + ' 09:00:00'
        }).then(response => {
          const body = response.result || {}
          if (body.code !== 0) throw { businessMessage: body.msg || '跟进任务生成失败' }
          wx.showToast({ title: '跟进任务已生成', icon: 'success' })
        }).catch(error => wx.showToast({
          title: error.businessMessage
            || app.describeSalesRequestError(error, '跟进任务生成失败'),
          icon: 'none'
        }))
      }
    })
  },

  closeQuotation() {
    if (!this.data.canClose || this.data.saving) return
    wx.showModal({
      title: '关闭报价',
      content: '关闭后这张报价将保留为历史记录，是否继续？',
      confirmText: '关闭报价',
      confirmColor: '#8a563b',
      success: res => {
        if (!res.confirm) return
        this.setData({ saving: true })
        closeSalesQuotation(this.data.quotationId).then(response => {
          const body = response.result || {}
          if (body.code !== 0) throw { businessMessage: body.msg || '报价关闭失败' }
          this.applyQuotation(body.data || {})
          wx.showToast({ title: '报价已关闭', icon: 'success' })
        }).catch(error => wx.showToast({
          title: error.businessMessage || app.describeSalesRequestError(error, '报价关闭失败'),
          icon: 'none'
        })).finally(() => this.setData({ saving: false }))
      }
    })
  },

  requestDeleteQuotation() {
    if (!this.data.quotationId) return
    wx.showModal({
      title: '删除报价',
      content: '前端删除入口已准备，后台暂未提供报价删除接口，因此当前不会删除这张报价。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  noop() {},

  applyQuotation(data) {
    const quotation = data.quotation || {}
    const items = (data.items || []).map(item => ({
      goodsId: item.distributerGoodsId,
      goodsName: item.goodsNameSnapshot,
      specification: item.specificationSnapshot || '',
      unit: item.unitSnapshot || '',
      origin: item.originSnapshot || '',
      imagePath: item.imageRefSnapshot || '',
      greatCategoryId: item.greatCategoryIdSnapshot,
      greatCategoryName: item.greatCategoryNameSnapshot || '其他商品',
      greatCategorySort: item.greatCategorySortSnapshot,
      subCategoryId: item.subCategoryIdSnapshot,
      subCategoryName: item.subCategoryNameSnapshot || '其他',
      subCategorySort: item.subCategorySortSnapshot,
      quantity: String(item.quantity == null ? '' : item.quantity),
      ourQuotePrice: item.ourQuotePrice == null ? '' : String(item.ourQuotePrice),
      customerCurrentPurchasePrice: item.customerCurrentPurchasePrice == null
        ? '' : String(item.customerCurrentPurchasePrice),
      priceStatus: item.ourQuotePrice == null ? 'PRICE_PENDING' : 'PRICE_AVAILABLE',
      originalSearchName: item.originalSearchName,
      matchScore: item.matchScore == null ? '' : item.matchScore,
      matchReason: item.matchReason,
      algorithmVersion: item.algorithmVersion,
      sourceType: item.sourceType || 'MANUAL',
      sourceRawText: item.sourceRawText || '',
      sourceKeyword: item.sourceKeyword || item.originalSearchName || '',
      salespersonConfirmed: item.salespersonConfirmed === 1
        || item.salespersonConfirmed === true
    }))
    const attachments = (data.attachments || []).map(item => Object.assign({}, item, {
      localPath: ''
    }))
    const locked = quotation.statusCode !== 'DRAFT'
    const meta = contextMeta(
      quotation.departmentId,
      quotation.leadId,
      quotation.visitId,
      quotation.shopNameSnapshot || ''
    )
    this.setData(Object.assign({
      quotationId: quotation.quotationId,
      quotationNo: quotation.quotationNo,
      statusCode: quotation.statusCode,
      statusLabel: statusLabel(quotation.statusCode),
      locked,
      canClose: quotation.statusCode === 'FINALIZED' || quotation.statusCode === 'EXPIRED',
      departmentId: quotation.departmentId,
      leadId: quotation.leadId,
      visitId: quotation.visitId,
      selectedBusinessTypeId: quotation.businessTypeId || null,
      selectedBusinessTypeName: quotation.businessTypeNameSnapshot || '',
      selectedBusinessTypeBannerUrl: this.businessTypeAssetUrl(
        quotation.businessTypeBannerRefSnapshot),
      selectedBusinessTypeThemeColor: quotation.businessTypeThemeColorSnapshot || '#76B82A',
      shopName: quotation.shopNameSnapshot || '',
      validUntil: dateLabel(quotation.validUntil),
      remark: quotation.remark || '',
      previewToken: '',
      attachments,
      editingIndex: -1
    }, meta))
    this.setQuoteItems(items)
    this.loadAttachmentImages(quotation.quotationId, attachments)
  },

  loadAttachmentImages(quotationId, attachments) {
    if (!quotationId || !attachments.length) return
    attachments.forEach((attachment, index) => {
      downloadSalesQuotationAttachment(quotationId, attachment.attachmentId)
        .then(localPath => this.setData({
          ['attachments[' + index + '].localPath']: localPath
        })).catch(() => null)
    })
  },

  loadQuotation(quotationId) {
    this._loadingQuotation = true
    this.setData({ loading: true })
    getSalesQuotation(quotationId).then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '报价加载失败', icon: 'none' })
        return
      }
      this.applyQuotation(body.data || {})
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '报价加载失败'), icon: 'none'
    })).finally(() => {
      this._loadingQuotation = false
      this.setData({ loading: false })
    })
  },

  preview() {
    if (!this.data.quotationId) {
      wx.showToast({ title: '请先保存草稿，再查看预览', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/sales/quotationPreview/quotationPreview?quotationId=' + this.data.quotationId
    })
  },

  back() { wx.navigateBack() }
})
