#!/usr/bin/env node

/**
 * 妙读本地拆解工具 - 主入口
 *
 * 工作流程（分步执行）：
 *   fetch   → 拉取待处理队列
 *   download → 下载 EPUB
 *   extract → LLM 拆解
 *   review  → 导出数据到 Excel，人工审核
 *   submit  → 审核完成后上传数据
 *
 * 用法:
 *   node cli.js fetch                      # 拉取待处理提交
 *   node cli.js download [id1,id2]         # 下载 EPUB（不传 id 则下载全部）
 *   node cli.js extract                    # LLM 拆解所有已下载书籍
 *   node cli.js export                     # 导出数据为 Excel 文件
 *   node cli.js submit [excel_file]        # 上传 Excel 数据到后端
 *   node cli.js status                     # 查看处理状态
 *   node cli.js clear [id]                 # 清理数据
 *   node cli.js help                       # 查看帮助
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './lib/config.js'
import * as api from './lib/api.js'
import * as fetcher from './lib/fetcher.js'
import * as parser from './lib/parser.js'
import * as xlsx from './lib/xlsx.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')
const QUEUE_FILE = resolve(DATA_DIR, 'queue.json')

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

// ============ 数据持久化 ============

function loadQueue() {
  if (!existsSync(QUEUE_FILE)) {
    return []
  }
  return JSON.parse(readFileSync(QUEUE_FILE, 'utf-8'))
}

function saveQueue(items) {
  writeFileSync(QUEUE_FILE, JSON.stringify(items, null, 2), 'utf-8')
}

// ============ 帮助 ============

function showHelp() {
  console.log(`
妙读本地拆解工具

用法:
  node cli.js <command> [options]

命令:
  fetch                     拉取待处理提交队列
  download [id1,id2]        下载 EPUB（不传 id 则下载全部待处理项）
  extract                   LLM 拆解所有已下载书籍
  export                    导出数据为 Excel 文件
  submit [excel_file]       上传 Excel 数据到后端
  status                    查看处理状态
  clear [id]                清理指定或全部本地数据
  help                      查看帮助

环境变量（.env 文件）:
  API_BASE_URL              后端 API 地址（默认: https://api.zhihr.vip）
  MLOOK_USERNAME            mlook.mobi 用户名
  MLOOK_PASSWORD            mlook.mobi 密码
  LLM_API_KEY               LLM API Key（用于知识提取）
  LLM_BASE_URL              LLM API 地址（默认: https://api.openai.com/v1）
  LLM_MODEL                 LLM 模型名（默认: gpt-4o-mini）

示例:
  # 完整工作流
  node cli.js fetch
  node cli.js download
  node cli.js extract
  node cli.js export          # 打开 Excel 审核
  # ... 修改 Excel ...
  node cli.js submit          # 上传审核后的数据
`)
  process.exit(0)
}

// ============ 命令：fetch ============

async function cmdFetch() {
  console.log('📡 拉取待处理提交队列...')
  const submissions = await api.getQueuedSubmissions()

  if (!submissions.length) {
    console.log('✅ 队列为空')
    return
  }

  const existing = loadQueue()
  const existingIds = new Set(existing.map((s) => s.id))
  const newItems = submissions.filter((s) => !existingIds.has(s.id))

  for (const sub of newItems) {
    const item = {
      id: sub.id,
      title: sub.title,
      type: sub.type,
      searchQuery: sub.search_query || '',
      mlookLink: sub.mlook_link || null,
      status: sub.status,
      createdAt: sub.created_at,
      epubPath: null,
      bookDetail: {},
      extractedBook: null,
      knowledgePoints: [],
      toc: [],
      notes: '',
    }
    existing.push(item)
  }

  saveQueue(existing)
  console.log(`✅ 已获取 ${submissions.length} 个提交，新增 ${newItems.length} 个`)
}

// ============ 命令：download ============

async function cmdDownload(targetIds) {
  const queue = loadQueue()
  const toDownload = targetIds
    ? queue.filter((s) => targetIds.includes(s.id))
    : queue.filter((s) => !s.epubPath)

  if (!toDownload.length) {
    console.log('✅ 没有需要下载的 EPUB')
    return
  }

  console.log(`📥 准备下载 ${toDownload.length} 本 EPUB`)

  let cookies = null
  if (config.mlookUsername && config.mlookPassword) {
    cookies = await fetcher.loginToMlook()
  }

  let successCount = 0
  let failCount = 0

  for (const item of toDownload) {
    try {
      console.log(`\n  ▶ ${item.title}`)
      let detail = {}
      if (item.mlookLink) {
        detail = await fetcher.fetchBookDetail(item.mlookLink, cookies)
        item.bookDetail = detail
      }

      if (detail.epubUrl) {
        const path = await fetcher.downloadEpub(detail.epubUrl, item.title)
        item.epubPath = path
        successCount++
      } else {
        console.log('    ⚠️  无 EPUB 链接，跳过')
      }
    } catch (err) {
      console.error(`    ❌ 下载失败: ${err.message}`)
      failCount++
    }

    saveQueue(queue)
  }

  console.log(`\n✅ 下载完成: ${successCount} 成功, ${failCount} 失败`)
}

// ============ 命令：extract ============

async function cmdExtract() {
  const queue = loadQueue()
  const toExtract = queue.filter((s) => s.epubPath && !s.extractedBook)

  if (!toExtract.length) {
    console.log('✅ 没有需要拆解的书籍')
    return
  }

  console.log(`🧠 准备拆解 ${toExtract.length} 本书籍`)

  for (const item of toExtract) {
    try {
      console.log(`\n  ▶ ${item.title}`)

      // 1. 解析 EPUB
      const parsed = await parser.parseEpub(item.epubPath)
      item.toc = parsed.toc
      item.extractedBook = {
        title: parsed.title || item.title,
        author: parsed.author || '',
        isbn: '',
        douban_rate: null,
        baidu_pan_url: item.bookDetail?.baiduPanUrl || '',
        baidu_pan_code: item.bookDetail?.baiduPanCode || '',
        mlook_link: item.mlookLink || '',
      }
      console.log(`    目录项: ${parsed.toc.length}`)

      // 2. LLM 拆解
      if (parsed.chapters.length > 0) {
        try {
          item.knowledgePoints = await parser.extractKnowledge(
            parsed.title,
            parsed.author,
            parsed.chapters,
            parsed.toc
          )
          console.log(`    知识要点: ${item.knowledgePoints.length} 条`)
        } catch (err) {
          console.error(`    ⚠️  LLM 拆解失败: ${err.message}`)
          item.knowledgePoints = item.toc.map((t, i) => ({
            chapter: t.label,
            level: 3,
            title: t.label,
            content: '',
            sort_order: i,
          }))
        }
      } else {
        item.knowledgePoints = item.toc.map((t, i) => ({
          chapter: t.label,
          level: 3,
          title: t.label,
          content: '',
          sort_order: i,
        }))
      }

      saveQueue(queue)
    } catch (err) {
      console.error(`    ❌ 拆解失败: ${err.message}`)
    }
  }

  console.log(`\n✅ 拆解完成`)
}

// ============ 命令：export ============

function cmdExport() {
  const queue = loadQueue()
  const exported = queue.filter((s) => s.extractedBook)

  if (!exported.length) {
    console.log('❌ 没有可导出的数据（先运行 extract）')
    return
  }

  const filePath = resolve(DATA_DIR, 'export.xlsx')

  const booksData = exported.map((s) => ({
    title: s.extractedBook?.title || '',
    author: s.extractedBook?.author || '',
    isbn: s.extractedBook?.isbn || '',
    douban_rate: s.extractedBook?.douban_rate || '',
    baidu_pan_url: s.extractedBook?.baidu_pan_url || '',
    baidu_pan_code: s.extractedBook?.baidu_pan_code || '',
    mlook_link: s.extractedBook?.mlook_link || '',
  }))

  const kpData = exported.flatMap((s) => {
    const title = s.extractedBook?.title || ''
    return (s.knowledgePoints || []).map((kp, i) => ({
      book_title: title,
      chapter: kp.chapter || '',
      level: kp.level || 3,
      title: kp.title || '',
      content: kp.content || '',
      sort_order: kp.sort_order ?? i,
    }))
  })

  xlsx.writeXlsx(filePath, booksData, kpData)
  console.log(`✅ 已导出到: ${filePath}`)
  console.log(`   书籍: ${booksData.length} 本`)
  console.log(`   知识点: ${kpData.length} 条`)
}

// ============ 命令：submit ============

async function cmdSubmit(excelFile) {
  const filePath = excelFile || resolve(DATA_DIR, 'export.xlsx')
  if (!existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`)
    return
  }

  console.log(`📤 读取 Excel 文件: ${filePath}`)
  const { books, knowledgePoints } = xlsx.readXlsx(filePath)

  if (!books.length) {
    console.error('❌ Excel 中没有书籍数据')
    return
  }

  // 从本地队列获取关联的提交 ID
  const queue = loadQueue()
  const submissionIds = queue
    .filter((s) => s.extractedBook)
    .map((s) => s.id)

  const submitData = {
    books: books.map((b) => ({
      title: b.title,
      author: b.author || '',
      isbn: b.isbn || '',
      douban_rate: b.douban_rate || null,
      baidu_pan_url: b.baidu_pan_url || '',
      baidu_pan_code: b.baidu_pan_code || '',
      mlook_link: b.mlook_link || '',
    })),
    knowledge_points: knowledgePoints,
    submission_ids: submissionIds,
  }

  console.log(`   书籍: ${submitData.books.length} 本`)
  console.log(`   知识点: ${submitData.knowledge_points.length} 条`)
  console.log(`   关联提交: ${submissionIds.length} 个`)

  const result = await api.batchSubmit(submitData)
  console.log(`\n✅ 上传成功: ${result.message}`)
}

// ============ 命令：status ============

function cmdStatus() {
  const queue = loadQueue()
  if (!queue.length) {
    console.log('本地队列为空')
    return
  }

  const stages = {
    '待下载': queue.filter((s) => !s.epubPath).length,
    '已下载': queue.filter((s) => s.epubPath && !s.extractedBook).length,
    '已拆解': queue.filter((s) => s.extractedBook).length,
  }

  console.log('='.repeat(50))
  console.log('  妙读本地处理状态')
  console.log('='.repeat(50))
  console.log(`  总计: ${queue.length} 个提交`)
  for (const [stage, count] of Object.entries(stages)) {
    console.log(`  ${stage}: ${count}`)
  }
  console.log('='.repeat(50))

  for (const item of queue) {
    const stage = item.extractedBook
      ? '✅ 已拆解'
      : item.epubPath
      ? '📥 已下载'
      : '⏳ 待下载'
    console.log(`  #${item.id} ${stage} ${item.title}`)
    if (item.notes) {
      console.log(`    备注: ${item.notes}`)
    }
  }
}

// ============ 命令：clear ============

function cmdClear(targetId) {
  const queue = loadQueue()

  if (targetId) {
    const item = queue.find((s) => s.id === parseInt(targetId, 10))
    if (!item) {
      console.error(`未找到提交 #${targetId}`)
      return
    }
    if (item.epubPath && existsSync(item.epubPath)) {
      unlinkSync(item.epubPath)
    }
    const idx = queue.indexOf(item)
    queue.splice(idx, 1)
    console.log(`已清理提交 #${targetId}`)
  } else {
    queue.forEach((s) => {
      if (s.epubPath && existsSync(s.epubPath)) {
        unlinkSync(s.epubPath)
      }
    })
    queue.length = 0
    console.log('已清理全部本地数据')
  }

  saveQueue(queue)
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'

  switch (command) {
    case 'help':
      showHelp()
      break
    case 'fetch':
      cmdFetch()
      break
    case 'download':
      const ids = args[1] ? args[1].split(',').map(Number) : null
      cmdDownload(ids)
      break
    case 'extract':
      cmdExtract()
      break
    case 'export':
      cmdExport()
      break
    case 'submit':
      cmdSubmit(args[1])
      break
    case 'status':
      cmdStatus()
      break
    case 'clear':
      cmdClear(args[1])
      break
    default:
      console.error(`未知命令: ${command}`)
      console.log('使用 --help 查看帮助')
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})