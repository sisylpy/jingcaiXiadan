Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    animation: {
      type: null,
      value: null
    },
    departments: {
      type: Array,
      value: []
    },
    selectedId: {
      type: null,
      value: null
    }
  },

  methods: {
    noop() {},

    close() {
      this.triggerEvent('close')
    },

    select(e) {
      this.triggerEvent('select', { item: e.currentTarget.dataset.item })
    }
  }
})
