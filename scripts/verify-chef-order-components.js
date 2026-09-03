const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const pageDir = path.join(projectRoot, 'pages/ai/customer/chefOrder')
const componentRoot = path.join(projectRoot, 'components/chef-order')

const components = [
  'benefit-card',
  'cart',
  'category-list',
  'coupon-popup',
  'department-switcher',
  'registration-popup',
  'search-results',
  'time-list'
]

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function eventHandlers(wxml) {
  const names = new Set()
  const pattern = /\b(?:bind|catch)(?::?[\w-]+)?\s*=\s*"([A-Za-z_$][\w$]*)"/g
  let match
  while ((match = pattern.exec(wxml))) {
    if (match[1] !== 'true' && match[1] !== 'false') names.add(match[1])
  }
  return names
}

function methodExists(source, method) {
  return new RegExp('\\b' + method + '\\s*(?:\\(|:)').test(source)
}

function verifyTagBalance(file) {
  const source = read(file)
  const stack = []
  let index = 0

  while (index < source.length) {
    if (source.indexOf('<!--', index) === index) {
      const commentEnd = source.indexOf('-->', index + 4)
      assert(commentEnd >= 0, file + ': 注释未闭合')
      index = commentEnd + 3
      continue
    }
    if (source[index] !== '<' || !/[\/A-Za-z]/.test(source[index + 1] || '')) {
      index += 1
      continue
    }

    let cursor = index + 1
    let quote = ''
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor]
      if (quote) {
        if (char === quote) quote = ''
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (char === '>') {
        break
      }
    }
    assert(cursor < source.length, file + ': 标签未闭合')

    const rawTag = source.slice(index + 1, cursor).trim()
    const closing = rawTag[0] === '/'
    const selfClosing = /\/$/.test(rawTag)
    const match = (closing ? rawTag.slice(1) : rawTag).match(/^[-\w:]+/)
    if (match) {
      const tagName = match[0]
      if (closing) {
        assert(stack.pop() === tagName, file + ': 标签闭合顺序错误 ' + tagName)
      } else if (!selfClosing) {
        stack.push(tagName)
      }
    }
    index = cursor + 1
  }

  assert(stack.length === 0, file + ': 存在未闭合标签 ' + stack.join(', '))
}

const pageJsonPath = path.join(pageDir, 'chefOrder.json')
const pageWxmlPath = path.join(pageDir, 'chefOrder.wxml')
const pageJsPath = path.join(pageDir, 'chefOrder.js')
const pageWxssPath = path.join(pageDir, 'chefOrder.wxss')
const pageJson = JSON.parse(read(pageJsonPath))

components.forEach(name => {
  const dir = path.join(componentRoot, name)
  ;['js', 'json', 'wxml', 'wxss'].forEach(extension => {
    assert(fs.existsSync(path.join(dir, name + '.' + extension)), name + ' 缺少 .' + extension + ' 文件')
  })
  const tagName = 'chef-order-' + name
  assert(pageJson.usingComponents[tagName], 'chefOrder.json 未注册组件 ' + tagName)

  const componentWxml = path.join(dir, name + '.wxml')
  const componentJs = read(path.join(dir, name + '.js'))
  verifyTagBalance(componentWxml)
  eventHandlers(read(componentWxml)).forEach(handler => {
    assert(methodExists(componentJs, handler), name + ' 缺少事件方法 ' + handler)
  })
})

verifyTagBalance(pageWxmlPath)

const pageSource = [
  'chefOrder.js',
  'chefOrderBenefit.js',
  'chefOrderRegistration.js',
  'chefOrderSearch.js'
].map(file => read(path.join(pageDir, file))).join('\n')
const knownLegacyHandlers = new Set(['cancle', 'delStandard'])
eventHandlers(read(pageWxmlPath)).forEach(handler => {
  if (!knownLegacyHandlers.has(handler)) {
    assert(methodExists(pageSource, handler), 'chefOrder 页面缺少事件方法 ' + handler)
  }
})

assert(read(pageJsPath).split('\n').length < 1600, 'chefOrder.js 再次膨胀到 1600 行以上')
assert(read(pageWxmlPath).split('\n').length < 300, 'chefOrder.wxml 再次膨胀到 300 行以上')
assert(read(pageWxssPath).split('\n').length < 240, 'chefOrder.wxss 再次膨胀到 240 行以上')

const pageJs = read(pageJsPath)
const benefitJs = read(path.join(pageDir, 'chefOrderBenefit.js'))
const registrationJs = read(path.join(pageDir, 'chefOrderRegistration.js'))
const apiRestrauntJs = read(path.join(projectRoot, 'lib/apiRestraunt.js'))
assert(pageJs.indexOf('isSalesAgent') >= 0, '业务员代下单模式入口丢失')
assert(pageJs.indexOf('backFromSalesAgent') >= 0, '业务员代下单返回逻辑丢失')

const actionMenuWxml = read(pageWxmlPath)
;['open-type="share"', 'data-type="paste"', 'data-type="ai"', 'data-type="books"'].forEach(marker => {
  assert(actionMenuWxml.indexOf(marker) >= 0, '加号菜单缺少入口 ' + marker)
})
assert(actionMenuWxml.indexOf('popupWidth') < 0 && actionMenuWxml.indexOf('popupHeight') < 0,
  '加号菜单不能使用未初始化的宽高，否则内容会被裁成 0x0')
assert(actionMenuWxml.indexOf('data-index="{{index}}"') >= 0
    && actionMenuWxml.indexOf('data-item="{{dep}}"') < 0,
  '部门选择不能通过 dataset 传输整个订单对象')
const selectDepartmentSource = pageJs.slice(
  pageJs.indexOf('selectDepartment(e)'), pageJs.indexOf('hideOperation()'))
assert(selectDepartmentSource.indexOf('selectedDepartment = this.data.depArr[index]') >= 0
    && selectDepartmentSource.indexOf('\n      e,') < 0,
  '部门选择不能把完整点击事件写入 setData')
assert(pageJs.indexOf('&entry=customerInvite') >= 0, '客户分享链接缺少客户邀请标识')
assert(pageJs.indexOf("'&disId=' + this.data.disId") >= 0, '客户分享链接缺少配送商参数')
assert(pageJs.indexOf("'customerInvite'") >= 0, '客户邀请链接未强制进入客户注册流程')
assert(pageJs.indexOf('_getDepInfo({ loadOrders: false })') >= 0,
  '未注册客户读取门店资料时不能提前请求受保护的订单数据')
assert(pageJs.indexOf("options.entry === 'boss'") >= 0,
  'Boss 小程序入口必须支持免登录只读模式')
assert(pageJs.indexOf('&& hasDirectCustomerScope') >= 0
    && pageJs.indexOf("options.entry === 'boss' || !options.entry") >= 0,
  '旧版 Boss 链接缺少免登录兼容处理')
assert(pageJs.indexOf('shopAuth: !this.data.isGuestAccess') >= 0,
  'Boss 只读订单请求未关闭客户身份校验')
assert(pageJs.indexOf('allowGuestFallback: isBossEntry') >= 0
    && pageJs.indexOf('preferCustomer: isBossEntry') >= 0,
  'Boss 入口必须先尝试客户登录，再降级为免登录查看')
assert(pageJs.indexOf('if (preferCustomer)') >= 0
    && pageJs.indexOf("wx.setStorageSync('shopMiniLastRole', 'CUSTOMER')") >= 0,
  'Boss 入口遇到业务员和客户双身份时必须优先客户身份')
assert(pageJs.indexOf('_enterGuestAccess()') >= 0,
  'Boss 入口缺少未注册用户的只读降级处理')
assert(benefitJs.indexOf('if (this.data.isGuestAccess)') >= 0,
  'Boss 只读模式不能继续请求客户优惠券和结算预览')
assert(apiRestrauntJs.indexOf('shopAuth: requestOptions.shopAuth !== false') >= 0,
  '订单查询接口缺少按场景切换身份校验的能力')
assert(pageJs.indexOf("url: '../../../resGoodsLessCash/resGoodsLessCash'") >= 0,
  '现金客户商品目录入口丢失')
assert(pageJs.indexOf("url: '../../../resGoodsLess/resGoodsLess'") >= 0,
  '记账客户商品目录入口丢失')
assert(pageJs.indexOf('Number(currentDepartment.nxDepartmentSettleType)') >= 0,
  '游客商品目录必须按照当前部门结算类型分流')
assert(registrationJs.indexOf('36 * 60 * 60 * 1000') >= 0,
  '未注册用户的注册弹窗必须延迟 36 小时显示')
assert(registrationJs.indexOf('Date.now() - firstVisitTimestamp >= REGISTRATION_POPUP_DELAY_MS') >= 0,
  '注册弹窗缺少首次访问时间判断')
assert(pageJs.indexOf("wx.getStorageSync('showChefOrderRegistration')") >= 0,
  '商品页发起下单时必须返回 chefOrder 显示注册弹窗')
assert(registrationJs.indexOf('this.data.forceRegistration') >= 0,
  '用户主动下单时注册弹窗不能受 36 小时延迟限制')

const onLoadSource = pageJs.slice(pageJs.indexOf('onLoad(options)'), pageJs.indexOf('_getDisInfo()'))
assert(onLoadSource.indexOf('showPage: true') < 0,
  '注册弹窗不能在自动登录结果返回前显示，否则会重复闪现')

console.log('Chef order component checks passed')
