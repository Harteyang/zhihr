#!/usr/bin/env python3
"""
将 pinyin-data-generated.js 注入到 pinyin.js
保留 byShengmu 索引构建逻辑、getByShengmu、pinyin 索引等
"""
import re

GEN_FILE = '/Users/yq/Documents/zhihr/pinyin-graph/src/data/pinyin-data-generated.js'
TARGET = '/Users/yq/Documents/zhihr/pinyin-graph/src/data/pinyin.js'

# 读取生成的数据数组
with open(GEN_FILE, 'r', encoding='utf-8') as f:
    gen_content = f.read()

# 提取 pinyinData 数组（从 export const pinyinData = [ 到 ]）
m = re.search(r'export const pinyinData = \[.*?\n\]\n', gen_content, re.DOTALL)
if not m:
    raise SystemExit('未找到生成的 pinyinData 数组')
new_pinyin_data = m.group(0)

# 读取目标文件
with open(TARGET, 'r', encoding='utf-8') as f:
    target = f.read()

# 替换原 pinyinData 数组（保留前面的 // 注释）
pattern = re.compile(
    r'(// ====+\n// 拼音数据.*?\n// ====+\n\n)?'
    r'export const pinyinData = \[.*?\n\]\n',
    re.DOTALL
)

if pattern.search(target):
    new_target = pattern.sub(
        '// ====\n// 拼音数据 — 共 1074 条（含造句字段）\n// 数据源：scripts/sync_pinyin_data.py 自动同步自 /Users/yq/Downloads/拼音_最终版.json\n// ====\n\n' + new_pinyin_data,
        target,
        count=1
    )
else:
    raise SystemExit('未找到 pinyinData 数组模式')

# 检查 byShengmu 重建逻辑是否需要适配
# 现状：byShengmu 是手写索引，每条 data 元素有 id
# 由于新数据 id 格式从 "b-a-1" 改为 "b-a-1声"，需要验证
# 验证 byShengmu 中是否使用了 id 字段
# 简单方案：把 byShengmu 改成自动构建
if 'export const byShengmu' in new_target:
    # 自动构建 byShengmu
    new_target = re.sub(
        r'// 按声母分组索引\nexport const byShengmu = \{.*?\n\}\n',
        '// 按声母分组索引（自动构建）\nexport const byShengmu = pinyinData.reduce((acc, item) => {\n  if (!acc[item.shengmu]) acc[item.shengmu] = []\n  acc[item.shengmu].push(item)\n  return acc\n}, {})\n',
        new_target,
        count=1,
        flags=re.DOTALL
    )

# 同理重写 byYunmu 索引（如果存在）
if 'export const byYunmu' in new_target and 'pinyinData.reduce' not in new_target.split('export const byYunmu')[1][:200]:
    new_target = re.sub(
        r'// 按韵母分组索引\nexport const byYunmu = \{.*?\n\}\n',
        '// 按韵母分组索引（自动构建）\nexport const byYunmu = pinyinData.reduce((acc, item) => {\n  if (!acc[item.yunmu]) acc[item.yunmu] = []\n  acc[item.yunmu].push(item)\n  return acc\n}, {})\n',
        new_target,
        count=1,
        flags=re.DOTALL
    )

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(new_target)

# 验证
print(f'目标文件已更新: {TARGET}')
print(f'原长度: {len(target)}, 新长度: {len(new_target)}')
print(f'pinyinData 条数（应在 1074 附近）: {new_pinyin_data.count(chr(10)+"  },")}')
