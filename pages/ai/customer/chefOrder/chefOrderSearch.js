import { depSearchTodayOrders } from '../../../../lib/apiRestraunt'

export const chefOrderSearchMethods = {
  onSortByChange(e) {
    console.log(e);
    const {
      type
    } = e.detail;
    this.setData({
      showType: type,
    })
    if (type === 'time') {
      // TODO: 按时间排序逻辑
      console.log('页面收到：按时间排序');
      if(this.data.isSubDep){
        this._initDataSub();
      }else{
        this._initData();
      }


    } else if (type === 'category') {
      // TODO: 按类别排序逻辑
      console.log('页面收到：按类别排序');

      if(this.data.isSubDep){
        this._initSubDepDataByFather();
      }else{
        this._initDataByFather();
      }
    }
  },


  onSearchInput(e) {
    const value = e.detail.value;
    console.log('[chefOrder] 收到输入内容:', value);
    console.log('[chefOrder] 事件详情:', e);

    this.setData({
      searchValue: value
    });

    if (!value) {
      console.log('[chefOrder] 搜索值为空，清空搜索结果');
      this.setData({
        searchArr: null  // 改为null，这样搜索蒙版会消失
      });
      return;
    }

    var depId = this.data.depId;
    if(this.data.depHasSubs > 0){
      depId = -1
    }
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: depId,
      searchStr: value
    };
    console.log('[chefOrder] 搜索参数:', data);

    depSearchTodayOrders(data).then(res => {
      console.log('[chefOrder] 搜索API返回:', res);
      if (res.result.code == 0) {
        this.setData({
          searchArr: res.result.data || [],  // 确保返回空数组而不是null
        });
        console.log('[chefOrder] 搜索成功，结果数量:', res.result.data ? res.result.data.length : 0);
      } else {
        console.error('[chefOrder] 搜索失败:', res.result.msg);
        // 搜索失败时也显示空结果
        this.setData({
          searchArr: []
        });
      }
    }).catch(error => {
      console.error('[chefOrder] 搜索API异常:', error);
      // 搜索异常时也显示空结果
      this.setData({
        searchArr: []
      });
    });
  },


  reSearch() {
    console.log("重新搜索", this.data.searchValue)
    var depId = this.data.depId;
    if(this.data.depHasSubs > 0){
      depId = -1
    }
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: depId,
      searchStr: this.data.searchValue
    };
    console.log("搜索参数:", data);

    // 同时执行搜索和页面数据更新
    Promise.all([
      depSearchTodayOrders(data),
      this.updatePageData()
    ]).then(([searchRes, pageRes]) => {
      console.log("搜索API返回:", searchRes);
      if (searchRes.result.code == 0) {
        this.setData({
          searchArr: searchRes.result.data || [],  // 确保返回空数组而不是null
        });
        console.log("搜索成功，结果数量:", searchRes.result.data ? searchRes.result.data.length : 0);
      } else {
        console.error("搜索失败:", searchRes.result.msg);
        // 搜索失败时也显示空结果
        this.setData({
          searchArr: []
        });
      }
    }).catch(error => {
      console.error("搜索API异常:", error);
      // 搜索异常时也显示空结果
      this.setData({
        searchArr: []
      });
    });
  },

  // 更新页面数据的方法
  updatePageData() {
    return new Promise((resolve) => {
      if (this.data.isSubDep) {
        if(this.data.showType == 'time'){
          this._initDataSub();
        }else if(this.data.showType =='category'){
          this._initSubDepDataByFather();
        }
      } else {
        if (this.data.showType === 'time') {
          this._initData();
        } else if (this.data.showType === 'category') {
          this._initDataByFather();
        }
      }
      resolve();
    });
  },

  onSearchCancel() {
    console.log('[chefOrder] 点击取消搜索');
    // 清空搜索结果，恢复原订单列表
    this.setData({
      searchArr: null,  // 改为null，这样搜索蒙版会消失
      searchValue: ''
    });

  },
}
