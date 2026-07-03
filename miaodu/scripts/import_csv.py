"""
导入 CSV 数据到 D1 数据库
用法: python3 import_csv.py <csv路径>
"""
import csv
import sys
import re
import os
import subprocess
import tempfile

def clean_title(title):
    return title.strip().strip('《》').strip()

def parse_knowledge_points(text):
    points = []
    lines = text.split('\n')
    current_title = ''
    current_content = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if re.match(r'^[一二三四五六七八九十]+[、.．]\s*', line):
            if current_title:
                points.append((current_title, '\n'.join(current_content).strip()))
            current_title = re.sub(r'^[一二三四五六七八九十]+[、.．]\s*', '', line).strip()
            current_content = []
        elif re.match(r'^\d+[.．、]\s*', line):
            if current_title:
                current_content.append(line)
            else:
                points.append(('', line))
        else:
            if current_title:
                current_content.append(line)
            else:
                current_content.append(line)
    if current_title:
        points.append((current_title, '\n'.join(current_content).strip()))
    elif current_content:
        points.append(('', '\n'.join(current_content).strip()))
    return points

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else '/Volumes/1T - 数据/Users/yq/Downloads/电子书/冯唐电子书目录_已匹配.csv'

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    books_with_data = [r for r in rows if r.get('目录索引', '').strip() and r.get('核心知识要点', '').strip()]
    print(f"有完整数据的书籍: {len(books_with_data)}")

    # 生成完整 SQL
    all_sql = []

    # 清空
    all_sql.append("DELETE FROM miaodu_knowledge_points;")
    all_sql.append("DELETE FROM miaodu_books;")
    all_sql.append("")

    # 插入书籍
    for row in books_with_data:
        title = clean_title(row['书名'])
        title_esc = title.replace("'", "''")
        all_sql.append(f"INSERT INTO miaodu_books (title, status) VALUES ('{title_esc}', 'completed');")

    all_sql.append("")

    # 插入知识点
    total_kps = 0
    for row in books_with_data:
        title = clean_title(row['书名'])
        title_esc = title.replace("'", "''")
        catalog = row.get('目录索引', '').strip()
        kp_text = row.get('核心知识要点', '').strip()
        sort_order = 0

        for line in catalog.split('\n'):
            line = line.strip()
            if not line:
                continue
            level = 1 if re.match(r'^(第[一二三四五六七八九十百零\d]+章|引言|结语|附录|前言|序言|后记|推荐序|译序|再版序)', line) else 2
            line_esc = line.replace("'", "''")
            all_sql.append(
                f"INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, sort_order) "
                f"VALUES ((SELECT id FROM miaodu_books WHERE title = '{title_esc}'), "
                f"'{line_esc}', {level}, '{line_esc}', {sort_order});"
            )
            sort_order += 1
            total_kps += 1

        if kp_text:
            for kp_title, kp_content in parse_knowledge_points(kp_text):
                display = (kp_title or kp_content[:50]).replace("'", "''")
                kp_title_esc = (kp_title or kp_content[:80]).replace("'", "''")
                kp_content_esc = kp_content.replace("'", "''")
                all_sql.append(
                    f"INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, content, sort_order) "
                    f"VALUES ((SELECT id FROM miaodu_books WHERE title = '{title_esc}'), "
                    f"'{display}', 3, '{kp_title_esc}', '{kp_content_esc}', {sort_order});"
                )
                sort_order += 1
                total_kps += 1

        print(f"  {title}: {sort_order} 条")

    # 写入临时文件
    sql_path = '/tmp/miaodu_import.sql'
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(all_sql))

    print(f"\n共 {len(books_with_data)} 本书, {total_kps} 条知识点")
    print(f"SQL 文件: {sql_path} ({os.path.getsize(sql_path)} 字节)")

    # 执行 SQL 文件
    print("\n开始执行导入...")
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--file=' + sql_path],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )

    print("\n执行结果:")
    for line in result.stdout.split('\n'):
        if 'error' in line.lower() or 'Error' in line:
            print(f"  ⚠️  {line.strip()}")
    for line in result.stderr.split('\n'):
        if 'error' in line.lower() or 'Error' in line:
            print(f"  ⚠️  {line.strip()}")

    # 验证
    print("\n验证:")
    v1 = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--command=SELECT COUNT(*) as cnt FROM miaodu_books;'],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )
    for line in v1.stdout.split('\n'):
        if '"cnt"' in line:
            print(f"  书籍: {line.strip()}")

    v2 = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--command=SELECT COUNT(*) as cnt FROM miaodu_knowledge_points;'],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )
    for line in v2.stdout.split('\n'):
        if '"cnt"' in line:
            print(f"  知识点: {line.strip()}")

    v3 = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--command=SELECT title FROM miaodu_books ORDER BY title;'],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )
    titles = []
    for line in v3.stdout.split('\n'):
        if '"title"' in line:
            t = line.split(':')[1].strip().strip('"').strip(',')
            titles.append(t)
    print(f"\n已导入 {len(titles)} 本书:")
    for t in titles:
        print(f"  - {t}")

if __name__ == '__main__':
    main()
