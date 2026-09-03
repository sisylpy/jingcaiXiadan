const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const view = read('pages/sales/home/home.wxml')
const page = read('pages/sales/home/home.js')
const api = read('lib/apiSales.js')
const appConfig = JSON.parse(read('app.json'))
const pageConfig = JSON.parse(read('pages/sales/home/home.json'))
const pageStyle = read('pages/sales/home/home.wxss')
const afterSalesBillsPage = read('subPackage/pages/customer/customerPage/customerPage.js')
const afterSalesIssuePage = read('subPackage/pages/customer/issuePage/issuePage.js')
const afterSalesCreatePage = read('subPackage/pages/customer/afterSalesCreate/afterSalesCreate.js')
const prospectListPage = read('pages/sales/newCustomerVisits/newCustomerVisits.js')
const prospectListView = read('pages/sales/newCustomerVisits/newCustomerVisits.wxml')
const prospectListStyle = read('pages/sales/newCustomerVisits/newCustomerVisits.wxss')
const heroPath = path.join(root, 'images/sales-home-hero-v1.jpg')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(fs.existsSync(heroPath), 'sales home must keep its generated hero asset in the project')
assert(fs.statSync(heroPath).size < 700 * 1024,
  'sales home hero must remain small enough for the mini-program package')
assert(view.includes('src="/images/sales-home-hero-v1.jpg"'),
  'sales home must render the generated hero background')
assert(view.includes('{{overview.visitCustomerCount}}')
  && view.includes('{{overview.newCustomerCount}}')
  && view.includes('{{overview.quotationCount}}')
  && view.includes('{{overview.pendingReturnCount}}')
  && view.includes('{{overview.intentionCustomerCount}}'),
  'sales home must show all five real overview values')
assert(view.includes('商品报价') && view.includes('待办事项')
  && view.includes('添加新客户') && view.includes('售后问题'),
  'sales home must show the four new large shortcuts')
assert(view.includes('query-card" bindtap="openQuoteQuery"')
  && page.includes('/subPackage-sales/pages/quoteQuery/quoteQuery'),
  'quote query shortcut must open the public-share-capable quote catalog')
assert(view.includes('bindtap="openAfterSales"')
  && page.includes('/subPackage/pages/customer/customerPage/customerPage'),
  'after-sales shortcut must open the sales-owned customer bill page')
assert(view.includes('class="small-action" bindtap="startVisit"')
  && view.includes('class="small-action" bindtap="openQuotation"')
  && view.includes('class="small-action" bindtap="openCustomers"')
  && view.includes('class="small-action" bindtap="openDailyVisits"'),
  'existing entries must remain functional in the small four-cell grid')
assert(api.includes("request('announcements')")
  && page.includes('getSalesAnnouncements()')
  && page.includes('.slice(0, 2)')
  && view.indexOf('class="announcement-panel"') < view.indexOf('class="growth-card"'),
  'up to two announcements must render immediately above the bottom growth card')
assert(view.includes('class="growth-node" src="{{item.icon}}"')
  && page.includes('/images/sales-growth/discover.svg')
  && page.includes('/images/sales-growth/long-term.svg'),
  'growth path must use the five illustrated stage icons')
assert(pageConfig.disableScroll === true
  && pageStyle.includes('height: 100vh')
  && pageStyle.includes('overflow: hidden')
  && pageStyle.includes('.home-bottom { margin-top: auto;'),
  'sales home must stay within one screen and anchor the bottom section')
assert(!view.includes('查看全部')
  && !view.includes('growth-note')
  && view.includes('拜访记录'),
  'highlighted helper text must be removed and the visit entry renamed')
assert(api.includes("request('workbench/overview')")
  && page.includes('getSalesWorkbenchOverview()'),
  'sales home overview must use its authenticated backend endpoint')
const salesAfterSalesPackage = (appConfig.subPackages || [])
  .find(item => item.root === 'subPackage')
assert(salesAfterSalesPackage
  && salesAfterSalesPackage.pages.includes('pages/customer/customerPage/customerPage')
  && salesAfterSalesPackage.pages.includes('pages/customer/issuePage/issuePage')
  && salesAfterSalesPackage.pages.includes('pages/customer/afterSalesCreate/afterSalesCreate'),
  'sales after-sales pages must be registered in the mini-program package')
assert(afterSalesBillsPage.includes('getSalesAfterSalesBills')
  && afterSalesIssuePage.includes('getSalesAfterSalesBill')
  && afterSalesCreatePage.includes('createSalesAfterSales'),
  'sales after-sales flow must load assigned bills and create a case from the selected bill')
assert(prospectListPage.includes("getSalesLeads({ status: 'FOLLOWING', limit: 100 })")
  && prospectListView.includes('wx:key="leadId"')
  && !prospectListView.includes('data-visit-id='),
  'new customer development must render one card per lead instead of one card per visit')
assert(prospectListPage.includes('getSalesNextActions')
  && prospectListPage.includes('getSalesQuotations')
  && prospectListPage.includes('getSalesLeadPhotos')
  && prospectListPage.includes('loadCoverPhotos')
  && prospectListPage.includes("getSalesLeads({ status: 'CLOSED', limit: 100 })")
  && prospectListView.includes('今天需联系')
  && prospectListPage.includes("{ code: 'CONVERTED', name: '已转客户'")
  && prospectListPage.includes("currentAction ? '去处理' : '安排跟进'"),
  'prospect list must show one exclusive customer stage and task reminders')
assert(prospectListStyle.includes('overflow-x: hidden')
  && prospectListStyle.includes('box-sizing: border-box'),
  'prospect list must not overflow the right edge of the phone')

console.log('Sales home visual and overview checks passed')
