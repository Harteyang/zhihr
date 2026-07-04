/**
 * 生成 Excel 模板样表
 * 用法: node generate_template.js
 */
import * as xlsx from './lib/xlsx.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(__dirname, '导入模板.xlsx')

// 示例书籍数据
const books = [
  { title: '示例书名', author: '作者名', isbn: '9787123456789', douban_rate: 8.5, baidu_pan_url: 'https://pan.baidu.com/s/xxx', baidu_pan_code: 'abcd', mlook_link: '' },
  { title: '', author: '', isbn: '', douban_rate: '', baidu_pan_url: '', baidu_pan_code: '', mlook_link: '' },
]

// 示例知识点数据
const knowledgePoints = [
  { book_title: '示例书名', chapter: '第一章 认知觉醒', level: 3, title: '元认知的概念', content: '元认知是对自己思考过程的认知和理解...', sort_order: 0 },
  { book_title: '示例书名', chapter: '第一章 认知觉醒', level: 3, title: '自我觉察的重要性', content: '只有觉察到自己的思维模式，才能有意识地改变...', sort_order: 1 },
  { book_title: '示例书名', chapter: '第二章 深度思考', level: 3, title: '第一性原理', content: '回归事物最基本的原理，从根本上思考问题...', sort_order: 2 },
  { book_title: '', chapter: '', level: 3, title: '', content: '', sort_order: 0 },
]

xlsx.writeXlsx(outputPath, books, knowledgePoints)
console.log(`✅ 样表已生成: ${outputPath}`)
console.log('\nSheet 1 - books:')
console.log('  title, author, isbn, douban_rate, baidu_pan_url, baidu_pan_code, mlook_link')
console.log('\nSheet 2 - knowledge_points:')
console.log('  book_title, chapter, level, title, content, sort_order')