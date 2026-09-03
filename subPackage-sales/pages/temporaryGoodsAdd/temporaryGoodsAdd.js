import {
  createSalesTemporaryGoods,
  uploadSalesTemporaryGoodsImage
} from '../../../lib/apiSales.js'

const app = getApp()
const TRANSFER_KEY = 'salesTemporaryGoodsTransfer'

function decode(value) {
  try { return decodeURIComponent(value || '') } catch (e) { return value || '' }
}

function normalizeWeight(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const unitMap = { '升': 'L', '毫升': 'ml', '斤': 'Kg', '公斤': 'Kg', '千克': 'Kg', '克': 'g' }
  const match = text.match(/^([\d.]+)\s*([^\d\s]+)$/)
  if (!match || !unitMap[match[2]]) return text
  return match[1] + unitMap[match[2]]
}

Page({
  data: {
    statusBarHeight: 20,
    lineId: '',
    saving: false,
    canSave: false,
    photos: [],
    createdGoodsId: null,
    createdCandidate: null,
    form: {
      goodsName: '',
      unit: '',
      standardWeight: '',
      cartonUnit: '',
      itemsPerCarton: '',
      brand: '',
      origin: '',
      detail: ''
    }
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      lineId: decode(options.lineId),
      'form.goodsName': decode(options.goodsName),
      'form.unit': decode(options.unit),
      'form.standardWeight': decode(options.standardWeight)
    }, () => this.refreshCanSave())
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value
    if (field === 'standardWeight') value = normalizeWeight(value)
    this.setData({ ['form.' + field]: value }, () => this.refreshCanSave())
  },

  refreshCanSave() {
    const form = this.data.form || {}
    this.setData({
      canSave: !!String(form.goodsName || '').trim() && !!String(form.unit || '').trim()
    })
  },

  choosePhotos() {
    if (this.data.saving) return
    const remaining = 2 - this.data.photos.length
    if (remaining <= 0) return
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: result => {
        const selected = (result.tempFiles || []).map(item => ({
          path: item.tempFilePath,
          size: item.size || 0,
          uploaded: false
        }))
        this.setData({ photos: this.data.photos.concat(selected).slice(0, 2) })
      }
    })
  },

  previewPhoto(e) {
    const index = Number(e.currentTarget.dataset.index)
    const urls = this.data.photos.map(item => item.path)
    if (!urls[index]) return
    wx.previewImage({ current: urls[index], urls })
  },

  removePhoto(e) {
    if (this.data.saving) return
    const index = Number(e.currentTarget.dataset.index)
    const photo = this.data.photos[index]
    if (photo && photo.uploaded) {
      wx.showToast({ title: '这张图片已经保存', icon: 'none' })
      return
    }
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    this.setData({ photos })
  },

  save() {
    if (!this.data.canSave || this.data.saving) {
      if (!this.data.canSave) wx.showToast({ title: '请填写商品名称和销售单位', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    if (this.data.createdGoodsId && this.data.createdCandidate) {
      this.uploadPendingPhotos(this.data.createdGoodsId, this.data.createdCandidate)
      return
    }
    createSalesTemporaryGoods(this.data.form).then(response => {
      const body = response.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '商品保存失败' }
      const candidate = body.data
      this.setData({
        createdGoodsId: candidate.goodsId,
        createdCandidate: candidate
      })
      this.uploadPendingPhotos(candidate.goodsId, candidate)
    }).catch(error => {
      this.setData({ saving: false })
      wx.showToast({
        title: error.businessMessage || app.describeSalesRequestError(error, '商品保存失败'),
        icon: 'none'
      })
    })
  },

  uploadPendingPhotos(goodsId, candidate) {
    const index = this.data.photos.findIndex(photo => !photo.uploaded)
    if (index < 0) {
      this.finish(candidate)
      return
    }
    const photo = this.data.photos[index]
    uploadSalesTemporaryGoodsImage(goodsId, photo.path, index + 1).then(response => {
      const body = response.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '商品图片上传失败' }
      const nextCandidate = body.data || candidate
      this.setData({
        ['photos[' + index + '].uploaded']: true,
        createdCandidate: nextCandidate
      }, () => this.uploadPendingPhotos(goodsId, nextCandidate))
    }).catch(error => {
      this.setData({ saving: false })
      wx.showToast({
        title: error.businessMessage || app.describeSalesRequestError(error, '商品已创建，但图片上传失败，请重试'),
        icon: 'none'
      })
    })
  },

  finish(candidate) {
    wx.setStorageSync(TRANSFER_KEY, {
      lineId: this.data.lineId,
      candidate
    })
    wx.navigateBack()
  },

  back() {
    wx.navigateBack()
  }
})
