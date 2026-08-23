import Promise from './bluebird'
import apiUrl from '../config.js'

let cachedAsrCredentials = null

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (result) => result.code ? resolve(result.code) : reject(new Error('微信登录凭证获取失败')),
      fail: () => reject(new Error('微信登录凭证获取失败'))
    })
  })
}

export async function getAsrCredentials() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedAsrCredentials && Number(cachedAsrCredentials.expiredTime || 0) > now + 60) {
    return cachedAsrCredentials
  }
  const code = await wxLoginCode()
  cachedAsrCredentials = await new Promise((resolve, reject) => {
    getApp().shopRequest({
      url: apiUrl.apiUrl + 'mini-program-cloud/asr-credentials',
      method: 'POST',
      timeout: 30000,
      header: { 'Content-Type': 'application/json' },
      data: { clientType: 'SHOP', code },
      success: (response) => {
        const result = response.data || {}
        if (response.statusCode >= 200 && response.statusCode < 300 && result.code === 0) {
          resolve(result.data)
          return
        }
        reject(new Error(result.msg || '语音服务初始化失败'))
      },
      fail: () => reject(new Error('网络请求失败'))
    })
  })
  return cachedAsrCredentials
}
