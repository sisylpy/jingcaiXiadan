import {
  getSalesProfile,
  getSalesWorkbenchOverview,
  getSalesAnnouncements
} from '../../../lib/apiSales.js'

const app = getApp()

function announcementTime(value) {
  if (!value) return ''
  const text = String(value).replace('T', ' ')
  return text.length >= 16 ? text.slice(5, 16) : text
}

function presentAnnouncement(item) {
  return Object.assign({}, item, {
    title: String(item.nxDaTitle || '公司公告').trim(),
    content: String(item.nxDaPublisherNote || '').trim(),
    timeLabel: announcementTime(item.nxDaPublishedAt || item.nxDaUpdatedAt)
  })
}

function todayLabel() {
  const date = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return (date.getMonth() + 1) + '月' + date.getDate() + '日 · ' + week
}

function overviewView(source) {
  const data = source || {}
  return {
    visitCustomerCount: Number(data.visitCustomerCount) || 0,
    newCustomerCount: Number(data.newCustomerCount) || 0,
    quotationCount: Number(data.quotationCount) || 0,
    pendingReturnCount: Number(data.pendingReturnCount) || 0,
    intentionCustomerCount: Number(data.intentionCustomerCount) || 0
  }
}

Page({
  data: {
    loading: true,
    profile: null,
    announcements: [],
    growthSteps: [
      { icon: '/images/sales-growth/discover.svg', name: '发现客户' },
      { icon: '/images/sales-growth/first-visit.svg', name: '首次拜访' },
      { icon: '/images/sales-growth/trial-quote.svg', name: '试用报价' },
      { icon: '/images/sales-growth/cooperation.svg', name: '达成合作' },
      { icon: '/images/sales-growth/long-term.svg', name: '长期客户' }
    ],
    todayLabel: todayLabel(),
    overview: overviewView(null)
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
    if (!app.hasUsableSalesToken()) {
      wx.reLaunch({ url: '/pages/entry/entry' })
    }
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadData()
  },

  loadData() {
    this.setData({ loading: true })
    this.loadAnnouncements()
    Promise.all([
      getSalesProfile(),
      getSalesWorkbenchOverview()
    ]).then(results => {
      const profileResult = results[0].result || {}
      const overviewResult = results[1].result || {}
      const failed = [profileResult, overviewResult]
        .find(item => item.code !== 0)
      if (failed) {
        wx.showToast({ title: failed.msg || '工作台加载失败', icon: 'none' })
        return
      }
      wx.setStorageSync('salesProfile', profileResult.data)
      this.setData({
        profile: profileResult.data,
        overview: overviewView(overviewResult.data)
      })
    }).catch(error => {
      wx.showToast({
        title: app.describeSalesRequestError(error, '工作台加载失败'),
        icon: 'none'
      })
    }).finally(() => this.setData({ loading: false }))
  },

  loadAnnouncements() {
    getSalesAnnouncements().then(res => {
      const body = res.result || {}
      if (body.code !== 0) {
        this.setData({ announcements: [] })
        return
      }
      this.setData({
        announcements: (body.data || []).slice(0, 2).map(presentAnnouncement)
      })
    }).catch(() => this.setData({ announcements: [] }))
  },

  startVisit() {
    wx.navigateTo({ url: '/pages/sales/newCustomerVisits/newCustomerVisits' })
  },

  openQuotation() { wx.navigateTo({ url: '/pages/sales/quotationCenter/quotationCenter' }) },
  openQuoteQuery() {
    wx.navigateTo({ url: '/subPackage-sales/pages/quoteQuery/quoteQuery' })
  },
  openAfterSales() {
    wx.navigateTo({
      url: '/subPackage/pages/customer/customerPage/customerPage'
    })
  },
  addTemporaryCustomer() {
    wx.navigateTo({ url: '/pages/sales/newCustomerVisitAdd/newCustomerVisitAdd' })
  },
  openCustomers() { wx.navigateTo({ url: '/pages/sales/customers/customers' }) },
  openDailyVisits() { wx.navigateTo({ url: '/pages/sales/returnVisits/returnVisits' }) },
  openFollowUp() { wx.navigateTo({ url: '/pages/sales/leads/leads' }) },
  openProfile() { wx.navigateTo({ url: '/pages/sales/profile/profile' }) }
})
