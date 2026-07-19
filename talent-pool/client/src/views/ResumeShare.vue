<template>
  <div class="resume-share-page" v-loading="loading">
    <div class="share-container">
      <header class="share-header">
        <h1>候选人简历</h1>
        <p class="share-subtitle">请查看候选人简历信息，并选择下方操作</p>
      </header>

      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

      <template v-if="shareInfo">
        <!-- 顶部操作按钮区 -->
        <el-card shadow="never" class="section-card action-card">
          <div class="action-bar">
            <div class="action-bar-left">
              <span class="action-label">当前状态：</span>
              <el-tag :type="getStatusType(shareInfo.candidate.status)" effect="dark" size="large">
                {{ getStatusLabel(shareInfo.candidate.status) }}
              </el-tag>
            </div>
            <div class="action-bar-right">
              <template v-if="!actionSubmitted">
                <el-button
                  type="primary"
                  size="large"
                  :icon="Calendar"
                  :loading="submitting === 'schedule_interview'"
                  @click="handleAction('schedule_interview')"
                >
                  安排面试
                </el-button>
                <el-button
                  type="danger"
                  size="large"
                  plain
                  :icon="CircleClose"
                  :loading="submitting === 'screening_failed'"
                  @click="handleAction('screening_failed')"
                >
                  筛选不通过
                </el-button>
              </template>
              <template v-else>
                <el-tag :type="submittedActionType" effect="dark" size="large" class="submitted-tag">
                  <el-icon style="margin-right: 4px;"><CircleCheck /></el-icon>
                  {{ submittedActionText }}
                </el-tag>
              </template>
            </div>
          </div>
          <div v-if="actionSubmitted" class="action-tip">
            操作已记录，候选人状态已更新。如有疑问，请联系招聘负责人。
          </div>
        </el-card>

        <!-- 候选人基本信息 -->
        <el-card shadow="never" class="section-card">
          <template #header>
            <span class="section-title">候选人信息</span>
          </template>
          <el-descriptions :column="descColumn" border>
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
            <el-descriptions-item v-if="shareInfo.candidate.summary" label="个人简介" :span="3">
              <div class="candidate-summary">{{ shareInfo.candidate.summary }}</div>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 工作经历 -->
        <el-card
          v-if="shareInfo.experiences && shareInfo.experiences.length > 0"
          shadow="never"
          class="section-card"
        >
          <template #header>
            <div class="card-header-with-count">
              <span class="section-title">工作经历</span>
              <span class="section-count">{{ shareInfo.experiences.length }} 段经历</span>
            </div>
          </template>
          <el-timeline class="experience-timeline">
            <el-timeline-item
              v-for="(exp, idx) in shareInfo.experiences"
              :key="idx"
              :timestamp="formatDateRange(exp.start_date, exp.end_date)"
              placement="top"
              type="primary"
              hollow
            >
              <div class="experience-card">
                <div class="experience-header">
                  <span class="experience-company">{{ exp.company || '未填写公司' }}</span>
                  <el-tag v-if="exp.title" size="small" type="info" effect="plain" class="experience-title-tag">
                    {{ exp.title }}
                  </el-tag>
                </div>
                <div v-if="exp.description" class="experience-desc">{{ exp.description }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 简历附件 -->
        <el-card
          v-if="shareInfo.attachments && shareInfo.attachments.length > 0"
          shadow="never"
          class="section-card"
        >
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
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  :loading="previewingId === row.id"
                  @click="handlePreview(row)"
                >
                  预览
                </el-button>
                <el-button
                  type="success"
                  link
                  size="small"
                  :loading="downloadingId === row.id"
                  @click="handleDownload(row)"
                >
                  下载
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 简历预览区域 -->
        <el-card
          v-if="previewVisible"
          shadow="never"
          class="section-card preview-card"
          id="preview-section"
        >
          <template #header>
            <div class="preview-header">
              <div class="preview-header-left">
                <span class="preview-title">预览：{{ previewFileName }}</span>
              </div>
              <div class="preview-header-right">
                <el-button-group class="zoom-controls">
                  <el-button
                    size="small"
                    :icon="ZoomOut"
                    @click="zoomOutPreview"
                    :disabled="previewZoom <= MIN_PREVIEW_ZOOM + 0.01"
                  />
                  <el-button size="small" class="zoom-display" disabled>
                    {{ Math.round(previewZoom * 100) }}%
                  </el-button>
                  <el-button
                    size="small"
                    :icon="ZoomIn"
                    @click="zoomInPreview"
                    :disabled="previewZoom >= MAX_PREVIEW_ZOOM - 0.01"
                  />
                  <el-button size="small" @click="resetPreviewZoom">重置</el-button>
                </el-button-group>
                <el-button text size="small" @click="closePreview">关闭预览</el-button>
              </div>
            </div>
          </template>
          <div class="resume-preview-container">
            <div class="preview-zoom-wrapper" :style="{ zoom: previewZoom }">
              <PdfPreview v-if="previewType === 'pdf'" :src="previewUrl" />
              <HtmlPreview
                v-else-if="previewType === 'html'"
                :html="previewHtml"
                :loading="previewLoading"
                :error="previewError"
              />
              <div v-else-if="previewError" class="preview-fallback-error">
                <el-icon><Warning /></el-icon>
                <span>{{ previewError }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ZoomIn, ZoomOut, Warning, Calendar, CircleClose, CircleCheck } from '@element-plus/icons-vue'
import {
  getResumeShareInfo,
  getResumeShareDownloadUrl,
  previewResumeShareAttachment,
  previewResumeSharePdfUrl,
  submitResumeShareAction
} from '../api/resume-share.js'
import PdfPreview from '../components/PdfPreview.vue'
import HtmlPreview from '../components/HtmlPreview.vue'
import { formatTime, getStatusLabel, getStatusType } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const downloadingId = ref(null)
const loadError = ref('')
const shareInfo = ref(null)

// 操作按钮状态
// submitting: null | 'schedule_interview' | 'screening_failed'，标记当前正在提交的操作
const submitting = ref(null)
// 是否已成功提交过操作（提交后隐藏按钮、显示成功提示）
const actionSubmitted = ref(false)
// 已提交的操作类型，用于展示成功 tag
const submittedAction = ref('')

const submittedActionText = computed(() => {
  if (submittedAction.value === 'schedule_interview') return '已安排面试'
  if (submittedAction.value === 'screening_failed') return '已标记筛选不通过'
  // 其他终态（已面试通过/offer沟通/拒绝offer/已录用）：候选人已进入后续流程
  if (submittedAction.value === '') return '候选人已进入后续流程'
  return '操作已完成'
})

const submittedActionType = computed(() => {
  if (submittedAction.value === 'schedule_interview') return 'success'
  if (submittedAction.value === 'screening_failed') return 'danger'
  return 'success'
})

// 预览相关状态
const previewingId = ref(null)
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewType = ref('') // 'pdf' | 'html' | ''
const previewHtml = ref('')
const previewUrl = ref('')
const previewFileName = ref('')
const previewError = ref('')
const previewZoom = ref(1.0)
const MIN_PREVIEW_ZOOM = 0.5
const MAX_PREVIEW_ZOOM = 3.0
const ZOOM_STEP = 0.2

// 响应式描述列数
const descColumn = ref(3)

async function fetchShareInfo() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getResumeShareInfo(route.params.token)
    shareInfo.value = res.data.data
    // Issue 2: 使用白名单判断 —— 仅 to_recommend/resume_passed 状态允许操作
    // 其他 6 个状态（已安排面试/面试通过/offer沟通/拒绝offer/已录用/筛选不通过）均视为终态，隐藏按钮
    const status = res.data.data.candidate.status
    if (status === 'interview_scheduled') {
      actionSubmitted.value = true
      submittedAction.value = 'schedule_interview'
    } else if (status === 'screening_failed') {
      actionSubmitted.value = true
      submittedAction.value = 'screening_failed'
    } else if (status !== 'to_recommend' && status !== 'resume_passed') {
      // 其他终态（interview_passed/offer_discussing/offer_rejected/hired）：隐藏按钮，显示通用提示
      actionSubmitted.value = true
      submittedAction.value = ''
    }
  } catch (e) {
    loadError.value = e.response?.data?.message || e.message || '加载分享信息失败'
  } finally {
    loading.value = false
  }
}

async function handleAction(action) {
  const actionText = action === 'schedule_interview' ? '安排面试' : '筛选不通过'
  try {
    await ElMessageBox.confirm(
      `确认执行"${actionText}"操作？该操作将更新候选人状态，并记录到操作日志。`,
      '操作确认',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: action === 'schedule_interview' ? 'info' : 'warning'
      }
    )
  } catch {
    // 用户取消
    return
  }

  submitting.value = action
  try {
    await submitResumeShareAction(route.params.token, { action })
    // 本地更新状态，无需重新拉取接口
    if (shareInfo.value) {
      shareInfo.value.candidate.status = action === 'schedule_interview'
        ? 'interview_scheduled'
        : 'screening_failed'
    }
    actionSubmitted.value = true
    submittedAction.value = action
    ElMessage.success(`已${actionText}，候选人状态已更新`)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || `${actionText}失败`)
  } finally {
    submitting.value = null
  }
}

async function handleDownload(row) {
  downloadingId.value = row.id
  try {
    const res = await getResumeShareDownloadUrl(route.params.token, row.id)
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

// ====== 简历预览 ======
// 预览请求序号：防止快速切换附件时旧请求覆盖新请求的状态
let previewSeq = 0

async function handlePreview(row) {
  // 切换附件时先清理上一个 blob URL
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }

  // 自增序号并捕获当前请求的序号，响应回来时比对，过期的请求结果丢弃
  const mySeq = ++previewSeq

  previewingId.value = row.id
  previewFileName.value = row.file_name
  previewVisible.value = true
  previewLoading.value = true
  previewType.value = ''
  previewHtml.value = ''
  previewUrl.value = ''
  previewError.value = ''
  previewZoom.value = 1.0

  try {
    const fileType = (row.file_type || '').toLowerCase()
    if (fileType === 'pdf') {
      // PDF：直接 fetch 二进制流，转 blob URL 交给 PdfPreview
      const res = await fetch(previewResumeSharePdfUrl(route.params.token, row.id))
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: '预览失败' }))
        throw new Error(errData.message || '预览失败')
      }
      const blob = await res.blob()
      // Issue 5: 过期请求直接丢弃，blob 由 GC 自动回收，无需手动创建/撤销 URL
      if (mySeq !== previewSeq) return
      previewUrl.value = URL.createObjectURL(blob)
      previewType.value = 'pdf'
    } else if (fileType === 'doc' || fileType === 'docx' || fileType === 'txt') {
      // Word/TXT：调用预览接口拿 HTML
      const res = await previewResumeShareAttachment(route.params.token, row.id)
      if (mySeq !== previewSeq) return
      const data = res.data.data
      if (data?.type === 'html') {
        previewHtml.value = data.html
        previewType.value = 'html'
      } else {
        throw new Error('不支持的预览类型')
      }
    } else {
      throw new Error('该文件类型不支持在线预览，请下载后查看')
    }
    await nextTick()
    document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    if (mySeq !== previewSeq) return
    previewError.value = e.response?.data?.message || e.message || '预览失败，请尝试下载后查看'
    ElMessage.warning(previewError.value)
    previewType.value = ''
  } finally {
    if (mySeq === previewSeq) {
      previewLoading.value = false
      previewingId.value = null
    }
  }
}

function closePreview() {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewVisible.value = false
  previewType.value = ''
  previewHtml.value = ''
  previewUrl.value = ''
  previewFileName.value = ''
  previewError.value = ''
  previewZoom.value = 1.0
}

function zoomInPreview() {
  if (previewZoom.value < MAX_PREVIEW_ZOOM) {
    previewZoom.value = Math.min(MAX_PREVIEW_ZOOM, previewZoom.value + ZOOM_STEP)
  }
}

function zoomOutPreview() {
  if (previewZoom.value > MIN_PREVIEW_ZOOM) {
    previewZoom.value = Math.max(MIN_PREVIEW_ZOOM, previewZoom.value - ZOOM_STEP)
  }
}

function resetPreviewZoom() {
  previewZoom.value = 1.0
}

// ====== 工作经历日期格式化 ======
function formatDateRange(start, end) {
  const fmt = (d) => {
    if (!d) return ''
    const str = String(d)
    if (str.length >= 7) return str.slice(0, 7)
    return str
  }
  const s = fmt(start)
  const e = (!end || end === 'present') ? '至今' : fmt(end)
  if (s && e) return `${s} ~ ${e}`
  return s || e || '-'
}

// ====== 响应式列数 ======
function updateDescColumn() {
  descColumn.value = window.innerWidth < 768 ? 1 : 3
}

function handleResize() {
  updateDescColumn()
}

onMounted(() => {
  updateDescColumn()
  window.addEventListener('resize', handleResize)
  fetchShareInfo()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<style scoped>
.resume-share-page {
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

.card-header-with-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
}

/* 顶部操作区 */
.action-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.action-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.action-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.submitted-tag {
  font-size: 14px;
  padding: 8px 14px;
  height: auto;
}

.action-tip {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--el-color-success-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

/* 候选人个人简介 */
.candidate-summary {
  white-space: pre-wrap;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

/* 工作经历 */
.experience-timeline {
  padding-left: 4px;
}

.experience-card {
  padding: 4px 0;
}

.experience-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.experience-company {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.experience-title-tag {
  flex-shrink: 0;
}

.experience-desc {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
  white-space: pre-wrap;
  background: #f7f9fc;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--el-color-primary-light-5);
}

/* 简历预览 */
.preview-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preview-title {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 320px;
}

.preview-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.zoom-controls {
  display: inline-flex;
}

.zoom-display {
  min-width: 60px;
  pointer-events: none;
  color: var(--el-text-color-regular) !important;
}

.resume-preview-container {
  width: 100%;
  min-height: 400px;
  background: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

.preview-zoom-wrapper {
  width: 100%;
}

.preview-fallback-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 300px;
  color: var(--el-color-danger);
  font-size: 14px;
}

@media (max-width: 768px) {
  .resume-share-page { padding: 12px 8px; }
  .share-header h1 { font-size: 18px; }
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .action-bar-right {
    justify-content: stretch;
  }
  .action-bar-right .el-button {
    width: 100%;
  }
  .preview-header {
    flex-direction: column;
    align-items: stretch;
  }
  .preview-header-right {
    justify-content: space-between;
  }
  .preview-title {
    max-width: 100%;
  }
  .experience-desc {
    font-size: 12px;
  }
}
</style>
