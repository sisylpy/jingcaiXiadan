Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    searchArr: { type: null, value: null },
    windowWidth: { type: Number, value: 750 },
    depInfo: { type: Object, value: {} }
  },

  methods: {
    noop() {},

    cancel() {
      this.triggerEvent('cancel')
    },

    edit(e) {
      this.triggerEvent('edit', e.currentTarget.dataset)
    },

    receive(e) {
      this.triggerEvent('receive', e.currentTarget.dataset)
    }
  }
})
