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
    depInfo: {
      type: Object,
      value: { nxDepartmentEntities: [] }
    },
    workScope: {
      type: String,
      value: 'all'
    },
    selectedDepartmentName: {
      type: String,
      value: ''
    },
    windowWidth: {
      type: Number,
      value: 750
    },
    avatarUrl: {
      type: String,
      value: '/images/User2.png'
    },
    nameError: {
      type: String,
      value: ''
    },
    formValid: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    noop() {},

    close() {
      this.triggerEvent('close')
    },

    selectScope(e) {
      this.triggerEvent('selectscope', { scope: e.currentTarget.dataset.scope })
    },

    departmentChange(e) {
      this.triggerEvent('departmentchange', e.detail)
    },

    chooseAvatar(e) {
      this.triggerEvent('chooseavatar', e.detail)
    },

    nameInput(e) {
      this.triggerEvent('nameinput', e.detail)
    },

    save() {
      this.triggerEvent('save')
    }
  }
})
