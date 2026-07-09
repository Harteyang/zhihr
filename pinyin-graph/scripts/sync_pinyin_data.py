#!/usr/bin/env python3
"""
将 /Users/yq/Downloads/拼音_最终版.json 转换为 pinyin.js 中的 pinyinData 数组
新增 liju（造句）字段，保留所有原始字段
"""
import json
import re
import sys

# 韵母分类
def categorize_yunmu(yunmu):
    if yunmu in ('a', 'o', 'e', 'i', 'u', 'ü'):
        return '单韵母'
    if yunmu in ('ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er'):
        return '复韵母'
    if yunmu in ('an', 'en', 'in', 'un', 'ün'):
        return '前鼻韵母'
    if yunmu in ('ang', 'eng', 'ing', 'ong'):
        return '后鼻韵母'
    return '介音韵母'

def tone_num(s):
    """'4声' -> 4"""
    m = re.search(r'\d', str(s))
    return int(m.group()) if m else 0

def generate_js(data):
    lines = []
    lines.append('// 注：本文件由 scripts/sync_pinyin_data.py 自动生成')
    lines.append('// 数据来源：/Users/yq/Downloads/拼音_最终版.json')
    lines.append('// 总条数: %d' % len(data))
    lines.append('')
    lines.append('export const pinyinData = [')
    for r in data:
        rid = f"{r['声母']}-{r['韵母']}-{r['声调']}"
        obj = {
            'id': rid,
            'shengmu': r['声母'],
            'yunmu': r['韵母'],
            'yunmuCategory': categorize_yunmu(r['韵母']),
            'shengdiao': tone_num(r['声调']),
            'pinyin': r['拼音'],
            'hanzi': r['常用字'],
            'zuci': r.get('组词', ''),
            'liju': r.get('造句', ''),  # 新增字段
        }
        # 格式化输出
        parts = []
        for k, v in obj.items():
            v_str = json.dumps(v, ensure_ascii=False)
            parts.append(f'    "{k}": {v_str}')
        lines.append('  {')
        lines.append(',\n'.join(parts))
        lines.append('  },')
    lines.append(']')
    return '\n'.join(lines)

if __name__ == '__main__':
    with open('/Users/yq/Downloads/拼音_最终版.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    js = generate_js(data)
    with open('/Users/yq/Documents/zhihr/pinyin-graph/src/data/pinyin-data-generated.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print(f'已生成 {len(data)} 条数据')
