#!/bin/sh
# builds app.js (three.js r170 + the park, minified) and stamps the cache-busting version into index.html/style.css
set -e
cd "$(dirname "$0")"
V=${V:-$(date +%s | tail -c 7)}
./node_modules/.bin/esbuild src/main.js --bundle --minify --format=iife --target=es2019,safari14 --legal-comments=eof --outfile=app.js --log-level=warning
sed "s/__V__/$V/g" src/index.tpl.html > index.html
sed "s/__V__/$V/g" src/style.tpl.css > style.css
echo "built v=$V $(wc -c < app.js) bytes"
