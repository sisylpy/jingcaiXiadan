import {
  getSalesBusinessTypes,
  getSalesLeads,
  getSalesVisits
} from '../../../lib/apiSales.js'

const app = getApp()

function displayDate(value, emptyText) {
  if (!value) return emptyText || '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

const RESULT_LABELS = {
  NO_CONTACT: '老板不在',
  NO_INTEREST: '暂无兴趣',
  INTERESTED: '有兴趣',
  QUOTED: '已报价',
  TRIAL_WILLING: '愿意试单',
  DEAL: '已成交',
  CUSTOMER_REVISIT: '老客户回访'
}

Page({
  data: {
    loading: true,
    keyword: '',
    activeTab: 'leads',
    businessTypes: [],
    allLeads: [],
    leads: [],
    allVisits: [],
    visits: [],
    showVisitSheet: false,
    visitTarget: null
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight })
  },

  onShow() {
    if (app.hasUsableSalesToken()) this.loadData()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/sales/home/home' })
    }
  },

  loadData() {
    this.setData({ loading: true })
    Promise.all([
      getSalesBusinessTypes(),
      getSalesLeads({ status: 'FOLLOWING', limit: 100 }),
      getSalesVisits({ limit: 30 })
    ]).then(results => {
      const typeBody = results[0].result || {}
      const leadBody = results[1].result || {}
      const visitBody = results[2].result || {}
      if (typeBody.code !== 0 || leadBody.code !== 0 || visitBody.code !== 0) {
        wx.showToast({
          title: typeBody.msg || leadBody.msg || visitBody.msg || '跟进数据加载失败',
          icon: 'none'
        })
        return
      }
      const leads = (leadBody.data || []).map(item => Object.assign({}, item, {
        nextFollowLabel: displayDate(item.nextFollowAt, '未设置日期'),
        latestVisitLabel: displayDate(item.latestVisitAt, '暂无拜访')
      }))
      const visits = (visitBody.data || []).map(item => Object.assign({}, item, {
        shopName: item.shopName || item.shopNameSnapshot || '',
        address: item.address || item.addressSnapshot || '',
        visitTimeLabel: displayDate(item.visitAt || item.createdAt, '时间未记录'),
        nextFollowLabel: displayDate(item.nextFollowAt, ''),
        resultLabel: RESULT_LABELS[item.resultCode] || item.resultCode || '未填写结果',
        targetLabel: item.customerId ? '正式客户' : (item.leadId ? '销售线索' : '陌生门店')
      }))
      this.setData({
        businessTypes: typeBody.data || [],
        allLeads: leads,
        leads: this.filterLeads(leads, this.data.keyword),
        allVisits: visits,
        visits: this.filterVisits(visits, this.data.keyword)
      })
    }).catch(error => {
      wx.showToast({
        title: app.describeSalesRequestError(error, '线索加载失败'),
        icon: 'none'
      })
    }).finally(() => this.setData({ loading: false }))
  },

  filterLeads(leads, keyword) {
    const value = (keyword || '').trim().toLowerCase()
    if (!value) return leads || []
    return (leads || []).filter(item => {
      return [item.shopName, item.address, item.contactName, item.contactPhone]
        .some(text => String(text || '').toLowerCase().indexOf(value) >= 0)
    })
  },

  filterVisits(visits, keyword) {
    const value = (keyword || '').trim().toLowerCase()
    if (!value) return visits || []
    return (visits || []).filter(item => {
      return [item.shopName, item.address, item.contactName, item.contactPhone,
        item.businessTypeName, item.note]
        .some(text => String(text || '').toLowerCase().indexOf(value) >= 0)
    })
  },

  onKeywordInput(e) {
    const keyword = e.detail.value || ''
    this.setData({
      keyword,
      leads: this.filterLeads(this.data.allLeads, keyword),
      visits: this.filterVisits(this.data.allVisits, keyword)
    })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  recordAgain(e) {
    const leadId = e.currentTarget.dataset.id
    const lead = (this.data.allLeads || []).find(item =>
      String(item.leadId) === String(leadId))
    if (!lead) return
    this.setData({
      visitTarget: {
        leadId: lead.leadId,
        businessTypeId: lead.businessTypeId,
        shopName: lead.shopName,
        address: lead.address,
        contactName: lead.contactName,
        contactPhone: lead.contactPhone,
        latitude: lead.latitude,
        longitude: lead.longitude,
        intentCode: lead.intentCode
      },
      showVisitSheet: true
    })
  },

  quoteLead(e) {
    const leadId = e.currentTarget.dataset.id
    const lead = (this.data.allLeads || []).find(item =>
      String(item.leadId) === String(leadId))
    if (!lead) return
    wx.navigateTo({
      url: '/pages/sales/quotation/quotation?leadId=' + lead.leadId
        + '&shopName=' + encodeURIComponent(lead.shopName || '')
    })
  },

  recordVisitAgain(e) {
    const visit = (this.data.allVisits || []).find(item =>
      String(item.visitId) === String(e.currentTarget.dataset.id))
    if (!visit || (!visit.customerId && !visit.leadId)) return
    this.setData({
      visitTarget: {
        customerId: visit.customerId || null,
        leadId: visit.customerId ? null : (visit.leadId || null),
        businessTypeId: visit.businessTypeId,
        shopName: visit.shopName,
        address: visit.address,
        latitude: visit.latitude,
        longitude: visit.longitude,
        contactName: visit.contactName,
        contactPhone: visit.contactPhone,
        intentCode: visit.intentCode
      },
      showVisitSheet: true
    })
  },

  quoteVisit(e) {
    const visit = (this.data.allVisits || []).find(item =>
      String(item.visitId) === String(e.currentTarget.dataset.id))
    if (!visit) return
    let url = '/pages/sales/quotation/quotation?visitId=' + visit.visitId
    if (visit.customerId) url += '&customerId=' + visit.customerId
    else if (visit.leadId) url += '&leadId=' + visit.leadId
    url += '&shopName=' + encodeURIComponent(visit.shopName || '')
    wx.navigateTo({ url })
  },

  closeVisitSheet() {
    this.setData({ showVisitSheet: false, visitTarget: null })
  },

  onVisitSaved() {
    this.closeVisitSheet()
    this.loadData()
  },
})
