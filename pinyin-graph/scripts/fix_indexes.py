#!/usr/bin/env python3
"""
修复 byShengmu 和 byYunmu 索引，将手写索引替换为自动构建版本
确保所有字段（包括 liju）都被正确包含
"""
import re

def fix_pinyin_js(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 替换 byShengmu
    by_shengmu_pattern = re.compile(
        r'// 按声母分组索引\nexport const byShengmu = \{.*?\n\}\n',
        re.DOTALL
    )
    new_by_shengmu = '''// 按声母分组索引（自动构建，包含所有字段）
export const byShengmu = pinyinData.reduce((acc, item) => {
  if (!acc[item.shengmu]) acc[item.shengmu] = []
  acc[item.shengmu].push(item)
  return acc
}, {})\n'''
    
    if by_shengmu_pattern.search(content):
        content = by_shengmu_pattern.sub(new_by_shengmu, content, count=1)
        print('✓ 已替换 byShengmu 为自动构建')
    else:
        print('✗ 未找到 byShengmu 模式')

    # 替换 byYunmu
    by_yunmu_pattern = re.compile(
        r'// 按韵母分组索引\nexport const byYunmu = \{.*?\n\}\n',
        re.DOTALL
    )
    new_by_yunmu = '''// 按韵母分组索引（自动构建，包含所有字段）
export const byYunmu = pinyinData.reduce((acc, item) => {
  if (!acc[item.yunmu]) acc[item.yunmu] = []
  acc[item.yunmu].push(item)
  return acc
}, {})\n'''
    
    if by_yunmu_pattern.search(content):
        content = by_yunmu_pattern.sub(new_by_yunmu, content, count=1)
        print('✓ 已替换 byYunmu 为自动构建')
    else:
        print('✗ 未找到 byYunmu 模式')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'✓ 文件已更新: {file_path}')
    print(f'  原长度: {len(content)} 字符')

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 2:
        print('用法: python scripts/fix_indexes.py <pinyin.js 文件路径>')
        sys.exit(1)
    fix_pinyin_js(sys.argv[1])
