import apiUrl from '../../../config.js'
import {
  downloadSalesVisitPhoto,
  getSalesNextActions
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

function displayDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

function actionTime(value) {
  if (!value) return Number.MAX_SAFE_INTEGER
  const result = new Date(String(value).replace('T', ' ').replace(/-/g, '/')).getTime()
  return Number.isFinite(result) ? result : Number.MAX_SAFE_INTEGER
}

function absoluteImage(path) {
  if (!path) return ''
  if (/^(https?:|wxfile:)/i.test(path)) return path
  return apiUrl.server + String(path).replace(/^\//, '')
}

function present(item) {
  const now = Date.now()
  const target = item.targetAt ? new Date(String(item.targetAt).replace(/-/g, '/')).getTime() : 0
  const customerName = item.subjectNameSnapshot || '未命名客户'
  return Object.assign({}, item, {
    customerName,
    customerInitial: customerName.slice(0, 1),
    customerTypeLabel: item.departmentId ? '正式客户' : '新客户',
    customerAddress: item.subjectAddress || '地址未填写',
    customerBusinessType: item.businessTypeName || '',
    coverPhoto: absoluteImage(item.departmentFilePath),
    actionLabel: ACTION_LABELS[item.actionType] || item.actionTitle || '销售任务',
    displayTitle: ACTION_TITLES[item.actionType] || item.actionTitle || '处理销售任务',
    targetLabel: displayDate(item.targetAt),
    resultLabel: RESULT_LABELS[item.completionResult] || item.completionResult || '',
    overdue: item.statusCode !== 'COMPLETED' && target > 0 && target < now
  })
}

Page({
  data: {
    loading: true,
    activeTab: 'TODO',
    todo: [],
    completed: [],
    visibleActions: [],
    focusActionId: null
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      focusActionId: Number(options.actionId) || null
    })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadActions()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/sales/home/home' })
  },

  loadActions() {
    this.setData({ loading: true })
    Promise.all([
      getSalesNextActions({ status: 'PENDING', limit: 200 }),
      getSalesNextActions({ status: 'IN_PROGRESS', limit: 200 }),
      getSalesNextActions({ status: 'COMPLETED', limit: 200 })
    ]).then(results => {
      const bodies = results.map(item => item.result || {})
      const failed = bodies.find(item => item.code !== 0)
      if (failed) {
        wx.showToast({ title: failed.msg || '任务加载失败', icon: 'none' })
        return
      }
      const pending = (bodies[0].data || []).map(present)
      const inProgress = (bodies[1].data || []).map(present)
      const completed = (bodies[2].data || []).map(present)
      const todo = pending.concat(inProgress).sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
        return actionTime(a.targetAt) - actionTime(b.targetAt)
      })
      let activeTab = this.data.activeTab
      const focusId = this.data.focusActionId
      if (focusId) {
        activeTab = completed.some(item => item.actionId === focusId) ? 'COMPLETED' : 'TODO'
      }
      this.setData({ todo, completed, activeTab }, () => {
        this.refreshVisible()
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '任务加载失败'), icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  refreshVisible() {
    const map = {
      TODO: this.data.todo,
      COMPLETED: this.data.completed
    }
    const visibleActions = map[this.data.activeTab] || []
    this.setData({ visibleActions }, () => this.loadCustomerPhotos(visibleActions))
  },

  loadCustomerPhotos(actions) {
    const targets = (actions || []).filter(item =>
      !item.coverPhoto && item.coverAttachmentId)
    if (!targets.length) return
    if (!this._photoCache) this._photoCache = {}
    Promise.all(targets.map(item => {
      const attachmentId = Number(item.coverAttachmentId)
      if (this._photoCache[attachmentId]) {
        return Promise.resolve({ actionId: item.actionId, path: this._photoCache[attachmentId] })
      }
      return downloadSalesVisitPhoto(attachmentId).then(path => {
        this._photoCache[attachmentId] = path
        return { actionId: item.actionId, path }
      }).catch(() => ({ actionId: item.actionId, path: '' }))
    })).then(results => {
      const photoMap = {}
      results.forEach(item => { photoMap[item.actionId] = item.path })
      this.setData({
        visibleActions: this.data.visibleActions.map(item => Object.assign({}, item, {
          coverPhoto: photoMap[item.actionId] || item.coverPhoto || ''
        }))
      })
    })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.status, focusActionId: null }, () => {
      this.refreshVisible()
    })
  },

  openActionDetail(e) {
    const actionId = Number(e.currentTarget.dataset.id)
    if (!actionId) return
    wx.navigateTo({
      url: '/pages/sales/nextActionDetail/nextActionDetail?actionId=' + actionId
    })
  }
})
