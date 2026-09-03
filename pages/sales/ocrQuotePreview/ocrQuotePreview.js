import {
  uploadSalesQuoteOcrPreview,
  discardSalesQuoteOcrPreview,
  searchSalesQuotationCandidates
} from '../../../lib/apiSales.js'
import apiUrl from '../../../config.js'

const app = getApp()
const TRANSFER_KEY = 'salesOcrQuoteTransfer'

function imageUrl(path) {
  if (!path) return '/images/logo.jpg'
  return /^https?:\/\//.test(path) ? path : apiUrl.server + path
}

function decorateCandidate(candidate) {
  return Object.assign({}, candidate, {
    imageUrl: imageUrl(candidate.imagePath),
    priceLabel: candidate.priceStatus === 'PRICE_AVAILABLE'
      ? '¥' + candidate.displayPrice + (candidate.unit ? '/' + candidate.unit : '')
      : '价格待确认'
  })
}

Page({
  data: {
    statusBarHeight: 20,
    loading: false,
    imagePath: '',
    previewToken: '',
    lines: [],
    selectedCount: 0,
    searchLineIndex: -1,
    searchKeyword: '',
    searchCandidates: [],
    searching: false,
    errorMessage: '',
    recognitionModeLabel: '',
    ocrImageList: [],
    ocrResetKey: 0
  },

  onLoad() {
    this.confirmed = false
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
  },

  onReady() {
    this.chooseSource()
  },

  onUnload() {
    if (!this.confirmed && this.data.previewToken) {
      discardSalesQuoteOcrPreview(this.data.previewToken).catch(() => null)
    }
  },

  chooseSource() {
    if (this.data.loading) return
    const cropper = this.selectComponent('#salesQuoteImageCropper')
    if (cropper) cropper.chooseImages()
  },

  onOcrImageChange(e) {
    this.setData({ ocrImageList: (e.detail && e.detail.imageList) || [] })
  },

  onStartOCRFast(e) {
    this.startQuoteRecognition(e, 'fast')
  },

  onStartOCR(e) {
    this.startQuoteRecognition(e, 'complex')
  },

  startQuoteRecognition(e, mode) {
    if (this.data.loading) return
    const imageList = (e.detail && e.detail.imageList) || []
    const image = imageList[0] || {}
    const filePath = image.path || image.tempFilePath || ''
    if (!filePath) {
      wx.showToast({ title: '请选择采购单图片', icon: 'none' })
      return
    }
    this.replacePreview(filePath, mode)
  },

  replacePreview(filePath, mode) {
    const previous = this.data.previewToken
    const complex = mode === 'complex'
    this.setData({
      loading: true,
      imagePath: filePath,
      previewToken: '',
      lines: [],
      selectedCount: 0,
      errorMessage: '',
      recognitionModeLabel: complex ? '多列 · DeepSeek 大模型识别' : '单列 · 快速识别'
    })
    if (previous) discardSalesQuoteOcrPreview(previous).catch(() => null)
    uploadSalesQuoteOcrPreview(filePath, mode).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '采购单识别失败' }
      const data = body.data || {}
      const lines = (data.lines || []).map(line => Object.assign({}, line, {
        quantity: line.quantity == null ? '' : String(line.quantity),
        unit: line.unit || '',
        spec: line.spec || '',
        customerCurrentPurchasePrice: line.customerCurrentPurchasePrice == null
          ? '' : String(line.customerCurrentPurchasePrice),
        candidates: (line.candidates || []).map(decorateCandidate),
        selectedCandidate: null,
        selectedGoodsId: null,
        showAll: false,
        manuallyAdded: false
      }))
      this.setData({
        previewToken: data.previewToken || '',
        lines,
        ocrImageList: [],
        ocrResetKey: Date.now()
      })
      if (!lines.length) {
        this.setData({ errorMessage: '没有识别到采购明细，可使用“添加漏掉的商品”手工补录。' })
      }
    }).catch(error => {
      this.setData({ errorMessage: error.businessMessage
        || app.describeSalesRequestError(error, '采购单识别失败') })
    }).finally(() => this.setData({ loading: false }))
  },

  visibleCandidates(line) {
    return line.showAll ? line.candidates : line.candidates.slice(0, 3)
  },

  chooseCandidate(e) {
    const lineIndex = Number(e.currentTarget.dataset.line)
    const goodsId = Number(e.currentTarget.dataset.goods)
    const line = this.data.lines[lineIndex]
    const candidate = (line.candidates || []).find(item => Number(item.goodsId) === goodsId)
    if (!candidate) return
    this.setData({
      ['lines[' + lineIndex + '].selectedGoodsId']: goodsId,
      ['lines[' + lineIndex + '].selectedCandidate']: candidate,
      ['lines[' + lineIndex + '].matchStatus']: 'MATCHED'
    }, () => this.refreshCount())
  },

  toggleMore(e) {
    const index = Number(e.currentTarget.dataset.line)
    this.setData({ ['lines[' + index + '].showAll']: !this.data.lines[index].showAll })
  },

  onLineInput(e) {
    const index = Number(e.currentTarget.dataset.line)
    const field = e.currentTarget.dataset.field
    this.setData({ ['lines[' + index + '].' + field]: e.detail.value })
  },

  deleteLine(e) {
    const lines = this.data.lines.slice()
    lines.splice(Number(e.currentTarget.dataset.line), 1)
    this.setData({ lines, searchLineIndex: -1, searchCandidates: [] },
      () => this.refreshCount())
  },

  searchOther(e) {
    const index = Number(e.currentTarget.dataset.line)
    this.setData({
      searchLineIndex: index,
      searchKeyword: this.data.lines[index].goodsKeyword || '',
      searchCandidates: []
    })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  runSearch() {
    const keyword = (this.data.searchKeyword || '').trim()
    if (!keyword) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    this.setData({ searching: true, searchCandidates: [] })
    searchSalesQuotationCandidates(keyword, 30).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '搜索失败' }
      this.setData({ searchCandidates: (body.data || []).map(decorateCandidate) })
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '搜索失败'),
      icon: 'none'
    })).finally(() => this.setData({ searching: false }))
  },

  chooseSearchCandidate(e) {
    const index = this.data.searchLineIndex
    if (index < 0 || !this.data.lines[index]) return
    const goodsId = Number(e.currentTarget.dataset.goods)
    const candidate = this.data.searchCandidates.find(item => Number(item.goodsId) === goodsId)
    if (!candidate) return
    const candidates = this.data.lines[index].candidates.slice()
    if (!candidates.some(item => Number(item.goodsId) === goodsId)) candidates.unshift(candidate)
    this.setData({
      ['lines[' + index + '].goodsKeyword']: (this.data.searchKeyword || '').trim(),
      ['lines[' + index + '].candidates']: candidates,
      ['lines[' + index + '].selectedGoodsId']: goodsId,
      ['lines[' + index + '].selectedCandidate']: candidate,
      ['lines[' + index + '].matchStatus']: 'MATCHED',
      searchLineIndex: -1,
      searchKeyword: '',
      searchCandidates: []
    }, () => this.refreshCount())
  },

  addMissing() {
    const lines = this.data.lines.concat([{
      lineId: 'M' + Date.now(),
      rawText: '',
      goodsKeyword: '',
      quantity: '1',
      unit: '',
      spec: '',
      customerCurrentPurchasePrice: '',
      ocrConfidence: null,
      matchConfidence: null,
      matchStatus: 'NO_CANDIDATE',
      candidates: [],
      selectedCandidate: null,
      selectedGoodsId: null,
      showAll: false,
      manuallyAdded: true
    }])
    const index = lines.length - 1
    this.setData({
      lines,
      searchLineIndex: index,
      searchKeyword: '',
      searchCandidates: []
    })
  },

  closeSearch() {
    this.setData({ searchLineIndex: -1, searchKeyword: '', searchCandidates: [] })
  },

  refreshCount() {
    this.setData({
      selectedCount: this.data.lines.filter(line => !!line.selectedCandidate).length
    })
  },

  confirm() {
    const selected = this.data.lines.filter(line => !!line.selectedCandidate)
    if (!selected.length) {
      wx.showToast({ title: '请至少确认一项商品', icon: 'none' })
      return
    }
    const invalid = selected.find(line => !line.quantity || Number(line.quantity) <= 0)
    if (invalid) {
      wx.showToast({ title: '请确认每项数量', icon: 'none' })
      return
    }
    const items = selected.map(line => {
      const candidate = line.selectedCandidate
      return {
        goodsId: candidate.goodsId,
        goodsName: candidate.goodsName,
        specification: line.spec || candidate.specification || '',
        unit: line.unit || candidate.unit || '',
        origin: candidate.origin || '',
        imagePath: candidate.imagePath || '',
        greatCategoryId: candidate.greatCategoryId,
        greatCategoryName: candidate.greatCategoryName || '其他商品',
        greatCategorySort: candidate.greatCategorySort,
        subCategoryId: candidate.subCategoryId,
        subCategoryName: candidate.subCategoryName || '其他',
        subCategorySort: candidate.subCategorySort,
        quantity: String(line.quantity),
        ourQuotePrice: candidate.displayPrice || '',
        customerCurrentPurchasePrice: line.customerCurrentPurchasePrice || '',
        priceStatus: candidate.priceStatus,
        originalSearchName: line.goodsKeyword || candidate.goodsName,
        sourceType: line.manuallyAdded ? 'MANUAL' : 'OCR_PREVIEW',
        sourceRawText: line.manuallyAdded ? '' : line.rawText,
        sourceKeyword: line.goodsKeyword || candidate.goodsName,
        matchScore: candidate.matchScore,
        matchReason: candidate.matchReason,
        algorithmVersion: candidate.algorithmVersion,
        salespersonConfirmed: true
      }
    })
    wx.setStorageSync(TRANSFER_KEY, {
      previewToken: this.data.previewToken,
      items
    })
    this.confirmed = true
    wx.navigateBack()
  },

  back() {
    wx.navigateBack()
  }
})
