import {
  downloadSalesVisitPhoto,
  getSalesLeadPhotos,
  getSalesLeads,
  getSalesNextActions,
  getSalesQuotations,
  getSalesVisits
} from '../../../lib/apiSales.js'

const app = getApp()

function localDateKey(date) {
  return date.getFullYear() + '-'
    + String(date.getMonth() + 1).padStart(2, '0') + '-'
    + String(date.getDate()).padStart(2, '0')
}

function dateKey(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 10)
}

function displayDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

function recentVisitLabel(value) {
  if (!value) return '未记录'
  const text = displayDate(value)
  const key = text.slice(0, 10)
  const time = text.slice(11, 16)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (key === localDateKey(today)) return '今天 ' + time
  if (key === localDateKey(yesterday)) return '昨天 ' + time
  return text.slice(5)
}

function timestamp(value) {
  if (!value) return 0
  const result = new Date(String(value).replace('T', ' ').replace(/-/g, '/')).getTime()
  return Number.isFinite(result) ? result : 0
}

function visitStats(visits) {
  const result = {}
  ;(visits || []).forEach(visit => {
    const leadId = Number(visit.leadId)
    if (!leadId) return
    if (!result[leadId]) result[leadId] = { count: 0, latest: visit }
    result[leadId].count += 1
  })
  return result
}

function quotationStats(quotations, visits) {
  const visitLeadMap = {}
  ;(visits || []).forEach(visit => {
    if (visit.visitId && visit.leadId) visitLeadMap[visit.visitId] = Number(visit.leadId)
  })
  const result = {}
  ;(quotations || []).forEach(quotation => {
    if (quotation.statusCode === 'DRAFT') return
    const leadId = Number(quotation.leadId)
      || visitLeadMap[quotation.visitId] || null
    if (!leadId) return
    result[leadId] = (result[leadId] || 0) + 1
  })
  return result
}

function actionMap(pending, inProgress) {
  const result = {}
  ;(pending || []).forEach(action => {
    if (action.leadId && !result[action.leadId]) result[action.leadId] = action
  })
  ;(inProgress || []).forEach(action => {
    if (action.leadId) result[action.leadId] = action
  })
  return result
}

function customerStage(statusCode, latestResult, intentCode, quoteCount) {
  if (statusCode === 'CONVERTED') {
    return { code: 'CONVERTED', name: '已转客户' }
  }
  if (statusCode === 'CLOSED') {
    return { code: 'CLOSED', name: '已关闭' }
  }
  if (quoteCount > 0 || latestResult === 'QUOTED') {
    return { code: 'QUOTED', name: '已报价' }
  }
  if (latestResult === 'INTERESTED' || latestResult === 'TRIAL_WILLING'
    || latestResult === 'DEAL' || intentCode === 'WARM' || intentCode === 'HOT') {
    return { code: 'INTERESTED', name: '有意向' }
  }
  return { code: 'NEW', name: '刚接触' }
}

function presentLead(item, stats, quoteCount, nextAction) {
  const visitData = stats || {}
  const latest = visitData.latest || {}
  const latestAt = latest.visitAt || item.latestVisitAt || item.createdAt
  const stage = customerStage(
    item.statusCode, latest.resultCode, item.intentCode, quoteCount || 0)
  const workflowFinished = stage.code === 'CONVERTED' || stage.code === 'CLOSED'
  const currentAction = workflowFinished ? null : nextAction
  const actionTarget = currentAction && currentAction.targetAt
  const targetDate = dateKey(actionTarget)
  const today = localDateKey(new Date())
  const actionOverdue = !!(actionTarget && timestamp(actionTarget) < Date.now())
  let actionReminderCode = ''
  let actionReminderLabel = ''
  if (currentAction) {
    if (actionOverdue) {
      actionReminderCode = 'OVERDUE'
      actionReminderLabel = '已逾期'
    } else if (targetDate === today) {
      actionReminderCode = 'TODAY'
      actionReminderLabel = '今天联系'
    } else if (currentAction.statusCode === 'IN_PROGRESS') {
      actionReminderCode = 'IN_PROGRESS'
      actionReminderLabel = '处理中'
    } else if (actionTarget) {
      actionReminderCode = 'SCHEDULED'
      actionReminderLabel = '已安排'
    } else {
      actionReminderCode = 'PENDING'
      actionReminderLabel = '待处理'
    }
  }
  const shopName = item.shopName || '未命名门店'
  return Object.assign({}, item, {
    shopName,
    shopInitial: shopName.slice(0, 1),
    address: item.address || '地址未填写',
    stageCode: stage.code,
    stageLabel: stage.name,
    latestVisitLabel: recentVisitLabel(latestAt),
    latestVisitAt: latestAt,
    latestNote: latest.visitSummary || latest.note || '',
    visitCount: visitData.count || 0,
    quoteCount: quoteCount || 0,
    workflowFinished,
    hasNextAction: !!currentAction,
    nextActionId: currentAction ? currentAction.actionId : null,
    nextActionStatus: currentAction ? currentAction.statusCode : '',
    nextActionTitle: workflowFinished
      ? (stage.code === 'CONVERTED' ? '已转为正式客户' : '客户开发已关闭')
      : (currentAction ? (currentAction.actionTitle || '客户跟进') : '尚未安排下一步'),
    nextActionTargetLabel: actionTarget ? displayDate(actionTarget) : '',
    nextActionOverdue: actionOverdue,
    actionReminderCode,
    actionReminderLabel,
    nextActionButton: workflowFinished ? '' : (currentAction ? '去处理' : '安排跟进'),
    coverPhoto: ''
  })
}

function filterOptions(leads) {
  return [
    { code: 'ALL', name: '全部', count: leads.length },
    { code: 'NEW', name: '刚接触', count: leads.filter(item => item.stageCode === 'NEW').length },
    { code: 'INTERESTED', name: '有意向', count: leads.filter(item => item.stageCode === 'INTERESTED').length },
    { code: 'QUOTED', name: '已报价', count: leads.filter(item => item.stageCode === 'QUOTED').length },
    { code: 'CONVERTED', name: '已转客户', count: leads.filter(item => item.stageCode === 'CONVERTED').length },
    { code: 'CLOSED', name: '已关闭', count: leads.filter(item => item.stageCode === 'CLOSED').length }
  ]
}

function filterTitle(code) {
  return {
    ALL: '全部新客户',
    NEW: '刚接触的客户',
    INTERESTED: '有意向的客户',
    QUOTED: '已经报价的客户',
    CONVERTED: '已转为正式客户',
    CLOSED: '已关闭的客户'
  }[code] || '全部新客户'
}

Page({
  data: {
    loading: true,
    activeFilter: 'ALL',
    filters: [],
    allLeads: [],
    visibleLeads: [],
    developingCount: 0,
    todayContactCount: 0,
    overdueCount: 0,
    listTitle: '全部新客户'
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadData()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/sales/home/home' })
  },

  loadData() {
    this.setData({ loading: true })
    Promise.all([
      getSalesLeads({ status: 'FOLLOWING', limit: 100 }),
      getSalesLeads({ status: 'CONVERTED', limit: 100 }),
      getSalesLeads({ status: 'CLOSED', limit: 100 }),
      getSalesVisits({ limit: 100 }),
      getSalesNextActions({ status: 'PENDING', limit: 200 }),
      getSalesNextActions({ status: 'IN_PROGRESS', limit: 200 }),
      getSalesQuotations({ limit: 100 })
    ]).then(results => {
      const bodies = results.map(item => item.result || {})
      const failed = bodies.find(item => item.code !== 0)
      if (failed) throw { businessMessage: failed.msg || '陌生客户加载失败' }

      const rawVisits = bodies[3].data || []
      const prospectVisits = rawVisits.filter(item =>
        !item.departmentId && item.resultCode !== 'CUSTOMER_REVISIT')
      const visitsByLead = visitStats(prospectVisits)
      const quotesByLead = quotationStats(bodies[6].data || [], prospectVisits)
      const actionsByLead = actionMap(bodies[4].data || [], bodies[5].data || [])
      const followingLeads = bodies[0].data || []
      const rawLeads = followingLeads.concat(bodies[1].data || [], bodies[2].data || [])
      const leads = rawLeads.map(item => presentLead(
        item,
        visitsByLead[item.leadId],
        quotesByLead[item.leadId],
        actionsByLead[item.leadId]
      )).sort((a, b) => timestamp(b.latestVisitAt) - timestamp(a.latestVisitAt))
      const filters = filterOptions(leads)
      const today = localDateKey(new Date())

      this.setData({
        allLeads: leads,
        filters,
        developingCount: followingLeads.length,
        todayContactCount: leads.filter(item => item.hasNextAction
          && dateKey(item.nextActionTargetLabel) === today).length,
        overdueCount: leads.filter(item => item.nextActionOverdue).length
      }, () => {
        this.refreshVisibleLeads()
        this.loadCoverPhotos(leads)
      })
    }).catch(error => wx.showToast({
      title: error.businessMessage
        || app.describeSalesRequestError(error, '陌生客户加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  loadCoverPhotos(leads) {
    const rows = leads || []
    if (!rows.length) return
    if (!this._coverCache) this._coverCache = {}
    Promise.all(rows.map(item => {
      if (this._coverCache[item.leadId]) {
        return Promise.resolve({
          leadId: item.leadId,
          path: this._coverCache[item.leadId]
        })
      }
      const attachment = item.coverAttachmentId
        ? Promise.resolve(item.coverAttachmentId)
        : getSalesLeadPhotos(item.leadId).then(res => {
          const body = res.result || {}
          if (body.code !== 0) return null
          const photos = body.data || []
          return photos.length ? photos[0].attachmentId : null
        })
      return attachment.then(attachmentId => {
        if (!attachmentId) return { leadId: item.leadId, path: '' }
        return downloadSalesVisitPhoto(attachmentId).then(path => {
          this._coverCache[item.leadId] = path
          return { leadId: item.leadId, path }
        })
      })
      .catch(() => ({ leadId: item.leadId, path: '' }))
    })).then(results => {
      const pathMap = {}
      results.forEach(item => { pathMap[item.leadId] = item.path })
      const allLeads = this.data.allLeads.map(item => Object.assign({}, item, {
        coverPhoto: pathMap[item.leadId] || item.coverPhoto || ''
      }))
      this.setData({ allLeads }, () => this.refreshVisibleLeads())
    })
  },

  refreshVisibleLeads() {
    const active = this.data.activeFilter
    const visible = this.data.allLeads.filter(item => {
      return active === 'ALL' || item.stageCode === active
    })
    this.setData({
      visibleLeads: visible,
      listTitle: filterTitle(active)
    })
  },

  switchFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.code }, () => {
      this.refreshVisibleLeads()
    })
  },

  addVisit() {
    wx.navigateTo({ url: '/pages/sales/newCustomerVisitAdd/newCustomerVisitAdd' })
  },

  openProspect(e) {
    const leadId = Number(e.currentTarget.dataset.leadId)
    if (!leadId) return
    wx.navigateTo({ url: '/pages/sales/prospectDetail/prospectDetail?leadId=' + leadId })
  },

  handleLeadAction(e) {
    const leadId = Number(e.currentTarget.dataset.leadId)
    const actionId = Number(e.currentTarget.dataset.actionId)
    if (actionId) {
      wx.navigateTo({
        url: '/pages/sales/nextActionDetail/nextActionDetail?actionId=' + actionId
      })
      return
    }
    if (leadId) {
      wx.navigateTo({
        url: '/pages/sales/prospectDetail/prospectDetail?leadId=' + leadId + '&schedule=1'
      })
    }
  }
})
