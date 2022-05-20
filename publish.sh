#!/usr/bin/env sh
# 确保脚本抛出遇到的错误
set -e
# 文档
# 生成文档静态文件
npm run docs:build
cd docs/.vitepress/dist
echo 'docs.liucl.cn' > CNAME
git init
git add -A
git commit -m 'update docs'
   git push -f git@github.com:oitq/oitq.github.io.git master:master
cd -
