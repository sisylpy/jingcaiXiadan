import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const source = fs.readFileSync(path.join(root, 'config.js'), 'utf8')

// 1) 默认必须是测试环境，绝不能默认指向正式服务器
const config = require('../config.js')
assert.equal(config.environment, 'TEST')
assert.match(config.apiUrl, /^https:\/\/test-api\.grainservice\.club\//)
assert.match(config.server, /^https:\/\/test-api\.grainservice\.club\//)
assert.doesNotMatch(config.apiUrl, /grainservice\.club:8443/)

// 2) 不得再用同名字段重复覆盖来切换环境：
//    apiUrl/server 只允许出现在 TEST、PROD 两组定义和最终导出中，且导出必须取自 ACTIVE
assert.equal((source.match(/apiUrl:/g) || []).length, 3, 'apiUrl 只允许 TEST/PROD/导出三处')
assert.equal((source.match(/server:/g) || []).length, 3, 'server 只允许 TEST/PROD/导出三处')
assert.match(source, /apiUrl: ACTIVE\.apiUrl/)
assert.match(source, /server: ACTIVE\.server/)

// 3) 正式环境必须显式确认，未确认不得静默生效
assert.match(source, /CONFIRM_PROD_RELEASE/)
assert.match(source, /ACTIVE === PROD && CONFIRM_PROD_RELEASE !== true/)

console.log('shop-mini 环境配置检查通过（默认 TEST，PROD 需显式确认）')
