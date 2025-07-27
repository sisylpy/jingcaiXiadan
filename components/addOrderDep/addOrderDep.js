// components/popup/popup.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    applyStandardName: {
      type: String,
      value: ""
    },
    
    applyRemark: {
      type: String,
      value: ""
    },
    item: {
      type: Object,
      value: ""
    },
    windowWidth:{
      type: Number,
      value: ""
    },
    
    applyNumber: {
      type: String,
      value: ""
    },
    editApply: {
      type: Boolean,
      value: false
    },

    level:{
      type: String,
      value: ""
    }
    
  },
  data: {
    visible: false,
    popupTop: '30%',
    showAddStandard: false,
    newStandardName: "",
    focusType: "number"
  },
  
  methods: {
    showInputStandard(){
      this.setData({
        showAddStandard: true
      })
    },

    visibleInputStandard(){
      this.setData({
        showAddStandard: true
      })
    },
    cancleStandard(){
      console.log("visibleAddStandard")
      this.setData({
        showAddStandard: false
      })
    },

    confirmStandard(){
      console.log(this.data.newStandardName)
      if(this.data.newStandardName.length > 0){
        this.triggerEvent('confirmStandard', {
          newStandardName: this.data.newStandardName,
        })
        this.setData({
          showAddStandard: false,
          newStandardName: ""
        })
      }else{
        wx.showToast({
          title: '新规格内容是空',
          icon: 'none'
        })
      }
    },


    clickMask() {
      this.setData({visible: false})
    },

    onCancel() {
      this.setData({ visible: false,editApply:false,depStandardArr: [],applyNumber: "" })
      this.triggerEvent('cancle')
    },

    onSave(e) {
      console.log("cofifiif" , this.data.level);
      if(this.data.showAddStandard){
        wx.showModal({
          title: '有未完成操作',
          content: '请完成新规格',
          showCancel: false,
          complete: (res) => {
            
            if (res.confirm) {
              
            }
          }
        })
      }else{
        if(this.data.applyNumber  > 0){
          var regex=/^[0]+/; //整数验证正则        
          var apply = "";
          if(this.data.applyNumber.indexOf(".") !== -1){
            apply = this.data.applyNumber;
          }else{
            apply = this.data.applyNumber.replace(regex, "");
          }
          console.log("cofifiif" , this.data.level);
          this.triggerEvent('confirm', {
            applyNumber: apply ,
            applyStandardName: this.data.applyStandardName,
            applyRemark: this.data.applyRemark,
            level: this.data.level,
          })
  
          this.setData({
            visible: false,
            applyNumber: "",
            applyRemark: "",
            remarkContent: "",
            goodsStandard: "",
            isNotice: false,
            editApply: false,
          })
        }else{
          wx.showToast({
            title: '订货数量只能填写数字',
            icon: "none"
          })
        }
      } 
    },



    delApply: function(){
      console.log("sha;bibiiiiiii")
      this.triggerEvent('delApply', {

      })
    },

   

  
    getApplyNumber: function (e) {
    
      var numberStr = this.data.applyNumber.toString();
      var y = String(numberStr).indexOf(".") ;//获取小数点的位置
      if(y !== -1){
        var count = String(numberStr).length - y;//获取小数点后的个数
        console.log("conttntntnt=== ", count);
      }

      if(e.detail.value > 9999 ){
        wx.showToast({
          title: '最大不能超过9999',
          icon: "none"
        })
      
        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length ),
        })
        
      } else if(count ==2 ){

        wx.showToast({
          title: '小数点只能保留一位',
        })
        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length - 1),
        })
      }
      
      else {
       
        if(e.detail.value > 0  || e.detail.value == 0){
         

          this.setData({
            applyNumber: e.detail.value
          })
        }else{
          wx.showToast({
            title: '只能填写数字',
            icon: 'none'
          })

          // var g
          // var reg = new RegExp("([0]*)([1-9]+[0-9]+)", "g");
          this.setData({
            applyNumber: numberStr.substring(0, numberStr.length ),
          })
        }
      }
    },

   

    addRemark: function (e) {
      if(e.detail.value.length < 15){
        this.setData({
          applyRemark: e.detail.value
        })
      }else{
        wx.showToast({
          title: '最多输入15个字符。',
          icon:  'none'
        })
        var str = this.data.applyRemark;
        this.setData({
          applyRemark: str.substring(0, e.detail.value.length)
        })
      }
      
    },

    changeStandard: function (e) {
      console.log("chanananndngenngne",e)
      var name = e.currentTarget.dataset.name;
     
      this.triggerEvent('changeStandard', {
        applyStandardName: name,
        level: e.currentTarget.dataset.level,

      })
    },

    delStandard(e){
      console.log("delStandarddelStandard")
      
      this.triggerEvent('delStandard', {
        id: e.currentTarget.dataset.id,
        standardName: e.currentTarget.dataset.name,

      })

    },

    addStanard(e){
      this.setData({
        newStandardName: e.detail.value
      })
    },


    onInputFocus: function(e) {
      console.log("e",e);
      var type = e.currentTarget.dataset.type
      this.setData({
        popupTop: '15%' , // 输入框聚焦时上移
        focusType: type
      });
    },

    // onInputFocusRemark(){
    //   this.setData({
    //     popupTop: '20%' ,// 输入框失去焦点时恢复
    //     focusType: 'remark'
    //   });
    // },
    // onInputBlurRemark: function() {
    //   this.setData({
    //     popupTop: '30%',
    //     focusType: ''
    //   });
    // },
    onInputBlur: function() {
      this.setData({
        popupTop: '30%' ,// 输入框失去焦点时恢复
        focusType: ''
      });
    },


  }
});
