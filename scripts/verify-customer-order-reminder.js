const assert = require('assert')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

const pageSource = read('pages/ai/customer/customerGoodsAi/customerGoodsAi.js')
const pageView = read('pages/ai/customer/customerGoodsAi/customerGoodsAi.wxml')
const pageStyle = read('pages/ai/customer/customerGoodsAi/customerGoodsAi.wxss')
const apiSource = read('lib/apiPrediction.js')

assert(!pageSource.includes('disGetSubDepAiOrder'), 'AI 补货页不能继续使用旧版推荐接口')
assert(pageSource.includes('getShopDepartmentReplenishment(this.data.depId)'),
  'AI 补货页必须只请求一次 Shop 部门智能补货接口')
assert(!pageSource.includes('Promise.all(')
  && !pageSource.includes('getOrderReminderCatalog')
  && !pageSource.includes('getOrderReminderForecast')
  && !pageSource.includes('getDepartmentGoodsOrderCatalog'),
  '预测、当天订单排除和部门商品匹配必须在后台完成')
assert(!pageSource.includes('getCustomerGoodsProfile'), '智能补货页不应加载主客户全部商品画像')
assert(!pageSource.includes('_buildForecastGoods')
  && !pageSource.includes('_relationUnit')
  && !pageSource.includes('orderedGoodsIds'),
  '小程序页面不能再承担预测商品合并和当天订单排除任务')

assert(apiSource.includes('purchase-prediction-lab/departments/')
  && apiSource.includes("+ '/replenishment'"), 'Shop 专用智能补货 API 路径不正确')
assert(!apiSource.includes('purchase-prediction-lab/shop/departments/'),
  '业务路径不能包含 /shop/，否则客户端会跳过 Shop 登录网关')
assert(apiSource.includes('getApp().shopRequest'), '接口必须经过 Shop 身份校验')

assert(pageView.includes('goods_back')
  && pageView.includes('/images/CE.svg')
  && !pageView.includes('/images/CE.png')
  && pageView.includes('建议订货:')
  && pageView.includes('近期平均用量/天:')
  && pageView.includes('安全库存:')
  && pageView.includes('智能补货建议'), '原智能补货页面结构未保留')
assert(pageStyle.includes('.goods_back')
  && pageStyle.includes('.save_btn')
  && pageStyle.includes('#fff6df'), '原智能补货页面样式未保留')
assert(!pageView.includes('reminder-page')
  && !pageView.includes('summary-grid')
  && !pageView.includes('今天可能漏订'), '不能把页面改造成桌面端分区页面')

console.log('Customer AI replenishment interface checks passed')
