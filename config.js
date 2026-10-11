/**
 * 环境选择：同一时刻只有 ACTIVE 指向的那一组地址生效。
 *
 * 仓库默认保持 TEST 生效，测试请求不会打到正式服务器。
 * 发布正式版时，由发布人把 ACTIVE 改成 PROD 并提交；不要把测试地址当作正式发布地址提交。
 */

// 测试服务器
const TEST = {
  apiUrl: 'https://test-api.grainservice.club/nongxinle/api/',
  server: 'https://test-api.grainservice.club/nongxinle/'
}

// 正式服务器（仅发布正式版时启用）
const PROD = {
  apiUrl: 'https://grainservice.club:8443/nongxinle/api/',
  server: 'https://grainservice.club:8443/nongxinle/'
}

const ACTIVE = TEST

module.exports = {
  apiUrl: ACTIVE.apiUrl,
  server: ACTIVE.server,

  tencentCloud: {
    engineModelType: '16k_zh',
    voiceFormat: 1
  }
}
