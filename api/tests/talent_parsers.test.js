import { strict as assert } from 'node:assert'
import { extractInfo } from '../src/modules/talent_parsers.js'

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

test('extracts name, phone, email and position from labeled profile', () => {
  const sample = `姓名：张三
手机：13800138000
邮箱：zhangsan@qq.com
求职意向：高级前端工程师`
  const result = extractInfo(sample)
  assert.equal(result.name, '张三')
  assert.equal(result.phone, '13800138000')
  assert.equal(result.email, 'zhangsan@qq.com')
  assert.equal(result.position, '高级前端工程师')
  assert.equal(result.confidence.name, 'high')
  assert.equal(result.confidence.phone, 'high')
  assert.equal(result.confidence.email, 'high')
})

test('extracts education info', () => {
  const sample = `教育背景
某某大学 本科 计算机科学与技术 2014-2018`
  const result = extractInfo(sample)
  assert.equal(result.education, '本科')
  assert.ok(result.school.includes('某某大学'))
  assert.ok(result.major.includes('计算机'))
  assert.equal(result.confidence.education, 'medium')
})

test('extracts work experiences with time ranges', () => {
  const sample = `
工作经历
ABC科技有限公司 高级前端工程师
2020.03 - 2023.05
负责公司核心产品前端开发，使用 Vue/React。

XYZ网络公司 前端工程师
2018.07 - 2020.02
参与移动端 H5 项目开发。
  `
  const result = extractInfo(sample)
  assert.equal(result.experiences.length, 2)
  assert.ok(result.experiences[0].company.includes('ABC'))
  assert.equal(result.experiences[0].start_date, '2020-03')
  assert.equal(result.experiences[0].end_date, '2023-05')
  assert.equal(result.experiences[1].start_date, '2018-07')
  assert.equal(result.experiences[1].end_date, '2020-02')
  assert.equal(result.confidence.experiences, 'medium')
})

test('calculates experience years from time ranges when no direct statement', () => {
  const sample = `
工作经历
A公司 工程师
2018.03 - 2023.05
  `
  const result = extractInfo(sample)
  assert.ok(result.experience_years >= 5)
  assert.equal(result.confidence.experience_years, 'low')
})

test('extracts skills from skills section', () => {
  const sample = `专业技能
JavaScript、Vue、React、Node.js、Webpack`
  const result = extractInfo(sample)
  assert.ok(result.skills.includes('Vue'))
  assert.ok(result.skills.includes('React'))
  assert.ok(result.skills.includes('Node.js'))
  assert.equal(result.confidence.skills, 'medium')
})

test('returns missing confidence for empty fields', () => {
  const sample = `这是一份几乎为空的简历`
  const result = extractInfo(sample)
  assert.equal(result.name, null)
  assert.equal(result.phone, null)
  assert.equal(result.email, null)
  assert.equal(result.confidence.name, 'missing')
  assert.equal(result.confidence.phone, 'missing')
  assert.equal(result.confidence.email, 'missing')
})

test('extracts name when label shares line with other fields', () => {
  const sample = `姓名：张三 手机：13800138000 邮箱：zhangsan@qq.com`
  const result = extractInfo(sample)
  assert.equal(result.name, '张三')
  assert.equal(result.phone, '13800138000')
  assert.equal(result.email, 'zhangsan@qq.com')
})

test('extracts English name from labeled profile', () => {
  const sample = `Name: John Smith
Phone: 13800138000
Email: john@company.com`
  const result = extractInfo(sample)
  assert.equal(result.name, 'John Smith')
  assert.equal(result.phone, '13800138000')
  assert.equal(result.email, 'john@company.com')
})

console.log('Parser tests complete')
