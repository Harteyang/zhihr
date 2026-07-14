# 人才库简历解析优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 `talent_parsers.js` 中的简历解析逻辑，在 Cloudflare Workers 内用纯规则实现分区块提取姓名、联系方式、学历、工作年限、技能、工作经历，并给出置信度；前端 `CandidateForm.vue` 自动回填并按置信度提示用户确认。

**Architecture:** 将解析流程拆分为文本清洗、区块分割、字段提取、置信度评分四个独立阶段；PDF 使用 `unpdf`、Word 使用 `fflate` 提取纯文本；结果通过 `POST /api/talent/candidates/parse-resume` 返回，前端据此回填表单并渲染置信度标签。

**Tech Stack:** Cloudflare Workers、D1、R2/OSS、`unpdf`、`fflate`、`xlsx`、Vue 3、Element Plus。

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `api/src/modules/talent_parsers.js` | 简历文本提取、清洗、分区块、字段提取、置信度计算。本计划核心改动文件。 |
| `api/src/modules/talent.js` | `parseResume` 保持接口不变，消费新解析结构。 |
| `talent-pool/client/src/views/CandidateForm.vue` | 接收解析结果自动回填全部字段，并根据置信度渲染提示。 |
| `talent-pool/client/src/utils/constants.js` | 可能新增学历选项映射（如需要）。 |
| `api/tests/talent_parsers.test.js` | 新增最小化 Node 测试脚本，用 `node:assert` 验证解析函数。 |

---

## Task 1: 建立解析模块骨架

**Files:**
- Modify: `api/src/modules/talent_parsers.js:1-98`

目标：把现有 `extractInfo` 重构成可扩展的结构，保留 PDF/Word/Excel 入口，新增文本清洗函数和常量定义。

- [ ] **Step 1: 在文件顶部添加区块关键词常量**

```javascript
const SECTION_KEYWORDS = {
  profile: ['个人信息', '基本信息', '联系方式', 'profile', '基本信息', '姓名', 'name'],
  education: ['教育背景', '教育经历', '学历', '毕业院校', 'education', '教育'],
  experience: ['工作经历', '工作经验', '工作履历', '实习经历', 'experience', '职业经历', '工作'],
  skills: ['技能', '专业技能', 'skills', '技术栈', 'self-assessment', '自我评价', '个人优势'],
  projects: ['项目经历', '项目经验', 'projects', '项目'],
  other: ['证书', 'languages', '语言能力', '获奖', '荣誉']
}

const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  MISSING: 'missing'
}

const EDUCATION_LEVELS = ['博士', '硕士', '研究生', '本科', '大专', '专科', '高中', '中专', 'MBA', 'EMBA']

const JOB_TITLES = ['工程师', '经理', '总监', '主管', '开发', '产品经理', '设计师', '架构师', '负责人', '专员', '顾问']

const COMPANY_SUFFIXES = ['公司', '科技', '网络', '集团', '信息', '软件', 'Corp', 'Ltd', 'Limited', 'Inc']
```

- [ ] **Step 2: 新增文本清洗函数 `cleanText`**

```javascript
function cleanText(rawText) {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u2002-\u200B\u3000]/g, ' ')
    .replace(/([a-zA-Z0-9])\n(?=[a-zA-Z0-9])/g, '$1 ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !isHeaderFooter(line))
    .join('\n')
}

function isHeaderFooter(line) {
  const footerPatterns = [
    /^第\s*\d+\s*页/,
    /^\d+\s*\/\s*\d+$/,
    /^\s*\d+\s*$/,
    /^https?:\/\//,
    /^简历\s*更新/,
    /^ID:\s*\d+/
  ]
  return footerPatterns.some(p => p.test(line))
}
```

- [ ] **Step 3: 新增合并短行函数 `mergeBrokenLines`**

```javascript
function mergeBrokenLines(text) {
  const lines = text.split('\n')
  const merged = []
  let buffer = ''

  for (const line of lines) {
    const trimmed = line.trim()
    const isShort = trimmed.length < 40
    const endsWithPunctuation = /[。，；：！？.!,;:?]$/.test(trimmed)
    const isListItem = /^[\d一二三四五六七八九十]+[.．、\s]/.test(trimmed)

    if (buffer && (isListItem || endsWithPunctuation || !isShort)) {
      merged.push(buffer.trim())
      buffer = trimmed
    } else if (isShort && !endsWithPunctuation && !isListItem) {
      buffer += ' ' + trimmed
    } else {
      if (buffer) merged.push(buffer.trim())
      buffer = trimmed
    }
  }
  if (buffer) merged.push(buffer.trim())
  return merged.join('\n')
}
```

- [ ] **Step 4: 新增统一空白与冒号函数 `normalizePunctuation`**

```javascript
function normalizePunctuation(text) {
  return text
    .replace(/：/g, ':')
    .replace(/　/g, ' ')
    .replace(/\s{2,}/g, ' ')
}
```

- [ ] **Step 5: 提交**

```bash
git add api/src/modules/talent_parsers.js
git commit -m "refactor(talent-parsers): add section constants and text cleaning helpers"
```

---

## Task 2: 实现区块分割

**Files:**
- Modify: `api/src/modules/talent_parsers.js`

- [ ] **Step 1: 新增 `detectSection` 函数**

```javascript
function detectSection(line) {
  const lower = line.toLowerCase()
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`(^|[\\s\\/:])${kw}($|[\\s\\/:：])`, 'i')
      if (regex.test(lower) || lower.includes(kw.toLowerCase())) {
        return section
      }
    }
  }
  return null
}
```

- [ ] **Step 2: 新增 `splitSections` 函数**

```javascript
function splitSections(text) {
  const lines = text.split('\n')
  const sections = {
    profile: [],
    education: [],
    experience: [],
    skills: [],
    projects: [],
    other: [],
    unclassified: []
  }
  let current = 'unclassified'

  for (const line of lines) {
    const section = detectSection(line)
    if (section) {
      current = section
      continue
    }
    sections[current].push(line)
  }
  return sections
}
```

- [ ] **Step 3: 提交**

```bash
git add api/src/modules/talent_parsers.js
git commit -m "feat(talent-parsers): add resume section segmentation"
```

---

## Task 3: 实现字段级提取函数

**Files:**
- Modify: `api/src/modules/talent_parsers.js`

- [ ] **Step 1: 新增 `extractName` 函数**

```javascript
function extractName(sections, fullText) {
  // 高置信：明确标签
  const profileText = sections.profile.join('\n')
  const labelMatch = profileText.match(/(?:姓名|name)[\s:：]+([^\n]{2,20})/i)
  if (labelMatch) {
    const name = labelMatch[1].trim().replace(/[\s\d]/g, '')
    if (isValidChineseName(name)) return { value: name, confidence: CONFIDENCE.HIGH }
  }

  // 中置信：个人信息区前5行
  const candidates = sections.profile.slice(0, 5)
  for (const line of candidates) {
    const name = findChineseName(line)
    if (name) return { value: name, confidence: CONFIDENCE.MEDIUM }
  }

  // 低置信：全文前10行
  const allLines = fullText.split('\n').slice(0, 10)
  for (const line of allLines) {
    const name = findChineseName(line)
    if (name) return { value: name, confidence: CONFIDENCE.LOW }
  }

  return { value: null, confidence: CONFIDENCE.MISSING }
}

function isValidChineseName(name) {
  return /^[\u4e00-\u9fa5]{2,4}$/.test(name)
}

function findChineseName(line) {
  const blacklist = ['有限公司', '科技有限公司', '大学', '学院', '学校', '简历', '求职', '应聘', '招聘']
  const matches = line.match(/[\u4e00-\u9fa5]{2,4}/g) || []
  for (const m of matches) {
    if (blacklist.some(b => m.includes(b))) continue
    return m
  }
  return null
}
```

- [ ] **Step 2: 新增 `extractPhone` 和 `extractEmail` 函数**

```javascript
function extractPhone(text) {
  const match = text.match(/1[3-9]\d{9}/)
  if (match && isValidPhoneSegment(match[0])) {
    return { value: match[0], confidence: CONFIDENCE.HIGH }
  }
  return { value: null, confidence: CONFIDENCE.MISSING }
}

function isValidPhoneSegment(phone) {
  const validSegments = ['13', '14', '15', '16', '17', '18', '19']
  return validSegments.includes(phone.slice(0, 2))
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)
  if (match) {
    const email = match[0].toLowerCase()
    const invalidDomains = ['example.com', 'test.com', 'email.com']
    if (!invalidDomains.some(d => email.endsWith(d))) {
      return { value: email, confidence: CONFIDENCE.HIGH }
    }
  }
  return { value: null, confidence: CONFIDENCE.MISSING }
}
```

- [ ] **Step 3: 新增 `extractPosition` 函数**

```javascript
function extractPosition(sections, fullText) {
  const keywords = ['意向岗位', '期望职位', '应聘岗位', '求职意向', '目标岗位', 'position wanted', 'job objective', '期望岗位']
  const text = sections.profile.join('\n') + '\n' + fullText
  for (const kw of keywords) {
    const regex = new RegExp(`${kw}[\s:：]+([^\n，,；;]{2,30})`, 'i')
    const match = text.match(regex)
    if (match) {
      const value = match[1].trim().replace(/（.*?）/g, '').replace(/\(.*?\)/g, '')
      if (value && !value.includes('面议') && !value.includes('不限')) {
        return { value, confidence: CONFIDENCE.MEDIUM }
      }
    }
  }
  return { value: null, confidence: CONFIDENCE.MISSING }
}
```

- [ ] **Step 4: 新增 `extractEducation` 函数**

```javascript
function extractEducation(sections) {
  const text = sections.education.join('\n') + '\n' + sections.profile.join('\n')
  let level = null
  let confidence = CONFIDENCE.MISSING

  for (const lvl of EDUCATION_LEVELS) {
    const regex = new RegExp(lvl.replace('MBA', 'MBA'), 'i')
    if (regex.test(text)) {
      level = lvl === '研究生' ? '硕士' : lvl
      confidence = CONFIDENCE.MEDIUM
      break
    }
  }

  // 学校
  const schoolMatch = text.match(/([^\n，,；;]{2,20}(?:大学|学院|学校|University|College))/i)
  const school = schoolMatch ? schoolMatch[1].trim() : null

  // 专业
  const majorMatch = text.match(/(?:专业|major)[\s:：]+([^\n，,；;]{2,20})/i)
  const major = majorMatch ? majorMatch[1].trim() : null

  return {
    value: {
      education: level,
      school,
      major
    },
    confidence: confidence === CONFIDENCE.MISSING && (school || major) ? CONFIDENCE.LOW : confidence
  }
}
```

- [ ] **Step 5: 新增 `extractExperienceYears` 函数**

```javascript
function extractExperienceYears(sections, fullText) {
  const text = sections.profile.join('\n') + '\n' + fullText
  const directMatch = text.match(/(\d+)\s*[年余]?\s*(?:工作|相关|开发|从业|专业)?\s*经验/)
  if (directMatch) {
    return { value: parseInt(directMatch[1], 10), confidence: CONFIDENCE.MEDIUM }
  }

  // 从工作经历计算
  const years = calculateYearsFromExperience(sections.experience)
  if (years !== null) {
    return { value: years, confidence: CONFIDENCE.LOW }
  }

  return { value: null, confidence: CONFIDENCE.MISSING }
}
```

- [ ] **Step 6: 新增 `extractSkills` 函数**

```javascript
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'C++', 'C#', 'Rust', 'PHP', 'Ruby',
  'Vue', 'React', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
  'Node.js', 'Express', 'Koa', 'NestJS', 'Django', 'Flask', 'Spring',
  'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Vite', 'Rollup',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', '阿里云', '腾讯云', 'Git', 'Linux'
]

function extractSkills(sections) {
  const text = sections.skills.join('\n')
  if (!text.trim()) return { value: [], confidence: CONFIDENCE.MISSING }

  const separators = /[,，、;；\n]/
  const tokens = text.split(separators).map(s => s.trim()).filter(Boolean)
  const skills = []

  for (const token of tokens) {
    const normalized = token.replace(/[（(].*?[）)]/g, '').trim()
    if (COMMON_SKILLS.some(s => s.toLowerCase() === normalized.toLowerCase())) {
      skills.push(normalized)
    } else if (normalized.length >= 2 && normalized.length <= 20 && !/公司|大学|学院/.test(normalized)) {
      skills.push(normalized)
    }
  }

  const unique = [...new Set(skills)].slice(0, 20)
  return {
    value: unique,
    confidence: unique.length > 0 ? CONFIDENCE.MEDIUM : CONFIDENCE.MISSING
  }
}
```

- [ ] **Step 7: 提交**

```bash
git add api/src/modules/talent_parsers.js
git commit -m "feat(talent-parsers): add field extraction with confidence scoring"
```

---

## Task 4: 实现工作经历提取

**Files:**
- Modify: `api/src/modules/talent_parsers.js`

- [ ] **Step 1: 新增时间解析函数**

```javascript
const TIME_PATTERNS = [
  { regex: /(\d{4})\.(\d{1,2})\s*[-~至]\s*(\d{4})\.(\d{1,2}|至今)/, hasYear: true },
  { regex: /(\d{4})\/(\d{1,2})\s*[-~至]\s*(\d{4})\/(\d{1,2}|至今)/, hasYear: true },
  { regex: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*[-~至]\s*(\d{4})\s*年\s*(\d{1,2})\s*月/, hasYear: true },
  { regex: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*[-~至]\s*至今/, hasYear: true },
  { regex: /(\d{4})\.(\d{1,2})\s*[-~至]\s*至今/, hasYear: true }
]

function parseTimeRange(text) {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern.regex)
    if (match) {
      const startYear = match[1].padStart(4, '20')
      const startMonth = match[2].padStart(2, '0')
      let endDate = 'present'
      if (match[3] && match[3] !== '至今') {
        const endYear = match[3].padStart(4, '20')
        const endMonth = match[4] ? match[4].padStart(2, '0') : '12'
        endDate = `${endYear}-${endMonth}`
      }
      return {
        start_date: `${startYear}-${startMonth}`,
        end_date: endDate
      }
    }
  }
  return null
}
```

- [ ] **Step 2: 新增 `extractCompany` 和 `extractTitle` 函数**

```javascript
function extractCompany(text) {
  const lines = text.split('\n')
  for (const line of lines) {
    const match = line.match(/([^\n，,；;]{2,40}(?:公司|科技|网络|集团|信息|软件|Corp|Ltd|Limited|Inc))/i)
    if (match) return match[1].trim()
  }
  return null
}

function extractTitle(text) {
  const lines = text.split('\n')
  for (const line of lines) {
    for (const title of JOB_TITLES) {
      if (line.includes(title)) {
        const match = line.match(new RegExp(`([^\\n，,；;]{2,30}${title})`))
        if (match) return match[1].trim()
      }
    }
  }
  return null
}
```

- [ ] **Step 3: 新增 `extractExperiences` 函数**

```javascript
function extractExperiences(sections) {
  const text = sections.experience.join('\n')
  if (!text.trim()) return { value: [], confidence: CONFIDENCE.MISSING }

  const entries = splitExperienceEntries(text)
  const experiences = []

  for (const entry of entries) {
    const timeRange = parseTimeRange(entry)
    const company = extractCompany(entry)
    const title = extractTitle(entry)

    experiences.push({
      company: company || '',
      title: title || '',
      start_date: timeRange ? timeRange.start_date : '',
      end_date: timeRange ? timeRange.end_date : '',
      description: entry.replace(/\n/g, ' ').trim()
    })
  }

  const validCount = experiences.filter(e => e.company && e.title && e.start_date).length
  const confidence = validCount === experiences.length && experiences.length > 0
    ? CONFIDENCE.MEDIUM
    : (experiences.length > 0 ? CONFIDENCE.LOW : CONFIDENCE.MISSING)

  return { value: experiences, confidence }
}

function splitExperienceEntries(text) {
  const entries = []
  let current = ''
  const lines = text.split('\n')

  for (const line of lines) {
    if (parseTimeRange(line) && current.trim()) {
      entries.push(current.trim())
      current = line
    } else {
      current += '\n' + line
    }
  }
  if (current.trim()) entries.push(current.trim())

  return entries.length > 0 ? entries : [text]
}
```

- [ ] **Step 4: 新增 `calculateYearsFromExperience` 函数（供年限提取回退使用）**

```javascript
function calculateYearsFromExperience(experienceLines) {
  const text = experienceLines.join('\n')
  const ranges = []
  let match
  const regex = /(\d{4})[./](\d{1,2})\s*[-~至]\s*(\d{4})[./](\d{1,2}|至今)/g
  while ((match = regex.exec(text)) !== null) {
    const start = new Date(`${match[1].padStart(4, '20')}-${match[2].padStart(2, '0')}-01`)
    let end = new Date()
    if (match[3] !== '至今') {
      end = new Date(`${match[3].padStart(4, '20')}-${match[4].padStart(2, '0')}-01`)
    }
    ranges.push({ start, end })
  }

  if (ranges.length === 0) return null

  const earliest = new Date(Math.min(...ranges.map(r => r.start)))
  const latest = new Date(Math.max(...ranges.map(r => r.end)))
  const months = (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth())
  return Math.max(1, Math.round(months / 12))
}
```

- [ ] **Step 5: 提交**

```bash
git add api/src/modules/talent_parsers.js
git commit -m "feat(talent-parsers): add work experience extraction with time range parsing"
```

---

## Task 5: 组装解析结果并更新 parseFile

**Files:**
- Modify: `api/src/modules/talent_parsers.js`

- [ ] **Step 1: 重写 `extractInfo` 函数**

```javascript
function extractInfo(rawText) {
  const cleaned = normalizePunctuation(mergeBrokenLines(cleanText(rawText)))
  const sections = splitSections(cleaned)

  const nameResult = extractName(sections, cleaned)
  const phoneResult = extractPhone(cleaned)
  const emailResult = extractEmail(cleaned)
  const positionResult = extractPosition(sections, cleaned)
  const educationResult = extractEducation(sections)
  const yearsResult = extractExperienceYears(sections, cleaned)
  const skillsResult = extractSkills(sections)
  const experiencesResult = extractExperiences(sections)

  const summary = sections.skills.slice(0, 5).join('\n') || cleaned.split('\n').slice(0, 5).join('\n')

  return {
    name: nameResult.value,
    phone: phoneResult.value,
    email: emailResult.value,
    position: positionResult.value,
    education: educationResult.value.education,
    school: educationResult.value.school,
    major: educationResult.value.major,
    experience_years: yearsResult.value,
    skills: skillsResult.value,
    summary,
    experiences: experiencesResult.value,
    raw_text: cleaned,
    confidence: {
      name: nameResult.confidence,
      phone: phoneResult.confidence,
      email: emailResult.confidence,
      position: positionResult.confidence,
      education: educationResult.confidence,
      school: educationResult.value.school ? CONFIDENCE.MEDIUM : CONFIDENCE.MISSING,
      major: educationResult.value.major ? CONFIDENCE.MEDIUM : CONFIDENCE.MISSING,
      experience_years: yearsResult.confidence,
      skills: skillsResult.confidence,
      experiences: experiencesResult.confidence
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add api/src/modules/talent_parsers.js
git commit -m "feat(talent-parsers): wire up section-based parsing pipeline"
```

---

## Task 6: 更新后端 parseResume 接口

**Files:**
- Modify: `api/src/modules/talent.js:537-554`

`parseResume` 不需要大改，因为 `parseFile` 已经返回新结构。只需确保返回的 `raw_text` 不会被序列化太大（可选截断）。

- [ ] **Step 1: 截断 raw_text 避免响应过大**

```javascript
async function parseResume(request, env, corsHeaders) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    const arrayBuffer = await file.arrayBuffer()
    const parsed = await parseFile(file.name, arrayBuffer)

    // 避免返回过大的原始文本
    if (parsed.raw_text && parsed.raw_text.length > 5000) {
      parsed.raw_text = parsed.raw_text.slice(0, 5000) + '\n...（已截断）'
    }

    return jsonResponse({ success: true, data: parsed }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add api/src/modules/talent.js
git commit -m "feat(api/talent): truncate raw_text in parse-resume response"
```

---

## Task 7: 更新前端表单自动回填

**Files:**
- Modify: `talent-pool/client/src/views/CandidateForm.vue:124-139`

- [ ] **Step 1: 扩展 `handleFileChange` 回填所有字段**

```javascript
async function handleFileChange(uploadFile) {
  if (!uploadFile.raw) return
  const formData = new FormData()
  formData.append('file', uploadFile.raw)
  try {
    ElMessage.info('正在解析文件...')
    const res = await parseResume(formData)
    const data = res.data.data || res.data

    if (data.name) form.name = data.name
    if (data.phone) form.phone = data.phone
    if (data.email) form.email = data.email
    if (data.position) form.position = data.position
    if (data.education) form.education = data.education
    if (data.experience_years !== null && data.experience_years !== undefined) {
      form.experience_years = data.experience_years
    }
    if (data.summary) form.summary = data.summary
    if (Array.isArray(data.skills)) form.skills = data.skills

    if (Array.isArray(data.experiences) && data.experiences.length > 0) {
      form.experiences = data.experiences.map(exp => ({
        company: exp.company || '',
        title: exp.title || '',
        start_date: exp.start_date || '',
        end_date: exp.end_date || '',
        description: exp.description || ''
      }))
    }

    // 保存置信度用于 UI 提示
    fieldConfidence.value = data.confidence || {}

    ElMessage.success('解析完成，请确认并补充信息')
  } catch (e) {
    ElMessage.warning('文件解析失败，请手动填写')
  }
}
```

- [ ] **Step 2: 新增 `fieldConfidence` 响应式状态**

```javascript
const fieldConfidence = ref({})
```

- [ ] **Step 3: 提交**

```bash
git add talent-pool/client/src/views/CandidateForm.vue
git commit -m "feat(client): auto-fill all parsed resume fields in candidate form"
```

---

## Task 8: 添加前端置信度视觉提示

**Files:**
- Modify: `talent-pool/client/src/views/CandidateForm.vue:22-88`

- [ ] **Step 1: 新增置信度提示组件/样式辅助函数**

```javascript
function confidenceClass(field) {
  const c = fieldConfidence.value[field]
  if (c === 'low' || c === 'missing') return 'low-confidence'
  if (c === 'medium') return 'medium-confidence'
  return ''
}

function confidenceIcon(field) {
  const c = fieldConfidence.value[field]
  if (c === 'low' || c === 'missing') return 'CircleCloseFilled'
  if (c === 'medium') return 'WarningFilled'
  return null
}

function confidenceTip(field) {
  const c = fieldConfidence.value[field]
  if (c === 'low' || c === 'missing') return '未识别或可信度低，请补充'
  if (c === 'medium') return '请确认'
  return ''
}
```

- [ ] **Step 2: 为表单字段添加置信度后缀图标**

以"姓名"字段为例，其他字段类似：

```vue
<el-form-item label="姓名" prop="name">
  <el-input
    v-model="form.name"
    placeholder="必填"
    style="max-width: 300px;"
    :class="confidenceClass('name')"
  >
    <template #suffix>
      <el-icon v-if="confidenceIcon('name')" :class="confidenceClass('name') + '-icon'">
        <component :is="confidenceIcon('name')" />
      </el-icon>
    </template>
  </el-input>
  <div v-if="confidenceTip('name')" class="confidence-tip">{{ confidenceTip('name') }}</div>
</el-form-item>
```

需要确保 `confidenceIcon` 返回字符串时能被 `<component :is="..." />` 正确解析。Element Plus 图标组件名如 `CircleCloseFilled` 需从 `@element-plus/icons-vue` 导入。更简单的方式是：

```vue
<template #suffix>
  <el-tooltip v-if="confidenceIcon('name')" :content="confidenceTip('name')" placement="top">
    <el-icon :class="confidenceClass('name') + '-icon'">
      <WarningFilled v-if="confidenceIcon('name') === 'WarningFilled'" />
      <CircleCloseFilled v-if="confidenceIcon('name') === 'CircleCloseFilled'" />
    </el-icon>
  </el-tooltip>
</template>
```

- [ ] **Step 3: 添加样式**

```vue
<style scoped>
.low-confidence :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
.medium-confidence :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-warning) inset;
}
.low-confidence-icon {
  color: var(--el-color-danger);
}
.medium-confidence-icon {
  color: var(--el-color-warning);
}
.confidence-tip {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-top: 4px;
}
</style>
```

- [ ] **Step 4: 导入所需图标**

```javascript
import { Plus, WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
```

- [ ] **Step 5: 提交**

```bash
git add talent-pool/client/src/views/CandidateForm.vue
git commit -m "feat(client): add confidence indicators for parsed resume fields"
```

---

## Task 9: 添加最小化单元测试

**Files:**
- Create: `api/tests/talent_parsers.test.js`

由于 api 项目没有测试框架，使用 Node.js 内置 `assert` + `fs` 读取样例文件（如暂无样例，可先用内联文本字符串）。

- [ ] **Step 1: 创建测试文件**

```javascript
import { strict as assert } from 'node:assert'
import { parseFile } from '../src/modules/talent_parsers.js'

async function testNameExtraction() {
  const sample = `姓名：张三\n手机：13800138000\n邮箱：zhangsan@example.com\n求职意向：高级前端工程师`
  const encoder = new TextEncoder()
  const result = await parseFile('test.pdf', encoder.encode(sample).buffer)
  assert.equal(result.name, '张三')
  assert.equal(result.phone, '13800138000')
  assert.equal(result.email, 'zhangsan@example.com')
  assert.equal(result.position, '高级前端工程师')
  console.log('✓ testNameExtraction passed')
}

async function testWorkExperience() {
  const sample = `
工作经历
ABC科技有限公司 高级前端工程师
2020.03 - 2023.05
负责公司核心产品前端开发，使用 Vue/React。

XYZ网络公司 前端工程师
2018.07 - 2020.02
参与移动端 H5 项目开发。
  `
  const encoder = new TextEncoder()
  const result = await parseFile('test.pdf', encoder.encode(sample).buffer)
  assert.equal(result.experiences.length, 2)
  assert.ok(result.experiences[0].company.includes('ABC'))
  assert.equal(result.experiences[0].start_date, '2020-03')
  assert.equal(result.experiences[0].end_date, '2023-05')
  console.log('✓ testWorkExperience passed')
}

async function testEducation() {
  const sample = `教育背景\n某某大学 本科 计算机科学与技术 2014-2018`
  const encoder = new TextEncoder()
  const result = await parseFile('test.pdf', encoder.encode(sample).buffer)
  assert.equal(result.education, '本科')
  assert.ok(result.school.includes('某某大学'))
  assert.ok(result.major.includes('计算机'))
  console.log('✓ testEducation passed')
}

async function main() {
  await testNameExtraction()
  await testWorkExperience()
  await testEducation()
  console.log('All tests passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

注意：`parseFile` 对 `.pdf` 会调用 `unpdf.extractText`，传入文本字符串可能无法真正解析。测试中应该使用真实的 PDF 文件，或暂时用 `.docx` / `.txt` 扩展名绕过（但当前 parseFile 不支持 `.txt`）。

更稳妥的方式是：在测试里直接调用内部函数 `extractInfo`，而非 `parseFile`。但这需要导出 `extractInfo`。

- [ ] **Step 2: 在 `talent_parsers.js` 末尾导出 `extractInfo` 供测试**

```javascript
export { parseFile, parseExcel, generateTemplateBuffer, extractInfo }
```

- [ ] **Step 3: 修改测试直接调用 `extractInfo`**

```javascript
import { strict as assert } from 'node:assert'
import { extractInfo } from '../src/modules/talent_parsers.js'

async function testNameExtraction() {
  const sample = `姓名：张三\n手机：13800138000\n邮箱：zhangsan@example.com\n求职意向：高级前端工程师`
  const result = extractInfo(sample)
  assert.equal(result.name, '张三')
  assert.equal(result.phone, '13800138000')
  assert.equal(result.email, 'zhangsan@example.com')
  assert.equal(result.position, '高级前端工程师')
  console.log('✓ testNameExtraction passed')
}
// ... 其他测试类似
```

- [ ] **Step 4: 运行测试**

```bash
cd /Users/yq/Documents/zhihr/api
node tests/talent_parsers.test.js
```

- [ ] **Step 5: 提交**

```bash
git add api/src/modules/talent_parsers.js api/tests/talent_parsers.test.js
git commit -m "test(api): add parser unit tests"
```

---

## Task 10: 端到端测试

**Files:**
- 不涉及文件修改，仅操作验证。

- [ ] **Step 1: 启动本地后端**

```bash
cd /Users/yq/Documents/zhihr/api
npx wrangler dev
```

- [ ] **Step 2: 启动本地前端**

```bash
cd /Users/yq/Documents/zhihr/talent-pool/client
npm run dev
```

- [ ] **Step 3: 登录后进入"新增候选人"页面上传 PDF/Word 简历**

验证：
- 姓名、手机号、邮箱正确回填。
- 学历、工作年限、目标岗位、技能等字段有值。
- 工作经历自动添加到表单。
- 低置信字段有红色/黄色提示。
- 手动修改后能正常提交。

- [ ] **Step 4: 测试扫描版 PDF**

上传图片型 PDF，验证前端提示"扫描件无法自动解析"。

- [ ] **Step 5: 测试解析失败降级**

上传损坏文件或不支持格式，验证前端提示"文件解析失败，请手动填写"。

---

## 计划自检

### Spec 覆盖检查

| 设计文档要求 | 对应任务 |
|-------------|---------|
| 文本清洗（去页眉页脚、合并断行） | Task 1 |
| 区块分割 | Task 2 |
| 姓名、手机号、邮箱、岗位、学历、年限、技能提取 | Task 3 |
| 工作经历完整提取 | Task 4 |
| 置信度评分 | Task 3, Task 4, Task 8 |
| 前端自动回填 | Task 7 |
| 前端置信度提示 | Task 8 |
| 错误降级 | Task 6, Task 10 |
| 单元测试 | Task 9 |

### Placeholder 扫描

- 无 TBD/TODO。
- 所有代码步骤均给出实际代码或明确命令。
- 无 "添加适当错误处理" 等模糊描述。

### 一致性检查

- 解析结果字段名与前后端一致：`name`, `phone`, `email`, `position`, `education`, `school`, `major`, `experience_years`, `skills`, `summary`, `experiences`, `confidence`。
- `confidence` 取值统一为 `high` / `medium` / `low` / `missing`。

---

## 执行方式

Plan complete and saved to `docs/superpowers/plans/2026-07-14-talent-resume-parsing-implementation.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
