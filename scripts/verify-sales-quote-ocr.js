const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const preview = read('pages/sales/ocrQuotePreview/ocrQuotePreview.js')
const previewView = read('pages/sales/ocrQuotePreview/ocrQuotePreview.wxml')
const imageCropper = read('components/sales-quote-image-cropper/sales-quote-image-cropper.js')
const quotation = read('pages/sales/quotation/quotation.js')
const quotationCenter = read('pages/sales/quotationCenter/quotationCenter.js')
const quotationCenterView = read('pages/sales/quotationCenter/quotationCenter.wxml')
const quotationView = read('pages/sales/quotation/quotation.wxml')
const recommendation = read('subPackage-sales/pages/recommendations/recommendations.js')
const goodsAdder = read('subPackage-sales/pages/quotationGoodsAdd/quotationGoodsAdd.js')
const goodsAdderView = read('subPackage-sales/pages/quotationGoodsAdd/quotationGoodsAdd.wxml')
const temporaryGoodsAdd = read('subPackage-sales/pages/temporaryGoodsAdd/temporaryGoodsAdd.js')
const temporaryGoodsAddView = read('subPackage-sales/pages/temporaryGoodsAdd/temporaryGoodsAdd.wxml')
const appConfig = read('app.json')
const api = read('lib/apiSales.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(preview.includes('uploadSalesQuoteOcrPreview'), 'OCR preview must use sales preview upload API')
assert(imageCropper.includes('wx.chooseMedia'), 'quote OCR must reuse camera and album image selection')
assert(imageCropper.includes("ocrMode: 'fast'"), 'quote OCR must reuse the Boss single/multi mode selector')
assert(imageCropper.includes('startOCRRecognitionFast'), 'single-column mode must emit the Boss fast OCR event')
assert(imageCropper.includes('startOCRRecognition'), 'multi-column mode must emit the Boss complex OCR event')
assert(imageCropper.includes("select('#cropCanvas')"), 'quote OCR selected area must be exported through the Boss crop canvas')
assert(previewView.includes('sales-quote-image-cropper'), 'quote OCR page must use the image cropper before upload')
assert(preview.includes('onStartOCRFast(e)'), 'quote page must receive the Boss single-column event')
assert(preview.includes('onStartOCR(e)'), 'quote page must receive the Boss multi-column event')
assert(preview.includes("this.startQuoteRecognition(e, 'complex')"), 'multi-column event must request complex quote recognition')
assert(preview.includes('selectedCandidate: null'), 'OCR must not auto-select a goods candidate')
assert(preview.includes('deleteLine(e)'), 'OCR confirmation must support deleting a wrong line')
assert(preview.includes('addMissing()'), 'OCR confirmation must support adding a missed item')
assert(preview.includes("wx.setStorageSync(TRANSFER_KEY"), 'confirmed OCR rows must return to the existing quotation workspace')
assert(!preview.includes('createSalesQuotation'), 'OCR preview page must not create a quotation')
assert(!preview.includes('NxDepartmentOrders'), 'OCR preview page must not reference formal orders')
assert(!preview.includes('distributerId'), 'tenant id must not be supplied by OCR preview UI')
assert(!preview.includes('recognizeOrderAsync') && !preview.includes('recognizeOrderFast'), 'quote OCR must not call Boss order OCR endpoints')
assert(!preview.includes('depId') && !preview.includes('depFatherId'), 'quote OCR must not require an order department')
assert(quotation.includes('salesOcrQuoteTransfer'), 'existing quotation workspace must consume OCR-confirmed rows')
assert(quotation.includes('previewToken: this.data.previewToken'), 'quotation save must bind the owned preview token')
assert(api.includes("salesApi('quote-previews/ocr')"), 'OCR upload must use the protected sales API namespace')
assert(api.includes('formData: { mode }'), 'OCR upload must send the selected Boss fast/complex mode')

assert(quotationCenterView.includes('bindtap="startQuotation"'), 'quotation center plus button must create a quotation directly')
assert(quotationCenter.includes("url: '/pages/sales/quotation/quotation'"), 'quotation center must enter the shared workspace directly')
assert(!quotationCenterView.includes('create-menu'), 'quotation center must not ask users to choose an input mode first')
assert(quotationView.includes('bindtap="openGoodsAdder"'), 'quotation workspace must open the dedicated goods-adder page')
assert(!quotationView.includes('quote-entry-row'), 'quotation workspace must not keep inline goods-entry controls')
assert(goodsAdderView.includes('按行业报价'), 'dedicated goods-adder must retain industry recommendations')
assert(api.includes("request('business-types/used-by-departments')"),
  'sales API must expose business types already used by formal departments')
assert(goodsAdder.includes('getSalesBusinessTypesUsedByDepartments()'),
  'dedicated goods-adder must only load business types used by departments')
assert(goodsAdderView.includes('图片识别') && goodsAdderView.includes('语音说单')
  && goodsAdderView.includes('粘贴清单'),
  'dedicated goods-adder must expose image, voice and pasted-list input')
assert(goodsAdder.includes('searchSalesQuotationCandidates'),
  'recognized text must match protected sales quotation candidates')
assert(goodsAdderView.includes('bindtap="openTemporaryGoodsAdd"'),
  'unmatched quotation goods must expose a create-goods button')
assert(goodsAdder.includes('consumeTemporaryGoodsTransfer()'),
  'new temporary goods must return to and select the originating quotation row')
assert(temporaryGoodsAdd.includes('createSalesTemporaryGoods'),
  'temporary goods page must use the protected sales create API')
assert(temporaryGoodsAdd.includes('wx.chooseMedia') && temporaryGoodsAdd.includes('photos.length'),
  'temporary goods page must support selecting up to two product images')
assert(api.includes("salesApi('goods/' + goodsId + '/images')"),
  'temporary goods images must use the protected sales upload API')
assert(temporaryGoodsAddView.includes('商品名称') && temporaryGoodsAddView.includes('销售单位'),
  'temporary goods page must require goods name and sales unit')
assert(api.includes("request('goods/temporary', 'POST', data)"),
  'temporary goods creation must stay in the protected sales API namespace')
assert(goodsAdder.includes('ourQuotePrice'),
  'recognized goods must carry an editable quotation price')
assert(goodsAdder.includes("wx.setStorageSync(TRANSFER_KEY"),
  'confirmed goods must return to the existing quotation workspace')
assert(appConfig.includes('pages/quotationGoodsAdd/quotationGoodsAdd'),
  'AI goods-adder must stay in the sales subpackage')
assert(appConfig.includes('pages/temporaryGoodsAdd/temporaryGoodsAdd'),
  'temporary goods form must stay in the sales subpackage')
assert(!quotationCenterView.includes('未命名报价'), 'quotation list must not use 未命名报价 as its business title')
assert(quotation.includes('persistDraft()'), 'shared workspace must own quotation persistence')
assert(quotation.includes('? updateSalesQuotation(this.data.quotationId, this.payload())'), 'existing draft must update the same quotation')
assert(quotation.includes(': createSalesQuotation(this.payload())'), 'new quotation must use the shared create path')
assert(quotation.includes('this.persistDraft().then(() => finalizeSalesQuotation(this.data.quotationId))'), 'finalization must reuse shared draft persistence')
assert(quotation.includes("content: '定稿后将锁定本次商品和报价快照，是否继续？'"), 'finalization must confirm immutable snapshot semantics')
assert(quotation.includes('departmentId: this.data.departmentId || null'), 'department context must be preserved in the shared payload')
assert(quotation.includes('leadId: this.data.leadId || null'), 'lead context must be preserved in the shared payload')
assert(quotation.includes('visitId: this.data.visitId || null'), 'visit context must be preserved in the shared payload')
assert(recommendation.includes("returnToWorkspace: String(options.returnToWorkspace || '') === '1'"), 'industry recommendation must support returning to the current workspace')
assert(recommendation.includes('wx.navigateBack()'), 'industry items must return to the existing workspace instead of creating another quotation')
assert(quotation.includes('getSalesDepartments()'), 'draft quotation must load assigned formal departments')
assert(quotation.includes('getSalesVisits({ limit: 100 })'), 'draft quotation must load stranger visit options')
assert(quotation.includes('.filter(item => !item.departmentId)'), 'department visits must not be mislabeled as stranger visits')
assert(quotation.includes('selectQuoteTarget(e)'), 'draft quotation must support selecting a quotation target')
assert(quotationView.includes('正式客户 {{formalCustomers.length}}'), 'target picker must expose formal customers')
assert(quotationView.includes('陌生拜访 {{strangerVisits.length}}'), 'target picker must expose stranger visits')
assert(quotationCenterView.includes('catchtap="requestDeleteQuotation"'), 'quotation center must expose delete for draft and history rows')
assert(quotationView.includes('bindtap="requestDeleteQuotation"'), 'quotation workspace must expose delete for a saved quotation')
assert(!api.includes('deleteSalesQuotation'), 'client must not invent a quotation delete API before the backend supports it')
assert(!quotationCenterView.includes('已发送') && !quotationCenterView.includes('已接受')
  && !quotationCenterView.includes('客户拒绝'), 'quotation center must not fabricate unsupported sales states')

console.log('Sales quote OCR and unified workspace checks passed')
