import {
  getSalesProfile,
  createSalesDepartment,
  getSalesLead,
  convertSalesLead
} from '../../../lib/apiSales.js'

const app = getApp()
const DEPARTMENT_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9]

function newDepartment(name) {
  return {
    nxDepartmentName: name || '',
    nxDepartmentType: 'unFixed',
    nxDepartmentPrintName: 'ApplyHalfPanel',
    nxDepartmentHasSubs: 0,
    nxDepartmentShowWeeks: 1,
    nxDepartmentSubAmount: 0,
    nxDepartmentIsGroupDep: 0
  }
}

Page({
  data: {
    loading: true,
    submitting: false,
    conversionMode: false,
    leadId: null,
    lead: null,
    profile: null,
    customerName: '',
    settleOptions: [
      { name: '记账', value: 1 },
      { name: '现金', value: 0 }
    ],
    settleIndex: 0,
    hasDepartments: false,
    departmentCounts: DEPARTMENT_COUNTS,
    departmentCountIndex: 0,
    subDepartments: [],
    clerks: [],
    clerkIndex: 0
  },

  onLoad(options) {
    const leadId = Number((options || {}).leadId) || null
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      leadId,
      conversionMode: !!leadId
    })
    const leadRequest = leadId
      ? getSalesLead(leadId)
      : Promise.resolve({ result: { code: 0, data: null } })
    Promise.all([getSalesProfile(), leadRequest]).then(results => {
      const body = results[0].result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '负责人资料加载失败', icon: 'none' })
        return
      }
      const leadBody = results[1].result || {}
      if (leadBody.code !== 0) {
        wx.showToast({ title: leadBody.msg || '陌生客户资料加载失败', icon: 'none' })
        return
      }
      const profile = body.data || {}
      const lead = leadBody.data ? (leadBody.data.lead || null) : null
      const clerks = profile.clerks || []
      let clerkIndex = 0
      if (profile.defaultClerk) {
        const index = clerks.findIndex(item => Number(item.nxDistributerUserId)
          === Number(profile.defaultClerk.nxDistributerUserId))
        if (index >= 0) clerkIndex = index
      }
      this.setData({
        profile,
        clerks,
        clerkIndex,
        lead,
        customerName: lead ? (lead.shopName || '') : this.data.customerName
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '负责人资料加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  onCustomerNameInput(e) {
    const customerName = e.detail.value || ''
    this.setData({ customerName })
  },

  onSettleChange(e) { this.setData({ settleIndex: Number(e.detail.value) }) },
  onClerkChange(e) { this.setData({ clerkIndex: Number(e.detail.value) }) },

  onDepartmentModeChange(e) {
    const hasDepartments = String(e.detail.value) === '1'
    this.setDepartmentMode(hasDepartments)
  },

  selectDepartmentMode(e) {
    this.setDepartmentMode(String(e.currentTarget.dataset.value) === '1')
  },

  setDepartmentMode(hasDepartments) {
    if (hasDepartments === this.data.hasDepartments
        && (!hasDepartments || (this.data.subDepartments || []).length)) return
    this.setData({
      hasDepartments,
      departmentCountIndex: 0,
      subDepartments: hasDepartments ? [newDepartment(), newDepartment()] : []
    })
  },

  onDepartmentCountChange(e) {
    const departmentCountIndex = Number(e.detail.value)
    const count = DEPARTMENT_COUNTS[departmentCountIndex]
    const current = (this.data.subDepartments || []).slice(0, count)
    while (current.length < count) current.push(newDepartment())
    this.setData({ departmentCountIndex, subDepartments: current })
  },

  onDepartmentNameInput(e) {
    this.setData({
      ['subDepartments[' + Number(e.currentTarget.dataset.index) + '].nxDepartmentName']:
        e.detail.value || ''
    })
  },

  clerkUserId() {
    const profile = this.data.profile || {}
    if (profile.defaultClerk) return profile.defaultClerk.nxDistributerUserId
    if ((this.data.clerks || []).length) {
      const selected = this.data.clerks[this.data.clerkIndex]
      return selected ? selected.nxDistributerUserId : null
    }
    return null
  },

  submit() {
    if (this.data.submitting) return
    const customerName = String(this.data.customerName || '').trim()
    if (!customerName) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }
    const profile = this.data.profile || {}
    const salesInfo = profile.salesInfo || {}
    if (!salesInfo.nxDiuDistributerId) {
      wx.showToast({ title: '业务员资料尚未加载完成', icon: 'none' })
      return
    }
    const clerkUserId = this.clerkUserId()
    if (!profile.defaultClerk && (this.data.clerks || []).length && !clerkUserId) {
      wx.showToast({ title: '请选择负责录单员', icon: 'none' })
      return
    }
    const subDepartments = this.data.hasDepartments
      ? (this.data.subDepartments || []).map(item => newDepartment(
        String(item.nxDepartmentName || '').trim())) : []
    if (subDepartments.some(item => !item.nxDepartmentName)) {
      wx.showToast({ title: '请填写全部部门名称', icon: 'none' })
      return
    }
    const settle = this.data.settleOptions[this.data.settleIndex]
    const payload = {
      nxDdDistributerId: salesInfo.nxDiuDistributerId,
      clerkUserId,
      nxDepartmentEntity: {
        nxDepartmentName: customerName,
        nxDepartmentAttrName: customerName,
        nxDepartmentOrderCode: customerName,
        nxDepartmentType: 'unFixed',
        nxDepartmentPrintName: 'ApplyHalfPanel',
        nxDepartmentSettleType: settle ? settle.value : 1,
        nxDepartmentWorkingStatus: 0,
        nxDepartmentShowWeeks: 1,
        nxDepartmentIsGroupDep: 1,
        nxDepartmentSubAmount: subDepartments.length,
        nxSubDepartments: subDepartments,
        nxDepartmentAddress: this.data.lead ? (this.data.lead.address || '') : '',
        nxDepartmentLat: this.data.lead && this.data.lead.latitude !== null
          && this.data.lead.latitude !== undefined ? String(this.data.lead.latitude) : '',
        nxDepartmentLng: this.data.lead && this.data.lead.longitude !== null
          && this.data.lead.longitude !== undefined ? String(this.data.lead.longitude) : ''
      }
    }
    this.setData({ submitting: true })
    wx.showLoading({
      title: this.data.conversionMode ? '正在转为正式客户' : '正在保存客户',
      mask: true
    })
    const saveRequest = this.data.conversionMode
      ? convertSalesLead(this.data.leadId, payload)
      : createSalesDepartment(payload)
    saveRequest.then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '客户保存失败', icon: 'none' })
        return
      }
      const data = body.data || {}
      const customer = this.data.conversionMode ? (data.department || {}) : data
      wx.showToast({
        title: this.data.conversionMode ? '已转为正式客户' : '客户已添加',
        icon: 'success'
      })
      setTimeout(() => wx.redirectTo({
        url: '/pages/sales/customerDetail/customerDetail?departmentId='
          + customer.nxDepartmentId
      }), 350)
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '客户保存失败'), icon: 'none'
    })).finally(() => {
      wx.hideLoading()
      this.setData({ submitting: false })
    })
  },

  back() { wx.navigateBack() }
})
