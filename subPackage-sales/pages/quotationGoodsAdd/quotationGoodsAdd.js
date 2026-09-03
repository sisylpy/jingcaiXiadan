import {
  searchSalesQuotationCandidates,
  getSalesBusinessTypesUsedByDepartments,
  discardSalesQuoteOcrPreview
} from '../../../lib/apiSales.js'
import { parseOrderFromText } from '../../../lib/orderParser.js'
import { getAsrCredentials } from '../../../lib/miniProgramCloud.js'
import apiUrl from '../../../config.js'

const app = getApp()
const BASKET_KEY = 'salesQuotationBasket'
const BASKET_BUSINESS_TYPE_KEY = 'salesQuotationBusinessType'
const TRANSFER_KEY = 'salesOcrQuoteTransfer'
const TEMPORARY_GOODS_TRANSFER_KEY = 'salesTemporaryGoodsTransfer'
const plugin = requirePlugin('QCloudAIVoice')
const speechRecognizerManager = plugin.speechRecognizerManager()
const config = require('../../../config.js')
const ENGINE_MODEL = config.tencentCloud && config.tencentCloud.engineModelType || '16k_zh'
const VOICE_FORMAT = config.tencentCloud && config.tencentCloud.voiceFormat || 1

function imageUrl(path) {
  if (!path) return '/images/logo.jpg'
  return /^https?:\/\//.test(path) ? path : apiUrl.server + path
}

function assetUrl(path) {
  if (!path) return ''
  return /^https?:\/\//.test(path) ? path : apiUrl.server + path.replace(/^\//, '')
}

function candidateView(candidate) {
  return Object.assign({}, candidate, {
    imageUrl: imageUrl(candidate.imagePath),
    priceLabel: candidate.priceStatus === 'PRICE_AVAILABLE'
      ? '¥' + candidate.displayPrice + (candidate.unit ? '/' + candidate.unit : '')
      : '价格待确认'
  })
}

function lineKey(prefix, index) {
  return prefix + '-' + Date.now() + '-' + index
}

Page({
  data: {
    statusBarHeight: 20,
    targetName: '',
    inputContent: '',
    inputFocused: false,
    isRecording: false,
    recognitionStatus: '',
    duration: 0,
    matching: false,
    showReview: false,
    lines: [],
    selectedCount: 0,
    existingCount: 0,
    previewToken: '',
    showBusinessTypes: false,
    businessTypesLoading: false,
    businessTypes: []
  },

  onLoad(options) {
    this._recordingBaseText = ''
    this._submitted = false
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      targetName: decodeURIComponent(options.targetName || '')
    })
    this.bindSpeechCallbacks()
    this.loadBusinessTypes()
    if (String(options.mode || '') === 'ocr') {
      setTimeout(() => this.openOcr(), 80)
    } else if (String(options.mode || '') === 'industry') {
      this.setData({ showBusinessTypes: true })
    }
  },

  onShow() {
    this.refreshExistingCount()
    this.consumeTemporaryGoodsTransfer()
    this.consumeOcrTransfer()
  },

  onUnload() {
    this.stopDurationTimer()
    if (this.data.isRecording) {
      try { speechRecognizerManager.stop() } catch (e) {}
    }
    if (!this._submitted && this.data.previewToken) {
      discardSalesQuoteOcrPreview(this.data.previewToken).catch(() => null)
    }
  },

  refreshExistingCount() {
    const basket = wx.getStorageSync(BASKET_KEY)
    this.setData({ existingCount: Array.isArray(basket) ? basket.length : 0 })
  },

  onInput(e) {
    this.setData({ inputContent: e.detail.value })
  },

  onInputFocus() {
    this.setData({ inputFocused: true })
  },

  onInputBlur() {
    this.setData({ inputFocused: false })
  },

  finishInput() {
    this.setData({ inputFocused: false })
  },

  useExample() {
    this.setData({ inputContent: '口蘑 5斤\n香菇 3斤\n青椒 10斤\n金针菇 2袋' })
  },

  clearInput() {
    this.setData({ inputContent: '', recognitionStatus: '' })
  },

  pasteFromClipboard() {
    if (this.data.isRecording) return
    wx.getClipboardData({
      success: result => {
        const text = String(result.data || '').trim()
        if (!text) {
          wx.showToast({ title: '剪贴板没有可用内容', icon: 'none' })
          return
        }
        this.setData({ inputContent: text }, () => this.parseAndMatch())
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    })
  },

  parseAndMatch() {
    const text = String(this.data.inputContent || '').trim()
    if (!text || this.data.matching || this.data.isRecording) {
      if (!text) wx.showToast({ title: '请先输入或粘贴商品清单', icon: 'none' })
      return
    }
    const parsed = parseOrderFromText(text) || {}
    const orders = (parsed.orders || []).filter(item => String(item.nxDoGoodsName || '').trim())
    if (!orders.length) {
      wx.showToast({ title: '没有识别到商品，请每行输入一个商品', icon: 'none' })
      return
    }
    if (this.data.previewToken) {
      discardSalesQuoteOcrPreview(this.data.previewToken).catch(() => null)
    }
    this.setData({ matching: true, recognitionStatus: '正在匹配配送商商品和价格…' })
    Promise.all(orders.map((order, index) => this.matchParsedOrder(order, index)))
      .then(lines => {
        this.setData({
          lines,
          showReview: true,
          previewToken: '',
          recognitionStatus: '',
          matching: false
        }, () => this.refreshSelectedCount())
      })
      .catch(error => {
        this.setData({ matching: false, recognitionStatus: '' })
        wx.showToast({
          title: app.describeSalesRequestError(error, '商品匹配失败'),
          icon: 'none'
        })
      })
  },

  matchParsedOrder(order, index) {
    const keyword = String(order.nxDoGoodsName || '').trim()
    return searchSalesQuotationCandidates(keyword, 10).then(response => {
      const body = response.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '商品匹配失败' }
      const candidates = (body.data || []).map(candidateView)
      const selected = candidates[0] || null
      return this.buildReviewLine({
        lineId: lineKey('TEXT', index),
        rawText: keyword + (order.nxDoQuantity || '') + (order.nxDoStandard || ''),
        goodsKeyword: keyword,
        quantity: order.nxDoQuantity || '1',
        unit: order.nxDoStandard || selected && selected.unit || '',
        specification: selected && selected.specification || '',
        customerCurrentPurchasePrice: '',
        sourceType: 'MANUAL',
        candidates,
        selected
      })
    })
  },

  buildReviewLine(source) {
    const selected = source.selected || null
    return {
      lineId: source.lineId,
      rawText: source.rawText || '',
      goodsKeyword: source.goodsKeyword || selected && selected.goodsName || '',
      quantity: String(source.quantity || '1'),
      unit: source.unit || selected && selected.unit || '',
      specification: source.specification || selected && selected.specification || '',
      customerCurrentPurchasePrice: source.customerCurrentPurchasePrice || '',
      sourceType: source.sourceType || 'MANUAL',
      candidates: source.candidates || [],
      selectedGoodsId: selected && selected.goodsId || null,
      selectedCandidate: selected,
      ourQuotePrice: selected && selected.displayPrice != null
        ? String(selected.displayPrice) : '',
      editingMatch: false,
      showCandidates: false,
      searching: false
    }
  },

  consumeOcrTransfer() {
    const transfer = wx.getStorageSync(TRANSFER_KEY)
    if (!transfer || !Array.isArray(transfer.items) || !transfer.items.length) return
    wx.removeStorageSync(TRANSFER_KEY)
    const ocrLines = transfer.items.map((item, index) => {
      const candidate = candidateView({
        goodsId: item.goodsId,
        goodsName: item.goodsName,
        specification: item.specification,
        unit: item.unit,
        origin: item.origin,
        imagePath: item.imagePath,
        greatCategoryId: item.greatCategoryId,
        greatCategoryName: item.greatCategoryName,
        greatCategorySort: item.greatCategorySort,
        subCategoryId: item.subCategoryId,
        subCategoryName: item.subCategoryName,
        subCategorySort: item.subCategorySort,
        displayPrice: item.ourQuotePrice,
        priceStatus: item.priceStatus,
        matchScore: item.matchScore,
        matchReason: item.matchReason,
        algorithmVersion: item.algorithmVersion
      })
      const line = this.buildReviewLine({
        lineId: lineKey('OCR', index),
        rawText: item.sourceRawText,
        goodsKeyword: item.sourceKeyword || item.originalSearchName,
        quantity: item.quantity,
        unit: item.unit,
        specification: item.specification,
        customerCurrentPurchasePrice: item.customerCurrentPurchasePrice,
        sourceType: item.sourceType || 'OCR_PREVIEW',
        candidates: [candidate],
        selected: candidate
      })
      line.ourQuotePrice = item.ourQuotePrice == null ? '' : String(item.ourQuotePrice)
      return line
    })
    const lines = (this.data.lines || []).concat(ocrLines)
    this.setData({
      lines,
      showReview: true,
      previewToken: transfer.previewToken || this.data.previewToken
    }, () => this.refreshSelectedCount())
  },

  consumeTemporaryGoodsTransfer() {
    const transfer = wx.getStorageSync(TEMPORARY_GOODS_TRANSFER_KEY)
    if (!transfer || !transfer.lineId || !transfer.candidate) return
    wx.removeStorageSync(TEMPORARY_GOODS_TRANSFER_KEY)
    const lineIndex = (this.data.lines || []).findIndex(line => line.lineId === transfer.lineId)
    if (lineIndex < 0) return
    const line = this.data.lines[lineIndex]
    const candidate = candidateView(transfer.candidate)
    this.setData({
      ['lines[' + lineIndex + '].goodsKeyword']: candidate.goodsName || line.goodsKeyword,
      ['lines[' + lineIndex + '].candidates']: [candidate],
      ['lines[' + lineIndex + '].selectedGoodsId']: candidate.goodsId,
      ['lines[' + lineIndex + '].selectedCandidate']: candidate,
      ['lines[' + lineIndex + '].unit']: candidate.unit || line.unit || '',
      ['lines[' + lineIndex + '].specification']: candidate.specification || line.specification || '',
      ['lines[' + lineIndex + '].ourQuotePrice']: candidate.displayPrice == null
        ? '' : String(candidate.displayPrice),
      ['lines[' + lineIndex + '].editingMatch']: false,
      ['lines[' + lineIndex + '].showCandidates']: false,
      showReview: true
    }, () => {
      this.refreshSelectedCount()
      wx.showToast({ title: '新商品已添加', icon: 'success' })
    })
  },

  toggleCandidates(e) {
    const index = Number(e.currentTarget.dataset.index)
    const line = this.data.lines[index]
    if (!line) return
    const editingMatch = !line.editingMatch
    this.setData({
      ['lines[' + index + '].editingMatch']: editingMatch,
      ['lines[' + index + '].goodsKeyword']: editingMatch
        ? String(line.selectedCandidate && line.selectedCandidate.goodsName || line.goodsKeyword || '')
        : String(line.selectedCandidate && line.selectedCandidate.goodsName || line.goodsKeyword || ''),
      ['lines[' + index + '].showCandidates']: editingMatch && (line.candidates || []).length > 0
    })
  },

  chooseCandidate(e) {
    const lineIndex = Number(e.currentTarget.dataset.line)
    const goodsId = Number(e.currentTarget.dataset.goods)
    const line = this.data.lines[lineIndex]
    if (!line) return
    const selected = (line.candidates || []).find(item => Number(item.goodsId) === goodsId)
    if (!selected) return
    this.setData({
      ['lines[' + lineIndex + '].selectedGoodsId']: selected.goodsId,
      ['lines[' + lineIndex + '].selectedCandidate']: selected,
      ['lines[' + lineIndex + '].goodsKeyword']: selected.goodsName || line.goodsKeyword,
      ['lines[' + lineIndex + '].unit']: line.unit || selected.unit || '',
      ['lines[' + lineIndex + '].specification']: line.specification || selected.specification || '',
      ['lines[' + lineIndex + '].ourQuotePrice']: selected.displayPrice == null ? '' : String(selected.displayPrice),
      ['lines[' + lineIndex + '].editingMatch']: false,
      ['lines[' + lineIndex + '].showCandidates']: false
    }, () => this.refreshSelectedCount())
  },

  onLineInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    const updates = { ['lines[' + index + '].' + field]: e.detail.value }
    if (field === 'goodsKeyword') updates['lines[' + index + '].showCandidates'] = false
    this.setData(updates)
  },

  searchLine(e) {
    const index = Number(e.currentTarget.dataset.index)
    const line = this.data.lines[index]
    if (!line || line.searching) return
    const keyword = String(line.goodsKeyword || '').trim()
    if (!keyword) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    this.setData({ ['lines[' + index + '].searching']: true })
    searchSalesQuotationCandidates(keyword, 10).then(response => {
      const body = response.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '搜索失败' }
      const candidates = (body.data || []).map(candidateView)
      const selected = candidates[0] || null
      const updates = {
        ['lines[' + index + '].candidates']: candidates,
        ['lines[' + index + '].showCandidates']: candidates.length > 0,
        ['lines[' + index + '].searching']: false
      }
      if (!line.editingMatch) {
        updates['lines[' + index + '].selectedGoodsId'] = selected && selected.goodsId || null
        updates['lines[' + index + '].selectedCandidate'] = selected
        updates['lines[' + index + '].unit'] = line.unit || selected && selected.unit || ''
        updates['lines[' + index + '].specification'] = line.specification || selected && selected.specification || ''
        updates['lines[' + index + '].ourQuotePrice'] = selected && selected.displayPrice != null
          ? String(selected.displayPrice) : ''
        updates['lines[' + index + '].showCandidates'] = candidates.length > 1
      }
      this.setData(updates, () => {
        this.refreshSelectedCount()
        if (!candidates.length) wx.showToast({ title: '没有找到匹配商品', icon: 'none' })
      })
    }).catch(error => {
      this.setData({ ['lines[' + index + '].searching']: false })
      wx.showToast({
        title: error.businessMessage || app.describeSalesRequestError(error, '搜索失败'),
        icon: 'none'
      })
    })
  },

  openTemporaryGoodsAdd(e) {
    const index = Number(e.currentTarget.dataset.index)
    const line = this.data.lines[index]
    if (!line) return
    const query = [
      'lineId=' + encodeURIComponent(line.lineId),
      'goodsName=' + encodeURIComponent(String(line.goodsKeyword || '')),
      'unit=' + encodeURIComponent(String(line.unit || '')),
      'standardWeight=' + encodeURIComponent(String(line.specification || ''))
    ].join('&')
    wx.navigateTo({
      url: '/subPackage-sales/pages/temporaryGoodsAdd/temporaryGoodsAdd?' + query
    })
  },

  deleteLine(e) {
    const lines = this.data.lines.slice()
    lines.splice(Number(e.currentTarget.dataset.index), 1)
    this.setData({ lines, showReview: lines.length > 0 }, () => this.refreshSelectedCount())
  },

  addBlankLine() {
    const lines = this.data.lines.concat([this.buildReviewLine({
      lineId: lineKey('ADD', this.data.lines.length),
      goodsKeyword: '',
      quantity: '1',
      unit: '',
      sourceType: 'MANUAL',
      candidates: [],
      selected: null
    })])
    this.setData({ lines, showReview: true })
  },

  editSource() {
    this.setData({ showReview: false })
  },

  refreshSelectedCount() {
    this.setData({
      selectedCount: (this.data.lines || []).filter(line => !!line.selectedCandidate).length
    })
  },

  confirmAdd() {
    const lines = this.data.lines || []
    if (!lines.length) {
      wx.showToast({ title: '还没有商品', icon: 'none' })
      return
    }
    const unmatchedIndex = lines.findIndex(line => !line.selectedCandidate)
    if (unmatchedIndex >= 0) {
      wx.showToast({ title: '第' + (unmatchedIndex + 1) + '项还没有匹配商品', icon: 'none' })
      return
    }
    const invalidIndex = lines.findIndex(line => !(Number(line.quantity) > 0))
    if (invalidIndex >= 0) {
      wx.showToast({ title: '第' + (invalidIndex + 1) + '项数量不正确', icon: 'none' })
      return
    }
    const items = lines.map(line => {
      const candidate = line.selectedCandidate
      return {
        goodsId: candidate.goodsId,
        goodsName: candidate.goodsName,
        specification: line.specification || candidate.specification || '',
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
        ourQuotePrice: line.ourQuotePrice,
        customerCurrentPurchasePrice: line.customerCurrentPurchasePrice || '',
        priceStatus: line.ourQuotePrice === '' ? 'PRICE_PENDING' : 'PRICE_AVAILABLE',
        originalSearchName: line.goodsKeyword || candidate.goodsName,
        sourceType: line.sourceType || 'MANUAL',
        sourceRawText: line.rawText || '',
        sourceKeyword: line.goodsKeyword || candidate.goodsName,
        matchScore: candidate.matchScore,
        matchReason: candidate.matchReason,
        algorithmVersion: candidate.algorithmVersion,
        salespersonConfirmed: true
      }
    })
    wx.setStorageSync(TRANSFER_KEY, { items, previewToken: this.data.previewToken || '' })
    this._submitted = true
    wx.navigateBack()
  },

  bindSpeechCallbacks() {
    speechRecognizerManager.OnRecognitionStart = () => {
      this.setData({ recognitionStatus: '正在听，请说商品清单…' })
    }
    speechRecognizerManager.OnRecognitionResultChange = result => {
      const spoken = result && result.result && result.result.voice_text_str
      if (!spoken) return
      this.setData({
        inputContent: [this._recordingBaseText, String(spoken).trim()].filter(Boolean).join('\n'),
        recognitionStatus: '正在识别…'
      })
    }
    speechRecognizerManager.OnRecognitionComplete = () => {
      this.finishRecording('语音识别完成')
      if (String(this.data.inputContent || '').trim()) this.parseAndMatch()
    }
    speechRecognizerManager.OnRecorderStop = () => {
      this.finishRecording(this.data.inputContent ? '语音识别完成' : '录音已停止')
    }
    speechRecognizerManager.OnError = result => {
      if (result && result.code === 4008) return
      this.finishRecording('语音识别失败')
      wx.showToast({ title: '语音识别失败', icon: 'none' })
    }
  },

  ensureRecordPermission() {
    return new Promise(resolve => {
      wx.getSetting({
        success: setting => {
          if (setting.authSetting && setting.authSetting['scope.record']) {
            resolve(true)
            return
          }
          wx.authorize({
            scope: 'scope.record',
            success: () => resolve(true),
            fail: () => {
              wx.showModal({
                title: '需要麦克风权限',
                content: '开启麦克风权限后才能使用语音说单。',
                confirmText: '去设置',
                success: result => {
                  if (!result.confirm) {
                    resolve(false)
                    return
                  }
                  wx.openSetting({
                    success: opened => resolve(!!(opened.authSetting
                      && opened.authSetting['scope.record'])),
                    fail: () => resolve(false)
                  })
                }
              })
            }
          })
        },
        fail: () => resolve(true)
      })
    })
  },

  async startRecord() {
    if (this.data.isRecording || this.data.matching) return
    const allowed = await this.ensureRecordPermission()
    if (!allowed) return
    let credentials
    try {
      credentials = await getAsrCredentials()
    } catch (error) {
      wx.showToast({ title: error.message || '语音服务初始化失败', icon: 'none' })
      return
    }
    this._recordingBaseText = String(this.data.inputContent || '').trim()
    this.setData({ isRecording: true, duration: 0, recognitionStatus: '正在连接语音服务…' })
    this._durationTimer = setInterval(() => {
      this.setData({ duration: this.data.duration + 1 })
    }, 1000)
    speechRecognizerManager.start({
      secretkey: credentials.secretKey,
      secretid: credentials.secretId,
      token: credentials.token,
      appid: credentials.appId,
      engine_model_type: ENGINE_MODEL,
      voice_format: VOICE_FORMAT
    })
  },

  stopRecord() {
    if (!this.data.isRecording) return
    try { speechRecognizerManager.stop() } catch (e) {}
    this.finishRecording('正在整理语音内容…')
  },

  finishRecording(status) {
    this.stopDurationTimer()
    this.setData({ isRecording: false, recognitionStatus: status })
  },

  stopDurationTimer() {
    if (this._durationTimer) clearInterval(this._durationTimer)
    this._durationTimer = null
  },

  openOcr() {
    if (this.data.isRecording || this.data.matching) return
    wx.navigateTo({ url: '/pages/sales/ocrQuotePreview/ocrQuotePreview' })
  },

  loadBusinessTypes() {
    this.setData({ businessTypesLoading: true })
    getSalesBusinessTypesUsedByDepartments().then(response => {
      const body = response.result || {}
      if (body.code !== 0) return
      this.setData({
        businessTypes: (body.data || []).map(item => Object.assign({}, item, {
          iconUrl: assetUrl(item.iconRef)
        }))
      })
    }).catch(() => null).finally(() => this.setData({ businessTypesLoading: false }))
  },

  toggleBusinessTypes() {
    this.setData({ showBusinessTypes: !this.data.showBusinessTypes })
  },

  chooseBusinessType(e) {
    const id = Number(e.currentTarget.dataset.id)
    const selected = this.data.businessTypes.find(item => Number(item.businessTypeId) === id)
    if (!selected) return
    wx.setStorageSync(BASKET_BUSINESS_TYPE_KEY, {
      businessTypeId: selected.businessTypeId,
      typeName: selected.typeName,
      bannerImageRef: selected.bannerImageRef,
      themeColor: selected.themeColor
    })
    this.setData({ showBusinessTypes: false })
    wx.navigateTo({
      url: '/subPackage-sales/pages/recommendations/recommendations?businessTypeId='
        + selected.businessTypeId + '&businessTypeName='
        + encodeURIComponent(selected.typeName || '') + '&returnToWorkspace=1'
    })
  },

  back() {
    wx.navigateBack()
  }
})
