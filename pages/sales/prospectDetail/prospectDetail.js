import {
  getSalesLeadWorkflow,
  closeSalesLeadWorkflow,
  reopenSalesLeadWorkflow,
  createSalesNextAction,
  getSalesBusinessTypes,
  getSalesLeadPhotos,
  downloadSalesVisitPhoto,
  deleteSalesLead
} from '../../../lib/apiSales.js'

const app = getApp()

const ACTIVITY_LABELS = {
  VISIT_NEW: '客户拜访',
  QUOTE: '客户报价',
  FOLLOW_UP: '跟进结果',
  AFTER_SALES: '售后处理',
  COMPLAINT: '客户投诉'
}

const RESULT_LABELS = {
  NO_CONTACT: '未接触老板',
  NO_INTEREST: '无兴趣',
  INTERESTED: '有兴趣',
  QUOTED: '已报价',
  TRIAL_WILLING: '愿意试单',
  DEAL: '已成交'
}

const ACTION_LABELS = {
  CONTACT: '电话联系',
  QUOTE: '提交报价',
  RETURN_VISIT: '再次拜访',
  FOLLOW_UP: '继续跟进',
  OTHER: '其他事项'
}

function dateAfter(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

function dateTimeAfterHours(hours) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000)
  return {
    date: date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0'),
    time: String(date.getHours()).padStart(2, '0') + ':'
      + String(date.getMinutes()).padStart(2, '0')
  }
}

function localDateTimeValue(dateText, timeText) {
  const dateParts = String(dateText || '').split('-').map(Number)
  const timeParts = String(timeText || '').split(':').map(Number)
  if (dateParts.length !== 3 || timeParts.length !== 2) return NaN
  return new Date(dateParts[0], dateParts[1] - 1, dateParts[2],
    timeParts[0], timeParts[1], 0).getTime()
}

function displayDate(value, length) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, length || 16)
}

function presentActivity(item) {
  return Object.assign({}, item, {
    typeLabel: ACTIVITY_LABELS[item.activityType] || '客户活动',
    timeLabel: displayDate(item.activityAt),
    dotClass: item.activityType === 'QUOTE' ? 'quote'
      : (item.sourceType === 'LEAD_WORKFLOW' ? 'workflow' : 'visit')
  })
}

function presentAction(item) {
  if (!item) return null
  return Object.assign({}, item, {
    actionLabel: ACTION_LABELS[item.actionType] || item.actionTitle || '销售任务',
    targetLabel: displayDate(item.targetAt),
    statusLabel: item.statusCode === 'IN_PROGRESS' ? '处理中' : '待处理'
  })
}

function developmentDays(value) {
  if (!value) return '-'
  let created = new Date(value).getTime()
  if (!Number.isFinite(created)) {
    created = new Date(String(value).replace('T', ' ').replace(/-/g, '/')).getTime()
  }
  if (!Number.isFinite(created)) return '-'
  return Math.max(1, Math.floor((Date.now() - created) / 86400000) + 1) + '天'
}

function sequenceTitle(prefix, sequence) {
  return sequence === 1 ? '首次' + prefix : '第' + sequence + '次' + prefix
}

function buildJourney(activities, currentAction) {
  const rows = activities || []
  const sequenceById = {}
  const counters = { VISIT_NEW: 0, QUOTE: 0 }
  rows.slice().reverse().forEach(item => {
    if (Object.prototype.hasOwnProperty.call(counters, item.activityType)) {
      counters[item.activityType] += 1
      sequenceById[item.activityId] = counters[item.activityType]
    }
  })
  const journey = rows.map((item, index) => {
    const isVisit = item.activityType === 'VISIT_NEW'
    const isQuote = item.activityType === 'QUOTE'
    const isTaskResult = item.sourceType === 'NEXT_ACTION'
    const isWorkflow = item.sourceType === 'LEAD_WORKFLOW'
    let title = item.typeLabel
    let content = item.activityContent || ''
    if (isVisit) title = sequenceTitle('拜访', sequenceById[item.activityId])
    if (isQuote) title = sequenceTitle('报价', sequenceById[item.activityId])
    if (isTaskResult) title = '跟进完成'
    if (isWorkflow && content) {
      title = content
      content = ''
    }
    return {
      journeyKey: 'activity-' + item.activityId,
      sequenceNo: rows.length - index,
      kind: isQuote ? 'QUOTE' : 'ACTIVITY',
      sourceId: isQuote ? Number(item.sourceId) || null : null,
      title,
      content,
      feedback: item.customerFeedback || '',
      timeLabel: item.timeLabel,
      statusLabel: '',
      eventClass: isQuote ? 'quote' : (isTaskResult ? 'follow' : (isWorkflow ? 'workflow' : 'visit')),
      canOpen: isQuote && !!Number(item.sourceId)
    }
  })
  if (currentAction) {
    journey.unshift({
      journeyKey: 'action-' + currentAction.actionId,
      sequenceNo: rows.length + 1,
      kind: 'ACTION',
      sourceId: currentAction.actionId,
      title: currentAction.actionTitle || currentAction.actionLabel,
      content: currentAction.actionDescription || '已安排下一步，等待处理',
      feedback: '',
      timeLabel: currentAction.targetLabel,
      statusLabel: currentAction.statusLabel,
      eventClass: 'pending',
      canOpen: true
    })
  }
  return journey
}

function stageLabel(lead, activities, visits) {
  if (!lead) return '-'
  if (lead.statusCode === 'CLOSED') return '开发已关闭'
  if (lead.statusCode === 'CONVERTED') return '已成交'
  const rows = activities || []
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].activityType === 'QUOTE') return '已报价'
    if (rows[i].activityType === 'VISIT_NEW') break
  }
  const latestVisit = (visits || [])[0] || {}
  return RESULT_LABELS[latestVisit.resultCode] || '开发中'
}

Page({
  data: {
    loading: true,
    submitting: false,
    deleting: false,
    leadId: null,
    lead: null,
    businessTypes: [],
    photos: [],
    activities: [],
    journeyRows: [],
    currentAction: null,
    latestActivityId: null,
    closedActivity: null,
    stageLabel: '',
    visitCount: 0,
    quoteCount: 0,
    completedFollowCount: 0,
    latestFeedback: '暂无反馈',
    nextActionSummary: '待安排',
    profileTags: [],
    showClose: false,
    showReopen: false,
    showNextAction: false,
    autoSchedule: false,
    showEdit: false,
    showMore: false,
    closeOptions: [
      { code: 'REFUSED', name: '明确拒绝' },
      { code: 'NO_RESPONSE', name: '多次联系无回应' },
      { code: 'CLOSED_SHOP', name: '门店停业' },
      { code: 'NOT_SUITABLE', name: '不符合合作条件' },
      { code: 'OTHER', name: '其他' }
    ],
    closeReasonCode: '',
    closeNote: '',
    reopenDate: dateAfter(3),
    reopenNote: '',
    actionOptions: [
      { code: 'CONTACT', name: '电话联系', actionType: 'CONTACT', title: '联系客户' },
      { code: 'VISIT', name: '再次拜访', actionType: 'RETURN_VISIT', title: '再次拜访客户' },
      { code: 'QUOTE', name: '提交报价', actionType: 'QUOTE', title: '给客户提交报价' },
      { code: 'SAMPLE', name: '送样/试单', actionType: 'OTHER', title: '安排送样或试单' },
      { code: 'OTHER', name: '其他', actionType: 'OTHER', title: '其他客户跟进' }
    ],
    nextActionCode: '',
    nextActionDate: '',
    nextActionTime: '',
    nextActionNote: '',
    today: dateAfter(0),
    quoteRefreshKey: 0
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      leadId: Number(options.leadId) || null,
      autoSchedule: options.schedule === '1'
    })
  },

  onShow() {
    if (this.data.leadId && app.hasUsableSalesToken()) this.loadData()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/sales/newCustomerVisits/newCustomerVisits' })
  },

  loadData() {
    this.setData({ loading: true })
    Promise.all([
      getSalesLeadWorkflow(this.data.leadId),
      getSalesBusinessTypes(),
      getSalesLeadPhotos(this.data.leadId)
    ]).then(results => {
      const body = results[0].result || {}
      const typeBody = results[1].result || {}
      const photoBody = results[2].result || {}
      if (body.code !== 0 || typeBody.code !== 0 || photoBody.code !== 0) {
        throw { businessMessage: body.msg || typeBody.msg || photoBody.msg || '客户档案加载失败' }
      }
      const data = body.data || {}
      const lead = data.lead || null
      const activities = (data.activities || []).map(presentActivity)
      const visits = data.visits || []
      const currentAction = presentAction(data.currentAction)
      const quoteCount = activities.filter(item => item.activityType === 'QUOTE').length
      const completedFollowCount = activities.filter(item =>
        item.sourceType === 'NEXT_ACTION').length
      const feedbackActivity = activities.find(item =>
        !!item.customerFeedback && item.sourceType !== 'LEAD_WORKFLOW')
      const currentStage = stageLabel(lead, activities, visits)
      const profileTags = [{
        key: 'prospect',
        name: lead && lead.statusCode === 'CONVERTED' ? '已转正式客户'
          : (lead && lead.statusCode === 'CLOSED' ? '已关闭开发' : '陌生客户')
      }]
      if (visits.length) {
        profileTags.push({
          key: 'visit',
          name: visits.length === 1 ? '首次拜访' : visits.length + '次拜访'
        })
      }
      if (quoteCount) profileTags.push({ key: 'quote', name: quoteCount + '次已定稿报价' })
      const photoRows = photoBody.data || []
      return Promise.all(photoRows.map(item => {
        return downloadSalesVisitPhoto(item.attachmentId).catch(() => '')
      })).then(paths => {
        this.setData({
          lead: lead ? Object.assign({}, lead, {
            statusLabel: lead.statusCode === 'CLOSED' ? '已关闭'
              : lead.statusCode === 'CONVERTED' ? '已成交'
                : (currentAction ? '跟进中' : '待安排'),
            latestVisitLabel: displayDate(lead.latestVisitAt),
            createdLabel: displayDate(lead.createdAt, 10),
            developmentDays: developmentDays(lead.createdAt),
            latestActivityLabel: activities.length
              ? displayDate(activities[0].activityAt, 10)
              : displayDate(lead.latestVisitAt, 10),
            hasContact: !!(lead.contactName || lead.contactPhone),
            canOpenMap: lead.latitude !== null && lead.latitude !== undefined
              && lead.longitude !== null && lead.longitude !== undefined,
            coverPhoto: paths.find(Boolean) || ''
          }) : null,
          businessTypes: typeBody.data || [],
          photos: photoRows.map((item, index) => Object.assign({}, item, {
            previewPath: paths[index] || ''
          })),
          activities,
          journeyRows: buildJourney(activities, currentAction),
          currentAction,
          latestActivityId: activities.length ? activities[0].activityId : null,
          closedActivity: data.closedActivity ? presentActivity(data.closedActivity) : null,
          stageLabel: currentStage,
          visitCount: visits.length,
          quoteCount,
          completedFollowCount,
          latestFeedback: feedbackActivity
            ? feedbackActivity.customerFeedback : '暂无反馈',
          nextActionSummary: currentAction ? currentAction.targetLabel : '待安排',
          profileTags,
          quoteRefreshKey: Date.now()
        }, () => {
          if (this.data.autoSchedule && !currentAction
            && lead && lead.statusCode === 'FOLLOWING') {
            this.setData({ autoSchedule: false })
            this.openNextAction()
          }
        })
      })
    }).catch(error => wx.showToast({
      title: error.businessMessage
        || app.describeSalesRequestError(error, '客户档案加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  openCurrentTask() {
    if (!this.data.currentAction) return
    wx.navigateTo({
      url: '/pages/sales/nextActionDetail/nextActionDetail?actionId='
        + this.data.currentAction.actionId
    })
  },

  openJourney(e) {
    const kind = e.currentTarget.dataset.kind
    const sourceId = Number(e.currentTarget.dataset.id)
    if (kind === 'ACTION') {
      this.openCurrentTask()
      return
    }
    if (kind === 'QUOTE' && sourceId) {
      wx.navigateTo({
        url: '/pages/sales/quotationPreview/quotationPreview?quotationId=' + sourceId
      })
    }
  },

  openLeadLocation() {
    const lead = this.data.lead || {}
    const latitude = Number(lead.latitude)
    const longitude = Number(lead.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    wx.openLocation({
      latitude,
      longitude,
      name: lead.shopName || '客户门店',
      address: lead.address || '',
      scale: 17
    })
  },

  callContact() {
    const phone = String((this.data.lead || {}).contactPhone || '').trim()
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: phone })
  },

  handlePrimaryAction() {
    const lead = this.data.lead || {}
    if (lead.statusCode === 'CONVERTED') {
      this.openConvertedDepartment()
      return
    }
    if (lead.statusCode === 'CLOSED') {
      this.openReopen()
      return
    }
    if (this.data.currentAction) this.openCurrentTask()
    else this.openNextAction()
  },

  openMore() {
    this.setData({ showMore: true })
  },

  closeMore() {
    this.setData({ showMore: false })
  },

  editFromMore() {
    this.setData({ showMore: false, showEdit: true })
  },

  convertFromMore() {
    this.setData({ showMore: false })
    this.convertToDepartment()
  },

  closeFromMore() {
    this.setData({ showMore: false })
    this.openClose()
  },

  recordAgain() {
    wx.navigateTo({
      url: '/pages/sales/newCustomerVisitAdd/newCustomerVisitAdd?leadId=' + this.data.leadId
    })
  },

  editProspect() {
    this.setData({ showEdit: true })
  },

  closeEdit() {
    this.setData({ showEdit: false })
  },

  onProspectSaved() {
    this.setData({ showEdit: false })
    this.loadData()
  },

  previewPhotos(e) {
    const urls = this.data.photos.map(item => item.previewPath).filter(Boolean)
    const current = e.currentTarget.dataset.path
    if (!urls.length || !current) return
    wx.previewImage({ current, urls })
  },

  deleteProspect() {
    if (this.data.deleting) return
    this.setData({ showMore: false })
    wx.showModal({
      title: '删除临时客户',
      content: '系统会先删除尚未处理的跟进任务，再删除客户照片、拜访记录和临时客户档案。删除后不能恢复。',
      confirmText: '确认删除',
      confirmColor: '#b65345',
      success: result => {
        if (!result.confirm) return
        this.setData({ deleting: true })
        deleteSalesLead(this.data.leadId).then(res => {
          const body = res.result || {}
          if (body.code !== 0) {
            throw { businessMessage: body.msg || '临时客户删除失败' }
          }
          wx.showToast({ title: '临时客户已删除', icon: 'success' })
          setTimeout(() => this.goBack(), 500)
        }).catch(error => wx.showToast({
          title: error.businessMessage
            || app.describeSalesRequestError(error, '临时客户删除失败'),
          icon: 'none'
        })).finally(() => this.setData({ deleting: false }))
      }
    })
  },

  createQuote() {
    wx.navigateTo({
      url: '/pages/sales/quotation/quotation?leadId=' + this.data.leadId
        + '&shopName=' + encodeURIComponent((this.data.lead || {}).shopName || '')
    })
  },

  convertToDepartment() {
    wx.navigateTo({
      url: '/pages/sales/customerAdd/customerAdd?leadId=' + this.data.leadId
    })
  },

  openConvertedDepartment() {
    const departmentId = Number((this.data.lead || {}).convertedDepartmentId)
    if (!departmentId) return
    wx.navigateTo({
      url: '/pages/sales/customerDetail/customerDetail?departmentId=' + departmentId
    })
  },

  openClose() {
    this.setData({ showMore: false, showClose: true, closeReasonCode: '', closeNote: '' })
  },

  openReopen() {
    this.setData({
      showMore: false,
      showReopen: true,
      reopenDate: dateAfter(3),
      reopenNote: ''
    })
  },

  openNextAction() {
    if (!this.data.latestActivityId) {
      wx.showToast({ title: '当前没有可关联的客户活动', icon: 'none' })
      return
    }
    const target = dateTimeAfterHours(2)
    this.setData({
      showMore: false,
      showNextAction: true,
      nextActionCode: '',
      nextActionDate: target.date,
      nextActionTime: target.time,
      nextActionNote: ''
    })
  },

  closeModals() {
    if (this.data.submitting) return
    this.setData({
      showClose: false,
      showReopen: false,
      showNextAction: false,
      showMore: false
    })
  },

  selectCloseReason(e) {
    this.setData({ closeReasonCode: e.currentTarget.dataset.code })
  },

  selectNextAction(e) {
    this.setData({ nextActionCode: e.currentTarget.dataset.code })
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  submitClose() {
    if (this.data.submitting) return
    const option = this.data.closeOptions.find(item => item.code === this.data.closeReasonCode)
    const note = (this.data.closeNote || '').trim()
    if (!option) {
      wx.showToast({ title: '请选择关闭原因', icon: 'none' })
      return
    }
    if (option.code === 'OTHER' && !note) {
      wx.showToast({ title: '请填写具体关闭原因', icon: 'none' })
      return
    }
    const reason = option.name + (note ? '：' + note : '')
    this.setData({ submitting: true })
    closeSalesLeadWorkflow(this.data.leadId, { reason }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '关闭开发失败' }
      wx.showToast({ title: '开发工作流已关闭', icon: 'success' })
      this.setData({ showClose: false })
      this.loadData()
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '关闭开发失败'),
      icon: 'none'
    })).finally(() => this.setData({ submitting: false }))
  },

  submitReopen() {
    if (this.data.submitting || !this.data.reopenDate) return
    this.setData({ submitting: true })
    reopenSalesLeadWorkflow(this.data.leadId, {
      nextTargetAt: this.data.reopenDate + ' 09:00:00',
      note: (this.data.reopenNote || '').trim()
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '重新开启失败' }
      wx.showToast({ title: '已重新开启开发', icon: 'success' })
      this.setData({ showReopen: false })
      this.loadData()
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '重新开启失败'),
      icon: 'none'
    })).finally(() => this.setData({ submitting: false }))
  },

  submitNextAction() {
    if (this.data.submitting) return
    const option = this.data.actionOptions.find(item =>
      item.code === this.data.nextActionCode)
    const note = (this.data.nextActionNote || '').trim()
    if (!option) {
      wx.showToast({ title: '请选择下一步要做什么', icon: 'none' })
      return
    }
    if (!this.data.nextActionDate || !this.data.nextActionTime) {
      wx.showToast({ title: '请选择计划时间', icon: 'none' })
      return
    }
    if (localDateTimeValue(this.data.nextActionDate, this.data.nextActionTime)
        <= Date.now()) {
      wx.showToast({ title: '计划时间必须晚于当前时间', icon: 'none' })
      return
    }
    if (option.code === 'OTHER' && !note) {
      wx.showToast({ title: '请填写具体要做的事情', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    createSalesNextAction(this.data.latestActivityId, {
      actionType: option.actionType,
      title: option.title,
      description: note,
      targetAt: this.data.nextActionDate + ' ' + this.data.nextActionTime + ':00'
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '下一步创建失败' }
      wx.showToast({ title: '下一步已安排', icon: 'success' })
      this.setData({ showNextAction: false })
      this.loadData()
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '下一步创建失败'),
      icon: 'none'
    })).finally(() => this.setData({ submitting: false }))
  },

  noop() {}
})
