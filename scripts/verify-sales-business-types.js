const fs = require('fs')
const path = require('path')
const assert = require('assert')

const miniRoot = path.resolve(__dirname, '..')
const workspace = path.resolve(miniRoot, '../../..')
const serverRoot = path.join(workspace, 'nongxinle-server')
const read = file => fs.readFileSync(file, 'utf8')

const api = read(path.join(miniRoot, 'lib/apiSales.js'))
const editor = read(path.join(miniRoot,
  'pages/sales/customerBusinessType/customerBusinessType.js'))
const quotation = read(path.join(miniRoot, 'pages/sales/quotation/quotation.js'))
const recommendations = read(path.join(miniRoot,
  'subPackage-sales/pages/recommendations/recommendations.wxml'))
const quoteQuery = read(path.join(miniRoot,
  'subPackage-sales/pages/quoteQuery/quoteQuery.js'))
const quoteQueryView = read(path.join(miniRoot,
  'subPackage-sales/pages/quoteQuery/quoteQuery.wxml'))
const quoteQueryStyle = read(path.join(miniRoot,
  'subPackage-sales/pages/quoteQuery/quoteQuery.wxss'))
const shopRequest = read(path.join(miniRoot, 'lib/shopRequest.js'))
const publicController = read(path.join(serverRoot,
  'src/main/java/com/nongxinle/distribute/sales/api/SalesPublicQuoteController.java'))
const preview = read(path.join(miniRoot,
  'pages/sales/quotationPreview/quotationPreview.wxml'))
const migration = read(path.join(serverRoot, 'src/main/resources/db/migration',
  'V20260824_05__department_multi_business_type_visuals.sql'))

assert(api.includes('businessTypeIds: businessTypeIds || [primaryBusinessTypeId]'))
assert(editor.includes('selectedBusinessTypeIds'))
assert(editor.includes('setPrimaryBusinessType'))
assert(quotation.includes('businessTypeId: this.data.selectedBusinessTypeId || null'))
assert(recommendations.includes('industry-hero-image'))
assert(recommendations.includes('bannerImageUrl'))
assert(quoteQuery.includes("String(options.public || '') === '1'"))
assert(quoteQuery.includes("app.shopRequest({"))
assert(quoteQuery.includes("public/sales/quote-catalog"))
assert(quoteQuery.includes('onShareAppMessage()'))
assert(quoteQueryView.includes('open-type="share"'))
assert(!quoteQueryView.includes('bottom-bar'))
assert(!quoteQueryView.includes('加入报价'))
assert(!quoteQueryView.includes('家客户采购'))
assert(!quoteQueryView.includes('产地：'))
assert(!quoteQueryView.includes('热销第'))
assert(quoteQueryView.includes('class="rank-index'))
assert(quoteQueryView.includes('{{item.rank}}'))
assert(!quoteQueryView.includes('hero-image'))
assert(quoteQueryStyle.includes('background: #f7f8f7;'))
assert(quoteQueryStyle.includes('overflow-x: hidden;')
  && quoteQueryStyle.includes('box-sizing: border-box;'))
assert(quoteQueryStyle.includes('.goods-card')
  && quoteQueryStyle.includes('border-bottom: 1rpx solid #e4e9e6;')
  && quoteQueryStyle.includes('box-shadow: none;'))
assert(shopRequest.includes("'/api/public/sales/quote-catalog'"))
assert(publicController.includes('@RequestMapping("api/public/sales")'))
assert(!publicController.includes('SalesAuthContext'))
assert(preview.includes('businessTypeBannerUrl'))
assert(migration.includes("'BBQ', 'RICE_NOODLES', 'DUMPLING'"))

const assetRoot = path.join(serverRoot,
  'src/main/resources/sales-business-type-assets')
assert.strictEqual(fs.readdirSync(path.join(assetRoot, 'icons'))
  .filter(name => name.endsWith('.svg')).length, 44)
assert.deepStrictEqual(fs.readdirSync(path.join(assetRoot, 'banners')).sort(),
  ['bbq.jpg', 'dumpling.jpg', 'rice_noodles.jpg'])

console.log('Sales multi-business-type and 3-banner pilot checks passed')
