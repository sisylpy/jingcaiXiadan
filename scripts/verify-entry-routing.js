const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
const entrySource = fs.readFileSync(path.join(root, 'pages/entry/entry.js'), 'utf8')
const chefOrderSource = fs.readFileSync(
  path.join(root, 'pages/ai/customer/chefOrder/chefOrder.js'),
  'utf8'
)
const expirySource = fs.readFileSync(path.join(root, 'lib/authExpiry.js'), 'utf8')
  .replace(/export function /g, 'function ')
  + '\nreturn { parseAuthExpiry, authTokenNotExpired }'
const expiry = new Function(expirySource)()

assert.strictEqual(appJson.pages[0], 'pages/entry/entry', '正常启动必须先进入轻量身份入口')
assert.strictEqual(appJson.lazyCodeLoading, 'requiredComponents', '组件按需加载未开启')
assert(entrySource.includes("app.hasUsableCustomerToken()"), '入口没有复用客户登录缓存')
assert(entrySource.includes("app.hasUsableSalesToken()"), '入口没有复用业务员登录缓存')
assert(entrySource.includes("'/pages/sales/home/home'"), '入口缺少业务员工作台路由')
assert(entrySource.includes("entry=identityResolved"), '客户身份路由缺少已认证标识')
assert(chefOrderSource.includes("options.entry === 'identityResolved'"),
  'chefOrder 仍会在入口登录后重复请求登录')
assert(chefOrderSource.includes("entry=customerInvite"), '客户分享链接入口标识丢失')
assert.strictEqual(
  expiry.parseAuthExpiry('2099-01-01 00:00:00'),
  Date.parse('2099-01-01T00:00:00'),
  'iOS 不兼容的后台日期格式没有被标准化'
)
assert.strictEqual(expiry.authTokenNotExpired('2099-01-01 00:00:00'), true)
assert.strictEqual(expiry.authTokenNotExpired('2000-01-01 00:00:00'), false)

console.log('Startup identity routing checks passed')
