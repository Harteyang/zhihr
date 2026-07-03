/**
 * 解析结果同步到 D1 数据库脚本
 * 用法: node sync_to_d1.js <json文件路径> [--mlook-link <url>] [--baidu-url <url>] [--baidu-code <code>]
 *
 * 需要先配置 Cloudflare API Token
 * 通过 wrangler d1 execute 命令执行 SQL
 */

import { readFileSync, writeFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const args = process.argv.slice(2)
const jsonPath = args[0]
const mlookLink = args.includes('--mlook-link') ? args[args.indexOf('--mlook-link') + 1] : null
const baiduUrl = args.includes('--baidu-url') ? args[args.indexOf('--baidu-url') + 1] : null
const baiduCode = args.includes('--baidu-code') ? args[args.indexOf('--baidu-code') + 1] : null

if (!jsonPath) {
  console.error('用法: node sync_to_d1.js <json文件路径> [--mlook-link <url>] [--baidu-url <url>] [--baidu-code <code>]')
  process.exit(1)
}

async function main() {
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  const { title, author, knowledgePoints } = data

  if (!title || !knowledgePoints?.length) {
    console.error('JSON 文件中缺少必要字段 (title, knowledgePoints)')
    process.exit(1)
  }

  console.log(`准备同步: ${title}`)
  console.log(`  作者: ${author || '未知'}`)
  console.log(`  知识点数: ${knowledgePoints.length}`)

  // 生成 INSERT SQL
  const insertBook = `
    INSERT INTO miaodu_books (title, author, status, mlook_link, baidu_pan_url, baidu_pan_code)
    VALUES ('${title.replace(/'/g, "''")}', '${(author || '').replace(/'/g, "''")}', 'completed', ${mlookLink ? `'${mlookLink.replace(/'/g, "''")}'` : 'NULL'}, ${baiduUrl ? `'${baiduUrl.replace(/'/g, "''")}'` : 'NULL'}, ${baiduCode ? `'${baiduCode.replace(/'/g, "''")}'` : 'NULL'});
  `

  const insertKps = knowledgePoints.map((kp, i) => `
    INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, content, sort_order)
    VALUES ((SELECT id FROM miaodu_books WHERE title = '${title.replace(/'/g, "''")}'), '${(kp.chapter || '').replace(/'/g, "''")}', ${kp.level || 3}, '${(kp.title || '').replace(/'/g, "''")}', ${kp.content ? `'${kp.content.replace(/'/g, "''")}'` : 'NULL'}, ${i});
  `).join('')

  const fullSql = insertBook + insertKps

  // 写入临时 SQL 文件
  const tmpFile = `/tmp/miaodu_sync_${Date.now()}.sql`
  writeFileSync(tmpFile, fullSql, 'utf-8')

  try {
    console.log('正在执行数据库同步...')
    const { stdout, stderr } = await execAsync(`npx wrangler d1 execute zhihr_db --file=${tmpFile} --remote`)
    console.log('同步完成!')
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
  } catch (err) {
    console.error('同步失败:', err.message)
    process.exit(1)
  }
}

main()
