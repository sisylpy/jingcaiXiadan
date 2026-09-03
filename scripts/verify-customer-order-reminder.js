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
assert(pageSource.includes('getOrderReminderCatalog')
  && pageSource.includes('getOrderReminderForecast'), 'AI 补货页必须使用桌面端同源预测接口')
assert(pageSource.includes("const BASELINE = 'V8_REPLENISHMENT_STATE'"), '预测算法基线未与桌面端统一')
assert(pageSource.includes('departmentId: this.data.depId'), '预测必须使用当前订货部门 ID')
assert(pageSource.includes('getDepartmentGoodsOrderCatalog(this.data.depId, this.data.disId)'),
  '商品关系必须按当前部门和配送商精确查询')
assert(!pageSource.includes('getCustomerGoodsProfile'), '智能补货页不应加载主客户全部商品画像')
assert(pageSource.includes("level !== 'LEVEL_A'")
  && pageSource.includes("lifecycle === 'NOT_DUE'")
  && pageSource.includes('orderedGoodsIds[goodsId]'), '商品列表必须只保留当前待提醒商品')
assert(pageSource.includes('this._relationUnit(candidate) === forecastUnit'),
  '预测商品必须按当前部门商品关系的订货单位精确匹配')

assert(apiSource.includes('purchase-prediction-lab/catalog')
  && apiSource.includes('purchase-prediction-lab/reconciliation-forecasts'), '预测 API 路径不正确')
assert(apiSource.includes('nxdepartmentdisgoods/disGetDepartmentGoods/'),
  '当前部门商品关系接口路径不正确')
assert(apiSource.includes('getApp().shopRequest'), '接口必须经过 Shop 身份校验')

assert(pageView.includes('goods_back')
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
