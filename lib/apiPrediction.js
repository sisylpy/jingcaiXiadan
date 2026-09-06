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

/** Shop 专用智能补货：后台按当前子部门预测并剔除当天已有订单。 */
export function getShopDepartmentReplenishment(departmentId) {
  return predictionRequest(
    'purchase-prediction-lab/departments/'
      + encodeURIComponent(departmentId) + '/replenishment',
    'GET'
  )
}
