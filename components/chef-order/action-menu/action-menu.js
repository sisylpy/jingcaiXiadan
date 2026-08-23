Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    popupWidth: {
      type: Number,
      value: 0
    },
    popupHeight: {
      type: Number,
      value: 0
    },
    animation: {
      type: null,
      value: null
    },
    depRecord: {
      type: Boolean,
      value: false
    },
    searchArr: {
      type: null,
      value: null
    },
    fabRotated: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    maskTap() {
      this.triggerEvent('masktap')
    },

    popupTap() {
      this.triggerEvent('popuptap')
    },

    addOrder(e) {
      this.triggerEvent('addorder', { type: e.currentTarget.dataset.type })
    },

    fabTap() {
      this.triggerEvent('fabtap')
    }
  }
})
