<template>
  <div class="share-evaluation-page" v-loading="loading">
    <div class="share-container">
      <header class="share-header">
        <h1>候选人面试评价</h1>
        <p class="share-subtitle">请填写对该候选人的面试评价，提交后仍可修改</p>
      </header>

      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

      <template v-if="shareInfo">
        <!-- 顶部：面试评价 -->
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="evaluation-card-header">
              <span class="section-title">面试评价</span>
              <el-tag
                v-if="existingEvaluation && editMode === 'view'"
                size="small"
                type="success"
                effect="plain"
              >
                已提交
              </el-tag>
              <el-tag
                v-else-if="editMode === 'form' && existingEvaluation"
                size="small"
                type="warning"
                effect="plain"
              >
                修改中
              </el-tag>
              <el-tag v-else size="small" type="info" effect="plain">待填写</el-tag>
            </div>
          </template>

          <!-- view 模式：已提交评价展示 -->
          <div
            v-if="existingEvaluation && editMode === 'view'"
            class="evaluation-display"
          >
            <div class="evaluation-display-meta">
              <span class="evaluator-name">{{ existingEvaluation.evaluator_name }}</span>
              <span class="eval-time">
                提交时间：{{ formatTime(existingEvaluation.created_at) }}
              </span>
              <span
                v-if="existingEvaluation.updated_at && existingEvaluation.updated_at !== existingEvaluation.created_at"
                class="eval-time"
              >
                · 最近修改：{{ formatTime(existingEvaluation.updated_at) }}
              </span>
            </div>
            <div class="evaluation-display-content">{{ existingEvaluation.content }}</div>
            <div class="evaluation-display-actions">
              <el-button
                type="primary"
                size="small"
                :icon="Edit"
                @click="startEditEvaluation"
              >
                修改评价
              </el-button>
            </div>
          </div>

          <!-- form 模式：评价输入表单（首次提交或修改时） -->
          <el-form v-else label-position="top">
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
              <el-button v-if="existingEvaluation" @click="cancelEdit">取消</el-button>
            </div>
          </el-form>
        </el-card>

        <!-- 中间：简历预览区域（默认展开） -->
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

        <!-- 底部：简历附件列表 -->
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ZoomIn, ZoomOut, Warning, Edit } from '@element-plus/icons-vue'
import {
  getShareInfo,
  getShareDownloadUrl,
  previewShareAttachment,
  previewSharePdfUrl,
  submitShareEvaluation,
  updateShareEvaluation
} from '../api/share.js'
import PdfPreview from '../components/PdfPreview.vue'
import HtmlPreview from '../components/HtmlPreview.vue'
import { formatTime } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const submitting = ref(false)
const downloadingId = ref(null)
const loadError = ref('')
const shareInfo = ref(null)
const existingEvaluation = ref(null)
const evaluationContent = ref('')
// 评价编辑模式：'view' 已提交展示 | 'form' 输入表单（含首次提交与修改）
const editMode = ref('form')

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

async function fetchShareInfo() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getShareInfo(route.params.token)
    shareInfo.value = res.data.data
    if (res.data.data.evaluation) {
      existingEvaluation.value = res.data.data.evaluation
      evaluationContent.value = res.data.data.evaluation.content || ''
      // 已有评价：默认进入"已提交展示"模式
      editMode.value = 'view'
    } else {
      // 未提交：进入"填写表单"模式
      editMode.value = 'form'
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

async function handleSubmit() {
  const content = evaluationContent.value.trim()
  if (!content) {
    ElMessage.warning('请填写评价内容')
    return
  }
  submitting.value = true
  try {
    if (existingEvaluation.value) {
      // 修改已有评价
      const res = await updateShareEvaluation(route.params.token, { content })
      existingEvaluation.value = res.data.data
      evaluationContent.value = res.data.data.content
      ElMessage.success('评价已更新')
    } else {
      // 首次提交评价
      const res = await submitShareEvaluation(route.params.token, { content })
      existingEvaluation.value = res.data.data
      evaluationContent.value = res.data.data.content
      ElMessage.success('评价已提交')
    }
    // 提交/保存成功后，自动切换到"已提交展示"模式，隐藏输入框
    editMode.value = 'view'
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

// 点击"修改评价"按钮：重新展开输入框，预填已有内容
function startEditEvaluation() {
  if (existingEvaluation.value) {
    evaluationContent.value = existingEvaluation.value.content || ''
  }
  editMode.value = 'form'
  // 滚动到评价区域，确保用户看到输入框
  nextTick(() => {
    document.querySelector('.evaluation-card-header')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  })
}

// 取消修改：回到"已提交展示"模式，丢弃当前编辑内容
function cancelEdit() {
  if (existingEvaluation.value) {
    evaluationContent.value = existingEvaluation.value.content || ''
    editMode.value = 'view'
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

// ====== 简历预览 ======
let previewSeq = 0

async function handlePreview(row) {
  // 切换附件时先清理上一个 blob URL
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
      const res = await fetch(previewSharePdfUrl(route.params.token, row.id))
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: '预览失败' }))
        throw new Error(errData.message || '预览失败')
      }
      const blob = await res.blob()
      if (mySeq !== previewSeq) return
      previewUrl.value = URL.createObjectURL(blob)
      previewType.value = 'pdf'
    } else if (fileType === 'doc' || fileType === 'docx' || fileType === 'txt') {
      const res = await previewShareAttachment(route.params.token, row.id)
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
  // 清理 blob URL 避免内存泄漏
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
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

/* 面试评价卡片头部（标题 + 状态标签） */
.evaluation-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 已提交评价展示 */
.evaluation-display {
  padding: 4px 0;
}

.evaluation-display-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.evaluator-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.eval-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.evaluation-display-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  background: #f7f9fc;
  padding: 14px 16px;
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary-light-5);
  margin-bottom: 16px;
}

.evaluation-display-actions {
  display: flex;
  gap: 8px;
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
  .share-evaluation-page { padding: 12px 8px; }
  .share-header h1 { font-size: 18px; }
  .form-actions {
    flex-direction: column;
  }
  .form-actions .el-button {
    width: 100%;
    min-height: 44px;
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
  /* 附件表格移动端优化 */
  .section-card :deep(.el-table) {
    font-size: 13px;
  }
  /* 评价输入框移动端尺寸优化 */
  .section-card :deep(.el-textarea__inner) {
    min-height: 80px;
    max-height: 160px;
  }
}
</style>
