import apiUrl from '../config.js'

export function loginShopMini(code) {
  return new Promise((resolve, reject) => {
    getApp().shopRequest({
      url: apiUrl.apiUrl + 'nxdepartmentuser/depUserLoginDaoDu/' + code,
      method: 'GET',
      success: response => resolve(response.data),
      fail: reject
    })
  })
}
