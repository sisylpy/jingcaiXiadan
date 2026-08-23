import apiUrl from '../../../config.js'
import {
  getSalesCurrentStandard,
  getSalesStandardHistory,
  saveSalesStandard,
  uploadSalesStandardImage
} from '../../../lib/apiSales.js'

const app = getApp()
const DIMENSIONS = [
  { code: 'SIZE', name: '大小' },
  { code: 'COLOR', name: '颜色' },
  { code: 'FRESHNESS', name: '新鲜度' },
  { code: 'ROOT', name: '根部' },
  { code: 'PACKAGING', name: '包装' },
  { code: 'SUBSTITUTE', name: '替代规则' },
  { code: 'OTHER', name: '其他' }
]
const IMAGE_ROLES = [
  { code: 'REFERENCE', name: '参考图片' },
  { code: 'PASS', name: '合格示例' },
  { code: 'PROHIBITED', name: '禁止示例' }
]

Page({
  data: {
    dimensions: DIMENSIONS,
    dimensionIndex: 0,
    importanceLevels: [1, 2, 3, 4, 5],
    importanceIndex: 2,
    requirementText: '',
    changeReason: '客户拜访记录',
    current: { items: [], images: [] },
    history: [],
    showHistory: false,
    imageRoles: IMAGE_ROLES,
    imageRoleIndex: 0,
    imageDimensionIndex: 0,
    imageDescription: '',
    saving: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      relationId: Number(options.relationId),
      goodsName: decodeURIComponent(options.goodsName || ''),
      customerName: decodeURIComponent(options.customerName || ''),
      imageServer: apiUrl.server
    })
    this.loadCurrent()
  },

  loadCurrent() {
    getSalesCurrentStandard(this.data.relationId).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '客户要求加载失败', icon: 'none' })
        return
      }
      const current = res.result.data || { items: [], images: [] }
      current.images = (current.images || []).map(image => Object.assign({}, image, {
        previewUrl: this.absoluteUrl(image.nxDdgimgImageUrl)
      }))
      this.setData({ current })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '客户要求加载失败'), icon: 'none'
    }))
  },

  absoluteUrl(path) {
    if (!path || /^(https?:|wxfile:)/i.test(path)) return path || ''
    return apiUrl.server + String(path).replace(/^\//, '')
  },

  onDimensionChange(e) { this.setData({ dimensionIndex: Number(e.detail.value) }) },
  onImportanceChange(e) { this.setData({ importanceIndex: Number(e.detail.value) }) },
  onTextInput(e) { this.setData({ requirementText: e.detail.value }) },
  onReasonInput(e) { this.setData({ changeReason: e.detail.value }) },
  onImageDimensionChange(e) { this.setData({ imageDimensionIndex: Number(e.detail.value) }) },
  onImageRoleChange(e) { this.setData({ imageRoleIndex: Number(e.detail.value) }) },
  onImageDescriptionInput(e) { this.setData({ imageDescription: e.detail.value }) },

  addRequirement() {
    const text = this.data.requirementText.trim()
    if (!text) {
      wx.showToast({ title: '请填写客户要求', icon: 'none' })
      return
    }
    const dimension = this.data.dimensions[this.data.dimensionIndex]
    this.save({
      confirmed: true,
      changeReason: this.data.changeReason.trim() || '客户拜访记录',
      items: [{
        clientKey: 'sales-' + Date.now(),
        dimensionCode: dimension.code,
        dimensionName: dimension.name,
        requirementText: text,
        importanceLevel: this.data.importanceLevels[this.data.importanceIndex],
        sort: Date.now() % 1000000
      }],
      images: [], inactiveItemIds: [], inactiveImageIds: []
    }, () => this.setData({ requirementText: '', importanceIndex: 2 }))
  },

  deactivateItem(e) {
    const itemId = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '失效这条要求',
      content: '历史记录仍会保留，当前订货时不再显示。',
      success: result => {
        if (result.confirm) this.save({
          confirmed: true,
          changeReason: '客户要求已变更',
          items: [], images: [], inactiveItemIds: [itemId], inactiveImageIds: []
        })
      }
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: result => {
        const filePath = result.tempFiles && result.tempFiles[0] && result.tempFiles[0].tempFilePath
        if (filePath) this.uploadAndSaveImage(filePath)
      }
    })
  },

  uploadAndSaveImage(filePath) {
    this.setData({ saving: true })
    wx.showLoading({ title: '上传图片', mask: true })
    uploadSalesStandardImage(this.data.relationId, filePath).then(res => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '图片上传失败')
      }
      const uploaded = Array.isArray(res.result.data) ? res.result.data[0] : res.result.data
      if (!uploaded || !uploaded.imageUrl) throw new Error('后台没有返回图片地址')
      const dimension = this.data.dimensions[this.data.imageDimensionIndex]
      const role = this.data.imageRoles[this.data.imageRoleIndex]
      return saveSalesStandard(this.data.relationId, {
        confirmed: true,
        changeReason: this.data.changeReason.trim() || '客户拜访图片记录',
        items: [],
        images: [{
          imageUrl: uploaded.imageUrl,
          dimensionCode: dimension.code,
          imageRole: role.code,
          description: this.data.imageDescription.trim(),
          importanceLevel: 3,
          sort: Date.now() % 1000000
        }],
        inactiveItemIds: [], inactiveImageIds: []
      })
    }).then(res => {
      if (!res || res.result.code !== 0) throw new Error((res && res.result.msg) || '图片要求保存失败')
      this.setData({ imageDescription: '' })
      this.loadCurrent()
      wx.showToast({ title: '图片要求已保存', icon: 'success' })
    }).catch(error => wx.showToast({ title: error.message || '图片要求保存失败', icon: 'none' }))
      .finally(() => { wx.hideLoading(); this.setData({ saving: false }) })
  },

  deactivateImage(e) {
    const imageId = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '失效这张图片',
      content: '图片仍保留在历史记录中。',
      success: result => {
        if (result.confirm) this.save({
          confirmed: true,
          changeReason: '客户图片要求已变更',
          items: [], images: [], inactiveItemIds: [], inactiveImageIds: [imageId]
        })
      }
    })
  },

  save(payload, done) {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '正在保存', mask: true })
    saveSalesStandard(this.data.relationId, payload).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' })
        return
      }
      if (done) done()
      this.loadCurrent()
      wx.showToast({ title: '客户要求已保存', icon: 'success' })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '保存失败'), icon: 'none'
    })).finally(() => { wx.hideLoading(); this.setData({ saving: false }) })
  },

  toggleHistory() {
    const show = !this.data.showHistory
    this.setData({ showHistory: show })
    if (show && this.data.history.length === 0) {
      getSalesStandardHistory(this.data.relationId).then(res => {
        if (res.result.code === 0) this.setData({ history: res.result.data || [] })
      })
    }
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = (this.data.current.images || []).map(item => item.previewUrl)
    wx.previewImage({ current, urls })
  },

  back() { wx.navigateBack() }
})
