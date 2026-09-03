function numericTimestamp(value) {
  const number = Number(value)
  if (!isFinite(number) || number <= 0) return NaN
  return number < 100000000000 ? number * 1000 : number
}

/**
 * 后台的过期时间可能是时间戳，也可能是 "yyyy-MM-dd HH:mm:ss"。
 * 后一种格式在部分 iOS WebView 中不能直接交给 Date 解析，需要先转为 ISO 形式。
 */
export function parseAuthExpiry(value) {
  if (value === null || value === undefined || value === '') return NaN
  if (typeof value === 'number') return numericTimestamp(value)

  const text = String(value).trim()
  if (/^\d+(\.\d+)?$/.test(text)) return numericTimestamp(text)

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)
    ? text.replace(' ', 'T')
    : text
  return Date.parse(normalized)
}

export function authTokenNotExpired(expiresAt) {
  if (expiresAt === null || expiresAt === undefined || expiresAt === '') return true
  const expiry = parseAuthExpiry(expiresAt)
  return !isNaN(expiry) && expiry > Date.now()
}
