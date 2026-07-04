/**
 * 拆解模块
 * 负责 EPUB 解析和 LLM 知识提取
 */
import JSZip from 'jszip'
import { readFileSync } from 'fs'
import { parse, resolve } from 'path'
import { config } from './config.js'

/**
 * 解析 EPUB 文件，提取目录和章节文本
 * 返回 { title, author, toc, chapters }
 */
export async function parseEpub(filePath) {
  const buffer = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buffer)

  // 读取 container.xml 定位 OPF
  const containerXml = await zip.file('META-INF/container.xml').async('text')
  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1]
  if (!opfPath) throw new Error('无法定位 OPF 文件')

  // 解析 OPF 元数据
  const opfContent = await zip.file(opfPath).async('text')
  const title = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)?.[1] || ''
  const author = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/)?.[1] || ''

  // 查找 NCX 目录文件
  const ncxMatch = opfContent.match(/href="([^"]*\.ncx)"/i)
  const ncxPath = ncxMatch
    ? resolve(parse(opfPath).dir, ncxMatch[1])
    : null

  const toc = []
  const chapters = []

  if (ncxPath) {
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
        const label = np.match(
          /<navLabel>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<\/navLabel>/
        )?.[1]
        const src = np.match(/<content[^>]*src="([^"]+)"/)?.[1]
        const order = parseInt(
          np.match(/playOrder\s*=\s*"(\d+)"/)?.[1] || '0',
          10
        )

        if (label && src) {
          toc.push({ label, src, order })

          // 读取章节内容
          const chapterFile = zip.file(src)
          if (chapterFile) {
            const html = await chapterFile.async('text')
            // 去除 HTML 标签，保留纯文本
            const text = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()

            if (text.length > 20) {
              chapters.push({ label, text: text.slice(0, 5000), order })
            }
          }
        }
      }
    }
  }

  return { title, author, toc, chapters }
}

/**
 * 调用 LLM 从章节文本中提取核心知识要点
 * 返回知识要点数组
 */
export async function extractKnowledge(title, author, chapters, toc) {
  if (!config.llm.apiKey) {
    console.warn('⚠️  未配置 LLM API Key，跳过知识提取')
    return buildSimpleKnowledge(toc)
  }

  // 将目录和章节内容组装成 prompt
  const tocText = toc.map((t, i) => `${i + 1}. ${t.label}`).join('\n')
  const chapterTexts = chapters
    .map((c) => `【${c.label}】\n${c.text.slice(0, 2000)}`)
    .join('\n\n')

  const systemPrompt = `你是一个专业的电子书拆解助手。请根据提供的书籍章节内容，提取出核心知识要点。

要求：
1. 提取 5-15 个最重要的知识要点
2. 每个要点包含标题和详细说明
3. 标题要精炼，说明要清晰完整
4. 按章节顺序排列
5. 用中文输出

输出格式为 JSON 数组：
[
  {
    "chapter": "所属章节名",
    "level": 3,
    "title": "知识要点标题",
    "content": "详细说明"
  }
]`

  const userPrompt = `书名：${title}
作者：${author || '未知'}

目录：
${tocText}

章节内容：
${chapterTexts || '（无详细章节内容）'}

请提取核心知识要点并以 JSON 格式返回。`

  console.log('  正在调用 LLM 提取知识要点...')

  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LLM API 请求失败: ${res.status} - ${errText}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('LLM 返回内容为空')
  }

  // 尝试从返回内容中提取 JSON
  try {
    // 尝试直接解析
    return JSON.parse(content)
  } catch {
    // 尝试从 markdown 代码块中提取
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }
    throw new Error('无法从 LLM 返回中解析 JSON')
  }
}

/**
 * 当没有 LLM 时，仅从目录构建简单的知识点
 */
function buildSimpleKnowledge(toc) {
  return toc.map((t) => ({
    chapter: t.label,
    level: 3,
    title: t.label,
    content: '',
  }))
}