import apiUrl from '../../../config.js'
import {
  getSalesCustomer,
  updateSalesCustomer,
  updateSalesCustomerDelivery,
  getSalesCustomerLabels,
  syncSalesCustomerLabels,
  createSalesCustomerLabel,
  deleteSalesCustomerLabel,
  addSalesCustomerDepartment,
  renameSalesCustomerDepartment,
  getSalesBusinessTypes,
  getSalesCustomerBusinessTypes
} from '../../../lib/apiSales.js'

const app = getApp()

const PRINT_OPTIONS = [
  { value: 'ApplyPanel', name: '一张一列' },
  { value: 'ApplyFiftyPanel', name: '一张两列' },
  { value: 'ApplyHalfWholePanel', name: '半张一列' },
  { value: 'ApplyHalfPanel', name: '半张两列' },
  { value: 'ApplyThirtyWholePanel', name: '三分之一张一列' },
  { value: 'ApplyThirtyPanel', name: '三分之一张两列' },
  { value: 'BlueToothPrint', name: '蓝牙打印机' },
  { value: 'feiEPrint', name: '飞鹅打印机' }
]

Page({
  data: {
    loading: true,
    customer: null,
    departments: [],
    customerUsers: [],
    selectedLabels: [],
    labelList: [],
    selectedLabelIds: [],
    navTitle: '客户管理',
    printOptions: PRINT_OPTIONS,
    priorityOptions: ['最低', '较低', '普通', '较高', '最高'],
    showEdit: false,
    showDelivery: false,
    showLabels: false,
    showVisitSheet: false,
    visitTarget: null,
    businessTypes: [],
    customerBusinessTypeName: '',
    customerBusinessTypeId: null,
    customerPhoto: '',
    pendingCustomerPhoto: '',
    saving: false,
    choosingLocation: false,
    newLabelName: ''
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      customerId: Number(options.customerId),
      imageServer: apiUrl.server
    })
  },

  onShow() {
    if (!this.data.showDelivery && !this.data.choosingLocation) this.loadCustomer()
  },

  loadCustomer() {
    if (!this.data.customerId) return
    this.setData({ loading: true })
    Promise.all([
      getSalesCustomer(this.data.customerId),
      getSalesCustomerLabels(this.data.customerId),
      getSalesBusinessTypes(),
      getSalesCustomerBusinessTypes(this.data.customerId)
    ]).then(results => {
      const customerResult = results[0].result || {}
      const labelResult = results[1].result || {}
      const typeResult = results[2].result || {}
      const relationResult = results[3].result || {}
      if (customerResult.code !== 0) {
        wx.showToast({ title: customerResult.msg || '客户资料加载失败', icon: 'none' })
        return
      }
      const customer = customerResult.data || {}
      const departments = customer.nxDepartmentEntities || customer.nxSubDepartments || []
      const customerUsers = (customer.nxDepartmentUserEntities || []).map(user =>
        Object.assign({}, user, { previewAvatar: this.absoluteImage(user.nxDuWxAvartraUrl) }))
      const labelData = labelResult.code === 0 ? (labelResult.data || {}) : {}
      const labelList = labelData.labelList || []
      const selectedLabelIds = labelData.selectedLabelIds || []
      const selectedLabels = labelList.filter(label =>
        selectedLabelIds.indexOf(label.nxDistributerLabelId) >= 0)
      const relationData = relationResult.code === 0 ? (relationResult.data || {}) : {}
      const customerTypes = relationData.types || []
      const primaryType = customerTypes.find(item => Number(item.isPrimary) === 1)
        || customerTypes[0] || null
      const savedCustomerPhoto = customer.nxDepartmentFilePath
        ? this.absoluteImage(customer.nxDepartmentFilePath) : ''
      this.setData({
        customer,
        departments,
        customerUsers,
        labelList,
        selectedLabelIds,
        selectedLabels,
        businessTypes: typeResult.code === 0 ? (typeResult.data || []) : [],
        customerBusinessTypeId: primaryType ? primaryType.businessTypeId : null,
        customerBusinessTypeName: primaryType ? primaryType.typeName : '',
        customerPhoto: savedCustomerPhoto,
        navTitle: customer.nxDepartmentAttrName
          || customer.nxDepartmentName
          || '客户管理',
        customerAvatar: savedCustomerPhoto
          || (customerUsers.length ? customerUsers[0].previewAvatar : '/images/user.png'),
        salesName: customer.salesUserEntity
          ? customer.salesUserEntity.nxDiuWxNickName : '我',
        clerkName: customer.clerkUserEntity
          ? customer.clerkUserEntity.nxDiuWxNickName : '老板代管',
        printDisplayName: this.printName(customer.nxDepartmentPrintName),
        formattedEarliestTime: this.secondsToTime(customer.nxDepartmentEarliestDeliveryTime),
        formattedLatestTime: this.secondsToTime(customer.nxDepartmentLatestDeliveryTime)
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '客户资料加载失败'), icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  absoluteImage(path) {
    if (!path) return '/images/user.png'
    if (/^(https?:|wxfile:|\/)/i.test(path)) return path.indexOf('/') === 0
      ? apiUrl.server + path.replace(/^\//, '') : path
    return apiUrl.server + path
  },

  openEdit() {
    const customer = this.data.customer || {}
    const matchedPrintIndex = PRINT_OPTIONS.findIndex(item =>
      item.value === customer.nxDepartmentPrintName)
    const printIndex = matchedPrintIndex >= 0 ? matchedPrintIndex : 2
    this.setData({
      showEdit: true,
      editForm: {
        nxDepartmentName: customer.nxDepartmentName || '',
        nxDepartmentAttrName: customer.nxDepartmentAttrName || '',
        nxDepartmentOrderCode: customer.nxDepartmentOrderCode || '',
        nxDepartmentPickName: customer.nxDepartmentPickName || '',
        nxDepartmentRecordMinutes: customer.nxDepartmentRecordMinutes || 0,
        nxDepartmentSettleType: Number(customer.nxDepartmentSettleType || 0),
        nxDepartmentType: customer.nxDepartmentType === 'fixed' ? 'fixed' : 'unFixed',
        nxDepartmentPrintName: PRINT_OPTIONS[printIndex].value,
        nxDepartmentDeliveryMode: customer.nxDepartmentDeliveryMode || 'DELIVERY'
      },
      printIndex
    })
  },

  closeEdit() { this.setData({ showEdit: false }) },

  onEditInput(e) {
    this.setData({ ['editForm.' + e.currentTarget.dataset.field]: e.detail.value })
  },

  onSettleChange(e) {
    this.setData({ 'editForm.nxDepartmentSettleType': Number(e.detail.value) })
  },

  onPricingChange(e) {
    this.setData({ 'editForm.nxDepartmentType': e.detail.value })
  },

  onDeliveryModeChange(e) {
    this.setData({ 'editForm.nxDepartmentDeliveryMode': e.detail.value })
  },

  onPrintChange(e) {
    const printIndex = Number(e.detail.value)
    this.setData({
      printIndex,
      'editForm.nxDepartmentPrintName': PRINT_OPTIONS[printIndex].value
    })
  },

  saveCustomer() {
    if (this.data.saving) return
    const payload = Object.assign({}, this.data.editForm, {
      nxDepartmentRecordMinutes: Number(this.data.editForm.nxDepartmentRecordMinutes || 0)
    })
    if (!String(payload.nxDepartmentName || '').trim()) {
      wx.showToast({ title: '请填写客户名称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '正在保存', mask: true })
    updateSalesCustomer(this.data.customerId, payload).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' })
        return
      }
      this.setData({ showEdit: false })
      this.loadCustomer()
      wx.showToast({ title: '客户资料已保存', icon: 'success' })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '保存失败'), icon: 'none'
    })).finally(() => { wx.hideLoading(); this.setData({ saving: false }) })
  },

  openDelivery() {
    const customer = this.data.customer || {}
    this.setData({
      showDelivery: true,
      selectedLatitude: customer.nxDepartmentLat || '',
      selectedLongitude: customer.nxDepartmentLng || '',
      deliveryAddress: customer.nxDepartmentAddress || '',
      earliestDeliveryTime: this.secondsToTime(customer.nxDepartmentEarliestDeliveryTime),
      latestDeliveryTime: this.secondsToTime(customer.nxDepartmentLatestDeliveryTime),
      unloadDuration: customer.nxDepartmentUnloadDuration || 30,
      deliveryNotes: customer.nxDepartmentDispatchRemark || '',
      priorityIndex: this.priorityIndex(customer.nxDepartmentDispatchPriorityWeight),
      allowEarlyDelivery: customer.nxDepartmentAllowEarlyDelivery !== 0
    })
  },

  closeDelivery() { this.setData({ showDelivery: false, choosingLocation: false }) },

  chooseLocation() {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => this.openDeliveryLocationChooser(),
      fail: () => this.showLocationPermissionGuide()
    })
  },

  openDeliveryLocationChooser() {
    this.setData({ choosingLocation: true })
    wx.chooseLocation({
      success: res => {
        this.setData({
          choosingLocation: false,
          selectedLatitude: String(res.latitude),
          selectedLongitude: String(res.longitude),
          deliveryAddress: (res.address || res.name || '').trim()
        })
      },
      fail: error => {
        this.setData({ choosingLocation: false })
        const message = error && error.errMsg ? error.errMsg : ''
        if (message.indexOf('auth deny') >= 0
            || message.indexOf('authorize:fail') >= 0) {
          this.showLocationPermissionGuide()
          return
        }
        if (message.indexOf('cancel') < 0) {
          wx.showToast({ title: '地图打开失败，请稍后重试', icon: 'none' })
        }
      }
    })
  },

  showLocationPermissionGuide() {
    wx.showModal({
      title: '需要位置权限',
      content: '选择客户配送位置需要使用地图定位，请在设置中允许位置权限。',
      confirmText: '去设置',
      success: result => {
        if (!result.confirm) return
        wx.openSetting({
          success: setting => {
            if (setting.authSetting && setting.authSetting['scope.userLocation']) {
              this.openDeliveryLocationChooser()
            } else {
              wx.showToast({ title: '位置权限尚未开启', icon: 'none' })
            }
          }
        })
      }
    })
  },

  openCustomerLocation() {
    const customer = this.data.customer || {}
    const latitude = Number(customer.nxDepartmentLat)
    const longitude = Number(customer.nxDepartmentLng)
    if (!this.validCoordinate(customer.nxDepartmentLat, customer.nxDepartmentLng)) {
      wx.showModal({
        title: '尚未设置地图位置',
        content: '请先选择客户配送位置。',
        confirmText: '去设置',
        success: result => { if (result.confirm) this.openDelivery() }
      })
      return
    }
    wx.openLocation({
      latitude,
      longitude,
      name: customer.nxDepartmentName || '客户位置',
      address: customer.nxDepartmentAddress || '',
      scale: 17,
      fail: () => wx.showToast({ title: '地图打开失败，请稍后重试', icon: 'none' })
    })
  },

  chooseCustomerPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      success: res => {
        const file = (res.tempFiles || [])[0] || {}
        if (!file.tempFilePath) return
        this.setData({ pendingCustomerPhoto: file.tempFilePath })
        wx.showToast({ title: '照片已拍摄，等待保存接口接入', icon: 'none' })
      }
    })
  },

  previewCustomerPhoto() {
    const current = this.data.pendingCustomerPhoto || this.data.customerPhoto
    if (!current) return
    wx.previewImage({
      current,
      urls: [current]
    })
  },

  discardPendingCustomerPhoto() {
    this.setData({ pendingCustomerPhoto: '' })
  },

  onDeliveryInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onEarliestTimeChange(e) { this.setData({ earliestDeliveryTime: e.detail.value }) },
  onLatestTimeChange(e) { this.setData({ latestDeliveryTime: e.detail.value }) },
  onPriorityChange(e) { this.setData({ priorityIndex: Number(e.detail.value) }) },
  onEarlyDeliveryChange(e) { this.setData({ allowEarlyDelivery: e.detail.value }) },

  saveDelivery() {
    if (this.data.saving) return
    if (!this.validCoordinate(this.data.selectedLatitude, this.data.selectedLongitude)) {
      wx.showToast({ title: '请先选择配送位置', icon: 'none' })
      return
    }
    const earliest = this.timeToSeconds(this.data.earliestDeliveryTime)
    const latest = this.timeToSeconds(this.data.latestDeliveryTime)
    if ((earliest === null) !== (latest === null) ||
        (earliest !== null && earliest >= latest)) {
      wx.showToast({ title: '请检查配送时间', icon: 'none' })
      return
    }
    const payload = {
      nxDepartmentLat: String(this.data.selectedLatitude),
      nxDepartmentLng: String(this.data.selectedLongitude),
      nxDepartmentAddress: String(this.data.deliveryAddress || '').trim(),
      nxDepartmentEarliestDeliveryTime: earliest,
      nxDepartmentLatestDeliveryTime: latest,
      nxDepartmentUnloadDuration: Number(this.data.unloadDuration || 0),
      nxDepartmentDispatchRemark: String(this.data.deliveryNotes || '').trim(),
      nxDepartmentDispatchPriorityWeight: this.data.priorityIndex + 1,
      nxDepartmentAllowEarlyDelivery: this.data.allowEarlyDelivery ? 1 : 0
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '保存配送设置', mask: true })
    updateSalesCustomerDelivery(this.data.customerId, payload).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '配送设置保存失败', icon: 'none' })
        return
      }
      this.setData({ showDelivery: false })
      this.loadCustomer()
      wx.showToast({ title: '配送设置已保存', icon: 'success' })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '配送设置保存失败'), icon: 'none'
    })).finally(() => { wx.hideLoading(); this.setData({ saving: false }) })
  },

  openLabels() {
    this.setData({
      showLabels: true,
      labelList: (this.data.labelList || []).map(label => Object.assign({}, label, {
        selected: this.data.selectedLabelIds.indexOf(label.nxDistributerLabelId) >= 0
      })),
      editingLabelIds: (this.data.selectedLabelIds || []).slice(),
      newLabelName: ''
    })
  },

  closeLabels() { this.setData({ showLabels: false }) },

  toggleLabel(e) {
    const labelId = Number(e.currentTarget.dataset.id)
    const ids = (this.data.editingLabelIds || []).slice()
    const index = ids.indexOf(labelId)
    if (index >= 0) ids.splice(index, 1)
    else ids.push(labelId)
    this.setData({
      editingLabelIds: ids,
      labelList: this.data.labelList.map(label => Object.assign({}, label, {
        selected: ids.indexOf(label.nxDistributerLabelId) >= 0
      }))
    })
  },

  onNewLabelInput(e) { this.setData({ newLabelName: e.detail.value }) },

  addLabel() {
    const name = String(this.data.newLabelName || '').trim()
    if (!name) return
    createSalesCustomerLabel(this.data.customerId, { nxDlName: name }).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '添加标签失败', icon: 'none' })
        return
      }
      const label = Object.assign({}, res.result.data, { selected: false })
      this.setData({ labelList: this.data.labelList.concat(label), newLabelName: '' })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '添加标签失败'), icon: 'none'
    }))
  },

  deleteLabel(e) {
    const labelId = Number(e.currentTarget.dataset.id)
    const labelName = e.currentTarget.dataset.name || ''
    wx.showModal({
      title: '删除配送商标签',
      content: '删除“' + labelName + '”后，所有客户都不再使用该标签。',
      success: result => {
        if (!result.confirm) return
        deleteSalesCustomerLabel(this.data.customerId, labelId).then(res => {
          if (res.result.code !== 0) {
            wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' })
            return
          }
          this.setData({
            labelList: this.data.labelList.filter(item => item.nxDistributerLabelId !== labelId),
            editingLabelIds: this.data.editingLabelIds.filter(id => id !== labelId)
          })
        }).catch(error => wx.showToast({
          title: app.describeSalesRequestError(error, '删除失败'), icon: 'none'
        }))
      }
    })
  },

  saveLabels() {
    if (this.data.saving) return
    this.setData({ saving: true })
    syncSalesCustomerLabels(this.data.customerId, this.data.editingLabelIds || []).then(res => {
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '标签保存失败', icon: 'none' })
        return
      }
      this.setData({ showLabels: false })
      this.loadCustomer()
      wx.showToast({ title: '客户标签已保存', icon: 'success' })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '标签保存失败'), icon: 'none'
    })).finally(() => this.setData({ saving: false }))
  },

  addDepartment() {
    wx.showModal({
      title: '添加客户部门', editable: true, placeholderText: '请输入部门名称',
      success: result => {
        const name = (result.content || '').trim()
        if (!result.confirm || !name) return
        addSalesCustomerDepartment(this.data.customerId, { nxDepartmentName: name }).then(res => {
          if (res.result.code === 0) {
            this.loadCustomer()
            wx.showToast({ title: '部门已添加', icon: 'success' })
          } else wx.showToast({ title: res.result.msg || '添加失败', icon: 'none' })
        }).catch(error => wx.showToast({
          title: app.describeSalesRequestError(error, '添加失败'), icon: 'none'
        }))
      }
    })
  },

  renameDepartment(e) {
    const id = Number(e.currentTarget.dataset.id)
    const currentName = e.currentTarget.dataset.name || ''
    wx.showModal({
      title: '修改部门名称', editable: true, content: currentName,
      success: result => {
        const name = (result.content || '').trim()
        if (!result.confirm || !name || name === currentName) return
        renameSalesCustomerDepartment(this.data.customerId, id, {
          nxDepartmentName: name
        }).then(res => {
          if (res.result.code === 0) this.loadCustomer()
          else wx.showToast({ title: res.result.msg || '修改失败', icon: 'none' })
        }).catch(error => wx.showToast({
          title: app.describeSalesRequestError(error, '修改失败'), icon: 'none'
        }))
      }
    })
  },

  openGoods() {
    wx.navigateTo({
      url: '/pages/sales/customerGoods/customerGoods?customerId=' + this.data.customerId
        + '&customerName=' + encodeURIComponent(this.data.customer.nxDepartmentName || '')
    })
  },

  startOrder() {
    app.clearShopLoginState()
    wx.setStorageSync('salesActingCustomerId', this.data.customerId)
    wx.setStorageSync('salesActingDistributerId', this.data.customer.nxDepartmentDisId)
    wx.setStorageSync('salesActingCustomerName', this.data.customer.nxDepartmentName || '')
    wx.navigateTo({
      url: '/pages/ai/customer/chefOrder/chefOrder?isAgent=1&depFatherId=' + this.data.customerId
        + '&disId=' + this.data.customer.nxDepartmentDisId
    })
  },

  recordCustomerVisit() {
    const customer = this.data.customer || {}
    this.setData({
      visitTarget: {
        customerId: this.data.customerId,
        businessTypeId: this.data.customerBusinessTypeId,
        nxDepartmentName: customer.nxDepartmentName,
        nxDepartmentAddress: customer.nxDepartmentAddress,
        nxDepartmentLat: customer.nxDepartmentLat,
        nxDepartmentLng: customer.nxDepartmentLng
      },
      showVisitSheet: true
    })
  },

  closeVisitSheet() {
    this.setData({ showVisitSheet: false, visitTarget: null })
  },

  onVisitSaved() {
    this.closeVisitSheet()
  },

  openCustomerQuotation() {
    const customer = this.data.customer || {}
    wx.navigateTo({
      url: '/pages/sales/quotation/quotation?customerId=' + this.data.customerId
        + '&shopName=' + encodeURIComponent(customer.nxDepartmentAttrName
          || customer.nxDepartmentName || '')
    })
  },

  openBusinessType() {
    const customer = this.data.customer || {}
    wx.navigateTo({
      url: '/pages/sales/customerBusinessType/customerBusinessType?customerId='
        + this.data.customerId + '&customerName='
        + encodeURIComponent(customer.nxDepartmentName || '')
    })
  },

  printName(value) {
    const item = PRINT_OPTIONS.find(option => option.value === value)
    return item ? item.name : '半张一列'
  },

  secondsToTime(value) {
    if (value === null || value === undefined || value === '') return ''
    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) return value
    const seconds = Number(value)
    if (isNaN(seconds) || seconds < 0 || seconds >= 86400) return ''
    const hour = Math.floor(seconds / 3600)
    const minute = Math.floor((seconds % 3600) / 60)
    return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
  },

  timeToSeconds(value) {
    if (!value) return null
    const parts = String(value).split(':').map(Number)
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return parts[0] * 3600 + parts[1] * 60
  },

  priorityIndex(value) {
    const priority = Number(value)
    return priority >= 1 && priority <= 5 ? priority - 1 : 2
  },

  validCoordinate(latitude, longitude) {
    const lat = Number(latitude)
    const lng = Number(longitude)
    return latitude !== '' && longitude !== '' && !isNaN(lat) && !isNaN(lng)
      && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  },

  stopPropagation() {},
  back() { wx.navigateBack() }
})
