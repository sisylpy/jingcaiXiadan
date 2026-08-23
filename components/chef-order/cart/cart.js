Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    bill: {
      type: null,
      value: null
    },
    windowWidth: {
      type: Number,
      value: 750
    },
    billSummary: {
      type: Object,
      value: null
    },
    orderPreview: {
      type: Object,
      value: null
    },
    claimableCoupons: {
      type: Array,
      value: []
    },
    claimableLoading: {
      type: Boolean,
      value: false
    },
    orderPreviewLoading: {
      type: Boolean,
      value: false
    },
    claimingCouponId: {
      type: null,
      value: null
    }
  },

  methods: {
    close() {
      this.triggerEvent('close')
    },

    claim(e) {
      this.triggerEvent('claim', { id: e.currentTarget.dataset.id })
    },

    pay() {
      this.triggerEvent('pay')
    }
  }
})
