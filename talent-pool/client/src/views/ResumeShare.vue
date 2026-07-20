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
            <p class="action-hint">请对简历做反馈：</p>
            <div class="action-bar-right">
              <template v-if="!actionSubmitted">
                <el-button
                  type="primary"
                  size="large"
                  :icon="Check"
                  :loading="submitting === 'resume_passed'"
                  @click="handleAction('resume_passed')"
                >
                  通过
                </el-button>
                <el-button
                  type="danger"
                  size="large"
                  :icon="Close"
                  :loading="submitting === 'screening_failed'"
                  @click="handleAction('screening_failed')"
                >
                  不通过
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ZoomIn, ZoomOut, Warning, Check, Close, CircleCheck } from '@element-plus/icons-vue'
import {
  getResumeShareInfo,
  getResumeShareDownloadUrl,
  previewResumeShareAttachment,
  previewResumeSharePdfUrl,
  submitResumeShareAction
} from '../api/resume-share.js'
import PdfPreview from '../components/PdfPreview.vue'
import HtmlPreview from '../components/HtmlPreview.vue'

const route = useRoute()
const loading = ref(false)
const downloadingId = ref(null)
const loadError = ref('')
const shareInfo = ref(null)

// 操作按钮状态
const submitting = ref(null)
const actionSubmitted = ref(false)
const submittedAction = ref('')

const submittedActionText = computed(() => {
  if (submittedAction.value === 'resume_passed') return '已通过'
  if (submittedAction.value === 'screening_failed') return '已不通过'
  // 其他终态（已安排面试/面试通过/offer沟通/拒绝offer/已录用）：候选人已进入后续流程
  if (submittedAction.value === '') return '候选人已进入后续流程'
  return '操作已完成'
})

const submittedActionType = computed(() => {
  if (submittedAction.value === 'screening_failed') return 'danger'
  return 'success'
})

// 预览相关状态
const previewingId = ref(null)
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewType = ref('')
const previewHtml = ref('')
const previewUrl = ref('')
const previewFileName = ref('')
const previewError = ref('')
const previewZoom = ref(1.0)
const MIN_PREVIEW_ZOOM = 0.5
const MAX_PREVIEW_ZOOM = 3.0
const ZOOM_STEP = 0.2

async function fetchShareInfo() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getResumeShareInfo(route.params.token)
    shareInfo.value = res.data.data
    // 白名单判断：仅 to_recommend/resume_passed 状态允许操作
    const status = res.data.data.candidate.status
    if (status === 'resume_passed') {
      actionSubmitted.value = true
      submittedAction.value = 'resume_passed'
    } else if (status === 'screening_failed') {
      actionSubmitted.value = true
      submittedAction.value = 'screening_failed'
    } else if (status !== 'to_recommend') {
      // 其他终态（interview_scheduled/interview_passed/offer_discussing/offer_rejected/hired）：隐藏按钮
      actionSubmitted.value = true
      submittedAction.value = ''
    }

    // 默认展开预览第一个附件
    const attachments = res.data.data.attachments
    if (attachments && attachments.length > 0) {
      await nextTick()
      handlePreview(attachments[0])
    }
  } catch (e) {
    loadError.value = e.response?.data?.message || e.message || '加载分享信息失败'
  } finally {
    loading.value = false
  }
}

async function handleAction(action) {
  const actionText = action === 'resume_passed' ? '通过' : '不通过'
  const confirmMessage = action === 'resume_passed'
    ? '操作确认，将提醒尽快安排面试'
    : '操作确认，简历不通过，将不会进入面试安排'
  try {
    await ElMessageBox.confirm(
      confirmMessage,
      '操作确认',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: action === 'resume_passed' ? 'info' : 'warning'
      }
    )
  } catch {
    return
  }

  submitting.value = action
  try {
    await submitResumeShareAction(route.params.token, { action })
    // 本地更新状态
    if (shareInfo.value) {
      shareInfo.value.candidate.status = action
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
let previewSeq = 0

async function handlePreview(row) {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }

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
      const res = await fetch(previewResumeSharePdfUrl(route.params.token, row.id))
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: '预览失败' }))
        throw new Error(errData.message || '预览失败')
      }
      const blob = await res.blob()
      if (mySeq !== previewSeq) return
      previewUrl.value = URL.createObjectURL(blob)
      previewType.value = 'pdf'
    } else if (fileType === 'doc' || fileType === 'docx' || fileType === 'txt') {
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

onMounted(() => {
  fetchShareInfo()
})

onBeforeUnmount(() => {
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

/* 顶部操作区 */
.action-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.action-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-hint {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.action-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-bar-right .el-button {
  min-width: 120px;
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
  -webkit-overflow-scrolling: touch;
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

/* 移动端适配 */
@media (max-width: 768px) {
  .resume-share-page {
    padding: 12px 8px;
  }

  .share-header h1 {
    font-size: 18px;
  }

  .action-card :deep(.el-card__body) {
    padding: 12px 16px;
  }

  .action-hint {
    font-size: 14px;
  }

  .action-bar-right {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .action-bar-right .el-button {
    width: 100%;
    min-height: 44px;
    font-size: 15px;
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

  .resume-preview-container {
    min-height: 300px;
  }
}
</style>
