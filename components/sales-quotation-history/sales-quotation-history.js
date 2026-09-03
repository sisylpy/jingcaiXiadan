import { getSalesQuotations } from '../../lib/apiSales.js'

const STATUS_LABELS = {
  DRAFT: '草稿',
  FINALIZED: '已定稿',
  EXPIRED: '已过期',
  CLOSED: '已关闭'
}

function dateLabel(value) {
  if (!value) return '-'
  const text = String(value).replace('T', ' ')
  return text.length >= 16 ? text.slice(0, 16) : text
}

function amountLabel(value) {
  const number = Number(value)
  if (!isFinite(number)) return '0'
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

Component({
  properties: {
    leadId: { type: Number, value: null },
    departmentId: { type: Number, value: null },
    refreshKey: { type: Number, value: 0 }
  },

  data: {
    loading: false,
    rows: []
  },

  observers: {
    'leadId, departmentId, refreshKey': function () {
      this.loadHistory()
    }
  },

  methods: {
    loadHistory() {
      const leadId = Number(this.data.leadId) || null
      const departmentId = Number(this.data.departmentId) || null
      if (!leadId && !departmentId) {
        this.setData({ rows: [], loading: false })
        return
      }
      const requestId = (this._requestId || 0) + 1
      this._requestId = requestId
      this.setData({ loading: true })
      getSalesQuotations({ leadId, departmentId, limit: 100 }).then(res => {
        if (requestId !== this._requestId) return
        const body = res.result || {}
        if (body.code !== 0) throw { businessMessage: body.msg || '报价历史加载失败' }
        const rows = (body.data || []).map(item => Object.assign({}, item, {
          statusLabel: STATUS_LABELS[item.statusCode] || item.statusCode || '未知状态',
          updatedLabel: dateLabel(item.updatedAt || item.createdAt),
          validLabel: item.validUntil ? String(item.validUntil).slice(0, 10) : '未设置',
          amountLabel: amountLabel(item.totalAmount)
        }))
        this.setData({ rows })
      }).catch(error => {
        if (requestId !== this._requestId) return
        wx.showToast({
          title: error.businessMessage || '报价历史加载失败',
          icon: 'none'
        })
      }).finally(() => {
        if (requestId === this._requestId) this.setData({ loading: false })
      })
    },

    openQuotation(e) {
      const quotationId = Number(e.currentTarget.dataset.id)
      const status = e.currentTarget.dataset.status
      if (!quotationId) return
      wx.navigateTo({
        url: status === 'DRAFT'
          ? '/pages/sales/quotation/quotation?quotationId=' + quotationId
          : '/pages/sales/quotationPreview/quotationPreview?quotationId=' + quotationId
      })
    }
  }
})
