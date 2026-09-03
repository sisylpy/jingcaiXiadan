import {
  completeSalesNextAction,
  getSalesLeadWorkflow,
  getSalesNextAction,
  getSalesQuotations,
  rescheduleSalesNextAction,
  startSalesNextAction
} from '../../../lib/apiSales.js'

const app = getApp()

const ACTION_LABELS = {
  CONTACT: '客户联系',
  QUOTE: '报价跟进',
  RETURN_VISIT: '客户回访',
  AFTER_SALES_REVIEW: '售后问题处理',
  COMPLAINT_REVIEW: '客户投诉处理',
  FOLLOW_UP: '继续跟进',
  OTHER: '其他任务'
}

const ACTION_TITLES = {
  AFTER_SALES_REVIEW: '处理售后问题',
  COMPLAINT_REVIEW: '处理客户投诉'
}

const RESULT_LABELS = {
  DEAL: '已成交',
  SOLVED: '已解决',
  NO_DEMAND: '暂无需求',
  CONTINUE: '继续跟进',
  ABANDON: '放弃'
}

const QUOTE_STATUS_LABELS = {
  DRAFT: '草稿',
  FINALIZED: '已定稿',
  EXPIRED: '已过期',
  CLOSED: '已关闭'
}

const VISIT_RESULT_LABELS = {
  NO_CONTACT: '未接触老板',
  NO_INTEREST: '无兴趣',
  INTERESTED: '有兴趣',
  QUOTED: '已报价',
  TRIAL_WILLING: '愿意试单',
  DEAL: '已成交',
  CUSTOMER_REVISIT: '客户回访'
}

const GENERIC_RESULT_OPTIONS = [
  { code: 'DEAL', name: '已成交', resultCode: 'DEAL' },
  { code: 'SOLVED', name: '已解决', resultCode: 'SOLVED' },
  { code: 'NO_DEMAND', name: '暂无需求', resultCode: 'NO_DEMAND' },
  { code: 'CONTINUE', name: '继续跟进', resultCode: 'CONTINUE', requiresNext: true },
  { code: 'ABANDON', name: '放弃', resultCode: 'ABANDON' }
]

const QUOTE_RESULT_OPTIONS = [
  { code: 'CUSTOMER_ORDER', name: '客户下单', resultCode: 'DEAL' },
  { code: 'KEEP_CONSIDERING', name: '继续考虑', resultCode: 'CONTINUE', requiresNext: true },
  { code: 'REQUOTE', name: '需要重新报价', resultCode: 'CONTINUE', requiresNext: true },
  { code: 'PRICE_OBJECTION', name: '价格有异议', resultCode: 'CONTINUE', requiresNext: true },
  { code: 'TEMP_NO', name: '暂时不要', resultCode: 'NO_DEMAND' },
  { code: 'UNREACHABLE', name: '联系不上', resultCode: 'CONTINUE', requiresNext: true }
]

function datePart(date) {
  return date.getFullYear() + '-'
    + String(date.getMonth() + 1).padStart(2, '0') + '-'
    + String(date.getDate()).padStart(2, '0')
}

function timePart(date) {
  return String(date.getHours()).padStart(2, '0') + ':'
    + String(date.getMinutes()).padStart(2, '0')
}

function dateTimeAfterHours(hours) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000)
  return { date: datePart(date), time: timePart(date) }
}

function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value
    : new Date(typeof value === 'string' ? value.replace(' ', 'T') : value)
  return Number.isNaN(date.getTime()) ? null : date
}

function pickerDateTime(value) {
  const parsed = parseDate(value)
  const date = parsed && parsed.getTime() > Date.now()
    ? parsed : new Date(Date.now() + 2 * 60 * 60 * 1000)
  return { date: datePart(date), time: timePart(date) }
}

function localDateTime(dateText, timeText) {
  const dateParts = String(dateText || '').split('-').map(Number)
  const timeParts = String(timeText || '').split(':').map(Number)
  if (dateParts.length !== 3 || timeParts.length !== 2) return NaN
  return new Date(dateParts[0], dateParts[1] - 1, dateParts[2],
    timeParts[0], timeParts[1], 0).getTime()
}

function displayDate(value) {
  const parsed = parseDate(value)
  if (parsed) return datePart(parsed) + ' ' + timePart(parsed)
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

function displayDay(value) {
  const text = displayDate(value)
  return text === '-' ? text : text.slice(0, 10)
}

function money(value) {
  if (value === null || value === undefined || value === '') return '¥0'
  return '¥' + Number(value).toFixed(2).replace(/\.00$/, '')
}

function sourceTitle(actionType) {
  if (actionType === 'QUOTE') return '任务来源'
  if (actionType === 'RETURN_VISIT') return '原回访记录'
  if (actionType === 'AFTER_SALES_REVIEW') return '原售后问题'
  if (actionType === 'COMPLAINT_REVIEW') return '原投诉记录'
  return '原始记录'
}

function sourceTimeLabel(activity) {
  const type = activity && activity.activityType
  if (type === 'VISIT_RETURN') return '回访时间'
  if (type === 'VISIT_NEW') return '拜访时间'
  if (type === 'QUOTE') return '报价时间'
  if (type === 'SERVICE' || type === 'COMPLAINT') return '问题提出时间'
  return '记录时间'
}

function activitySummary(value) {
  const text = (value || '').trim()
  const prefix = '拜访结果：'
  if (text.indexOf(prefix) !== 0) return text
  const code = text.slice(prefix.length)
  return prefix + (VISIT_RESULT_LABELS[code] || code)
}

function statusLabel(code) {
  if (code === 'COMPLETED') return '已完成'
  return '待办'
}

function presentAction(action, activity) {
  const source = activity || {}
  const actionDescription = (action.actionDescription || '').trim()
  const sourceContent = activitySummary(source.activityContent)
  const customerFeedback = (source.customerFeedback || '').trim()
  return Object.assign({}, action, {
    actionLabel: ACTION_LABELS[action.actionType] || action.actionTitle || '销售任务',
    displayTitle: ACTION_TITLES[action.actionType] || action.actionTitle || '处理销售任务',
    statusLabel: statusLabel(action.statusCode),
    targetLabel: displayDate(action.targetAt),
    createdAtLabel: displayDate(action.createdAt),
    completedAtLabel: displayDate(action.completedAt),
    resultLabel: RESULT_LABELS[action.completionResult] || action.completionResult || '',
    sourceTitle: sourceTitle(action.actionType),
    sourceTimeName: sourceTimeLabel(source),
    sourceTimeLabel: displayDate(source.activityAt || source.createdAt),
    sourceSummary: sourceContent || action.actionTitle || '未填写原始内容',
    sourceFeedback: customerFeedback || (actionDescription !== sourceContent
      ? actionDescription : '')
  })
}

function sequenceLabel(sequence) {
  return sequence === 1 ? '首次报价' : '第' + sequence + '次报价'
}

function presentQuotation(quotation, sequence) {
  const isDraft = quotation.statusCode === 'DRAFT'
  return Object.assign({}, quotation, {
    sequenceLabel: isDraft ? '报价草稿' : sequenceLabel(sequence),
    statusLabel: QUOTE_STATUS_LABELS[quotation.statusCode] || quotation.statusCode || '未知状态',
    amountLabel: money(quotation.totalAmount),
    timeLabel: displayDate(quotation.finalizedAt || quotation.updatedAt || quotation.createdAt),
    validUntilLabel: displayDay(quotation.validUntil)
  })
}

function resultOptions(actionType) {
  return actionType === 'QUOTE' ? QUOTE_RESULT_OPTIONS : GENERIC_RESULT_OPTIONS
}

function leadStage(workflow, quoteCount) {
  const lead = workflow && workflow.lead
  if (!lead) return quoteCount ? '已报价（第' + quoteCount + '次）' : '跟进中'
  if (lead.statusCode === 'CLOSED') return '开发已关闭'
  if (lead.statusCode === 'CONVERTED') return '已成交'
  if (quoteCount) return '已报价（第' + quoteCount + '次）'
  const activities = workflow.activities || []
  for (let i = 0; i < activities.length; i += 1) {
    if (activities[i].activityType === 'QUOTE') return '已报价'
    if (activities[i].activityType === 'VISIT_NEW') break
  }
  const visit = (workflow.visits || [])[0] || {}
  return VISIT_RESULT_LABELS[visit.resultCode] || '开发中'
}

function latestMeaningfulActivity(workflow) {
  const rows = workflow && workflow.activities ? workflow.activities : []
  for (let i = 0; i < rows.length; i += 1) {
    const feedback = (rows[i].customerFeedback || '').trim()
    if (feedback) return { feedback, content: activitySummary(rows[i].activityContent) }
  }
  return null
}

Page({
  data: {
    actionId: null,
    loading: true,
    quoteLoading: false,
    loaded: false,
    action: null,
    activity: null,
    currentContext: null,
    quotationRows: [],
    quoteCount: 0,
    resultOptions: GENERIC_RESULT_OPTIONS,
    completionResult: '',
    completionNote: '',
    requiresNextContact: false,
    todayDate: datePart(new Date()),
    nextTargetDate: dateTimeAfterHours(2).date,
    nextTargetTime: dateTimeAfterHours(2).time,
    showReschedule: false,
    rescheduleDate: dateTimeAfterHours(2).date,
    rescheduleTime: dateTimeAfterHours(2).time,
    submitting: false,
    rescheduling: false
  },

  onLoad(options) {
    const actionId = Number(options.actionId)
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      actionId
    })
    if (!actionId) {
      this.setData({ loading: false })
      wx.showToast({ title: '任务参数不正确', icon: 'none' })
      return
    }
    this.loadDetail()
  },

  onShow() {
    if (this.data.loaded && this.data.action && this.data.action.actionType === 'QUOTE') {
      this.loadQuotationContext(this.data.action)
    }
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/sales/leads/leads' })
  },

  loadDetail() {
    this.setData({ loading: true })
    getSalesNextAction(this.data.actionId).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '任务详情加载失败' }
      const data = body.data || {}
      const rawAction = data.action || {}
      const activity = data.activity || {}
      const action = presentAction(rawAction, activity)
      const nextPicker = pickerDateTime(action.targetAt)
      this.setData({
        action,
        activity,
        loaded: true,
        resultOptions: resultOptions(action.actionType),
        rescheduleDate: nextPicker.date,
        rescheduleTime: nextPicker.time
      })
      const loads = []
      if (action.leadId) loads.push(this.loadLeadContext(action))
      else this.refreshCurrentContext(action)
      if (action.actionType === 'QUOTE') loads.push(this.loadQuotationContext(action))
      return Promise.all(loads)
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '任务详情加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  loadLeadContext(action) {
    return getSalesLeadWorkflow(action.leadId).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '客户情况加载失败' }
      this._leadWorkflow = body.data || {}
      this.refreshCurrentContext(action)
    }).catch(error => {
      this.refreshCurrentContext(action)
      wx.showToast({
        title: error.businessMessage || app.describeSalesRequestError(error, '客户情况加载失败'),
        icon: 'none'
      })
    })
  },

  refreshCurrentContext(action) {
    const workflow = this._leadWorkflow || null
    const latest = latestMeaningfulActivity(workflow)
    const feedback = latest && latest.feedback
      ? latest.feedback : (action.sourceFeedback || '暂无客户反馈')
    this.setData({
      currentContext: {
        customerName: action.subjectNameSnapshot || '未命名客户',
        stageLabel: leadStage(workflow, this.data.quoteCount),
        quoteLabel: this.data.quoteCount ? this.data.quoteCount + '次' : '暂无',
        recentContent: latest && latest.content ? latest.content : action.sourceSummary,
        feedback
      }
    })
  },

  loadQuotationContext(action) {
    const params = { limit: 50 }
    if (action.departmentId) params.departmentId = action.departmentId
    else if (action.leadId) params.leadId = action.leadId
    else {
      this.setData({ quotationRows: [], quoteCount: 0 })
      this.refreshCurrentContext(action)
      return Promise.resolve()
    }
    this.setData({ quoteLoading: true })
    return getSalesQuotations(params).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '报价记录加载失败' }
      const quotations = body.data || []
      const submitted = quotations.filter(item => item.statusCode !== 'DRAFT')
      const sequenceById = {}
      submitted.slice().reverse().forEach((item, index) => {
        sequenceById[item.quotationId] = index + 1
      })
      const visible = (submitted.length ? submitted : quotations).slice(0, 5)
      this.setData({
        quoteCount: submitted.length,
        quotationRows: visible.map(item => presentQuotation(
          item, sequenceById[item.quotationId] || 0))
      })
      this.refreshCurrentContext(action)
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '报价记录加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ quoteLoading: false }))
  },

  openQuotation(e) {
    const action = this.data.action || {}
    const dataset = e && e.currentTarget ? e.currentTarget.dataset : {}
    const quotationId = Number(dataset.id)
    const quotationStatus = dataset.status
    let url
    if (quotationId) {
      url = quotationStatus === 'DRAFT'
        ? '/pages/sales/quotation/quotation?quotationId=' + quotationId
        : '/pages/sales/quotationPreview/quotationPreview?quotationId=' + quotationId
    } else {
      url = '/pages/sales/quotation/quotation?shopName='
        + encodeURIComponent(action.subjectNameSnapshot || '')
      if (action.departmentId) url += '&departmentId=' + action.departmentId
      else if (action.leadId) url += '&leadId=' + action.leadId
    }
    wx.navigateTo({ url })
  },

  selectResult(e) {
    const code = e.currentTarget.dataset.code
    const selected = this.data.resultOptions.find(item => item.code === code)
    this.setData({
      completionResult: code,
      requiresNextContact: !!(selected && selected.requiresNext)
    })
  },

  onCompletionNote(e) {
    this.setData({ completionNote: e.detail.value })
  },

  onNextDate(e) {
    this.setData({ nextTargetDate: e.detail.value })
  },

  onNextTime(e) {
    this.setData({ nextTargetTime: e.detail.value })
  },

  completionPayload(option) {
    const note = (this.data.completionNote || '').trim()
    const prefix = this.data.action.actionType === 'QUOTE'
      ? '跟进结果：' + option.name : ''
    return {
      resultCode: option.resultCode,
      completionNote: [prefix, note].filter(Boolean).join('；').slice(0, 500),
      nextTargetAt: option.requiresNext
        ? this.data.nextTargetDate + ' ' + this.data.nextTargetTime + ':00' : null
    }
  },

  submitComplete() {
    const action = this.data.action
    if (this.data.submitting || !action || action.statusCode === 'COMPLETED') return
    const option = this.data.resultOptions.find(
      item => item.code === this.data.completionResult)
    if (!option) {
      wx.showToast({ title: '请选择本次跟进结果', icon: 'none' })
      return
    }
    if (option.requiresNext) {
      const nextTime = localDateTime(this.data.nextTargetDate, this.data.nextTargetTime)
      if (!nextTime || nextTime <= Date.now()) {
        wx.showToast({ title: '下次联系时间必须晚于当前时间', icon: 'none' })
        return
      }
    }
    this.setData({ submitting: true })
    const start = action.statusCode === 'PENDING'
      ? startSalesNextAction(action.actionId) : Promise.resolve(null)
    start.then(startRes => {
      const startBody = startRes && startRes.result
      if (startBody && startBody.code !== 0) {
        throw { businessMessage: startBody.msg || '任务开始失败' }
      }
      return completeSalesNextAction(action.actionId, this.completionPayload(option))
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '跟进结果提交失败' }
      wx.showToast({
        title: option.requiresNext ? '已安排下次跟进' : '跟进已完成',
        icon: 'success'
      })
      setTimeout(() => this.goBack(), 500)
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '跟进结果提交失败'),
      icon: 'none'
    })).finally(() => this.setData({ submitting: false }))
  },

  openReschedule() {
    const picker = pickerDateTime(this.data.action && this.data.action.targetAt)
    this.setData({
      showReschedule: true,
      rescheduleDate: picker.date,
      rescheduleTime: picker.time
    })
  },

  closeReschedule() {
    if (!this.data.rescheduling) this.setData({ showReschedule: false })
  },

  noop() {},

  onRescheduleDate(e) {
    this.setData({ rescheduleDate: e.detail.value })
  },

  onRescheduleTime(e) {
    this.setData({ rescheduleTime: e.detail.value })
  },

  submitReschedule() {
    if (this.data.rescheduling) return
    const target = localDateTime(this.data.rescheduleDate, this.data.rescheduleTime)
    if (!target || target <= Date.now()) {
      wx.showToast({ title: '新的跟进时间必须晚于当前时间', icon: 'none' })
      return
    }
    this.setData({ rescheduling: true })
    rescheduleSalesNextAction(this.data.actionId, {
      targetAt: this.data.rescheduleDate + ' ' + this.data.rescheduleTime + ':00'
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '任务改期失败' }
      this.setData({
        action: presentAction(body.data || this.data.action, this.data.activity),
        showReschedule: false
      })
      wx.showToast({ title: '跟进时间已修改', icon: 'success' })
    }).catch(error => wx.showToast({
      title: error.businessMessage || app.describeSalesRequestError(error, '任务改期失败'),
      icon: 'none'
    })).finally(() => this.setData({ rescheduling: false }))
  }
})
