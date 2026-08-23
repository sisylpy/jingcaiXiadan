const ITEMS = [
  { key: 'workbench', label: '工作台', icon: '工', path: '/pages/sales/home/home' },
  { key: 'customers', label: '客户', icon: '客', path: '/pages/sales/customers/customers' },
  { key: 'quotation', label: '报价', icon: '价', path: '/pages/sales/quotationCenter/quotationCenter' },
  { key: 'followUp', label: '跟进', icon: '跟', path: '/pages/sales/leads/leads' },
  { key: 'profile', label: '我的', icon: '我', path: '/pages/sales/profile/profile' }
]

Component({
  properties: {
    current: { type: String, value: 'workbench' }
  },

  data: { items: ITEMS },

  methods: {
    switchPage(e) {
      const key = e.currentTarget.dataset.key
      const item = ITEMS.find(candidate => candidate.key === key)
      if (!item || key === this.properties.current) return
      wx.redirectTo({ url: item.path })
    }
  }
})
