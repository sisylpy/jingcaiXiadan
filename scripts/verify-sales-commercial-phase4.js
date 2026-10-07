const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const register = read('pages/salesRegister/salesRegister.js')
assert.match(register, /persistSalesAuth\(result\)/)
assert.match(register, /pages\/sales\/home\/home/)
assert.doesNotMatch(register, /pages\/ai\/customer\/chefOrder\/chefOrder/)

const request = read('lib/salesRequest.js')
assert.match(request, /FEATURE_NOT_ENTITLED/)
assert.match(request, /feature not entitled/)

console.log('sales Phase 4 commercial checks passed')
