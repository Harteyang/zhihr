/**
 * 本地 EPUB 解析脚本
 * 用法: node parse_epub.js <epub文件路径>
 * 输出: <书名>_parsed.json
 */
import JSZip from 'jszip'
import { readFileSync, writeFileSync } from 'fs'
import { parse, resolve } from 'path'

async function parseEpubFile(filePath) {
  const buffer = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buffer)

  // 读取 container.xml 定位 OPF
  const containerXml = await zip.file('META-INF/container.xml').async('text')
  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1]
  if (!opfPath) throw new Error('无法定位 OPF 文件')

  // 解析 OPF
  const opfContent = await zip.file(opfPath).async('text')
  const title = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)?.[1] || ''
  const author = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/)?.[1] || ''

  // 查找 NCX 文件
  const ncxMatch = opfContent.match(/href="([^"]*\.ncx)"/i)
  const ncxPath = ncxMatch ? resolve(parse(opfPath).dir, ncxMatch[1]) : null

  const toc = []
  const knowledgePoints = []

  if (ncxPath) {
    // 尝试多种路径形式解析 NCX
    let ncxContent = null
    for (const tryPath of [ncxPath, `OEBPS/${ncxMatch[1]}`, ncxMatch[1]]) {
      const file = zip.file(tryPath)
      if (file) {
        ncxContent = await file.async('text')
        break
      }
    }

    if (ncxContent) {
      const navPoints = ncxContent.match(/<navPoint[^>]*>[\s\S]*?<\/navPoint>/g) || []
      for (const np of navPoints) {
        const label = np.match(/<navLabel>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<\/navLabel>/)?.[1]
        const src = np.match(/<content[^>]*src="([^"]+)"/)?.[1]
        const order = parseInt(np.match(/playOrder\s*=\s*"(\d+)"/)?.[1] || '0', 10)

        if (label) {
          toc.push({ label, src, order })

          // 提取章节文件中的 heading
          if (src) {
            const chapterFile = zip.file(src)
            if (chapterFile) {
              const chapterHtml = await chapterFile.async('text')
              const headings = chapterHtml.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/g)
              if (headings) {
                headings.forEach((h) => {
                  const text = h.replace(/<[^>]+>/g, '').trim()
                  if (text && text !== label) {
                    knowledgePoints.push({
                      chapter: label,
                      level: 3,
                      title: text,
                      sortOrder: knowledgePoints.length,
                    })
                  }
                })
              }
            }
          }
        }
      }
    }
  }

  const result = {
    title,
    author,
    toc,
    knowledgePoints,
  }

  // 写入 JSON 文件
  const outputPath = filePath.replace(/\.epub$/i, '_parsed.json')
  writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`解析完成: ${outputPath}`)
  console.log(`  书名: ${title}`)
  console.log(`  作者: ${author}`)
  console.log(`  目录项: ${toc.length}`)
  console.log(`  知识点: ${knowledgePoints.length}`)

  return result
}

// 命令行调用
const filePath = process.argv[2]
if (!filePath) {
  console.error('用法: node parse_epub.js <epub文件路径>')
  process.exit(1)
}

parseEpubFile(filePath).catch((err) => {
  console.error('解析失败:', err.message)
  process.exit(1)
})
