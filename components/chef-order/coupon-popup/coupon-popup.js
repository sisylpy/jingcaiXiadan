Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    coupons: {
      type: Array,
      value: []
    },
    claimingCouponId: {
      type: null,
      value: null
    },
    claimingAll: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    noop() {},

    close() {
      this.triggerEvent('close')
    },

    claim(e) {
      this.triggerEvent('claim', { id: e.currentTarget.dataset.id })
    },

    claimAll() {
      this.triggerEvent('claimall')
    }
  }
})
