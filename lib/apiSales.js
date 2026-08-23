import Promise from './bluebird'
import { salesApi } from './salesRequest.js'

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    getApp().salesRequest({
      url: salesApi(path),
      method: method || 'GET',
      data: data,
      success: res => resolve({ result: res.data }),
      fail: reject
    })
  })
}

function queryString(params) {
  const source = params || {}
  return Object.keys(source).filter(key => source[key] !== undefined
    && source[key] !== null && source[key] !== '').map(key => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(source[key])
  }).join('&')
}

export const getSalesProfile = () => request('profile')
export const logoutSales = () => request('auth/logout', 'POST', {})
export const getSalesCustomers = () => request('customers')
export const createSalesCustomer = data => request('customers', 'POST', data)
export const getSalesCustomer = customerId => request('customers/' + customerId)
export const updateSalesCustomer = (customerId, data) =>
  request('customers/' + customerId, 'PUT', data)
export const updateSalesCustomerDelivery = (customerId, data) =>
  request('customers/' + customerId + '/delivery', 'PUT', data)
export const getSalesCustomerLabels = customerId =>
  request('customers/' + customerId + '/labels')
export const syncSalesCustomerLabels = (customerId, labelIds) =>
  request('customers/' + customerId + '/labels', 'PUT', { labelIds })
export const createSalesCustomerLabel = (customerId, data) =>
  request('customers/' + customerId + '/labels', 'POST', data)
export const deleteSalesCustomerLabel = (customerId, labelId) =>
  request('customers/' + customerId + '/labels/' + labelId, 'DELETE')
export const addSalesCustomerDepartment = (customerId, data) =>
  request('customers/' + customerId + '/departments', 'POST', data)
export const renameSalesCustomerDepartment = (customerId, departmentId, data) =>
  request('customers/' + customerId + '/departments/' + departmentId, 'PUT', data)
export const getSalesCustomerGoods = customerId =>
  request('customers/' + customerId + '/goods')
export const addSalesCustomerGoods = (customerId, data) =>
  request('customers/' + customerId + '/goods', 'POST', data)
export const deleteSalesCustomerGoods = (customerId, relationId) =>
  request('customers/' + customerId + '/goods/' + relationId, 'DELETE')
export const searchSalesCatalog = keyword =>
  request('catalog?keyword=' + encodeURIComponent(keyword))

export const getSalesBusinessTypes = () => request('business-types')
export const createSalesBusinessType = data => request('business-types', 'POST', data)
export const getSalesCustomerBusinessTypes = departmentId =>
  request('customers/' + departmentId + '/business-types')
export const setSalesCustomerBusinessTypes = (departmentId, primaryBusinessTypeId) =>
  request('customers/' + departmentId + '/business-types', 'PUT', { primaryBusinessTypeId })

export const createSalesVisit = data => request('visits', 'POST', data)
export const updateSalesVisit = (visitId, data) =>
  request('visits/' + visitId, 'PUT', data)
export const getSalesVisits = params => {
  const query = queryString(params)
  return request('visits' + (query ? '?' + query : ''))
}
export const getSalesLeads = params => {
  const query = queryString(params)
  return request('leads' + (query ? '?' + query : ''))
}
export const getSalesLead = leadId => request('leads/' + leadId)
export const updateSalesLead = (leadId, data) =>
  request('leads/' + leadId, 'PUT', data)

export const getSalesBusinessTypeRecommendations = (businessTypeId, limit) =>
  request('recommendations/business-types/' + businessTypeId
    + (limit ? '?limit=' + encodeURIComponent(limit) : ''))
export const searchSalesQuotationCandidates = (keyword, limit) =>
  request('quotation-candidates?keyword=' + encodeURIComponent(keyword)
    + (limit ? '&limit=' + encodeURIComponent(limit) : ''))
export const getSalesDisplayPrice = goodsId =>
  request('goods/' + goodsId + '/display-price')

export const createSalesQuotation = data => request('quotations', 'POST', data)
export const updateSalesQuotation = (quotationId, data) =>
  request('quotations/' + quotationId, 'PUT', data)
export const getSalesQuotations = params => {
  const query = queryString(params)
  return request('quotations' + (query ? '?' + query : ''))
}
export const getSalesQuotation = quotationId => request('quotations/' + quotationId)
export const finalizeSalesQuotation = quotationId =>
  request('quotations/' + quotationId + '/finalize', 'POST', {})
export const closeSalesQuotation = quotationId =>
  request('quotations/' + quotationId + '/close', 'POST', {})
export const getSalesQuotationPreview = quotationId =>
  request('quotations/' + quotationId + '/preview')

export const uploadSalesQuoteOcrPreview = (filePath, mode = 'fast') => {
  return new Promise((resolve, reject) => {
    getApp().salesUploadFile({
      url: salesApi('quote-previews/ocr'),
      filePath,
      name: 'image',
      formData: { mode },
      timeout: mode === 'complex' ? 180000 : 60000,
      success: res => {
        let body = res.data
        try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
        resolve({ result: body })
      },
      fail: reject
    })
  })
}
export const discardSalesQuoteOcrPreview = previewToken =>
  request('quote-previews/' + encodeURIComponent(previewToken), 'DELETE', {})
export const downloadSalesQuotationAttachment = (quotationId, attachmentId) => {
  return new Promise((resolve, reject) => {
    getApp().salesDownloadFile({
      url: salesApi('quotations/' + quotationId + '/attachments/'
        + attachmentId + '/content'),
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.tempFilePath)
        else reject({ response: res, statusCode: res.statusCode })
      },
      fail: reject
    })
  })
}

export const getSalesStandardDimensions = () => request('standards/dimensions')
export const getSalesCurrentStandard = relationId => request('standards/' + relationId)
export const getSalesStandardHistory = relationId =>
  request('standards/' + relationId + '/history')
export const saveSalesStandard = (relationId, data) =>
  request('standards/' + relationId, 'POST', data)
export const updateSalesGoodsRelation = (relationId, data) =>
  request('standards/' + relationId + '/relation', 'PUT', data)

export const uploadSalesStandardImage = (relationId, filePath) => {
  return new Promise((resolve, reject) => {
    getApp().salesUploadFile({
      url: salesApi('standards/' + relationId + '/images'),
      filePath,
      name: 'files',
      success: res => {
        let body = res.data
        try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
        resolve({ result: body })
      },
      fail: reject
    })
  })
}
