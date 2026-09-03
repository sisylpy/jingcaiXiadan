const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const app = read('app.json')
const list = read('pages/sales/leads/leads.js')
const listView = read('pages/sales/leads/leads.wxml')
const detail = read('pages/sales/nextActionDetail/nextActionDetail.js')
const detailView = read('pages/sales/nextActionDetail/nextActionDetail.wxml')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(app.includes('pages/sales/nextActionDetail/nextActionDetail'),
  'next-action detail page must be registered')
assert(list.includes("url: '/pages/sales/nextActionDetail/nextActionDetail?actionId='"),
  'every todo task must enter one shared detail page')
assert(!listView.includes('处理中') && !listView.includes('开始处理')
  && listView.includes('待办 {{todo.length}}'),
  'pending and in-progress tasks must be presented as one todo state')
assert(listView.includes('bindtap="openActionDetail"'),
  'task card must be the detail entry')
assert(detail.includes('getSalesNextAction'),
  'task detail must load its source activity')
assert(detailView.includes('{{action.sourceTimeName}}')
  && detailView.includes('{{action.sourceFeedback}}'),
  'task detail must show original time and feedback/problem')
assert(detail.includes('getSalesQuotations(params)')
  && detailView.includes('quotationRows'),
  'quotation task must load a compact customer quotation history')
assert(detail.includes("item.statusCode !== 'DRAFT'"),
  'quotation count must only include submitted quotations')
assert(detail.includes('completeSalesNextAction'),
  'task result must be submitted from the same detail page')
assert(detail.includes('startSalesNextAction'),
  'a pending task must be started automatically before submitting its result')
assert(detail.includes('rescheduleSalesNextAction')
  && detailView.includes('bindtap="openReschedule"'),
  'task detail must support rescheduling')
assert(detail.includes('QUOTE_RESULT_OPTIONS')
  && detailView.includes('本次跟进结果（选择）'),
  'quotation follow-up must show business-specific result choices')
assert(detail.includes("this.data.nextTargetTime + ':00'"),
  'continued follow-up must preserve a specific time instead of forcing 09:00')
assert(detailView.includes('mode="date"') && detailView.includes('mode="time"'),
  'continued follow-up must allow choosing both date and time')

console.log('Sales next-action detail checks passed')
