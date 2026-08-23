Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    summary: {
      type: Object,
      value: null
    }
  },

  methods: {
    openCoupon() {
      this.triggerEvent('opencoupon')
    }
  }
})
