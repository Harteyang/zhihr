#!/usr/bin/env python3
"""
给 pinyin.js 中 pinyinData 每条记录添加 liju（造句）字段
保留 byShengmu / byYunmu / validPinyinSet 等所有索引不变

策略：用正则匹配每条对象的 zuci 字段后插入 liju
"""
import re
import json

# 读取 JSON 数据并建立索引（key = 声母-韵母-声调）
with open('/Users/yq/Downloads/拼音_最终版.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

liju_map = {}
for r in raw:
    # 原 pinyin.js id 格式: b-a-1（无"声"字）
    tone = str(r['声调']).replace('声', '')
    key = f"{r['声母']}-{r['韵母']}-{tone}"
    liju_map[key] = r.get('造句', '')

print(f'造句索引: {len(liju_map)} 条')

# 读取 pinyin.js
TARGET = '/Users/yq/Documents/zhihr/pinyin-graph/src/data/pinyin.js'
with open(TARGET, 'r', encoding='utf-8') as f:
    content = f.read()

# 定位 pinyinData 数组
m = re.search(r'(export const pinyinData = \[)(.*?)(\n\]\n)', content, re.DOTALL)
if not m:
    raise SystemExit('未找到 pinyinData 数组')
header, body, footer = m.group(1), m.group(2), m.group(3)

# 在 pinyinData 数组的每条对象后追加 liju 字段
# 策略：匹配 "shengmu": "...", "yunmu": "...", "shengdiao": N, "pinyin": "...", "hanzi": "...", "zuci": "..."
# 然后在该 zuci 行后插入 liju 行
# 简单方案：用行级正则匹配每条记录的 zuci 行

lines = body.split('\n')
new_lines = []
added_count = 0
missing = []

for i, line in enumerate(lines):
    new_lines.append(line)
    # 匹配 "zuci": "..." 行（最后字段，可能有或没有逗号）
    m_zuci = re.match(r'^(\s*)"zuci":\s*"((?:[^"\\]|\\.)*)",?\s*$', line)
    if m_zuci:
        indent = m_zuci.group(1)
        # 向前找到该对象的 shengmu, yunmu, shengdiao
        shengmu = yunmu = shengdiao = None
        for j in range(i - 1, -1, -1):
            prev = lines[j]
            if '"shengmu":' in prev:
                mm = re.search(r'"shengmu":\s*"([^"]+)"', prev)
                if mm: shengmu = mm.group(1)
            if '"yunmu":' in prev:
                mm = re.search(r'"yunmu":\s*"([^"]+)"', prev)
                if mm: yunmu = mm.group(1)
            if '"shengdiao":' in prev:
                mm = re.search(r'"shengdiao":\s*(\d+)', prev)
                if mm: shengdiao = int(mm.group(1))
            if '"id":' in prev and 'b-' in prev[:20]:
                break
            if re.match(r'^\s*\{', prev):
                break

        if shengmu is not None and yunmu is not None and shengdiao is not None:
            tone_str = str(shengdiao)
            key = f"{shengmu}-{yunmu}-{tone_str}"
            liju = liju_map.get(key, '')
            if not liju:
                missing.append(key)
            liju_escaped = json.dumps(liju, ensure_ascii=False)
            # 总是给 zuci 加逗号，liju 作为末字段不加逗号
            new_lines[-1] = line.rstrip().rstrip(',').rstrip() + ','
            new_lines.append(f'{indent}"liju": {liju_escaped}')
            added_count += 1

new_body = '\n'.join(new_lines)
new_content = content[:m.start()] + header + new_body + footer + content[m.end():]

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'已为 {added_count} 条数据添加 liju 字段')
print(f'未找到造句的数据: {len(missing)}')
if missing[:5]:
    for k in missing[:5]: print(f'  - {k}')
