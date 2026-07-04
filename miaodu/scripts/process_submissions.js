#!/usr/bin/env node

/**
 * 妙读 - 本地拆解处理工具
 *
 * 用法:
 *   node process_submissions.js              # 单次处理队列中的待处理项
 *   node process_submissions.js --watch      # 持续轮询处理
 *   node process_submissions.js --id <id>    # 处理指定提交
 *   node process_submissions.js --help       # 查看帮助
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './lib/config.js'
import * as api from './lib/api.js'
import * as fetcher from './lib/fetcher.js'
import * as parser from './lib/parser.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============ CLI 参数解析 ============

function parseArgs() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
妙读 - 本地拆解处理工具

用法:
  node process_submissions.js               单次处理队列中的待处理项
  node process_submissions.js --watch       持续轮询处理（默认每 ${config.pollInterval} 秒）
  node process_submissions.js --id <id>     处理指定提交
  node process_submissions.js --help        查看帮助

环境变量（.env 文件）:
  API_BASE_URL        后端 API 地址（默认: https://api.zhihr.vip）
  MLOOK_USERNAME      mlook.mobi 用户名
  MLOOK_PASSWORD      mlook.mobi 密码
  LLM_API_KEY         LLM API Key（用于知识提取）
  LLM_BASE_URL        LLM API 地址（默认: https://api.openai.com/v1）
  LLM_MODEL           LLM 模型名（默认: gpt-4o-mini）
  POLL_INTERVAL       轮询间隔秒数（默认: 60）
  DOWNLOAD_DIR        EPUB 下载目录（默认: ./downloads）
`)
    process.exit(0)
  }

  const watch = args.includes('--watch')
  const idIdx = args.indexOf('--id')
  const specificId = idIdx !== -1 ? parseInt(args[idIdx + 1], 10) : null

  return { watch, specificId }
}

// ============ 主处理流程 ============

async function processSubmission(submission) {
  const { id, title, type, search_query: searchQuery, mlook_link: mlookLink } = submission
  console.log(`\n📦 处理提交 #${id}: ${title} (${type})`)

  try {
    // 步骤 1: 标记为处理中
    console.log('  步骤 1/5: 更新状态为 processing...')
    await api.updateSubmissionStatus(id, 'processing')

    // 步骤 2: 从 mlook 获取详情和 EPUB
    console.log('  步骤 2/5: 抓取 mlook 书籍详情...')
    let cookies = null
    if (config.mlookUsername && config.mlookPassword) {
      cookies = await fetcher.loginToMlook()
    }

    let bookDetail = { baiduPanUrl: null, baiduPanCode: null, epubUrl: null }
    if (mlookLink) {
      bookDetail = await fetcher.fetchBookDetail(mlookLink, cookies)
    }

    console.log(`    百度网盘: ${bookDetail.baiduPanUrl || '无'}`)
    console.log(`    EPUB 链接: ${bookDetail.epubUrl || '无'}`)

    // 步骤 3: 下载并解析 EPUB
    console.log('  步骤 3/5: 下载并解析 EPUB...')
    let parsedBook = { title, author: '', toc: [], chapters: [] }

    if (bookDetail.epubUrl) {
      const epubPath = await fetcher.downloadEpub(bookDetail.epubUrl, title)
      parsedBook = await parser.parseEpub(epubPath)
      console.log(`    目录项: ${parsedBook.toc.length}`)
      console.log(`    章节数: ${parsedBook.chapters.length}`)
    } else {
      console.log('    无 EPUB 链接，跳过下载和解析')
    }

    // 步骤 4: 提取知识要点
    console.log('  步骤 4/5: 提取知识要点...')
    let knowledgePoints = []

    if (parsedBook.chapters.length > 0) {
      try {
        knowledgePoints = await parser.extractKnowledge(
          parsedBook.title,
          parsedBook.author,
          parsedBook.chapters,
          parsedBook.toc
        )
        console.log(`    提取到 ${knowledgePoints.length} 个知识要点`)
      } catch (err) {
        console.error(`    ❌ 知识提取失败: ${err.message}`)
        console.log('    使用目录作为知识点兜底')
        knowledgePoints = parsedBook.toc.map((t, i) => ({
          chapter: t.label,
          level: 3,
          title: t.label,
          content: '',
        }))
      }
    } else {
      console.log('    无章节内容，跳过知识提取')
    }

    // 步骤 5: 回写数据库
    console.log('  步骤 5/5: 回写数据库...')
    const bookData = {
      title: parsedBook.title || title,
      author: parsedBook.author || '',
      baidu_pan_url: bookDetail.baiduPanUrl,
      baidu_pan_code: bookDetail.baiduPanCode,
      mlook_link: mlookLink,
      knowledge_points: knowledgePoints,
    }

    await api.addBook(bookData)
    console.log('    ✅ 数据库回写完成')

    // 标记为完成
    await api.updateSubmissionStatus(id, 'completed')
    console.log(`🎉 处理完成: ${title}`)
  } catch (err) {
    console.error(`\n❌ 处理失败 #${id}: ${err.message}`)
    try {
      await api.updateSubmissionStatus(id, 'failed', err.message)
    } catch {
      console.error('  状态回写也失败了')
    }
  }
}

// ============ 入口 ============

async function main() {
  const { watch, specificId } = parseArgs()

  console.log('='.repeat(50))
  console.log('  妙读 - 本地拆解处理工具')
  console.log(`  API: ${config.apiBaseUrl}`)
  console.log(`  LLM: ${config.llm.model}`)
  console.log(`  下载目录: ${config.downloadDir}`)
  console.log('='.repeat(50))

  if (specificId) {
    // 处理指定提交
    console.log(`\n🔍 处理指定提交 #${specificId}`)
    const submissions = await api.getAllSubmissions()
    const submission = submissions.find((s) => s.id === specificId)
    if (!submission) {
      console.error(`未找到提交 #${specificId}`)
      process.exit(1)
    }
    await processSubmission(submission)
  } else if (watch) {
    // 轮询模式
    console.log(`\n👀 轮询模式 - 每 ${config.pollInterval} 秒检查一次\n`)
    while (true) {
      try {
        const submissions = await api.getQueuedSubmissions()
        if (submissions.length === 0) {
          console.log(`[${new Date().toLocaleTimeString()}] 队列为空，等待中...`)
        } else {
          console.log(`\n📋 发现 ${submissions.length} 个待处理项`)
          for (const submission of submissions) {
            await processSubmission(submission)
          }
        }
      } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] 轮询出错: ${err.message}`)
      }
      await new Promise((r) => setTimeout(r, config.pollInterval * 1000))
    }
  } else {
    // 单次模式
    const submissions = await api.getQueuedSubmissions()
    if (submissions.length === 0) {
      console.log('✅ 队列为空，无需处理')
    } else {
      console.log(`\n📋 发现 ${submissions.length} 个待处理项`)
      for (const submission of submissions) {
        await processSubmission(submission)
      }
      console.log('\n✅ 全部处理完成')
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})