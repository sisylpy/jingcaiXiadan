Component({
  
  properties: {
    showPopup: Boolean,
    type: String, // 操作类型
    message: String,
    warnContent: String,
  },

  observers: {
    'type': function(type) {
      if (type === 'deleteSpec') {
        this.setData({
          popupTitle: '删除规格',
          message: '您确定要删除规格吗？'
        });
      } else if (type === 'deleteOrder') {
        this.setData({
          popupTitle: '删除订单',
          message: '您确定要删除该订单吗？'
        });
      }else if (type === 'deleteGoods') {
        this.setData({
          popupTitle: '删除商品',
          message: '您确定要删除该商品吗？'
        });
      }
      // 其他类型的处理
    }
  },

  data: {
    popupTitle: '',
    message: ''
  },

  methods: {
    onCancel() {
      this.triggerEvent('closeWarn');
    },
    onConfirm() {
      this.triggerEvent('confirmWarn');
    },
    stopPropagation(event) {
      // event.stopPropagation(); // 防止点击内容区域关闭弹出窗口
    }
  }
});
