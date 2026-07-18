<template>
  <div class="share-evaluation-page" v-loading="loading">
    <div class="share-container">
      <header class="share-header">
        <h1>候选人面试评价</h1>
        <p class="share-subtitle">请填写对该候选人的面试评价，提交后仍可修改</p>
      </header>

      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

      <template v-if="shareInfo">
        <!-- 候选人基本信息 -->
        <el-card shadow="never" class="section-card">
          <template #header>
            <span class="section-title">候选人信息</span>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="姓名">{{ shareInfo.candidate.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="目标岗位">{{ shareInfo.candidate.position || '-' }}</el-descriptions-item>
            <el-descriptions-item label="学历">{{ shareInfo.candidate.education || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工作年限">
              {{ shareInfo.candidate.experience_years ? `${shareInfo.candidate.experience_years}年` : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="来源">{{ shareInfo.candidate.source || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(shareInfo.candidate.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="技能" :span="3">
              <el-tag v-for="skill in shareInfo.candidate.skills" :key="skill" size="small" style="margin-right: 6px; margin-bottom: 4px;">
                {{ skill }}
              </el-tag>
              <span v-if="!shareInfo.candidate.skills || shareInfo.candidate.skills.length === 0">-</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 简历附件下载 -->
        <el-card shadow="never" class="section-card" v-if="shareInfo.attachments && shareInfo.attachments.length > 0">
          <template #header>
            <span class="section-title">简历附件</span>
          </template>
          <el-table :data="shareInfo.attachments" stripe>
            <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="file_type" label="类型" width="80" />
            <el-table-column label="大小" width="100">
              <template #default="{ row }">
                {{ row.file_size ? `${(row.file_size / 1024).toFixed(1)} KB` : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="success" link size="small" :loading="downloadingId === row.id" @click="handleDownload(row)">
                  下载
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 面试评价 -->
        <el-card shadow="never" class="section-card">
          <template #header>
            <span class="section-title">面试评价</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="评价人">
              <el-input :model-value="shareInfo.evaluator_name" disabled />
              <div class="field-hint">评价人信息已锁定，不可修改</div>
            </el-form-item>
            <el-form-item label="评价内容">
              <el-input
                v-model="evaluationContent"
                type="textarea"
                :rows="8"
                placeholder="请输入面试评价，包括专业能力、沟通表达、岗位匹配度等"
                maxlength="5000"
                show-word-limit
              />
            </el-form-item>
            <div class="form-actions">
              <el-button type="primary" :loading="submitting" @click="handleSubmit">
                {{ existingEvaluation ? '保存修改' : '提交评价' }}
              </el-button>
              <el-button v-if="existingEvaluation" @click="handleReset">重置为已提交内容</el-button>
            </div>
            <div v-if="existingEvaluation" class="last-submitted-info">
              <span>上次提交时间：{{ formatTime(existingEvaluation.created_at) }}</span>
              <span v-if="existingEvaluation.updated_at !== existingEvaluation.created_at">
                · 最近修改：{{ formatTime(existingEvaluation.updated_at) }}
              </span>
            </div>
          </el-form>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getShareInfo, getShareDownloadUrl, submitShareEvaluation, updateShareEvaluation } from '../api/share.js'
import { formatTime } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const submitting = ref(false)
const downloadingId = ref(null)
const loadError = ref('')
const shareInfo = ref(null)
const existingEvaluation = ref(null)
const evaluationContent = ref('')

async function fetchShareInfo() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getShareInfo(route.params.token)
    shareInfo.value = res.data.data
    if (res.data.data.evaluation) {
      existingEvaluation.value = res.data.data.evaluation
      evaluationContent.value = res.data.data.evaluation.content || ''
    }
  } catch (e) {
    loadError.value = e.response?.data?.message || e.message || '加载分享信息失败'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  const content = evaluationContent.value.trim()
  if (!content) {
    ElMessage.warning('请填写评价内容')
    return
  }
  submitting.value = true
  try {
    if (existingEvaluation.value) {
      // 修改
      const res = await updateShareEvaluation(route.params.token, { content })
      existingEvaluation.value = res.data.data
      evaluationContent.value = res.data.data.content
      ElMessage.success('评价已更新')
    } else {
      // 首次提交
      const res = await submitShareEvaluation(route.params.token, { content })
      existingEvaluation.value = res.data.data
      ElMessage.success('评价已提交')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  if (existingEvaluation.value) {
    evaluationContent.value = existingEvaluation.value.content || ''
    ElMessage.info('已重置为已提交内容')
  }
}

async function handleDownload(row) {
  downloadingId.value = row.id
  try {
    const res = await getShareDownloadUrl(route.params.token, row.id)
    const { url, fileName } = res.data.data
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || row.file_name || 'attachment'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '下载失败')
  } finally {
    downloadingId.value = null
  }
}

onMounted(fetchShareInfo)
</script>

<style scoped>
.share-evaluation-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px 12px;
}

.share-container {
  max-width: 800px;
  margin: 0 auto;
}

.share-header {
  text-align: center;
  margin-bottom: 24px;
}

.share-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
  color: var(--el-text-color-primary);
}

.share-subtitle {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.section-card {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
}

.field-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.last-submitted-info {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .share-evaluation-page { padding: 12px 8px; }
  .share-header h1 { font-size: 18px; }
}
</style>
