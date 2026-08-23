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
assert(pageJs.indexOf('isSalesAgent') >= 0, '业务员代下单模式入口丢失')
assert(pageJs.indexOf('backFromSalesAgent') >= 0, '业务员代下单返回逻辑丢失')

const actionMenuWxml = read(pageWxmlPath)
;['open-type="share"', 'data-type="paste"', 'data-type="ai"', 'data-type="books"'].forEach(marker => {
  assert(actionMenuWxml.indexOf(marker) >= 0, '加号菜单缺少入口 ' + marker)
})
assert(actionMenuWxml.indexOf('popupWidth') < 0 && actionMenuWxml.indexOf('popupHeight') < 0,
  '加号菜单不能使用未初始化的宽高，否则内容会被裁成 0x0')
assert(pageJs.indexOf('&entry=customerInvite') >= 0, '客户分享链接缺少客户邀请标识')
assert(pageJs.indexOf("'&disId=' + this.data.disId") >= 0, '客户分享链接缺少配送商参数')
assert(pageJs.indexOf("'customerInvite'") >= 0, '客户邀请链接未强制进入客户注册流程')

console.log('Chef order component checks passed')
