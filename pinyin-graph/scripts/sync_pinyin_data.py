#!/usr/bin/env python3
"""
将带造句字段的 JSON 数据转换为 pinyinData 数组（JS 格式）

用法:
  python scripts/sync_pinyin_data.py \
    --source-json 数据源.json \
    --output src/data/pinyin-data-generated.js

示例:
  python scripts/sync_pinyin_data.py \
    --source-json /path/to/拼音_最终版.json \
    --output /path/to/pinyin-graph/src/data/pinyin-data-generated.js
"""
import argparse
import json
import re


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


def generate_js(data, source_path):
    lines = []
    lines.append('// 注：本文件由 scripts/sync_pinyin_data.py 自动生成')
    lines.append(f'// 数据来源：{source_path}')
    lines.append(f'// 总条数: {len(data)}')
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
            'liju': r.get('造句', ''),
        }
        parts = []
        for k, v in obj.items():
            v_str = json.dumps(v, ensure_ascii=False)
            parts.append(f'    "{k}": {v_str}')
        lines.append('  {')
        lines.append(',\n'.join(parts))
        lines.append('  },')
    lines.append(']')
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description='将 JSON 数据转换为 pinyinData JS 数组')
    parser.add_argument(
        '--source-json',
        required=True,
        help='源 JSON 数据文件路径')
    parser.add_argument(
        '--output',
        required=True,
        help='输出的 JS 文件路径')
    args = parser.parse_args()

    with open(args.source_json, 'r', encoding='utf-8') as f:
        data = json.load(f)

    js = generate_js(data, args.source_json)

    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(js)

    print(f'已生成 {len(data)} 条数据 → {args.output}')


if __name__ == '__main__':
    main()
