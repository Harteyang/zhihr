import re
import os

PINYIN_FILE = '/Users/yq/Documents/zhihr/pinyin-graph/src/data/pinyin.js'
TEST_FILE = '/Users/yq/Documents/zhihr/pinyin-graph/pinyin.liju.data.test.js'
CSV_FILE = '/Users/yq/Documents/zhihr/pinyin-graph/scripts/convert-csv.js'

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f'{filepath}: 文件不存在，跳过')
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_count = len(re.findall(r'零声母', content))
    content = content.replace('零声母', '整体认读音节')
    new_count = len(re.findall(r'整体认读音节', content))
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'{filepath}: {old_count} 处 "零声母" 已替换为 "整体认读音节"')

if __name__ == '__main__':
    fix_file(PINYIN_FILE)
    fix_file(TEST_FILE)
    fix_file(CSV_FILE)