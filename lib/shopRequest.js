import apiUrl from '../config.js'

const SHOP_TOKEN_KEY = 'shopAccessToken'
const SHOP_EXPIRES_KEY = 'shopTokenExpiresAt'
const SHOP_PREFIX = '/api/shop/'
const SHOP_ROOT_PREFIX = '/shop/'
const SALES_TOKEN_KEY = 'salesAccessToken'
const SALES_EXPIRES_KEY = 'salesTokenExpiresAt'
const ACTING_CUSTOMER_KEY = 'salesActingCustomerId'

// 登录、注册和未登录商品浏览所必需的接口保持公开；其余业务接口统一进入 Shop 网关。
const PUBLIC_API_PATHS = [
  '/api/nxdepartmentuser/depUserLoginDaoDu',
  '/api/nxdepartmentuser/depOrderUserSaveWithFileLaodu',
  '/api/nxdistributeruser/disSalesUserSaveWithFile',
  '/api/nxdepartment/cashRegisterLaodu',
  '/api/nxdistributer/getDisInfo',
  '/api/nxdepartment/getDepInfo',
  '/api/nxdepartmentdisgoods/depGetDepDisGoodsCata',
  '/api/nxdepartmentdisgoods/depGetDepGoodsPage',
  '/api/nxdistributerfathergoods/nxDepGetDisCataGoods',
  '/api/nxdistributerfathergoods/nxDepGetDisFatherGoods'
]

const SESSION_ISSUING_PATHS = [
  '/api/nxdepartmentuser/depUserLoginDaoDu'
]

let redirectingToLogin = false

function parseUrl(url) {
  const value = String(url || '')
  const marker = '://'
  const start = value.indexOf(marker)
  const pathStart = start >= 0 ? value.indexOf('/', start + marker.length) : 0
  return pathStart >= 0 ? value.slice(pathStart) : value
}

function normalizedApiPath(url) {
  const fullPath = parseUrl(url).split('?')[0]
  const apiIndex = fullPath.indexOf('/api/')
  return apiIndex >= 0 ? fullPath.slice(apiIndex) : fullPath
}

function matchesPath(url, paths) {
  const path = normalizedApiPath(url)
  return paths.some(item => path === item || path.indexOf(item + '/') === 0)
}

function isNongxinleApi(url) {
  const value = String(url || '')
  return value.indexOf(apiUrl.apiUrl) === 0
    || value.indexOf(apiUrl.server + 'shop/') === 0
}

function isNongxinleServerResource(url) {
  return String(url || '').indexOf(apiUrl.server) === 0
}

function isPublicApi(url) {
  return matchesPath(url, PUBLIC_API_PATHS)
}

function isSessionIssuingApi(url) {
  return matchesPath(url, SESSION_ISSUING_PATHS)
}

function toShopUrl(url) {
  if (!isNongxinleApi(url) || isPublicApi(url)) return url
  const value = String(url)
  if (value.indexOf(SHOP_PREFIX) >= 0 || value.indexOf(SHOP_ROOT_PREFIX) >= 0) return value
  return value.replace('/api/', SHOP_PREFIX)
}

function shopTokenUsable() {
  const token = wx.getStorageSync(SHOP_TOKEN_KEY)
  if (!token) return false
  const expiresAt = wx.getStorageSync(SHOP_EXPIRES_KEY)
  if (!expiresAt) return true
  const expiry = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime()
  return !isNaN(expiry) && expiry > Date.now()
}

function salesActingUsable() {
  const customerId = Number(wx.getStorageSync(ACTING_CUSTOMER_KEY))
  const token = wx.getStorageSync(SALES_TOKEN_KEY)
  if (!customerId || !token) return false
  const expiresAt = wx.getStorageSync(SALES_EXPIRES_KEY)
  if (!expiresAt) return true
  const expiry = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime()
  return !isNaN(expiry) && expiry > Date.now()
}

export function hasUsableShopToken() {
  return shopTokenUsable() || salesActingUsable()
}

export function persistShopAuth(responseBody) {
  const auth = responseBody && responseBody.data && responseBody.data.shopAuth
  if (!auth || !auth.accessToken) return false
  wx.setStorageSync(SHOP_TOKEN_KEY, auth.accessToken)
  wx.setStorageSync(SHOP_EXPIRES_KEY, auth.expiresAt || '')
  wx.setStorageSync('shopUserId', auth.userId || '')
  wx.setStorageSync('shopDepartmentId', auth.departmentId || '')
  wx.setStorageSync('shopDepartmentFatherId', auth.departmentFatherId || '')
  wx.setStorageSync('shopDistributerId', auth.distributerId || '')
  delete auth.accessToken
  return true
}

export function persistSalesAuth(responseBody) {
  const data = responseBody && responseBody.data
  const auth = data && data.salesAuth
  if (!auth || !auth.accessToken) return false
  wx.setStorageSync('salesAccessToken', auth.accessToken)
  wx.setStorageSync('salesTokenExpiresAt', auth.expiresAt || '')
  wx.setStorageSync('salesUserId', auth.userId || '')
  wx.setStorageSync('salesDistributerId', auth.distributerId || '')
  if (data.salesInfo) wx.setStorageSync('salesUserInfo', data.salesInfo)
  delete auth.accessToken
  return true
}

export function clearShopLoginState() {
  ;[
    SHOP_TOKEN_KEY, SHOP_EXPIRES_KEY, 'shopUserId', 'shopDepartmentId',
    'shopDepartmentFatherId', 'shopDistributerId', 'userInfo', 'depInfo',
    'orderDepInfo', 'depFatherId', 'disId', ACTING_CUSTOMER_KEY,
    'salesActingDistributerId', 'salesActingCustomerName'
  ].forEach(key => wx.removeStorageSync(key))
}

function goLogin(message) {
  clearShopLoginState()
  if (redirectingToLogin) return
  redirectingToLogin = true
  wx.showToast({ title: message || '登录已失效，请重新登录', icon: 'none' })
  setTimeout(() => {
    wx.reLaunch({
      url: '/pages/ai/customer/chefOrder/chefOrder',
      complete: () => { redirectingToLogin = false }
    })
  }, 100)
}

function protectedOptions(options, protectServerResource) {
  const source = options || {}
  const url = source.url || ''
  const protectedApi = source.shopAuth !== false && isNongxinleApi(url) && !isPublicApi(url)
  const protectedResource = source.shopAuth !== false && protectServerResource
    && isNongxinleServerResource(url)
  const header = Object.assign({}, source.header || {})
  if (protectedApi || protectedResource) {
    if (salesActingUsable()) {
      header['X-NX-Sales-Token'] = wx.getStorageSync(SALES_TOKEN_KEY)
      header['X-NX-Sales-Client'] = 'nxl-shop-mini'
      header['X-NX-Acting-Customer-Id'] = wx.getStorageSync(ACTING_CUSTOMER_KEY)
    } else if (!shopTokenUsable()) {
      goLogin('请先登录订货端')
      return null
    } else {
      header['X-NX-Shop-Token'] = wx.getStorageSync(SHOP_TOKEN_KEY)
      header['X-NX-Shop-Client'] = 'nxl-shop-mini'
    }
  }
  return Object.assign({}, source, {
    url: protectedApi ? toShopUrl(url) : url,
    header: header
  })
}

function parsedBody(response) {
  let body = response && response.data
  try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
  return body
}

function shopAuthFailed(response) {
  if (!response || response.statusCode !== 401) return false
  const body = parsedBody(response)
  return !!(body && typeof body.errorCode === 'string'
    && (body.errorCode.indexOf('SHOP_TOKEN_') === 0
      || body.errorCode.indexOf('SALES_TOKEN_') === 0))
}

function authFailure(options, response) {
  const body = parsedBody(response)
  goLogin((body && body.msg) || '登录已失效，请重新登录')
  if (typeof options.fail === 'function') {
    options.fail({
      errMsg: 'shop token invalid',
      statusCode: response && response.statusCode,
      response: response
    })
  }
}

function missingIssuedToken(options, response) {
  clearShopLoginState()
  const errorResponse = {
    statusCode: 401,
    data: { msg: '后台未签发订货端登录凭证，请确认前后台版本一致' }
  }
  wx.showToast({ title: errorResponse.data.msg, icon: 'none', duration: 3500 })
  if (typeof options.fail === 'function') {
    options.fail({
      errMsg: 'shop token not issued',
      statusCode: 401,
      response: errorResponse
    })
  }
}

export function describeShopRequestError(error, fallback) {
  const response = error && error.response
  const body = parsedBody(response)
  if (body && body.msg) return body.msg
  const statusCode = (error && error.statusCode) || (response && response.statusCode)
  if (statusCode === 401) return '订货端登录凭证无效，请重新登录'
  if (statusCode === 403) return '当前账号没有此操作权限'
  if (statusCode === 404) return '服务器尚未部署订货端登录接口'
  if (statusCode >= 500) return '服务器处理登录失败，请稍后重试'
  const detail = String((error && error.errMsg) || '')
  if (detail.indexOf('timeout') >= 0) return '连接服务器超时，请稍后重试'
  if (detail.indexOf('fail') >= 0 || !statusCode) return '无法连接服务器，请检查网络'
  return fallback || '订货端请求失败，请重试'
}

export function shopRequest(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'shop token required', statusCode: 401 })
    }
    if (options && typeof options.complete === 'function') options.complete()
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (shopAuthFailed(response)) {
      authFailure(options || {}, response)
      return
    }
    const persisted = persistShopAuth(response && response.data)
    const salesPersisted = persistSalesAuth(response && response.data)
    if (isSessionIssuingApi(resolved.url)
        && response && response.data && response.data.code === 0
        && !persisted && !salesPersisted) {
      missingIssuedToken(options || {}, response)
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.request(resolved)
}

export function shopUploadFile(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'shop token required', statusCode: 401 })
    }
    if (options && typeof options.complete === 'function') options.complete()
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (shopAuthFailed(response)) {
      authFailure(options || {}, response)
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.uploadFile(resolved)
}

export function shopDownloadFile(options) {
  const resolved = protectedOptions(options, true)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'shop token required', statusCode: 401 })
    }
    if (options && typeof options.complete === 'function') options.complete()
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (shopAuthFailed(response)) {
      authFailure(options || {}, response)
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.downloadFile(resolved)
}
