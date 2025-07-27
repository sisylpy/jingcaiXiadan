import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js');

// 




export const getNxGoodsIdsByGreatId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getNxGoodsIdsByGreatId/' +data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}


export const depSearchTodayOrders = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/depSearchTodayOrders' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        depId: data.depId,
        searchStr: data.searchStr
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}



export const deleteDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/deleteDepGoods/' +data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}


export const updateFatherId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/updateFatherId' ,
      method: 'get',
      
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}




export const depGetDepGoodsByIds = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/depGetDepGoodsByIds' ,
      method: 'POST',
      data:{
        depGoodsIds: data.depGoodsIds,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


export const depGetDepGoodsPage = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/depGetDepGoodsPage' ,
      method: 'POST',
      data:{
        depId: data.depId,
        limit: data.limit,
        page: data.page,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

export const saveNxDisLinshiGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/saveNxDisLinshiGoods',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}



export const depGetTodayRecordSeconds = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpaylist/depGetTodayRecordSeconds/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

export const getBooks = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getBooks',
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}



/**
 * 添加订货申请
 * @param {*} data 
 */
export const saveOrderBefore = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveBefore' ,
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}




/**
 * 添加订货申请
 * @param {*} data 
 */
export const saveCashBefore = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveCashBefore' ,
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 搜索批发商商品
 */
export const queryDisGoodsByQuickSearchWithDepId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsByQuickSearchWithDepId' ,
      method: 'POST',
      data:{
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}



/**
 * 打印销售单据
 * @param {*} data 
 */
export const depPasteSearchGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/depPasteSearchGoods',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


export const choiceGoodsForApply = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/choiceGoodsForApply',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}



/**
 * 保存批发商商品
 * @param {*} data 
 */
export const downDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/postDgnGoods',
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


export const addRecord = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpaylist/disAaddRecord' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}


/**
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetSubDepAiOrder = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetSubDepAiOrder'  ,
      method: 'POST',
      data:{
        depId: data.depId,
        page: data.page,
        limit: data.limit,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      
    
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


/**
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const phoneGetToFillDepOrders = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/phoneGetToFillDepOrders' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        resFatherId: data.resFatherId,
        disId: data.disId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


/**
 * 批发商登陆
 * @param {*} data 
 */
export const disLogin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/disLogin',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}




export const deleteDepUserWithDep = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/deleteDepUserWithDep/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}

export const saveNewCustomerLaoDu = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/saveNewCustomerLaoDu' ,
      method: 'POST',
      data:{
        disId: data.disId,
        phoneCode: data.phoneCode,
        openId: data.openId,
        depUserId: data.depUserId,
        machineId: data.machineId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}



export const restrauntCashPayLaodu = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/restrauntCashPayLaodu' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


/**
 * 添加批发商订货规格
 * @param {*} data 
 */
export const disSaveStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerstandard/disSaveStandard' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}


//

export const saveLinshiGoods = (filePathList, goodsName,standard, detail,disId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributergoods/saveLinshiGoods',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        standard: standard,
        detail: detail,
        disId: disId,
       },
       success: function (res) {
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }


/**
 * 添加批发商商品
 */
export const saveNxDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/saveNxDisGoodsForCash',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}




/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const nxDepGetDisCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/nxDepGetDisCataGoods' ,
      method: 'POST',
      data:{
        nxDisId: data.nxDisId,
        depId: data.depId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}


//

/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const nxDepGetDisFatherGoodsByGrandId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/nxDepGetDisFatherGoodsByGrandId' ,
      method: 'POST',
      data:{
        depId: data.depId,
        fatherId: data.fatherId,
      
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}

/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const nxDepGetDisFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/nxDepGetDisFatherGoods' ,
      method: 'POST',
      data:{
        depId: data.depId,
        fatherId: data.fatherId,
        limit: data.limit,
        page: data.page
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}


export const disGetDisCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/disGetDisCataGoods/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}

export const updateGroupName = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/updateGroupName' ,
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

/**
 * 获取客户xiaoshou单
 * @param {*} data 
 */
export const sellerAndBuyerGetSalesBills = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/sellerAndBuyerGetSalesBills',
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        disId: data.disId
     },
     header: {
       "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
     },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


export const getDepUsersByDepId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/getDepUsersByDepId/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}


export const deleteDepUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/deleteDepUser/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const cashRegisterLaodu = (filePathList, depName, code,disId) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdepartment/cashRegisterLaodu',//演示域名、自行配置
       filePath: filePathList,
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        depName: depName,
        code: code,
        disId: disId,
       },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

/**
 * 删除常购商品
 * @param {*} data 
 */
export const getDgCataGoodsWithSubNames = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/getDgCataGoodsWithSubNames/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 删除常购商品
 * @param {*} data 
 */
export const deleteDepGoodsArr = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/deleteDepGoodsArr/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 删除常购商品
 * @param {*} data 
 */
export const deleteDepGoodsArr1 = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/deleteDepGoodsArr',
      method: 'POST',
      data,
      header: {
        "content-type": 'application/json'
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


export const queryDisGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsByQuickSearch',
      method: 'POST',
      data: {
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}


export const queryDepDisGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDepDisGoodsByQuickSearch',
      method: 'POST',
      data: {
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const deleteDepDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/deleteDepDisGoods/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const saveDepDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/saveDepDisGoods' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}


/**
 * 删除订货申请
 * @param {*} data 
 */
export const deleteOrder = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/delete/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
/**
 * 删除订货群（配送）商品规格
 * @param {*} data 
 */
export const depDeleteStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentstandard/delete/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 获取订货群（配送）商品的规格
 * @param {*} data 
 */
export const getDepGoodsStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentstandard/getDepGoodsStandard/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 修改订货群规格
 * @param {*} data 
 */
export const depUpdateStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentstandard/update' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 添加订货群订货规格
 * @param {*} data 
 */
export const depSaveStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentstandard/save' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

  
/**
 * 用户修改信息含头像
 * @param {*} filePathList 
 * @param {*} userName 
 * @param {*} userId 
 * @param {*} weeks 
 * @param {*} depId 
 */

export const updateDepUserWithFile = (filePathList, userName,userId , weeks, depId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdepartmentuser/updateDepUserWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        userId: userId,
       },
       success: function (res) {
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }

 /**
  * 用户修改信息
  * @param {*} data 
  */
export const updateDepUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/updateDepUser' ,
      method: 'POST',
      data: {
        userName: data.userName,
        userId: data.userId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

export const getBillApplys = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/getBillApplys'  ,
      method: 'POST',
      data: {
        billId: data.billId,
        depFatherId: data.depFatherId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 获取客户送货单
 * @param {*} data 
 */
export const sellerAndBuyerGetAccountBills = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/sellerAndBuyerGetAccountBills',
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        disId: data.disId
     },
     header: {
       "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
     },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 部门获取订货群配送商品
 * @param {*} data 
 */
export const depGetDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/depGetDepGoods/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 部门获取订货群配送商品类别
 * @param {*} data 
 */
export const depGetDepDisGoodsCata = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/depGetDepDisGoodsCata' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depId: data.depId
     },
     header: {
       "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
     },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
//



/**
 * 部门用户登陆
 * @param {*} data 
 */
export const depUserLoginDaoDuDesk = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/depUserLoginDaoDuDesk',
      method: 'POST',
      data:{
        code: data.code,
        machineId: data.machineId
     },
     header: {
       "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
     },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
/**
 * 部门用户登陆
 * @param {*} data 
 */
export const depUserLoginDaoDu = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/depUserLoginDaoDu/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 获取订货组部门
 * @param {*} data 
 */
export const getSubDepartments = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/getSubDepartments/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
//

/**
 * 获取部门信息
 * @param {*} data 
 */
export const getGroupInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/getGroupInfo/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
/**
 * 获取部门信息
 * @param {*} data 
 */
export const getDepInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/getDepInfo/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

export const getDepUserInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/getDepUserInfo/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
/**
 * 获取部门用户信息
 * @param {*} data 
 */
export const getDepAndUserInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/getDepAndUserInfo/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


/**
 * 修改订货申请
 * @param {*} data 
 */
export const updateOrder = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/updateOrder' ,
      method: 'POST',
      data:{
        id: data.id,
        weight: data.weight,
        standard: data.standard,
        remark: data.remark,
        printStandard: data.printStandard,
        priceLevel: data.priceLevel
     },
     header: {
       "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
     },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


/**
 * 添加订货申请
 * @param {*} data 
 */
export const saveCash = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveCash' ,
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


/**
 * 添加订货申请
 * @param {*} data 
 */
export const saveOrder = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/save' ,
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


/**
 * 添加订货申请
 * @param {*} data 
 */
export const nxDepSaveApply = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/nxDepSaveApply' ,
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

//

/**
 * 新首页
 * @param {*} data 
 */
export const depGetApply = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/depGetApply/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 新首页
 * @param {*} data 
 */


export const subDepGetApplyAiByTime = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/subDepGetApplyAiByTime/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

//


export const subDepGetApplyAiFather = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/subDepGetApplyAiFather/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


export const depGetApplyAiFather = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/depGetApplyAiFather/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
export const depGetApplyAiByTime = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/depGetApplyAiByTime/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
/**
 * 订货首页获取每日订货申请
 * @param {*} data 
 */
// export const depGetWeeksApply = (data) => {
//   return new Promise((resolve, reject) => {
//     wx.request({
//       url: apiUrl.apiUrl + 'nxdepartmentorders/depGetWeeksApply' ,
//       method: 'POST',
//       data: {
       
//         weeks: data.weeks,
//         depId:  data.depId
//       },
//       header:{
//         "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"

//       },
//       success: (res) => {
//         resolve({ result: res.data })
//       },
//       fail: (e) => {
//         reject(e);
//         load.hideLoading();
//       }
//     })
//   })
// }





export const depOrderUserSaveWithFileLaodu = (filePathList, userName,code, disId,depId,depFatherId, admin) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdepartmentuser/depOrderUserSaveWithFileLaodu',//演示域名、自行配置
       filePath: filePathList,
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        code: code,
        disId: disId,
        depId: depId,
        depFatherId: depFatherId,
        admin: admin
       },
       success: function (res) {
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }

