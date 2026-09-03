import apiUrl from '../../../config.js'
import {
  downloadSalesVisitPhoto,
  getSalesDailyVisits
} from '../../../lib/apiSales.js'

const app = getApp()

const FEEDBACK_LABELS = {
  SATISFIED: '满意',
  PRICE: '价格问题',
  GOODS_MISSING: '商品不全',
  QUALITY: '质量问题',
  DELIVERY: '配送问题',
  SERVICE: '服务问题',
  OTHER: '其他'
}

const RESULT_LABELS = {
  NO_CONTACT: '未接触老板',
  NO_INTEREST: '无兴趣',
  INTERESTED: '有兴趣',
  QUOTED: '已报价',
  TRIAL_WILLING: '愿意试单',
  DEAL: '已成交'
}

function pad(value) {
  return Number(value) < 10 ? '0' + Number(value) : String(value)
}

function localDateKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function timeLabel(value) {
  if (!value) return '时间未记录'
  const text = String(value).replace('T', ' ')
  return text.length >= 16 ? text.slice(11, 16) : text
}

function dateTimeLabel(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

function statusView(item) {
  if (!Number(item.followUpRequired)) {
    return { statusLabel: '已完成', statusClass: 'done' }
  }
  if (item.actionStatus === 'COMPLETED') {
    return { statusLabel: '已跟进', statusClass: 'done' }
  }
  return { statusLabel: '跟进中', statusClass: 'following' }
}

function announcementView(status) {
  if (status === 'PENDING') return '公告审核中'
  if (status === 'PUBLISHED') return '已发布公告'
  if (status === 'WITHDRAWN') return '公告已撤回'
  return ''
}

function absoluteImage(path) {
  if (!path) return ''
  if (/^(https?:|wxfile:)/i.test(path)) return path
  return apiUrl.server + String(path).replace(/^\//, '')
}

function presentVisit(item) {
  const isReturn = item.resultCode === 'CUSTOMER_REVISIT'
  const shopName = item.shopName || '未命名客户'
  return Object.assign({}, item, statusView(item), {
    shopName,
    customerInitial: shopName.slice(0, 1),
    customerTypeLabel: item.departmentId ? '正式客户' : '新客户',
    address: item.address || '地址未填写',
    businessTypeName: item.businessTypeName || '',
    coverPhoto: absoluteImage(item.departmentFilePath),
    visitTypeLabel: isReturn ? '客户回访' : '新客拜访',
    resultLabel: isReturn
      ? (FEEDBACK_LABELS[item.feedbackCode] || '客户反馈')
      : (RESULT_LABELS[item.resultCode] || '拜访记录'),
    visitTimeLabel: timeLabel(item.visitAt),
    nextFollowLabel: dateTimeLabel(item.nextFollowAt),
    announcementLabel: announcementView(item.announcementStatus),
    canOpenAction: !!item.nextActionId,
    canOpenSubject: !!(item.departmentId || item.leadId)
  })
}

Page({
  data: {
    statusBarHeight: 0,
    loading: true,
    visitDate: localDateKey(new Date()),
    visits: [],
    followUpCount: 0,
    completedCount: 0
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadVisits()
  },

  onPullDownRefresh() {
    this.loadVisits(true)
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/sales/home/home' })
  },

  onDateChange(e) {
    this.setData({ visitDate: e.detail.value })
    this.loadVisits()
  },

  loadVisits(fromPullDown) {
    this.setData({ loading: true })
    getSalesDailyVisits(this.data.visitDate).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw { businessMessage: body.msg || '回访记录加载失败' }
      const visits = (body.data || []).map(presentVisit)
      this.setData({
        visits,
        followUpCount: visits.filter(item => item.statusClass === 'following').length,
        completedCount: visits.filter(item => item.statusClass === 'done').length
      }, () => this.loadLeadPhotos(visits))
    }).catch(error => wx.showToast({
      title: error.businessMessage
        || app.describeSalesRequestError(error, '回访记录加载失败'),
      icon: 'none'
    })).finally(() => {
      this.setData({ loading: false })
      if (fromPullDown) wx.stopPullDownRefresh()
    })
  },

  loadLeadPhotos(visits) {
    const targets = (visits || []).filter(item =>
      !item.coverPhoto && item.coverAttachmentId)
    if (!targets.length) return
    if (!this._photoCache) this._photoCache = {}
    Promise.all(targets.map(item => {
      const attachmentId = Number(item.coverAttachmentId)
      if (this._photoCache[attachmentId]) {
        return Promise.resolve({ visitId: item.visitId, path: this._photoCache[attachmentId] })
      }
      return downloadSalesVisitPhoto(attachmentId).then(path => {
        this._photoCache[attachmentId] = path
        return { visitId: item.visitId, path }
      }).catch(() => ({ visitId: item.visitId, path: '' }))
    })).then(results => {
      const photoMap = {}
      results.forEach(item => { photoMap[item.visitId] = item.path })
      this.setData({
        visits: this.data.visits.map(item => Object.assign({}, item, {
          coverPhoto: photoMap[item.visitId] || item.coverPhoto || ''
        }))
      })
    })
  },

  startVisit() {
    wx.showActionSheet({
      itemList: ['开发新客户', '回访老客户'],
      success: result => {
        if (result.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/sales/newCustomerVisitAdd/newCustomerVisitAdd' })
        } else if (result.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/sales/customers/customers?mode=return' })
        }
      }
    })
  },

  openSubject(e) {
    const departmentId = Number(e.currentTarget.dataset.departmentId)
    const leadId = Number(e.currentTarget.dataset.leadId)
    if (departmentId) {
      wx.navigateTo({
        url: '/pages/sales/customerDetail/customerDetail?departmentId=' + departmentId
      })
    } else if (leadId) {
      wx.navigateTo({ url: '/pages/sales/prospectDetail/prospectDetail?leadId=' + leadId })
    }
  },

  openAction(e) {
    const actionId = Number(e.currentTarget.dataset.id)
    if (!actionId) return
    wx.navigateTo({
      url: '/pages/sales/nextActionDetail/nextActionDetail?actionId=' + actionId
    })
  }
})
