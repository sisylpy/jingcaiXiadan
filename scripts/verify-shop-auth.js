#!/usr/bin/env node
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wrapperPath = path.join(root, 'lib', 'shopRequest.js')
const salesWrapperPath = path.join(root, 'lib', 'salesRequest.js')
const failures = []

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.name === '.git' || entry.name === 'node_modules') return []
    return entry.isDirectory() ? walk(full) : [full]
  })
}

for (const file of walk(root).filter(file => file.endsWith('.js'))) {
  const relative = path.relative(root, file)
  if (relative.startsWith('scripts' + path.sep)) continue
  const source = fs.readFileSync(file, 'utf8')
  if (file !== wrapperPath && file !== salesWrapperPath
      && /\bwx\.(request|uploadFile|downloadFile)\s*\(/.test(source)) {
    failures.push(`${relative} 仍在绕过统一请求封装`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

let source = fs.readFileSync(wrapperPath, 'utf8')
source = source
  .replace(/^import apiUrl[^\n]*\n/, "const apiUrl = { apiUrl: 'https://example.test/nongxinle/api/', server: 'https://example.test/nongxinle/' }\n")
  .replace(/export function /g, 'function ')
  + '\nmodule.exports = { shopRequest, shopUploadFile, hasUsableShopToken, clearShopLoginState };\n'

const storage = {}
let lastRequest = null
let lastUpload = null
let requestHandler = null
let uploadHandler = null
let reLaunchUrl = ''
let navigateBackDelta = 0
let pageStack = []
const wx = {
  getStorageSync(key) { return storage[key] || '' },
  setStorageSync(key, value) { storage[key] = value },
  removeStorageSync(key) { delete storage[key] },
  showToast() {},
  reLaunch(options) {
    reLaunchUrl = options.url
    if (options.complete) options.complete()
  },
  navigateBack(options) {
    navigateBackDelta = options.delta
    if (options.complete) options.complete()
  },
  request(options) {
    lastRequest = options
    if (requestHandler) requestHandler(options)
    return options
  },
  uploadFile(options) {
    lastUpload = options
    if (uploadHandler) uploadHandler(options)
    return options
  },
  downloadFile(options) { return options }
}
const moduleRef = { exports: {} }
new Function('wx', 'setTimeout', 'getCurrentPages', 'module', 'exports', source)(
  wx,
  callback => { callback(); return 1 },
  () => pageStack,
  moduleRef,
  moduleRef.exports
)
const auth = moduleRef.exports

requestHandler = options => options.success({ statusCode: 200, data: { code: 0 } })
auth.shopRequest({
  url: 'https://example.test/nongxinle/api/nxdepartmentdisgoods/depGetDepDisGoodsCata',
  success() {}
})
assert.ok(lastRequest.url.includes('/api/nxdepartmentdisgoods/depGetDepDisGoodsCata'))
assert.ok(!lastRequest.url.includes('/api/shop/'))
assert.strictEqual(lastRequest.header['X-NX-Shop-Token'], undefined)

auth.shopRequest({
  url: 'https://example.test/nongxinle/api/nxdepartmentdisgoods/depGetDepGoodsPage',
  success() {}
})
assert.ok(lastRequest.url.includes('/api/nxdepartmentdisgoods/depGetDepGoodsPage'))
assert.ok(!lastRequest.url.includes('/api/shop/'))
assert.strictEqual(lastRequest.header['X-NX-Shop-Token'], undefined)

pageStack = [
  { route: 'pages/ai/customer/chefOrder/chefOrder' },
  { route: 'pages/resGoodsLess/resGoodsLess' }
]
let registrationFailure = null
auth.shopRequest({
  url: 'https://example.test/nongxinle/api/nxdepartmentorders/save',
  fail(error) { registrationFailure = error }
})
assert.strictEqual(navigateBackDelta, 1)
assert.strictEqual(storage.showChefOrderRegistration, true)
assert.strictEqual(reLaunchUrl, '')
assert.strictEqual(registrationFailure.statusCode, 401)

requestHandler = options => options.success({
  statusCode: 200,
  data: {
    code: 0,
    data: {
      userInfo: { nxDepartmentUserId: 8 },
      shopAuth: {
        accessToken: 'shop-token',
        expiresAt: Date.now() + 60000,
        userId: 8,
        departmentId: 18,
        departmentFatherId: 18,
        distributerId: 56
      }
    }
  }
})
auth.shopRequest({
  url: 'https://example.test/nongxinle/api/nxdepartmentuser/depUserLoginDaoDu/code',
  success() {}
})
assert.ok(lastRequest.url.includes('/api/nxdepartmentuser/depUserLoginDaoDu/'))
assert.strictEqual(storage.shopAccessToken, 'shop-token')

requestHandler = options => options.success({ statusCode: 200, data: { code: 0 } })
auth.shopRequest({
  url: 'https://example.test/nongxinle/api/nxdepartmentorders/getBooks',
  success() {}
})
assert.ok(lastRequest.url.includes('/api/shop/nxdepartmentorders/getBooks'))
assert.strictEqual(lastRequest.header['X-NX-Shop-Token'], 'shop-token')
assert.strictEqual(lastRequest.header['X-NX-Shop-Client'], 'nxl-shop-mini')

uploadHandler = options => options.success({ statusCode: 200, data: '{"code":0}' })
auth.shopUploadFile({
  url: 'https://example.test/nongxinle/api/nxdepartmentuser/updateDepUserWithFile',
  filePath: '/tmp/avatar.jpg',
  success() {}
})
assert.ok(lastUpload.url.includes('/api/shop/nxdepartmentuser/updateDepUserWithFile'))
assert.strictEqual(lastUpload.header['X-NX-Shop-Token'], 'shop-token')

requestHandler = options => options.success({
  statusCode: 401,
  data: { errorCode: 'SHOP_TOKEN_INVALID', msg: 'expired' }
})
auth.shopRequest({
  url: 'https://example.test/nongxinle/api/nxdepartmentorders/getBooks',
  fail() {}
})
assert.strictEqual(storage.shopAccessToken, undefined)
assert.strictEqual(reLaunchUrl, '/pages/ai/customer/chefOrder/chefOrder')

console.log('Shop Token 客户端检查通过')
