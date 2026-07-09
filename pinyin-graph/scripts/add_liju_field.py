#!/usr/bin/env python3
"""
给 pinyin.js 中 pinyinData 每条记录添加 liju（造句）字段
保留 byShengmu / byYunmu / validPinyinSet 等所有索引不变

用法:
  python scripts/add_liju_field.py \
    --source-json 数据源.json \
    --target src/data/pinyin.js

示例:
  python scripts/add_liju_field.py \
    --source-json /path/to/拼音_最终版.json \
    --target /path/to/pinyin-graph/src/data/pinyin.js
"""
import argparse
import re
import json


def build_liju_map(source_json):
    """读取带造句的 JSON 数据，建立 key → liju 索引"""
    with open(source_json, 'r', encoding='utf-8') as f:
        raw = json.load(f)

    liju_map = {}
    for r in raw:
        tone = str(r['声调']).replace('声', '')
        key = f"{r['声母']}-{r['韵母']}-{tone}"
        liju_map[key] = r.get('造句', '')
    return liju_map


def inject_liju(target_js, liju_map):
    """在 pinyin.js 的每条记录中插入 liju 字段"""
    with open(target_js, 'r', encoding='utf-8') as f:
        content = f.read()

    m = re.search(r'(export const pinyinData = \[)(.*?)(\n\]\n)', content, re.DOTALL)
    if not m:
        raise SystemExit('未找到 pinyinData 数组')
    header, body, footer = m.group(1), m.group(2), m.group(3)

    lines = body.split('\n')
    new_lines = []
    added_count = 0
    missing = []

    for i, line in enumerate(lines):
        new_lines.append(line)
        m_zuci = re.match(r'^(\s*)"zuci":\s*"((?:[^"\\]|\\.)*)",?\s*$', line)
        if m_zuci:
            indent = m_zuci.group(1)
            shengmu = yunmu = shengdiao = None
            for j in range(i - 1, -1, -1):
                prev = lines[j]
                if '"shengmu":' in prev:
                    mm = re.search(r'"shengmu":\s*"([^"]+)"', prev)
                    if mm:
                        shengmu = mm.group(1)
                if '"yunmu":' in prev:
                    mm = re.search(r'"yunmu":\s*"([^"]+)"', prev)
                    if mm:
                        yunmu = mm.group(1)
                if '"shengdiao":' in prev:
                    mm = re.search(r'"shengdiao":\s*(\d+)', prev)
                    if mm:
                        shengdiao = int(mm.group(1))
                if '"id":' in prev and 'b-' in prev[:20]:
                    break
                if re.match(r'^\s*\{', prev):
                    break

            if shengmu is not None and yunmu is not None and shengdiao is not None:
                key = f"{shengmu}-{yunmu}-{shengdiao}"
                liju = liju_map.get(key, '')
                if not liju:
                    missing.append(key)
                liju_escaped = json.dumps(liju, ensure_ascii=False)
                new_lines[-1] = line.rstrip().rstrip(',').rstrip() + ','
                new_lines.append(f'{indent}"liju": {liju_escaped}')
                added_count += 1

    new_body = '\n'.join(new_lines)
    new_content = content[:m.start()] + header + new_body + footer + content[m.end():]

    with open(target_js, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return added_count, missing


def main():
    parser = argparse.ArgumentParser(
        description='给 pinyin.js 添加 liju 造句字段')
    parser.add_argument(
        '--source-json',
        required=True,
        help='包含造句字段的 JSON 数据文件路径')
    parser.add_argument(
        '--target',
        required=True,
        help='目标 pinyin.js 文件路径')
    args = parser.parse_args()

    liju_map = build_liju_map(args.source_json)
    print(f'造句索引: {len(liju_map)} 条')

    added_count, missing = inject_liju(args.target, liju_map)

    print(f'已为 {added_count} 条数据添加 liju 字段')
    print(f'未找到造句的数据: {len(missing)}')
    if missing[:5]:
        for k in missing[:5]:
            print(f'  - {k}')


if __name__ == '__main__':
    main()
