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
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCandidate, createCandidate, updateCandidate, aiParseResume, getUploadUrl, confirmUpload, checkCandidateDuplicate } from '../api'
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

// 上传简历附件到指定候选人（OSS 直传 + confirmUpload）
// 复用于"新建候选人后上传"与"重复简历合并附件到已存在人员"两个场景
async function uploadAttachmentToCandidate(candidateId, file) {
  const urlRes = await getUploadUrl(candidateId, {
    file_name: file.name,
    file_size: file.size
  })
  const { uploadUrl, ossKey, fileName, fileType, fileSize } = urlRes.data.data

  const uploadProgressMsg = ElMessage.info('正在上传简历附件...', { duration: 0 })
  try {
    const xhr = new XMLHttpRequest()
    await new Promise((resolve, reject) => {
      xhr.open('PUT', uploadUrl, true)
      xhr.upload.onprogress = (e) => {
        if (e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 100)
          uploadProgressMsg.content = `正在上传简历附件... ${pct}%`
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else {
          // 解析 OSS XML 错误响应，提取具体错误码和消息便于定位
          let detail = `HTTP ${xhr.status}`
          try {
            const xml = xhr.responseText || ''
            const codeMatch = xml.match(/<Code>([^<]+)<\/Code>/)
            const msgMatch = xml.match(/<Message>([^<]+)<\/Message>/)
            if (codeMatch) detail = `${codeMatch[1]}: ${msgMatch ? msgMatch[1] : ''} (${xhr.status})`
          } catch { /* 忽略解析失败 */ }
          reject(new Error(`OSS 上传失败 - ${detail}`))
        }
      }
      xhr.onerror = () => reject(new Error('OSS 上传网络错误（可能是 CORS 或网络中断）'))
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
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // 新建模式下，先进行"姓名+电话"重复比对
  if (!isEdit.value && form.name && form.phone) {
    saving.value = true
    try {
      const dupRes = await checkCandidateDuplicate(form.name, form.phone)
      const { duplicate, matches } = dupRes.data.data
      if (duplicate && matches.length > 0) {
        saving.value = false
        const match = matches[0]
        const matchDesc = `${match.name} / ${match.phone || '无电话'} / ${match.position || '无岗位'}${matches.length > 1 ? `（共 ${matches.length} 条重复）` : ''}`
        try {
          await ElMessageBox.confirm(
            `该简历信息已存在。检测到"姓名+电话"组合与以下记录重复：${matchDesc}。是否将当前简历附件添加到已存在的人员信息记录下？`,
            '发现重复简历',
            {
              confirmButtonText: '添加附件到已存在人员',
              cancelButtonText: '取消操作',
              type: 'warning',
              distinguishCancelAndClose: true
            }
          )
        } catch (action) {
          // 用户点击"取消操作"或关闭对话框，终止入库流程
          ElMessage.info('已取消简历入库')
          return
        }
        // 用户确认：将新简历附件关联到已存在人员，避免数据重复
        saving.value = true
        try {
          if (selectedFile.value) {
            await uploadAttachmentToCandidate(match.id, selectedFile.value)
            ElMessage.success('简历附件已添加到已存在人员记录')
          } else {
            ElMessage.info('未选择附件，已跳转至已存在人员详情')
          }
          router.push(`/candidates/${match.id}`)
        } catch (uploadErr) {
          const errMsg = uploadErr.response?.data?.message || uploadErr.message || '附件上传失败，可在详情页重新上传'
          ElMessage.warning(errMsg)
          router.push(`/candidates/${match.id}`)
        } finally {
          saving.value = false
        }
        return
      }
      // 未重复，继续正常创建流程
    } catch (e) {
      // 重复检查接口失败不阻断入库流程，记录警告后继续
      console.warn('重复检查失败，继续创建:', e?.message)
    } finally {
      saving.value = false
    }
  }

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
        await uploadAttachmentToCandidate(candidateId, selectedFile.value)
        ElMessage.success('简历附件上传成功')
      } catch (uploadErr) {
        // 显示具体错误原因（OSS 错误码或网络错误），便于定位
        const errMsg = uploadErr.response?.data?.message || uploadErr.message || '候选人已创建，但简历附件上传失败，可在详情页重新上传'
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
