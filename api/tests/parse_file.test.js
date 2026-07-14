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

console.log('File parse tests complete')
