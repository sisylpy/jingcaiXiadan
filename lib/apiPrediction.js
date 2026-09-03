import apiUrl from '../config.js'

function predictionRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    getApp().shopRequest({
      url: apiUrl.apiUrl + path,
      method: method,
      data: data || {},
      header: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      success: response => resolve({ result: response.data }),
      fail: reject
    })
  })
}

/** 与桌面端订单提醒共用的预测日期和算法目录。 */
export function getOrderReminderCatalog(distributerId) {
  return predictionRequest('purchase-prediction-lab/catalog', 'GET', {
    distributerId: distributerId
  })
}

/** 当前营业日预测基线；当天实际订单由订单接口独立读取并在展示层核对。 */
export function getOrderReminderForecast(data) {
  return predictionRequest(
    'purchase-prediction-lab/reconciliation-forecasts',
    'POST',
    data
  )
}

/** 智能补货页只读取当前部门的商品关系，不扩展到主客户的其它部门。 */
export function getDepartmentGoodsOrderCatalog(departmentId, distributerId) {
  return predictionRequest(
    'nxdepartmentdisgoods/disGetDepartmentGoods/'
      + encodeURIComponent(departmentId) + '/' + encodeURIComponent(distributerId),
    'GET'
  )
}
