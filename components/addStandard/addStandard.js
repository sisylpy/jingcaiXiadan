
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否显示modal
    show: {
      type: Boolean,
      value: true
    },
    itemStandard: {
      type: Object,
      value: ""
    },
    depGoodsName: {
      type: String,
      value: ""
    },

    standardName: {
      type: String,
      value: ""
    },
   
    modalHeight: {
      type: Number,
      value: ""
    },
    scrollViewTop: {
      type: Number,
      value: ""
    },
    modalContentHeight: {
      type: Number,
      value: ""
    }
  
  },

  /**
   * 组件的初始数据
   */
  data: {
    
  },

  /**
   * 组件的方法列表
   */
  methods: {
   

    cancle() {
      this.setData({ show: false, standardName: "",depGoodsName: "",itemStandard:"" })
      this.triggerEvent('cancle')
    },

    confirm(e) {
      if(this.data.standardName.length > 0){
        this.triggerEvent('confirm', {
          standardName: this.data.standardName,
        })
      }
     

      this.setData({
        show: false,
        standardName: "",
        depGoodsName: "",
        itemStandard: ""

      })
    },

    getStandard: function (e) {
      console.log(e)
      this.setData({   
        standardName: e.detail.value
      })
    },


    getFocus: function(e){

      this.triggerEvent('getFocus', {
        keyboardHeight: e.detail.height,
      })
    }
    









  },
  

  
  
})
