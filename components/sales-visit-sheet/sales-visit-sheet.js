import { createSalesVisit } from '../../lib/apiSales.js'

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
    target: {
      type: Object,
      value: null
    }
  },

  data: {
    submitting: false,
    resultOptions: [
      { code: 'NO_CONTACT', name: '老板不在' },
      { code: 'NO_INTEREST', name: '暂无兴趣' },
      { code: 'INTERESTED', name: '有兴趣' },
      { code: 'QUOTED', name: '已报价' },
      { code: 'TRIAL_WILLING', name: '愿意试单' },
      { code: 'DEAL', name: '已成交' },
      { code: 'CUSTOMER_REVISIT', name: '老客户回访' }
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
    visitPhotoLocalPath: '',
    businessTypeIndex: -1,
    resultCode: '',
    intentCode: 'WARM',
    followUpRequired: false,
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
      const businessTypeIndex = types.findIndex(item =>
        String(item.businessTypeId) === String(typeId))
      this.setData({
        submitting: false,
        shopName: target.shopName || target.nxDepartmentName || '',
        address: target.address || target.nxDepartmentAddress || '',
        latitude: target.latitude || target.nxDepartmentLat || '',
        longitude: target.longitude || target.nxDepartmentLng || '',
        visitPhotoLocalPath: '',
        businessTypeIndex,
        resultCode: target.customerId ? 'CUSTOMER_REVISIT' : '',
        intentCode: target.intentCode || 'WARM',
        followUpRequired: false,
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

    selectIntent(e) {
      this.setData({ intentCode: e.currentTarget.dataset.code })
    },

    onFollowChange(e) {
      this.setData({ followUpRequired: !!e.detail.value })
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
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera', 'album'],
        camera: 'back',
        success: res => {
          const file = (res.tempFiles || [])[0] || {}
          if (!file.tempFilePath) return
          this.setData({ visitPhotoLocalPath: file.tempFilePath })
          wx.showToast({ title: '现场照片已拍摄', icon: 'success' })
        }
      })
    },

    previewVisitPhoto() {
      if (!this.data.visitPhotoLocalPath) return
      wx.previewImage({
        current: this.data.visitPhotoLocalPath,
        urls: [this.data.visitPhotoLocalPath]
      })
    },

    removeVisitPhoto() {
      this.setData({ visitPhotoLocalPath: '' })
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
      const shopName = (this.data.shopName || '').trim()
      if (!shopName) {
        wx.showToast({ title: '请输入门店名称', icon: 'none' })
        return
      }
      if (!this.data.resultCode) {
        wx.showToast({ title: '请选择拜访结果', icon: 'none' })
        return
      }
      if (this.data.resultCode === 'CUSTOMER_REVISIT' && !target.customerId) {
        wx.showToast({ title: '老客户回访需要先选择客户', icon: 'none' })
        return
      }
      if (this.data.followUpRequired && !this.data.nextFollowDate) {
        wx.showToast({ title: '请选择下次跟进日期', icon: 'none' })
        return
      }
      const types = this.properties.businessTypes || []
      const selectedType = this.data.businessTypeIndex >= 0
        ? types[this.data.businessTypeIndex] : null
      if (!target.customerId && !selectedType) {
        wx.showToast({ title: '请选择门店业态', icon: 'none' })
        return
      }

      const payload = {
        customerId: target.customerId || null,
        leadId: target.leadId || null,
        businessTypeId: selectedType
          ? selectedType.businessTypeId : (target.businessTypeId || null),
        shopName,
        address: (this.data.address || '').trim(),
        latitude: this.data.latitude === '' ? null : this.data.latitude,
        longitude: this.data.longitude === '' ? null : this.data.longitude,
        resultCode: this.data.resultCode,
        intentCode: this.data.intentCode,
        followUpRequired: this.data.followUpRequired,
        nextFollowAt: this.data.followUpRequired
          ? this.data.nextFollowDate + ' 09:00:00' : null,
        contactName: this.data.contactExpanded
          ? (this.data.contactName || '').trim() : null,
        contactPhone: this.data.contactExpanded
          ? (this.data.contactPhone || '').trim() : null,
        note: (this.data.note || '').trim()
      }

      this.setData({ submitting: true })
      createSalesVisit(payload).then(res => {
        const body = res.result || {}
        if (body.code !== 0) {
          wx.showToast({ title: body.msg || '拜访保存失败', icon: 'none' })
          return
        }
        const data = body.data || {}
        wx.showToast({
          title: data.leadCreated ? '已记录并加入跟进' : '拜访已记录',
          icon: 'success'
        })
        this.triggerEvent('saved', data)
      }).catch(error => {
        wx.showToast({
          title: app.describeSalesRequestError(error, '拜访保存失败'),
          icon: 'none'
        })
      }).finally(() => this.setData({ submitting: false }))
    }
  }
})
