#!/bin/sh

set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

failed=0

# config.js 会被打进小程序，禁止放任何长期凭证字段。
if rg -l -i '(apiKey|secretId|secretKey|suiteSecret|encodingAESKey)[[:space:]]*:' config.js >/dev/null; then
  echo '禁止在 config.js 中保存长期密钥字段。'
  failed=1
fi

# 长期云密钥和固定 Bearer 都只能存在于服务端。
if rg -l -i 'api\.deepseek\.com|Authorization[[:space:]]*:[^\n]*Bearer|AKID[A-Za-z0-9]{16,}|sk-[A-Za-z0-9_-]{20,}' \
  --glob '*.js' --glob '*.json' --glob '!miniprogram_npm/**' . >/dev/null; then
  echo '检测到疑似客户端长期密钥或云服务直连，请改为服务端代理。'
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo '客户端密钥检查通过。'
