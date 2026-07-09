import json
import os
from collections import defaultdict

INPUT_FILE = '/Users/yq/Downloads/拼音_最终版_新.json'
OUTPUT_FILE = '/Users/yq/Documents/zhihr/pinyin-graph/src/data/pinyin.js'

def load_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def convert_tone(tone_str):
    tone_map = {'1声': 1, '2声': 2, '3声': 3, '4声': 4, '轻声': 0}
    return tone_map.get(tone_str, 0)

def convert_data(raw_data):
    result = []
    for item in raw_data:
        shengmu = item.get('声母', '')
        yunmu = item.get('韵母', '')
        tone = convert_tone(item.get('声调', ''))
        pinyin = item.get('拼音', '')
        hanzi = item.get('常用字', '')
        zuci = item.get('组词', '')
        liju = item.get('造句', '')
        
        if not pinyin:
            continue
            
        result.append({
            'id': f'{shengmu}-{yunmu}-{tone}',
            'shengmu': shengmu,
            'yunmu': yunmu,
            'shengdiao': tone,
            'pinyin': pinyin,
            'hanzi': hanzi,
            'zuci': zuci,
            'liju': liju,
        })
    return result

def analyze_data(data):
    shengmu_counts = defaultdict(int)
    yunmu_counts = defaultdict(int)
    tone_counts = defaultdict(int)
    
    for item in data:
        shengmu_counts[item['shengmu']] += 1
        yunmu_counts[item['yunmu']] += 1
        tone_counts[item['shengdiao']] += 1
    
    return {
        'total': len(data),
        'shengmu_counts': shengmu_counts,
        'yunmu_counts': yunmu_counts,
        'tone_counts': tone_counts,
    }

def generate_js_file(data, output_path):
    js_content = '''/**
 * pinyin.js — 汉语拼音数据文件
 * 数据来源：拼音_最终版_新.json
 * 包含：声母、韵母、声调、拼音、汉字、组词、造句
 */

export const pinyinData = [\n'''
    
    for i, item in enumerate(data):
        line = f"  {json.dumps(item, ensure_ascii=False)}"
        if i < len(data) - 1:
            line += ','
        line += '\n'
        js_content += line
    
    js_content += ''']

// 按声母分组索引（自动构建，包含所有字段）
export const byShengmu = pinyinData.reduce((acc, item) => {
  if (!acc[item.shengmu]) acc[item.shengmu] = []
  acc[item.shengmu].push(item)
  return acc
}, {})

// 按韵母分组索引（自动构建，包含所有字段）
export const byYunmu = pinyinData.reduce((acc, item) => {
  if (!acc[item.yunmu]) acc[item.yunmu] = []
  acc[item.yunmu].push(item)
  return acc
}, {})

/**
 * 获取指定声母的所有音节
 */
export function getByShengmu(sm) {
  if (sm === 'y') {
    return pinyinData.filter(item => item.shengmu === 'y')
  }
  if (sm === 'w') {
    return pinyinData.filter(item => item.shengmu === 'w')
  }
  return byShengmu[sm] || []
}

/**
 * 获取指定韵母的所有音节
 */
export function getByYunmu(ym) {
  return byYunmu[ym] || []
}

/**
 * 按声母和声调度数筛选
 */
export function filterBy(options = {}) {
  let result = [...pinyinData]
  if (options.shengmu) result = result.filter(r => r.shengmu === options.shengmu)
  if (options.shengdiao) result = result.filter(r => r.shengdiao === options.shengdiao)
  if (options.yunmu) result = result.filter(r => r.yunmu === options.yunmu)
  return result
}

/**
 * 随机抽取 N 条记录
 */
export function randomPick(count = 10, pool = pinyinData) {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)

def generate_report(analysis):
    report = []
    report.append("=" * 60)
    report.append("汉语拼音数据校准报告")
    report.append("=" * 60)
    report.append(f"\n总条目数: {analysis['total']}")
    report.append("\n--- 声母分布 ---")
    for shengmu, count in sorted(analysis['shengmu_counts'].items(), key=lambda x: x[0]):
        report.append(f"  {shengmu}: {count} 条")
    report.append(f"\n声母总数: {len(analysis['shengmu_counts'])}")
    report.append("\n--- 声调分布 ---")
    tone_labels = {0: '轻声', 1: '1声', 2: '2声', 3: '3声', 4: '4声'}
    for tone, count in sorted(analysis['tone_counts'].items()):
        report.append(f"  {tone_labels.get(tone, f'{tone}')}: {count} 条")
    report.append("\n--- 韵母总数 ---")
    report.append(f"  共 {len(analysis['yunmu_counts'])} 个韵母")
    report.append("\n--- 校验结果 ---")
    issues = []
    for item in raw_data:
        if not item.get('拼音'):
            issues.append(f"  缺失拼音: {item}")
        if not item.get('常用字'):
            issues.append(f"  缺失汉字: {item}")
    if issues:
        report.append("  发现问题:")
        for issue in issues[:10]:
            report.append(issue)
        if len(issues) > 10:
            report.append(f"  ... 还有 {len(issues) - 10} 个问题")
    else:
        report.append("  ✓ 数据完整，无缺失项")
    report.append("\n" + "=" * 60)
    return '\n'.join(report)

if __name__ == '__main__':
    print("正在加载新数据文件...")
    raw_data = load_json_file(INPUT_FILE)
    print(f"原始数据条目: {len(raw_data)}")
    
    print("\n正在转换数据格式...")
    converted_data = convert_data(raw_data)
    print(f"转换后条目: {len(converted_data)}")
    
    print("\n正在分析数据...")
    analysis = analyze_data(converted_data)
    
    print("\n" + "=" * 60)
    print(generate_report(analysis))
    
    print("\n正在生成JS文件...")
    generate_js_file(converted_data, OUTPUT_FILE)
    print(f"已生成: {OUTPUT_FILE}")
    
    print("\n数据校准完成！")