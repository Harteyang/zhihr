import { strict as assert } from 'node:assert'
import { parseFile } from '../src/modules/talent_parsers.js'
import { zipSync } from 'fflate'

function buildDocxBuffer(text) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text.replace(/</g, '&lt;').replace(/&/g, '&amp;')}</w:t></w:r></w:p>
  </w:body>
</w:document>`

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`)
  }

  return zipSync(files)
}

function strToU8(str) {
  return new TextEncoder().encode(str)
}

function toUtf16Le(text) {
  const bytes = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes.push(code & 0xFF, (code >> 8) & 0xFF)
  }
  return new Uint8Array(bytes)
}

function buildDocBuffer(text) {
  // OLE Compound File 魔数 + UTF-16LE 编码的文本
  const oleHeader = new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
  const textBytes = toUtf16Le(text)
  const buf = new Uint8Array(oleHeader.length + textBytes.length)
  buf.set(oleHeader, 0)
  buf.set(textBytes, oleHeader.length)
  return buf
}

function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (err) {
    console.error(`✗ ${name}`)
    console.error(err.message)
    process.exitCode = 1
  }
}

test('parse DOCX resume file', async () => {
  const text = `姓名：李四
手机：13900139000
邮箱：lisi@company.com
求职意向：Java 后端工程师

教育背景
某某科技大学 本科 软件工程 2015-2019

工作经历
ABC科技有限公司 高级 Java 工程师
2020.03 - 2023.05
负责后端系统设计与开发。

专业技能
Java、Spring、MySQL、Redis、Docker`

  const buf = buildDocxBuffer(text)
  const result = await parseFile('resume.docx', buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

  assert.equal(result.name, '李四')
  assert.equal(result.phone, '13900139000')
  assert.equal(result.email, 'lisi@company.com')
  assert.ok(result.position.includes('Java'))
  assert.equal(result.education, '本科')
  assert.ok(result.school.includes('科技'))
  assert.ok(result.major.includes('软件'))
  assert.equal(result.experiences.length, 1)
  assert.ok(result.experiences[0].company.includes('ABC'))
  assert.ok(result.skills.includes('Java'))
})

test('parse DOC resume file (OLE binary with UTF-16LE text)', async () => {
  const text = `姓名：王五
手机：13700137000
邮箱：wangwu@company.com
求职意向：前端开发工程师

教育背景
某某大学 本科 计算机科学 2016-2020

工作经历
XYZ科技有限公司 前端工程师
2020.06 - 2023.08
负责前端开发。

专业技能
JavaScript、Vue、React、HTML、CSS`

  const buf = buildDocBuffer(text)
  const result = await parseFile('resume.doc', buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

  assert.equal(result.name, '王五')
  assert.equal(result.phone, '13700137000')
  assert.equal(result.email, 'wangwu@company.com')
  assert.ok(result.position.includes('前端'))
  assert.equal(result.education, '本科')
  assert.ok(result.skills.includes('Vue'))
})

test('parse DOC file that is actually HTML (common export format)', async () => {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<p>姓名：赵六</p>
<p>手机：13600136000</p>
<p>邮箱：zhaoliu@company.com</p>
<p>求职意向：后端工程师</p>
<p>教育背景</p>
<p>某某大学 本科 软件工程 2015-2019</p>
<p>专业技能</p>
<p>Java、Spring、MySQL、Redis</p>
</body></html>`

  const buf = strToU8(html)
  const result = await parseFile('resume.doc', buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

  assert.equal(result.name, '赵六')
  assert.equal(result.phone, '13600136000')
  assert.equal(result.email, 'zhaoliu@company.com')
  assert.ok(result.position.includes('后端'))
  assert.equal(result.education, '本科')
})

console.log('File parse tests complete')
