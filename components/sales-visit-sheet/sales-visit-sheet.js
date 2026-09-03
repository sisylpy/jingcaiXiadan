import {
  createSalesVisit,
  uploadSalesVisitStorefrontPhoto,
  updateSalesLead,
  uploadSalesLeadPhoto,
  deleteSalesVisitPhoto
} from '../../lib/apiSales.js'

const app = getApp()

function dateAfter(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
      observer(value) {
        if (value) this.resetForm()
      }
    },
    businessTypes: {
      type: Array,
      value: []
    },
    mode: {
      type: String,
      value: 'new'
    },
    standalone: {
      type: Boolean,
      value: false
    },
    inline: {
      type: Boolean,
      value: false
    },
    statusBarHeight: {
      type: Number,
      value: 0
    },
    standaloneTitle: {
      type: String,
      value: '开发新客户'
    },
    returnSummary: {
      type: Object,
      value: null
    },
    target: {
      type: Object,
      value: null
    },
    existingPhotos: {
      type: Array,
      value: []
    },
    existingPhotoCount: {
      type: Number,
      value: 0
    }
  },

  data: {
    submitting: false,
    resultOptions: [
      { code: 'NO_CONTACT', name: '未接触老板' },
      { code: 'NO_INTEREST', name: '无兴趣' },
      { code: 'INTERESTED', name: '有兴趣' },
      { code: 'TRIAL_WILLING', name: '愿意试单' },
      { code: 'DEAL', name: '已成交' }
    ],
    feedbackOptions: [
      { code: 'SATISFIED', name: '满意' },
      { code: 'PRICE', name: '价格问题' },
      { code: 'GOODS_MISSING', name: '商品不全' },
      { code: 'QUALITY', name: '质量问题' },
      { code: 'DELIVERY', name: '配送问题' },
      { code: 'SERVICE', name: '服务问题' },
      { code: 'OTHER', name: '其他' }
    ],
    intentOptions: [
      { code: 'COLD', name: '冷' },
      { code: 'WARM', name: '温' },
      { code: 'HOT', name: '热' }
    ],
    shopName: '',
    address: '',
    latitude: '',
    longitude: '',
    visitPhotoLocalPaths: [],
    savedPhotos: [],
    savedPhotoCount: 0,
    removedPhotoIds: [],
    businessTypeIndex: -1,
    resultCode: '',
    feedbackCode: '',
    intentCode: 'WARM',
    followUpRequired: false,
    announcementRequested: false,
    nextFollowDate: '',
    contactExpanded: false,
    contactName: '',
    contactPhone: '',
    note: ''
  },

  methods: {
    resetForm() {
      const target = this.properties.target || {}
      const types = this.properties.businessTypes || []
      const typeId = target.businessTypeId
      const isReturn = this.properties.mode === 'return' || !!target.departmentId
      const businessTypeIndex = types.findIndex(item =>
        String(item.businessTypeId) === String(typeId))
      this.setData({
        submitting: false,
        shopName: target.shopName || target.nxDepartmentName || '',
        address: target.address || target.nxDepartmentAddress || '',
        latitude: target.latitude || target.nxDepartmentLat || '',
        longitude: target.longitude || target.nxDepartmentLng || '',
        visitPhotoLocalPaths: [],
        savedPhotos: this.properties.existingPhotos || [],
        savedPhotoCount: (this.properties.existingPhotos || []).length,
        removedPhotoIds: [],
        businessTypeIndex,
        resultCode: isReturn ? 'CUSTOMER_REVISIT' : '',
        feedbackCode: '',
        intentCode: target.intentCode || 'WARM',
        followUpRequired: false,
        announcementRequested: false,
        nextFollowDate: dateAfter(3),
        contactExpanded: !!(target.contactName || target.contactPhone),
        contactName: target.contactName || '',
        contactPhone: target.contactPhone || '',
        note: ''
      })
    },

    onInput(e) {
      this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
    },

    onBusinessTypeChange(e) {
      this.setData({ businessTypeIndex: Number(e.detail.value) })
    },

    selectResult(e) {
      this.setData({ resultCode: e.currentTarget.dataset.code })
    },

    selectFeedback(e) {
      this.setData({ feedbackCode: e.currentTarget.dataset.code })
    },

    selectIntent(e) {
      this.setData({ intentCode: e.currentTarget.dataset.code })
    },

    onFollowChange(e) {
      this.setData({ followUpRequired: !!e.detail.value })
    },

    onAnnouncementChange(e) {
      this.setData({ announcementRequested: !!e.detail.value })
    },

    onDateChange(e) {
      this.setData({ nextFollowDate: e.detail.value })
    },

    chooseVisitLocation() {
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => this.openVisitLocationChooser(),
        fail: () => this.showVisitLocationPermissionGuide()
      })
    },

    openVisitLocationChooser() {
      wx.chooseLocation({
        success: res => {
          this.setData({
            latitude: String(res.latitude),
            longitude: String(res.longitude),
            address: (res.address || res.name || '').trim()
          })
          wx.showToast({ title: '拜访位置已记录', icon: 'success' })
        },
        fail: error => {
          const message = error && error.errMsg ? error.errMsg : ''
          if (message.indexOf('auth deny') >= 0
              || message.indexOf('authorize:fail') >= 0) {
            this.showVisitLocationPermissionGuide()
          } else if (message.indexOf('cancel') < 0) {
            wx.showToast({ title: '地图打开失败，请稍后重试', icon: 'none' })
          }
        }
      })
    },

    showVisitLocationPermissionGuide() {
      wx.showModal({
        title: '需要位置权限',
        content: '记录拜访门店位置需要使用地图定位，请在设置中允许位置权限。',
        confirmText: '去设置',
        success: result => {
          if (!result.confirm) return
          wx.openSetting({
            success: setting => {
              if (setting.authSetting && setting.authSetting['scope.userLocation']) {
                this.openVisitLocationChooser()
              } else {
                wx.showToast({ title: '位置权限尚未开启', icon: 'none' })
              }
            }
          })
        }
      })
    },

    openVisitLocation() {
      const latitude = Number(this.data.latitude)
      const longitude = Number(this.data.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        this.chooseVisitLocation()
        return
      }
      wx.openLocation({
        latitude,
        longitude,
        name: this.data.shopName || '拜访门店',
        address: this.data.address || '',
        scale: 17
      })
    },

    chooseVisitPhoto() {
      const remaining = 9 - this.data.savedPhotos.length
        - this.data.visitPhotoLocalPaths.length
      if (remaining <= 0) {
        wx.showToast({ title: '该客户最多保存9张照片', icon: 'none' })
        return
      }
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['camera', 'album'],
        camera: 'back',
        success: res => {
          const paths = (res.tempFiles || [])
            .map(file => file.tempFilePath).filter(Boolean)
          if (!paths.length) return
          this.setData({
            visitPhotoLocalPaths: this.data.visitPhotoLocalPaths.concat(paths)
          })
          wx.showToast({ title: '已选择' + paths.length + '张照片', icon: 'success' })
        }
      })
    },

    previewVisitPhoto(e) {
      const urls = this.data.savedPhotos.map(item => item.previewPath)
        .filter(Boolean).concat(this.data.visitPhotoLocalPaths)
      const current = e.currentTarget.dataset.path
      if (!urls.length) return
      wx.previewImage({
        current: current || urls[0],
        urls
      })
    },

    removeVisitPhoto(e) {
      const index = Number(e.currentTarget.dataset.index)
      const paths = this.data.visitPhotoLocalPaths.slice()
      paths.splice(index, 1)
      this.setData({ visitPhotoLocalPaths: paths })
    },

    removeSavedPhoto(e) {
      if (this.properties.mode !== 'edit') return
      const index = Number(e.currentTarget.dataset.index)
      const photos = this.data.savedPhotos.slice()
      const removed = photos.splice(index, 1)[0]
      if (!removed) return
      const removedPhotoIds = this.data.removedPhotoIds.slice()
      if (removed.attachmentId) removedPhotoIds.push(removed.attachmentId)
      this.setData({
        savedPhotos: photos,
        savedPhotoCount: photos.length,
        removedPhotoIds
      })
    },

    toggleContact() {
      this.setData({ contactExpanded: !this.data.contactExpanded })
    },

    close() {
      if (!this.data.submitting) this.triggerEvent('close')
    },

    noop() {},

    submit() {
      if (this.data.submitting) return
      const target = this.properties.target || {}
      const isReturn = this.properties.mode === 'return' || !!target.departmentId
      const shopName = (this.data.shopName || '').trim()
      if (!shopName) {
        wx.showToast({ title: '请输入门店名称', icon: 'none' })
        return
      }
      if (this.properties.mode === 'edit') {
        this.submitLeadEdit(target, shopName)
        return
      }
      if (!isReturn && !this.data.resultCode) {
        wx.showToast({ title: '请选择拜访结果', icon: 'none' })
        return
      }
      if (isReturn && !target.departmentId) {
        wx.showToast({ title: '老客户回访需要先选择客户', icon: 'none' })
        return
      }
      if (isReturn && !this.data.feedbackCode) {
        wx.showToast({ title: '请选择本次客户反馈', icon: 'none' })
        return
      }
      if (isReturn && this.data.followUpRequired && !this.data.nextFollowDate) {
        wx.showToast({ title: '请选择下次跟进日期', icon: 'none' })
        return
      }
      const summary = (this.data.note || '').trim()
      if (isReturn && this.data.announcementRequested && !summary) {
        wx.showToast({ title: '提交公告前请填写回访总结', icon: 'none' })
        return
      }
      const types = this.properties.businessTypes || []
      const selectedType = this.data.businessTypeIndex >= 0
        ? types[this.data.businessTypeIndex] : null
      if (!isReturn && !selectedType) {
        wx.showToast({ title: '请选择门店业态', icon: 'none' })
        return
      }

      const payload = {
        departmentId: target.departmentId || null,
        leadId: target.leadId || null,
        businessTypeId: selectedType
          ? selectedType.businessTypeId : (target.businessTypeId || null),
        shopName,
        address: (this.data.address || '').trim(),
        latitude: this.data.latitude === '' ? null : this.data.latitude,
        longitude: this.data.longitude === '' ? null : this.data.longitude,
        resultCode: isReturn ? 'CUSTOMER_REVISIT' : this.data.resultCode,
        feedbackCode: isReturn ? this.data.feedbackCode : null,
        intentCode: null,
        followUpRequired: this.data.followUpRequired,
        nextFollowAt: isReturn && this.data.followUpRequired
          ? this.data.nextFollowDate + ' 09:00:00' : null,
        contactName: null,
        contactPhone: null,
        note: isReturn ? null : summary,
        summary: isReturn ? summary : null,
        announcementRequested: isReturn && this.data.announcementRequested
      }

      this.setData({ submitting: true })
      createSalesVisit(payload).then(res => {
        const body = res.result || {}
        if (body.code !== 0) {
          wx.showToast({ title: body.msg || '拜访保存失败', icon: 'none' })
          return
        }
        const data = body.data || {}
        return this.finishSaved(data, isReturn)
      }).catch(error => {
        wx.showToast({
          title: app.describeSalesRequestError(error, '拜访保存失败'),
          icon: 'none'
        })
      }).finally(() => this.setData({ submitting: false }))
    },

    submitLeadEdit(target, shopName) {
      if (!target.leadId) {
        wx.showToast({ title: '临时客户信息不完整', icon: 'none' })
        return
      }
      const types = this.properties.businessTypes || []
      const selectedType = this.data.businessTypeIndex >= 0
        ? types[this.data.businessTypeIndex] : null
      if (!selectedType) {
        wx.showToast({ title: '请选择门店业态', icon: 'none' })
        return
      }
      const payload = {
        businessTypeId: selectedType.businessTypeId,
        shopName,
        address: (this.data.address || '').trim(),
        latitude: this.data.latitude === '' ? null : this.data.latitude,
        longitude: this.data.longitude === '' ? null : this.data.longitude,
        contactName: (this.data.contactName || '').trim(),
        contactPhone: (this.data.contactPhone || '').trim()
      }
      const removedPhotoIds = this.data.removedPhotoIds.slice()
      const localPaths = this.data.visitPhotoLocalPaths.slice()
      this.setData({ submitting: true })
      updateSalesLead(target.leadId, payload).then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw { businessMessage: body.msg || '客户资料保存失败' }
        return removedPhotoIds.reduce((chain, attachmentId, index) => chain.then(() => {
          return deleteSalesVisitPhoto(attachmentId).then(deleteRes => {
            const deleteBody = deleteRes.result || {}
            if (deleteBody.code !== 0) {
              throw { businessMessage: deleteBody.msg || '旧照片删除失败' }
            }
            this.setData({ removedPhotoIds: removedPhotoIds.slice(index + 1) })
          })
        }), Promise.resolve())
      }).then(() => {
        return localPaths.reduce((chain, path, index) => chain.then(() => {
          return uploadSalesLeadPhoto(target.leadId, path).then(uploadRes => {
            const uploadBody = uploadRes.result || {}
            if (uploadBody.code !== 0) {
              throw { businessMessage: uploadBody.msg || '新照片上传失败' }
            }
            this.setData({ visitPhotoLocalPaths: localPaths.slice(index + 1) })
          })
        }), Promise.resolve())
      }).then(() => {
        wx.showToast({ title: '客户资料已更新', icon: 'success' })
        this.triggerEvent('saved', { leadId: target.leadId })
      }).catch(error => wx.showToast({
        title: error.businessMessage
          || app.describeSalesRequestError(error, '客户资料保存失败'),
        icon: 'none'
      })).finally(() => this.setData({ submitting: false }))
    },

    finishSaved(data, isReturn) {
      const notifySaved = () => {
        wx.showToast({
          title: isReturn
            ? (this.data.announcementRequested ? '回访已记录，公告待审核' : '回访已记录')
            : (this.data.followUpRequired ? '已记录，待安排下一步' : '拜访已记录'),
          icon: 'success'
        })
        this.triggerEvent('saved', data)
      }
      const visit = data.visit || {}
      const photoPaths = this.data.visitPhotoLocalPaths || []
      if (isReturn || !photoPaths.length || !visit.visitId) {
        notifySaved()
        return Promise.resolve()
      }
      let uploadedCount = 0
      return photoPaths.reduce((chain, path) => chain.then(() => {
        return uploadSalesVisitStorefrontPhoto(visit.visitId, path).then(res => {
          const body = res.result || {}
          if (body.code !== 0) throw { businessMessage: body.msg || '门店照片上传失败' }
          uploadedCount += 1
        })
      }), Promise.resolve()).then(() => {
        notifySaved()
      }).catch(error => {
        wx.showToast({
          title: error.businessMessage
            || app.describeSalesRequestError(error,
              '拜访已保存，已上传' + uploadedCount + '张，部分照片失败'),
          icon: 'none'
        })
        this.triggerEvent('saved', data)
      })
    }
  }
})
