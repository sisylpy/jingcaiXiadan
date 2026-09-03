import apiUrl from '../config.js'
import { authTokenNotExpired } from './authExpiry.js'

const TOKEN_KEY = 'salesAccessToken'
const EXPIRES_KEY = 'salesTokenExpiresAt'
let redirecting = false

function tokenUsable() {
  const token = wx.getStorageSync(TOKEN_KEY)
  if (!token) return false
  const expiresAt = wx.getStorageSync(EXPIRES_KEY)
  return authTokenNotExpired(expiresAt)
}

export function hasUsableSalesToken() {
  return tokenUsable()
}

export function clearSalesLoginState() {
  const wasActingForCustomer = !!wx.getStorageSync('salesActingDepartmentId')
  ;[
    TOKEN_KEY, EXPIRES_KEY, 'salesUserId', 'salesDistributerId',
    'salesUserInfo', 'salesProfile', 'salesActingDepartmentId',
    'salesActingDistributerId', 'salesActingDepartmentName'
  ].forEach(key => wx.removeStorageSync(key))
  if (wasActingForCustomer) {
    ;['userInfo', 'depInfo', 'orderDepInfo', 'depFatherId', 'disId']
      .forEach(key => wx.removeStorageSync(key))
  }
}

function parsedBody(response) {
  let body = response && response.data
  try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
  return body
}

function goLogin(message) {
  clearSalesLoginState()
  if (redirecting) return
  redirecting = true
  wx.showToast({ title: message || '业务员登录已失效', icon: 'none' })
  setTimeout(() => {
    wx.reLaunch({
      url: '/pages/entry/entry',
      complete: () => { redirecting = false }
    })
  }, 100)
}

function protectedOptions(options) {
  const source = options || {}
  if (!tokenUsable()) {
    goLogin('请先登录业务员工作台')
    return null
  }
  const header = Object.assign({}, source.header || {}, {
    'X-NX-Sales-Token': wx.getStorageSync(TOKEN_KEY),
    'X-NX-Sales-Client': 'nxl-shop-mini'
  })
  return Object.assign({}, source, { header })
}

function isAuthFailure(response) {
  if (!response || response.statusCode !== 401) return false
  const body = parsedBody(response)
  return !body || String(body.errorCode || '').indexOf('SALES_TOKEN_') === 0
}

export function describeSalesRequestError(error, fallback) {
  const response = error && error.response
  const body = parsedBody(response)
  if (body && body.msg) return body.msg
  const statusCode = (error && error.statusCode) || (response && response.statusCode)
  if (statusCode === 401) return '业务员登录已失效，请重新登录'
  if (statusCode === 403) return '该客户没有分配给当前业务员'
  if (statusCode >= 500) return '服务器处理失败，请稍后重试'
  return fallback || '请求失败，请检查网络'
}

export function salesRequest(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'sales token required', statusCode: 401 })
    }
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (isAuthFailure(response)) {
      goLogin((parsedBody(response) || {}).msg)
      if (typeof options.fail === 'function') {
        options.fail({ errMsg: 'sales token invalid', response, statusCode: 401 })
      }
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.request(resolved)
}

export function salesUploadFile(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'sales token required', statusCode: 401 })
    }
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (isAuthFailure(response)) {
      goLogin((parsedBody(response) || {}).msg)
      if (typeof options.fail === 'function') {
        options.fail({ errMsg: 'sales token invalid', response, statusCode: 401 })
      }
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.uploadFile(resolved)
}

export function salesDownloadFile(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'sales token required', statusCode: 401 })
    }
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (isAuthFailure(response)) {
      goLogin((parsedBody(response) || {}).msg)
      if (typeof options.fail === 'function') {
        options.fail({ errMsg: 'sales token invalid', response, statusCode: 401 })
      }
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.downloadFile(resolved)
}

export function salesApi(path) {
  return apiUrl.apiUrl + 'sales/' + String(path || '').replace(/^\//, '')
}
