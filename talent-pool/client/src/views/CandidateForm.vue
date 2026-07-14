<template>
  <div style="max-width: 900px;">
    <el-page-header @back="$router.back()" :content="isEdit ? '编辑候选人' : '新增候选人'" style="margin-bottom: 20px;" />

    <el-card v-if="!isEdit" shadow="never" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".pdf,.docx,.doc"
          :on-change="handleFileChange"
          :show-file-list="false"
        >
          <el-button type="primary" plain>上传简历文件解析</el-button>
        </el-upload>
        <span style="color: var(--el-text-color-secondary); font-size: 13px;">支持 PDF、Word 格式，解析结果自动填充表单</span>
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
            <el-form-item label="目标岗位">
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
import { Plus, WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCandidate, createCandidate, updateCandidate, parseResume } from '../api'
import { addExperience as addExpApi, updateExperience } from '../api'
import SkillTags from '../components/SkillTags.vue'
import ExperienceForm from '../components/ExperienceForm.vue'
import { EDUCATION_OPTIONS } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const uploadRef = ref(null)
const saving = ref(false)
const fieldConfidence = ref({})

const form = reactive({
  name: '', phone: '', email: '', position: '',
  skills: [], education: '', experience_years: null,
  source: '', summary: '', experiences: []
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
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

    fieldConfidence.value = data.confidence || {}

    ElMessage.success('解析完成，请确认并补充信息')
  } catch (e) {
    ElMessage.warning('文件解析失败，请手动填写')
  } finally {
    // 重置上传组件内部文件列表，允许连续上传多个文件
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

    for (const exp of form.experiences) {
      if (!exp.company || !exp.title) continue
      if (isEdit.value && exp.id) {
        await updateExperience(candidateId, exp.id, exp)
      } else {
        await addExpApi(candidateId, exp)
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
    Object.assign(form, {
      name: data.name, phone: data.phone || '', email: data.email || '',
      position: data.position || '', skills: data.skills ? (typeof data.skills === 'string' ? JSON.parse(data.skills) : data.skills) : [],
      education: data.education || '', experience_years: data.experience_years || null,
      source: data.source || '', summary: data.summary || '',
      experiences: (data.experiences || []).map(e => ({ ...e }))
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
