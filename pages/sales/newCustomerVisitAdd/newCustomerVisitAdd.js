import {
  getSalesBusinessTypes,
  getSalesLead,
  getSalesLeadPhotos,
  downloadSalesVisitPhoto
} from '../../../lib/apiSales.js'

const app = getApp()

Page({
  data: {
    loading: true,
    ready: false,
    businessTypes: [],
    leadId: null,
    visitTarget: null,
    existingPhotos: [],
    existingPhotoCount: 0,
    editMode: false,
    formTitle: '开发新客户'
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      leadId: Number(options.leadId) || null,
      editMode: options.edit === '1'
    })
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true })
    const requests = [getSalesBusinessTypes()]
    if (this.data.leadId) {
      requests.push(getSalesLead(this.data.leadId))
      requests.push(getSalesLeadPhotos(this.data.leadId))
    }
    Promise.all(requests).then(results => {
      const typeBody = results[0].result || {}
      const leadBody = results[1] ? (results[1].result || {}) : { code: 0 }
      const photoBody = results[2] ? (results[2].result || {}) : { code: 0, data: [] }
      if (typeBody.code !== 0 || leadBody.code !== 0 || photoBody.code !== 0) {
        wx.showToast({
          title: typeBody.msg || leadBody.msg || photoBody.msg || '拜访表单加载失败',
          icon: 'none'
        })
        return
      }
      const lead = ((leadBody.data || {}).lead) || null
      const photos = photoBody.data || []
      return Promise.all(photos.map(item => {
        return downloadSalesVisitPhoto(item.attachmentId).catch(() => '')
      })).then(paths => {
        this.setData({
          businessTypes: typeBody.data || [],
          visitTarget: lead,
          existingPhotos: photos.map((item, index) => Object.assign({}, item, {
            previewPath: paths[index] || ''
          })),
          existingPhotoCount: photos.length,
          formTitle: this.data.editMode ? '编辑临时客户'
            : (lead ? '记录再次拜访' : '开发新客户'),
          ready: true
        })
      })
    }).catch(error => wx.showToast({
      title: app.describeSalesRequestError(error, '拜访表单加载失败'),
      icon: 'none'
    })).finally(() => this.setData({ loading: false }))
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/sales/newCustomerVisits/newCustomerVisits' })
  },

  onVisitSaved() {
    setTimeout(() => this.goBack(), 400)
  }
})
