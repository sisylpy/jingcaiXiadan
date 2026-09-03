import {
  getSalesAfterSalesDictionaries,
  createSalesAfterSales,
  uploadSalesAfterSalesImage
} from '../../../../lib/apiSales.js'

const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    draft: null,
    orders: [],
    severityOptions: [],
    issueTypeOptions: [],
    severity: 'MEDIUM',
    issueType: 'QUALITY',
    issueScopeMode: 'ITEM',
    issueScope: 'ITEM',
    description: '',
    photos: [],
    photoTargetOptions: [{ label: '整张售后', departmentDisGoodsId: null }],
    photoTargetIndex: 0,
    saving: false,
    loading: true
  },

  onLoad() {
    const draft = wx.getStorageSync('salesAfterSalesCreateDraft')
    if (!draft || !draft.billId || !Array.isArray(draft.orders) || !draft.orders.length) {
      wx.showToast({ title: '缺少原账单商品信息', icon: 'none' })
      setTimeout(() => wx.navigateBack({ delta: 1 }), 1000)
      return
    }
    const targets = this.buildPhotoTargets(draft.orders)
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 0,
      draft,
      orders: draft.orders,
      photoTargetOptions: targets,
      photoTargetIndex: targets.length === 2 ? 1 : 0
    })
    getSalesAfterSalesDictionaries().then(res => {
      const result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '字典加载失败')
      const data = result.data || {}
      const issueTypes = data.issueTypes || []
      const current = issueTypes.filter(item => item.code === this.data.issueType)[0] || {}
      const scopeMode = current.scopeMode || 'ITEM'
      this.setData({
        loading: false,
        severityOptions: data.severities || [],
        issueTypeOptions: issueTypes,
        issueScopeMode: scopeMode,
        issueScope: scopeMode === 'ORDER' || scopeMode === 'FLEXIBLE' ? 'ORDER' : 'ITEM'
      })
    }).catch(error => {
      this.setData({ loading: false })
      wx.showToast({ title: error.message || '售后选项加载失败', icon: 'none' })
    })
  },

  buildPhotoTargets(orders) {
    const targets = [{ label: '整张售后', departmentDisGoodsId: null }]
    ;(orders || []).filter(item => item.selected).forEach(item => {
      targets.push({
        label: item.goodsName || '问题商品',
        departmentDisGoodsId: item.departmentDisGoodsId
      })
    })
    return targets
  },

  toggleOrder(e) {
    const index = Number(e.currentTarget.dataset.index)
    const key = 'orders[' + index + '].selected'
    this.setData({ [key]: !this.data.orders[index].selected }, () => {
      const targets = this.buildPhotoTargets(this.data.orders)
      this.setData({
        photoTargetOptions: targets,
        photoTargetIndex: targets.length === 2 ? 1 : 0
      })
    })
  },

  selectIssueType(e) {
    const code = e.currentTarget.dataset.code
    const option = this.data.issueTypeOptions.filter(item => item.code === code)[0] || {}
    const scopeMode = option.scopeMode || 'ITEM'
    this.setData({
      issueType: code,
      issueScopeMode: scopeMode,
      issueScope: scopeMode === 'ORDER' || scopeMode === 'FLEXIBLE' ? 'ORDER' : 'ITEM'
    })
  },

  selectIssueScope(e) {
    this.setData({ issueScope: e.currentTarget.dataset.scope })
  },

  selectSeverity(e) {
    this.setData({ severity: e.currentTarget.dataset.code })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onPhotoTargetChange(e) {
    this.setData({ photoTargetIndex: Number(e.detail.value) })
  },

  choosePhotos() {
    const remaining = 20 - this.data.photos.length
    if (remaining <= 0) return
    wx.chooseMedia({
      count: Math.min(9, remaining),
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const target = this.data.photoTargetOptions[this.data.photoTargetIndex] ||
          this.data.photoTargetOptions[0]
        let tooLarge = 0
        let unsupported = 0
        const additions = (res.tempFiles || []).filter(file => {
          const path = String(file.tempFilePath || '').toLowerCase()
          const extension = (path.match(/\.([a-z0-9]+)(?:\?|$)/) || [])[1]
          if (file.size && file.size > 10 * 1024 * 1024) {
            tooLarge += 1
            return false
          }
          if (extension && ['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) {
            unsupported += 1
            return false
          }
          return true
        }).map(file => ({
          path: file.tempFilePath,
          status: 'waiting',
          statusText: '待上传',
          targetLabel: target.label,
          departmentDisGoodsId: target.departmentDisGoodsId
        }))
        if (tooLarge || unsupported) {
          const messages = []
          if (tooLarge) messages.push(tooLarge + '张超过10MB')
          if (unsupported) messages.push(unsupported + '张格式不支持')
          wx.showToast({ title: messages.join('，'), icon: 'none' })
        }
        this.setData({ photos: this.data.photos.concat(additions) })
      }
    })
  },

  previewPhoto(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: this.data.photos.map(item => item.path)
    })
  },

  removePhoto(e) {
    const photos = this.data.photos.slice()
    photos.splice(Number(e.currentTarget.dataset.index), 1)
    this.setData({ photos })
  },

  save() {
    if (this.data.saving) return
    const selected = this.data.orders.filter(item => item.selected)
    if (this.data.issueScope === 'ITEM' && !selected.length) {
      wx.showToast({ title: '请选择问题商品', icon: 'none' })
      return
    }
    const description = this.data.description.trim()
    if (!description) {
      wx.showToast({ title: '请填写问题说明', icon: 'none' })
      return
    }
    const anchor = this.data.orders.filter(item => {
      return Number(item.historyOrderId) === Number(this.data.draft.anchorHistoryOrderId)
    })[0] || selected[0] || this.data.orders[0]
    if (!anchor || !anchor.historyOrderId) {
      wx.showToast({ title: '缺少原订单信息', icon: 'none' })
      return
    }
    const request = {
      originalHistoryOrderId: anchor.historyOrderId,
      severity: this.data.severity,
      issueType: this.data.issueType,
      issueScope: this.data.issueScope,
      issueDescription: description,
      items: this.data.issueScope === 'ITEM' ? selected.map(item => ({
        originalHistoryOrderId: item.historyOrderId,
        departmentDisGoodsId: item.departmentDisGoodsId,
        issueQuantity: String(item.quantity || '') + String(item.standard || ''),
        issueTag: this.data.issueType,
        issueDescription: description
      })) : []
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '创建售后' })
    createSalesAfterSales(this.data.draft.billId, request).then(res => {
      const result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '创建售后失败')
      const detail = result.data || {}
      const afterSalesId = detail.nxDasId
      if (!afterSalesId) throw new Error('后台未返回售后单ID')
      if (!this.data.photos.length) return { afterSalesId, failed: 0 }
      return this.uploadPhotos(afterSalesId, detail.items || []).then(failed => ({
        afterSalesId,
        failed
      }))
    }).then(result => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.removeStorageSync('salesAfterSalesCreateDraft')
      wx.showToast({
        title: result.failed ? result.failed + '张照片上传失败' : '售后已创建',
        icon: result.failed ? 'none' : 'success'
      })
      setTimeout(() => wx.navigateBack({ delta: 1 }), result.failed ? 1500 : 700)
    }).catch(error => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({
        title: app.describeSalesRequestError(error, error.message || '创建售后失败'),
        icon: 'none'
      })
    })
  },

  uploadPhotos(afterSalesId, afterSalesItems) {
    const itemIdByGoods = {}
    ;(afterSalesItems || []).forEach(item => {
      itemIdByGoods[String(item.nxDasiDepartmentDisGoodsId)] = item.nxDasiId
    })
    const jobs = this.data.photos.map((photo, index) => {
      const statusKey = 'photos[' + index + '].status'
      const textKey = 'photos[' + index + '].statusText'
      this.setData({ [statusKey]: 'uploading', [textKey]: '上传中' })
      return uploadSalesAfterSalesImage({
        afterSalesId,
        afterSalesItemId: photo.departmentDisGoodsId ?
          itemIdByGoods[String(photo.departmentDisGoodsId)] : null,
        stage: 'EVIDENCE',
        description: this.data.description.trim(),
        filePath: photo.path
      }).then(res => {
        if (!res.result || res.result.code !== 0) {
          throw new Error((res.result && res.result.msg) || '上传失败')
        }
        this.setData({ [statusKey]: 'success', [textKey]: '已上传' })
        return false
      }).catch(() => {
        this.setData({ [statusKey]: 'failed', [textKey]: '上传失败' })
        return true
      })
    })
    return Promise.all(jobs).then(results => results.filter(Boolean).length)
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
