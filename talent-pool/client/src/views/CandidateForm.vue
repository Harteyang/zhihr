<template>
  <div style="max-width: 900px;">
    <el-page-header @back="$router.back()" :content="isEdit ? '编辑候选人' : '新增候选人'" style="margin-bottom: 20px;" />

    <el-card v-if="!isEdit" shadow="never" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".pdf,.docx,.doc,.txt"
          :on-change="handleFileChange"
          :show-file-list="false"
        >
          <el-button type="primary" plain :disabled="aiParsing">
            <el-icon><Upload /></el-icon> 上传简历自动解析
          </el-button>
        </el-upload>
        <el-button
          v-if="selectedFile && !aiParsing"
          type="warning"
          plain
          @click="handleAiParse"
        >
          <el-icon><MagicStick /></el-icon> 重新解析
        </el-button>
        <span v-if="!aiParsing" style="color: var(--el-text-color-secondary); font-size: 13px;">
          支持 PDF、Word、TXT 格式，上传后自动 AI 解析
          <template v-if="selectedFile">（当前文件：{{ selectedFile.name }}）</template>
        </span>
        <span v-if="aiParsing" style="color: var(--el-color-primary); font-size: 13px;">
          <el-icon class="is-loading"><Loading /></el-icon> AI 正在解析简历，请稍候...
        </span>
      </div>
    </el-card>

    <el-card shadow="never" v-loading="saving">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="必填" style="max-width: 300px;" :class="confidenceClass('name')">
            <template #suffix>
              <el-tooltip v-if="confidenceIcon('name')" :content="confidenceTip('name')" placement="top">
                <el-icon :class="confidenceClass('name') + '-icon'">
                  <WarningFilled v-if="confidenceIcon('name') === 'WarningFilled'" />
                  <CircleCloseFilled v-else />
                </el-icon>
              </el-tooltip>
            </template>
          </el-input>
          <div v-if="confidenceTip('name')" class="confidence-tip">{{ confidenceTip('name') }}</div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="11位手机号" :class="confidenceClass('phone')">
                <template #suffix>
                  <el-tooltip v-if="confidenceIcon('phone')" :content="confidenceTip('phone')" placement="top">
                    <el-icon :class="confidenceClass('phone') + '-icon'">
                      <WarningFilled v-if="confidenceIcon('phone') === 'WarningFilled'" />
                      <CircleCloseFilled v-else />
                    </el-icon>
                  </el-tooltip>
                </template>
              </el-input>
              <div v-if="confidenceTip('phone')" class="confidence-tip">{{ confidenceTip('phone') }}</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="email@example.com" :class="confidenceClass('email')">
                <template #suffix>
                  <el-tooltip v-if="confidenceIcon('email')" :content="confidenceTip('email')" placement="top">
                    <el-icon :class="confidenceClass('email') + '-icon'">
                      <WarningFilled v-if="confidenceIcon('email') === 'WarningFilled'" />
                      <CircleCloseFilled v-else />
                    </el-icon>
                  </el-tooltip>
                </template>
              </el-input>
              <div v-if="confidenceTip('email')" class="confidence-tip">{{ confidenceTip('email') }}</div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="目标岗位" prop="position">
              <el-input v-model="form.position" placeholder="期望职位" :class="confidenceClass('position')">
                <template #suffix>
                  <el-tooltip v-if="confidenceIcon('position')" :content="confidenceTip('position')" placement="top">
                    <el-icon :class="confidenceClass('position') + '-icon'">
                      <WarningFilled v-if="confidenceIcon('position') === 'WarningFilled'" />
                      <CircleCloseFilled v-else />
                    </el-icon>
                  </el-tooltip>
                </template>
              </el-input>
              <div v-if="confidenceTip('position')" class="confidence-tip">{{ confidenceTip('position') }}</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学历">
              <el-select v-model="form.education" placeholder="请选择" clearable style="width: 100%;" :class="confidenceClass('education')">
                <el-option v-for="e in EDUCATION_OPTIONS" :key="e" :label="e" :value="e" />
              </el-select>
              <div v-if="confidenceTip('education')" class="confidence-tip">{{ confidenceTip('education') }}</div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="工作年限">
              <el-input-number v-model="form.experience_years" :min="0" :max="50" style="width: 100%;" :class="confidenceClass('experience_years')" />
              <div v-if="confidenceTip('experience_years')" class="confidence-tip">{{ confidenceTip('experience_years') }}</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源渠道">
              <el-input v-model="form.source" placeholder="如 Boss直聘、内推" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="技能标签">
          <SkillTags v-model="form.skills" />
          <div v-if="confidenceTip('skills')" class="confidence-tip">{{ confidenceTip('skills') }}</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.summary" type="textarea" :rows="3" placeholder="简要评价或备注" />
          <div v-if="confidenceTip('summary')" class="confidence-tip">{{ confidenceTip('summary') }}</div>
        </el-form-item>

        <el-divider content-position="left">工作经历</el-divider>
        <ExperienceForm
          v-for="(exp, index) in form.experiences"
          :key="index"
          :experience="exp"
          @remove="form.experiences.splice(index, 1)"
        />
        <el-button type="primary" plain @click="addExperience" style="margin-bottom: 16px;">
          <el-icon><Plus /></el-icon> 添加工作经历
        </el-button>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit">{{ isEdit ? '保存修改' : '创建候选人' }}</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, WarningFilled, CircleCloseFilled, MagicStick, Upload, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCandidate, createCandidate, updateCandidate, aiParseResume, getUploadUrl, confirmUpload } from '../api'
import { addExperience as addExpApi, updateExperience, deleteExperience } from '../api'
import SkillTags from '../components/SkillTags.vue'
import ExperienceForm from '../components/ExperienceForm.vue'
import { EDUCATION_OPTIONS } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const uploadRef = ref(null)
const saving = ref(false)
const aiParsing = ref(false)
const fieldConfidence = ref({})
const selectedFile = ref(null)
// 编辑模式下记录原始工作经历 ID，用于提交时检测被删除的经历
const originalExperienceIds = ref([])

const form = reactive({
  name: '', phone: '', email: '', position: '',
  skills: [], education: '', experience_years: null,
  source: '', summary: '', experiences: []
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  position: [{ required: true, message: '请输入岗位', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

function addExperience() {
  form.experiences.push({ company: '', title: '', start_date: '', end_date: '', description: '' })
}

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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function handleFileChange(uploadFile) {
  if (!uploadFile.raw) return

  // 文件大小校验
  if (uploadFile.raw.size > MAX_FILE_SIZE) {
    ElMessage.error(`文件大小不能超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB（当前 ${(uploadFile.raw.size / 1024 / 1024).toFixed(2)}MB）`)
    uploadRef.value?.clearFiles()
    return
  }

  selectedFile.value = uploadFile.raw
  // 上传后自动触发 AI 解析，无需人工干预
  await handleAiParse()
}

async function handleAiParse() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  aiParsing.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  let aiMsg = null
  try {
    aiMsg = ElMessage.info({ message: '正在调用 AI 解析简历...', duration: 0 })
    const res = await aiParseResume(formData)
    const data = res.data.data || res.data

    // 填充表单
    if (data.name) form.name = data.name
    if (data.phone) form.phone = data.phone
    if (data.email) form.email = data.email
    if (data.position) form.position = data.position
    if (data.education) {
      const validEducation = ['大专', '本科', '硕士', '博士', '其他']
      // 仅在合法学历范围内赋值，否则保留空值让用户手动选择
      if (validEducation.includes(data.education)) {
        form.education = data.education
      }
    }
    // 注意：AI 返回的 school/major 字段当前无对应数据库列和 UI 输入框，暂不处理（避免幽灵字段）
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

    aiMsg?.close()
    ElMessage.success({ message: 'AI 解析完成，请确认并补充信息' })
  } catch (e) {
    aiMsg?.close()
    const errMsg = e?.response?.data?.message || e?.message || 'AI 解析失败，请稍后重试'
    ElMessage.warning(errMsg)
  } finally {
    aiParsing.value = false
    // 重置上传组件内部文件列表，允许重新选择文件
    uploadRef.value?.clearFiles()
  }
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const candidateData = { ...form }
    delete candidateData.experiences

    let candidateId
    if (isEdit.value) {
      await updateCandidate(route.params.id, candidateData)
      candidateId = route.params.id
    } else {
      const res = await createCandidate(candidateData)
      candidateId = res.data.data.id
    }

    // 编辑模式下：先删除被移除的工作经历
    if (isEdit.value && originalExperienceIds.value.length > 0) {
      const currentIds = form.experiences.filter(e => e.id).map(e => e.id)
      const deletedIds = originalExperienceIds.value.filter(id => !currentIds.includes(id))
      for (const delId of deletedIds) {
        try { await deleteExperience(candidateId, delId) } catch { /* 忽略已不存在的记录 */ }
      }
    }

    for (const exp of form.experiences) {
      if (!exp.company || !exp.title) continue
      if (isEdit.value && exp.id) {
        await updateExperience(candidateId, exp.id, exp)
      } else {
        await addExpApi(candidateId, exp)
      }
    }

    // 创建候选人后同步上传简历附件（OSS 直传）
    if (!isEdit.value && selectedFile.value) {
      try {
        const file = selectedFile.value
        const urlRes = await getUploadUrl(candidateId, {
          file_name: file.name,
          file_size: file.size
        })
        const { uploadUrl, ossKey, fileName, fileType, fileSize } = urlRes.data.data

        // 带进度提示的上传
        const uploadProgressMsg = ElMessage.info('正在上传简历附件...', { duration: 0 })
        try {
          const xhr = new XMLHttpRequest()
          await new Promise((resolve, reject) => {
            xhr.open('PUT', uploadUrl, true)
            // OSS 预签名 URL 的签名使用 application/octet-stream，保持一致
            xhr.setRequestHeader('Content-Type', 'application/octet-stream')
            xhr.upload.onprogress = (e) => {
              if (e.total > 0) {
                const pct = Math.round((e.loaded / e.total) * 100)
                uploadProgressMsg.content = `正在上传简历附件... ${pct}%`
              }
            }
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve()
              else reject(new Error(`OSS 上传失败 (${xhr.status})`))
            }
            xhr.onerror = () => reject(new Error('OSS 上传网络错误'))
            xhr.send(file)
          })
        } finally {
          uploadProgressMsg.close()
        }

        await confirmUpload(candidateId, {
          ossKey,
          fileName,
          fileType,
          fileSize: fileSize || file.size
        })
        ElMessage.success('简历附件上传成功')
      } catch (uploadErr) {
        const errMsg = uploadErr.response?.data?.message || '候选人已创建，但简历附件上传失败，可在详情页重新上传'
        ElMessage.warning(errMsg)
      }
    }

    ElMessage.success(isEdit.value ? '修改成功' : '创建成功')
    router.push(`/candidates/${candidateId}`)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const res = await getCandidate(route.params.id)
    const data = res.data.data
    const experiences = (data.experiences || []).map(e => ({ ...e }))
    // 记录原始工作经历 ID，用于提交时检测被删除的经历
    originalExperienceIds.value = experiences.map(e => e.id).filter(Boolean)
    Object.assign(form, {
      name: data.name, phone: data.phone || '', email: data.email || '',
      position: data.position || '', skills: data.skills ? (typeof data.skills === 'string' ? JSON.parse(data.skills) : data.skills) : [],
      education: data.education || '', experience_years: data.experience_years || null,
      source: data.source || '', summary: data.summary || '',
      experiences
    })
  }
})
</script>

<style scoped>
.low-confidence :deep(.el-input__wrapper),
.low-confidence :deep(.el-textarea__inner),
.low-confidence :deep(.el-input-number__decrease),
.low-confidence :deep(.el-input-number__increase) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
.medium-confidence :deep(.el-input__wrapper),
.medium-confidence :deep(.el-textarea__inner),
.medium-confidence :deep(.el-input-number__decrease),
.medium-confidence :deep(.el-input-number__increase) {
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
  line-height: 1.4;
}
</style>
