import {
  searchSalesQuotationCandidates,
  createSalesQuotation,
  updateSalesQuotation,
  getSalesQuotation,
  finalizeSalesQuotation,
  closeSalesQuotation,
  getSalesBusinessTypes,
  getSalesCustomers,
  getSalesVisits,
  downloadSalesQuotationAttachment
} from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'

const app = getApp()
const BASKET_KEY = 'salesQuotationBasket'
const OCR_TRANSFER_KEY = 'salesOcrQuoteTransfer'
const CATEGORY_ORDER = [
  'CUISINE', 'HOTPOT', 'BBQ', 'NOODLE_RICE',
  'BREAKFAST', 'SNACK', 'WESTERN', 'OTHER'
]
const CATEGORY_NAMES = {
  CUISINE: '菜系', HOTPOT: '火锅', BBQ: '烧烤', NOODLE_RICE: '面饭粉',
  BREAKFAST: '早餐', SNACK: '单品小吃', WESTERN: '异国/西餐', OTHER: '其他'
}

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

function contextMeta(customerId, leadId, visitId, shopName) {
  let targetTypeLabel = '匿名客户'
  let fallbackName = '匿名客户'
  if (customerId) {
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
    isAnonymous: !customerId && !leadId && !visitId,
    targetTypeLabel,
    targetDisplayName: shopName || fallbackName,
    hasCustomerContext: !!customerId,
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
    customerId: null,
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
    manualSearchExpanded: false,
    showBusinessTypes: false,
    businessTypesLoading: false,
    businessTypeGroups: [],
    keyword: '',
    searching: false,
    candidates: [],
    items: [],
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
    const customerId = options.customerId ? Number(options.customerId) : null
    const leadId = options.leadId ? Number(options.leadId) : null
    const visitId = options.visitId ? Number(options.visitId) : null
    const shopName = decodeURIComponent(options.shopName || '')
    const meta = contextMeta(customerId, leadId, visitId, shopName)
    this.setData(Object.assign({
      statusBarHeight: app.globalData.statusBarHeight,
      customerId,
      leadId,
      visitId,
      shopName,
      validUntil: dateAfter(7)
    }, meta))

    this.loadBusinessTypes()
    if (options.quotationId) {
      this.loadQuotation(Number(options.quotationId))
    } else {
      if (customerId || leadId || visitId) wx.removeStorageSync(BASKET_KEY)
      this.setQuoteItems(wx.getStorageSync(BASKET_KEY) || [], false)
    }
    this._openOcrOnReady = String(options.openOcr || '') === '1'
    this._openIndustryOnReady = String(options.openIndustry || '') === '1'
    this._openManualOnReady = String(options.openManual || '') === '1'
  },

  onReady() {
    if (this._openManualOnReady) {
      this._openManualOnReady = false
      this.setData({ manualSearchExpanded: true })
    }
    if (this._openIndustryOnReady) {
      this._openIndustryOnReady = false
      this.setData({ showBusinessTypes: true })
    }
    if (this._openOcrOnReady) {
      this._openOcrOnReady = false
      this.openOcr()
    }
  },

  onShow() {
    this.consumeOcrTransfer()
    this.syncBasketFromStorage()
  },

  loadBusinessTypes() {
    this.setData({ businessTypesLoading: true })
    getSalesBusinessTypes().then(res => {
      const body = res.result || {}
      if (body.code !== 0) return
      this.setData({ businessTypeGroups: this.groupBusinessTypes(body.data || []) })
    }).catch(() => null).finally(() => this.setData({ businessTypesLoading: false }))
  },

  groupBusinessTypes(types) {
    const groups = {}
    ;(types || []).forEach(item => {
      const category = item.typeCategory || 'OTHER'
      if (!groups[category]) groups[category] = []
      groups[category].push(item)
    })
    const order = CATEGORY_ORDER.concat(Object.keys(groups)
      .filter(category => CATEGORY_ORDER.indexOf(category) < 0))
    return order.filter(category => groups[category] && groups[category].length)
      .map(category => ({
        category,
        name: CATEGORY_NAMES[category] || '其他',
        types: groups[category]
      }))
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
    const items = (rawItems || []).map(item => this.decorateItem(item))
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
      quoteTotalLabel: total.toFixed(2),
      totalPricePending
    }, extraData))
    if (persist) wx.setStorageSync(BASKET_KEY, items)
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

  openAddMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === 'ocr') this.openOcr()
    if (mode === 'industry') {
      this.setData({
        showBusinessTypes: !this.data.showBusinessTypes,
        manualSearchExpanded: false
      })
    }
    if (mode === 'manual') {
      this.setData({
        manualSearchExpanded: !this.data.manualSearchExpanded,
        showBusinessTypes: false
      })
    }
  },

  chooseBusinessType(e) {
    if (this.data.locked) return
    this.setData({ showBusinessTypes: false })
    wx.navigateTo({
      url: '/pages/sales/recommendations/recommendations?businessTypeId='
        + e.currentTarget.dataset.id + '&businessTypeName='
        + encodeURIComponent(e.currentTarget.dataset.name || '')
        + '&returnToWorkspace=1'
    })
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
      getSalesCustomers(),
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
      const strangerVisits = (visitBody.data || []).filter(item => !item.customerId)
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
    const customerId = kind === 'customer' ? target.targetId : null
    const visitId = kind === 'visit' ? target.targetId : null
    const leadId = kind === 'visit' ? target.leadId : null
    const meta = contextMeta(customerId, leadId, visitId, target.targetName)
    this.setData(Object.assign({
      customerId,
      leadId,
      visitId,
      shopName: target.targetName,
      showTargetPicker: false,
      targetKeyword: ''
    }, meta))
    wx.showToast({ title: '报价对象已选择', icon: 'success' })
  },

  search() {
    const keyword = (this.data.keyword || '').trim()
    if (!keyword) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    this.setData({ searching: true, candidates: [] })
    searchSalesQuotationCandidates(keyword, 30).then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '搜索失败', icon: 'none' })
        return
      }
      this.setData({
        candidates: (body.data || []).map(item => Object.assign({}, item, {
          imageUrl: imageUrl(item.imagePath),
          priceLabel: item.priceStatus === 'PRICE_AVAILABLE'
            ? '¥' + item.displayPrice + (item.unit ? '/' + item.unit : '')
            : '价格待确认'
        }))
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '搜索失败'), icon: 'none'
    })).finally(() => this.setData({ searching: false }))
  },

  chooseCandidate(e) {
    if (this.data.locked) return
    const goodsId = Number(e.currentTarget.dataset.id)
    const candidate = this.data.candidates.find(item => Number(item.goodsId) === goodsId)
    if (!candidate) return
    if (this.data.items.some(item => Number(item.goodsId) === goodsId)) {
      wx.showToast({ title: '该商品已在报价中', icon: 'none' })
      return
    }
    const items = this.data.items.concat([{
      goodsId: candidate.goodsId,
      goodsName: candidate.goodsName,
      specification: candidate.specification || '',
      unit: candidate.unit || '',
      origin: candidate.origin || '',
      imagePath: candidate.imagePath || '',
      quantity: '1',
      ourQuotePrice: candidate.displayPrice || '',
      customerCurrentPurchasePrice: '',
      priceStatus: candidate.priceStatus,
      originalSearchName: this.data.keyword,
      matchScore: candidate.matchScore,
      matchReason: candidate.matchReason,
      algorithmVersion: candidate.algorithmVersion,
      sourceType: 'MANUAL',
      salespersonConfirmed: true
    }])
    this.setQuoteItems(items, true, {
      candidates: [],
      keyword: '',
      editingIndex: items.length - 1
    })
  },

  removeItem(e) {
    if (this.data.locked) return
    const items = this.data.items.slice()
    items.splice(Number(e.currentTarget.dataset.index), 1)
    this.setQuoteItems(items, true, { editingIndex: -1 })
  },

  payload() {
    return {
      customerId: this.data.customerId || null,
      leadId: this.data.leadId || null,
      visitId: this.data.visitId || null,
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
      }).catch(error => wx.showToast({
        title: error.businessMessage || app.describeSalesRequestError(error, '定稿失败'),
        icon: 'none'
      })).finally(() => this.setData({ saving: false }))
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
      quotation.customerId,
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
      customerId: quotation.customerId,
      leadId: quotation.leadId,
      visitId: quotation.visitId,
      shopName: quotation.shopNameSnapshot || '',
      validUntil: dateLabel(quotation.validUntil),
      remark: quotation.remark || '',
      previewToken: '',
      attachments,
      editingIndex: -1,
      candidates: [],
      manualSearchExpanded: false,
      showBusinessTypes: false
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

  openOcr() {
    if (this.data.locked) return
    wx.navigateTo({ url: '/pages/sales/ocrQuotePreview/ocrQuotePreview' })
  },

  back() { wx.navigateBack() }
})
