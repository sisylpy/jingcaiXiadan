function firstDefined(item, field, snapshotField) {
  const value = item[field]
  if (value !== null && value !== undefined && value !== '') return value
  const snapshot = item[snapshotField]
  return snapshot === null || snapshot === undefined || snapshot === '' ? null : snapshot
}

function sortValue(value) {
  if (value === null || value === undefined || value === '') return 999999
  const number = Number(value)
  return Number.isFinite(number) ? number : 999999
}

function compareCategories(a, b) {
  if (a.sort !== b.sort) return a.sort - b.sort
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
}

export function buildSalesGoodsCatalog(items) {
  const categoryMap = {}
  const normalizedItems = (items || []).map((item, sourceIndex) => {
    const greatCategoryId = firstDefined(item, 'greatCategoryId', 'greatCategoryIdSnapshot')
    const greatCategoryName = firstDefined(
      item, 'greatCategoryName', 'greatCategoryNameSnapshot') || '其他商品'
    const greatCategorySort = firstDefined(
      item, 'greatCategorySort', 'greatCategorySortSnapshot')
    const subCategoryId = firstDefined(item, 'subCategoryId', 'subCategoryIdSnapshot')
    const subCategoryName = firstDefined(
      item, 'subCategoryName', 'subCategoryNameSnapshot') || '其他'
    const subCategorySort = firstDefined(
      item, 'subCategorySort', 'subCategorySortSnapshot')
    const greatCategoryKey = greatCategoryId === null
      ? 'name:' + greatCategoryName : 'id:' + greatCategoryId
    const subCategoryKey = subCategoryId === null
      ? greatCategoryKey + ':name:' + subCategoryName : 'id:' + subCategoryId
    const normalized = Object.assign({}, item, {
      sourceIndex,
      greatCategoryId,
      greatCategoryName,
      greatCategorySort,
      subCategoryId,
      subCategoryName,
      subCategorySort,
      greatCategoryKey,
      subCategoryKey
    })

    if (!categoryMap[greatCategoryKey]) {
      categoryMap[greatCategoryKey] = {
        key: greatCategoryKey,
        id: greatCategoryId,
        name: greatCategoryName,
        sort: sortValue(greatCategorySort),
        count: 0,
        subCategoryMap: {}
      }
    }
    const greatCategory = categoryMap[greatCategoryKey]
    greatCategory.count += 1
    if (!greatCategory.subCategoryMap[subCategoryKey]) {
      greatCategory.subCategoryMap[subCategoryKey] = {
        key: subCategoryKey,
        id: subCategoryId,
        name: subCategoryName,
        sort: sortValue(subCategorySort),
        count: 0
      }
    }
    greatCategory.subCategoryMap[subCategoryKey].count += 1
    return normalized
  })

  const categories = Object.keys(categoryMap).map(key => {
    const category = categoryMap[key]
    const children = Object.keys(category.subCategoryMap)
      .map(childKey => category.subCategoryMap[childKey])
      .sort(compareCategories)
    return {
      key: category.key,
      id: category.id,
      name: category.name,
      sort: category.sort,
      count: category.count,
      subCategories: [{
        key: 'all',
        id: null,
        name: '全部',
        sort: -1,
        count: category.count
      }].concat(children)
    }
  }).sort(compareCategories)

  return { items: normalizedItems, categories }
}

export function filterSalesGoodsCatalog(items, greatCategoryKey, subCategoryKey) {
  return (items || []).filter(item => item.greatCategoryKey === greatCategoryKey
    && (subCategoryKey === 'all' || item.subCategoryKey === subCategoryKey))
}
