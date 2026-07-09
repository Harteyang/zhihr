#!/usr/bin/env python3
"""
将 pinyin-data-generated.js （sync_pinyin_data.py 的输出）注入到 pinyin.js
保留 byShengmu 索引构建逻辑、getByShengmu 等

用法:
  python scripts/inject_pinyin_data.py \
    --generated src/data/pinyin-data-generated.js \
    --target src/data/pinyin.js

示例:
  python scripts/inject_pinyin_data.py \
    --generated /path/to/pinyin-data-generated.js \
    --target /path/to/pinyin-graph/src/data/pinyin.js
"""
import argparse
import re


def inject(generated_path, target_path):
    # 读取生成的数据数组
    with open(generated_path, 'r', encoding='utf-8') as f:
        gen_content = f.read()

    m = re.search(r'export const pinyinData = \[.*?\n\]\n', gen_content, re.DOTALL)
    if not m:
        raise SystemExit('未找到生成的 pinyinData 数组')
    new_pinyin_data = m.group(0)

    # 读取目标文件
    with open(target_path, 'r', encoding='utf-8') as f:
        target = f.read()

    pattern = re.compile(
        r'(// ====+\n// 拼音数据.*?\n// ====+\n\n)?'
        r'export const pinyinData = \[.*?\n\]\n',
        re.DOTALL
    )

    if pattern.search(target):
        new_target = pattern.sub(
            '// ====\n// 拼音数据 — 共 1074 条（含造句字段）\n'
            f'// 数据源：由 scripts/sync_pinyin_data.py 自动生成\n'
            '// ====\n\n' + new_pinyin_data,
            target,
            count=1
        )
    else:
        raise SystemExit('未找到 pinyinData 数组模式')

    # 自动构建 byShengmu 索引（如果目标中是手写索引）
    if 'export const byShengmu' in new_target:
        new_target = re.sub(
            r'// 按声母分组索引\nexport const byShengmu = \{.*?\n\}\n',
            '// 按声母分组索引（自动构建）\n'
            'export const byShengmu = pinyinData.reduce((acc, item) => {\n'
            '  if (!acc[item.shengmu]) acc[item.shengmu] = []\n'
            '  acc[item.shengmu].push(item)\n'
            '  return acc\n'
            '}, {})\n',
            new_target,
            count=1,
            flags=re.DOTALL
        )

    # 自动构建 byYunmu 索引
    if 'export const byYunmu' in new_target \
            and 'pinyinData.reduce' not in new_target.split('export const byYunmu')[1][:200]:
        new_target = re.sub(
            r'// 按韵母分组索引\nexport const byYunmu = \{.*?\n\}\n',
            '// 按韵母分组索引（自动构建）\n'
            'export const byYunmu = pinyinData.reduce((acc, item) => {\n'
            '  if (!acc[item.yunmu]) acc[item.yunmu] = []\n'
            '  acc[item.yunmu].push(item)\n'
            '  return acc\n'
            '}, {})\n',
            new_target,
            count=1,
            flags=re.DOTALL
        )

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(new_target)

    count = new_pinyin_data.count(chr(10) + '  },')
    print(f'目标文件已更新: {target_path}')
    print(f'原长度: {len(target)}, 新长度: {len(new_target)}')
    print(f'pinyinData 条数（应在 1074 附近）: {count}')


def main():
    parser = argparse.ArgumentParser(
        description='将生成的 pinyinData 注入到 pinyin.js')
    parser.add_argument(
        '--generated',
        required=True,
        help='sync_pinyin_data.py 输出的 JS 文件路径')
    parser.add_argument(
        '--target',
        required=True,
        help='目标 pinyin.js 文件路径')
    args = parser.parse_args()

    inject(args.generated, args.target)


if __name__ == '__main__':
    main()
