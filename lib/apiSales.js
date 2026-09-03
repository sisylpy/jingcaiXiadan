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
export const getSalesDepartments = () => request('departments')
export const createSalesDepartment = data => request('departments', 'POST', data)
export const getSalesDepartment = departmentId => request('departments/' + departmentId)
export const updateSalesDepartment = (departmentId, data) =>
  request('departments/' + departmentId, 'PUT', data)
export const updateSalesDepartmentDelivery = (departmentId, data) =>
  request('departments/' + departmentId + '/delivery', 'PUT', data)
export const getSalesDepartmentReturnSummary = departmentId =>
  request('departments/' + departmentId + '/return-summary')
export const getSalesDepartmentLabels = departmentId =>
  request('departments/' + departmentId + '/labels')
export const syncSalesDepartmentLabels = (departmentId, labelIds) =>
  request('departments/' + departmentId + '/labels', 'PUT', { labelIds })
export const createSalesDepartmentLabel = (departmentId, data) =>
  request('departments/' + departmentId + '/labels', 'POST', data)
export const deleteSalesDepartmentLabel = (departmentId, labelId) =>
  request('departments/' + departmentId + '/labels/' + labelId, 'DELETE')
export const addSalesSubDepartment = (departmentId, data) =>
  request('departments/' + departmentId + '/departments', 'POST', data)
export const renameSalesSubDepartment = (rootDepartmentId, departmentId, data) =>
  request('departments/' + rootDepartmentId + '/departments/' + departmentId, 'PUT', data)
export const getSalesDepartmentGoods = departmentId =>
  request('departments/' + departmentId + '/goods')
export const addSalesDepartmentGoods = (departmentId, data) =>
  request('departments/' + departmentId + '/goods', 'POST', data)
export const deleteSalesDepartmentGoods = (departmentId, relationId) =>
  request('departments/' + departmentId + '/goods/' + relationId, 'DELETE')
export const searchSalesCatalog = keyword =>
  request('catalog?keyword=' + encodeURIComponent(keyword))

export const getSalesBusinessTypes = () => request('business-types')
export const getSalesBusinessTypesUsedByDepartments = () =>
  request('business-types/used-by-departments')
export const createSalesBusinessType = data => request('business-types', 'POST', data)
export const getSalesDepartmentBusinessTypes = departmentId =>
  request('departments/' + departmentId + '/business-types')
export const setSalesDepartmentBusinessTypes = (departmentId, primaryBusinessTypeId, businessTypeIds) =>
  request('departments/' + departmentId + '/business-types', 'PUT', {
    primaryBusinessTypeId,
    businessTypeIds: businessTypeIds || [primaryBusinessTypeId]
  })

export const createSalesVisit = data => request('visits', 'POST', data)
export const getSalesDailyVisits = date =>
  request('daily-visits?date=' + encodeURIComponent(date || ''))
export const uploadSalesVisitStorefrontPhoto = (visitId, filePath) => {
  return new Promise((resolve, reject) => {
    getApp().salesUploadFile({
      url: salesApi('visits/' + visitId + '/storefront-photo'),
      filePath,
      name: 'file',
      success: res => {
        let body = res.data
        try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
        resolve({ result: body })
      },
      fail: reject
    })
  })
}
export const getSalesLeadPhotos = leadId =>
  request('leads/' + leadId + '/photos')
export const uploadSalesLeadPhoto = (leadId, filePath) => {
  return new Promise((resolve, reject) => {
    getApp().salesUploadFile({
      url: salesApi('leads/' + leadId + '/photos'),
      filePath,
      name: 'file',
      success: res => {
        let body = res.data
        try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
        resolve({ result: body })
      },
      fail: reject
    })
  })
}
export const deleteSalesVisitPhoto = attachmentId =>
  request('visit-photos/' + attachmentId, 'DELETE', {})
export const downloadSalesVisitPhoto = attachmentId => {
  return new Promise((resolve, reject) => {
    getApp().salesDownloadFile({
      url: salesApi('visit-photos/' + attachmentId + '/content'),
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.tempFilePath)
        else reject({ response: res, statusCode: res.statusCode })
      },
      fail: reject
    })
  })
}
export const updateSalesVisit = (visitId, data) =>
  request('visits/' + visitId, 'PUT', data)
export const ensureSalesVisitLead = visitId =>
  request('visits/' + visitId + '/lead', 'POST', {})
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
export const deleteSalesLead = leadId =>
  request('leads/' + leadId, 'DELETE', {})
export const getSalesLeadWorkflow = leadId =>
  request('leads/' + leadId + '/workflow')
export const closeSalesLeadWorkflow = (leadId, data) =>
  request('leads/' + leadId + '/close', 'POST', data)
export const reopenSalesLeadWorkflow = (leadId, data) =>
  request('leads/' + leadId + '/reopen', 'POST', data)
export const convertSalesLead = (leadId, data) =>
  request('leads/' + leadId + '/convert', 'POST', data)

export const getSalesTodayActions = () => request('workbench/today')
export const getSalesWorkbenchOverview = () => request('workbench/overview')
export const getSalesAnnouncements = () => request('announcements')
export const getSalesAfterSalesBills = date =>
  request('after-sales/bills?date=' + encodeURIComponent(date || ''))
export const getSalesAfterSalesBill = billId =>
  request('after-sales/bills/' + billId)
export const getSalesAfterSalesDictionaries = () =>
  request('after-sales/dictionaries')
export const createSalesAfterSales = (billId, data) =>
  request('after-sales/bills/' + billId + '/cases', 'POST', data)
export const uploadSalesAfterSalesImage = options => {
  return new Promise((resolve, reject) => {
    const formData = {
      stage: options.stage || 'EVIDENCE'
    }
    if (options.afterSalesItemId) formData.afterSalesItemId = String(options.afterSalesItemId)
    if (options.description) formData.description = options.description
    getApp().salesUploadFile({
      url: salesApi('after-sales/' + options.afterSalesId + '/images'),
      filePath: options.filePath,
      name: 'files',
      formData,
      success: res => {
        let body = res.data
        try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
        resolve({ result: body })
      },
      fail: reject
    })
  })
}
export const getSalesNextActions = params => {
  const query = queryString(params)
  return request('next-actions' + (query ? '?' + query : ''))
}
export const getSalesNextAction = actionId => request('next-actions/' + actionId)
export const startSalesNextAction = actionId =>
  request('next-actions/' + actionId + '/start', 'POST', {})
export const rescheduleSalesNextAction = (actionId, data) =>
  request('next-actions/' + actionId + '/reschedule', 'POST', data)
export const completeSalesNextAction = (actionId, data) =>
  request('next-actions/' + actionId + '/complete', 'POST', data)
export const getSalesActivities = params => {
  const query = queryString(params)
  return request('activities' + (query ? '?' + query : ''))
}
export const createSalesNextAction = (activityId, data) =>
  request('activities/' + activityId + '/next-actions', 'POST', data)

export const getSalesBusinessTypeRecommendations = (businessTypeId, limit) =>
  request('recommendations/business-types/' + businessTypeId
    + (limit ? '?limit=' + encodeURIComponent(limit) : ''))
export const searchSalesQuotationCandidates = (keyword, limit) =>
  request('quotation-candidates?keyword=' + encodeURIComponent(keyword)
    + (limit ? '&limit=' + encodeURIComponent(limit) : ''))
export const getSalesDisplayPrice = goodsId =>
  request('goods/' + goodsId + '/display-price')
export const createSalesTemporaryGoods = data =>
  request('goods/temporary', 'POST', data)
export const uploadSalesTemporaryGoodsImage = (goodsId, filePath, slot) => {
  return new Promise((resolve, reject) => {
    getApp().salesUploadFile({
      url: salesApi('goods/' + goodsId + '/images'),
      filePath,
      name: 'file',
      formData: { slot: String(slot) },
      success: res => {
        let body = res.data
        try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
        resolve({ result: body })
      },
      fail: reject
    })
  })
}

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
