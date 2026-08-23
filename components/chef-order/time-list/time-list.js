Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    showType: { type: String, value: 'time' },
    depHasSubs: { type: Number, value: 0 },
    isSubDep: { type: Boolean, value: false },
    applyArr: { type: Array, value: [] },
    depArr: { type: Array, value: [] },
    windowHeight: { type: Number, value: 0 },
    navBarHeight: { type: Number, value: 0 },
    windowWidth: { type: Number, value: 750 },
    depInfo: { type: Object, value: {} }
  },

  methods: {
    edit(e) {
      this.triggerEvent('edit', e.currentTarget.dataset)
    },

    receive(e) {
      this.triggerEvent('receive', e.currentTarget.dataset)
    }
  }
})
