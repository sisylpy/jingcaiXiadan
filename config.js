/**
 * 环境选择：同一时刻只有 ACTIVE 指向的那一组地址生效。
 *
 * 仓库默认保持 TEST 生效，测试请求不会打到正式服务器。
 * 正式发布必须同时把 ACTIVE 改为 PROD 且 CONFIRM_PROD_RELEASE 改为 true；
 * 只改其中一个会直接抛错，不允许静默使用错误环境。
 * 不得再用同名字段重复覆盖来切换环境。
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
const CONFIRM_PROD_RELEASE = false

if (ACTIVE !== TEST && ACTIVE !== PROD) {
  throw new Error('运行环境未识别：ACTIVE 只能指向 TEST 或 PROD')
}
if (ACTIVE === PROD && CONFIRM_PROD_RELEASE !== true) {
  throw new Error('正式发布未确认：请同时把 ACTIVE 改为 PROD 且 CONFIRM_PROD_RELEASE 改为 true')
}

const environment = ACTIVE === PROD ? 'PROD' : 'TEST'

module.exports = {
  apiUrl: ACTIVE.apiUrl,
  server: ACTIVE.server,
  environment,

  tencentCloud: {
    engineModelType: '16k_zh',
    voiceFormat: 1
  }
}
