"""
导入 CSV 数据到 D1 数据库
用法: python3 import_csv.py <csv路径> [--clear]

参数:
  --clear   全量重导，清空现有数据后再导入（默认不清理，用于增量导入）
"""
import csv
import sys
import re
import os
import json
import subprocess
from datetime import datetime

LOG_FILE = '/tmp/miaodu_import_errors.log'

def esc(s):
    return s.replace("'", "''")

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

def build_book_values(row):
    """根据CSV行构建书籍INSERT的VALUES部分"""
    title = clean_title(row['书名'])
    subtitle = (row.get('副标题') or '').strip()
    author = (row.get('作者') or '').strip()
    isbn = (row.get('ISBN 号') or '').strip()
    douban_rate = None
    rate_str = (row.get('豆瓣评分') or '').strip()
    if rate_str:
        try:
            douban_rate = float(rate_str)
        except ValueError:
            pass
    douban_link = (row.get('豆瓣读书链接') or '').strip()
    ebook_name = (row.get('电子书名字') or '').strip()

    return {
        'title': title,
        'subtitle': subtitle,
        'author': author,
        'isbn': isbn,
        'douban_rate': douban_rate,
        'douban_link': douban_link,
        'ebook_name': ebook_name,
    }

def build_insert_sql(book):
    """构建单本书的INSERT SQL"""
    fields = ['title', 'status']
    vals = [f"'{esc(book['title'])}'", "'completed'"]

    if book['subtitle']:
        fields.append('subtitle')
        vals.append(f"'{esc(book['subtitle'])}'")
    if book['author']:
        fields.append('author')
        vals.append(f"'{esc(book['author'])}'")
    if book['isbn']:
        fields.append('isbn')
        vals.append(f"'{esc(book['isbn'])}'")
    if book['douban_rate'] is not None:
        fields.append('douban_rate')
        vals.append(str(book['douban_rate']))
    if book['douban_link']:
        fields.append('douban_link')
        vals.append(f"'{esc(book['douban_link'])}'")
    if book['ebook_name']:
        fields.append('ebook_name')
        vals.append(f"'{esc(book['ebook_name'])}'")

    return f"INSERT INTO miaodu_books ({', '.join(fields)}) VALUES ({', '.join(vals)});"

def main():
    csv_path = None
    clear = False
    for arg in sys.argv[1:]:
        if arg == '--clear':
            clear = True
        elif csv_path is None:
            csv_path = arg
    if csv_path is None:
        csv_path = '/Volumes/1T/Users/yq/Downloads/电子书/脚本/脚本数据_最终_修正版.csv'

    print(f"📂 读取 CSV: {csv_path}")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"  总行数: {len(rows)}")

    books_with_data = [r for r in rows if r.get('目录索引', '').strip() and r.get('核心知识要点', '').strip()]
    print(f"  有完整数据的书籍: {len(books_with_data)}")

    # 检测重复书名
    titles_seen = set()
    duplicates = []
    for row in books_with_data:
        title = clean_title(row['书名'])
        if title in titles_seen:
            duplicates.append(title)
        titles_seen.add(title)
    if duplicates:
        print(f"  ⚠️ 重复书名: {duplicates}")

    # 生成 SQL
    all_sql = []
    errors = []

    if clear:
        print("  ⚠️  执行全量重导：将清空现有数据")
        all_sql.append("DELETE FROM miaodu_knowledge_points;")
        all_sql.append("DELETE FROM miaodu_books;")
        all_sql.append("")
    else:
        print("  增量导入模式（如需全量重导请加 --clear 参数）")

    # 插入书籍
    book_map = {}
    for i, row in enumerate(books_with_data):
        book = build_book_values(row)
        title = book['title']
        if not title:
            errors.append(f"[行{i+2}] 书名为空，跳过")
            continue
        book_map[title] = book
        all_sql.append(build_insert_sql(book))

    all_sql.append("")

    # 插入知识点
    total_kps = 0
    skipped = 0
    for i, row in enumerate(books_with_data):
        title = clean_title(row['书名'])
        if title not in book_map:
            skipped += 1
            continue

        catalog = row.get('目录索引', '').strip()
        kp_text = row.get('核心知识要点', '').strip()
        sort_order = 0

        # 目录索引 → level 1/2
        for line in catalog.split('\n'):
            line = line.strip()
            if not line:
                continue
            level = 1 if re.match(r'^(第[一二三四五六七八九十百零\d]+章|引言|结语|附录|前言|序言|后记|推荐序|译序|再版序)', line) else 2
            line_esc = esc(line)
            all_sql.append(
                f"INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, sort_order) "
                f"VALUES ((SELECT id FROM miaodu_books WHERE title = '{esc(title)}'), "
                f"'{line_esc}', {level}, '{line_esc}', {sort_order});"
            )
            sort_order += 1
            total_kps += 1

        # 核心知识要点 → level 3
        if kp_text:
            for kp_title, kp_content in parse_knowledge_points(kp_text):
                display = (kp_title or kp_content[:50]).replace("'", "''")
                kp_title_esc = (kp_title or kp_content[:80]).replace("'", "''")
                kp_content_esc = kp_content.replace("'", "''")
                all_sql.append(
                    f"INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, content, sort_order) "
                    f"VALUES ((SELECT id FROM miaodu_books WHERE title = '{esc(title)}'), "
                    f"'{display}', 3, '{kp_title_esc}', '{kp_content_esc}', {sort_order});"
                )
                sort_order += 1
                total_kps += 1

        print(f"  {title}: {sort_order} 条 ({'subtitle' if book_map[title]['subtitle'] else ''}{' author' if book_map[title]['author'] else ''}{' isbn' if book_map[title]['isbn'] else ''}{' douban' if book_map[title]['douban_rate'] else ''})")

    # 写入 SQL 文件
    sql_path = '/tmp/miaodu_import.sql'
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(all_sql))

    book_count = len(book_map)
    print(f"\n📊 汇总: {book_count} 本书, {total_kps} 条知识点")
    print(f"   SQL 文件: {sql_path} ({os.path.getsize(sql_path):,} 字节)")

    if errors:
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(errors))
        print(f"   ⚠️ 错误日志: {LOG_FILE} ({len(errors)} 条)")

    # 执行导入
    print("\n🚀 开始执行导入...")
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--file=' + sql_path],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )

    has_error = False
    for line in result.stdout.split('\n'):
        if 'error' in line.lower() or 'Error' in line:
            print(f"  ⚠️  {line.strip()}")
            has_error = True
    for line in result.stderr.split('\n'):
        if 'error' in line.lower() or 'Error' in line:
            print(f"  ⚠️  {line.strip()}")
            has_error = True

    if not has_error:
        print("  ✅ 导入完成")

    # 验证
    print("\n🔍 验证结果:")
    v1 = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--command=SELECT COUNT(*) as cnt FROM miaodu_books;'],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )
    for line in v1.stdout.split('\n'):
        if '"cnt"' in line:
            actual_books = line.strip()
            print(f"  书籍数量: {actual_books}")

    v2 = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote', '--command=SELECT COUNT(*) as cnt FROM miaodu_knowledge_points;'],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )
    for line in v2.stdout.split('\n'):
        if '"cnt"' in line:
            actual_kps = line.strip()
            print(f"  知识点数量: {actual_kps}")

    # 抽样验证
    v3 = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'zhihr_db', '--remote',
         '--command=SELECT title, subtitle, author, isbn, douban_rate, douban_link, ebook_name FROM miaodu_books ORDER BY RANDOM() LIMIT 5;'],
        capture_output=True, text=True,
        cwd='/Users/yq/Documents/zhihr/miaodu/backend'
    )
    print("\n📋 随机抽样验证 (5条):")
    print(v3.stdout)

    print(f"\n📝 报告时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == '__main__':
    main()