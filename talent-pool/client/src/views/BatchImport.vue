<template>
  <div style="max-width: 900px;">
    <el-page-header @back="$router.back()" content="批量上传简历" style="margin-bottom: 20px;" />

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="上传简历" name="upload" />

      <!-- 解析进度面板 -->
      <el-tab-pane :label="progressTabLabel" name="progress" :disabled="!currentBatchId" />

      <!-- 历史记录 -->
      <el-tab-pane label="历史记录" name="history" />
    </el-tabs>

    <!-- ===== 上传简历 ===== -->
    <div v-if="activeTab === 'upload'">
      <el-card shadow="never">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
          <template #title>
            批量上传简历文件，系统将自动进行 AI 解析并创建候选人。支持 .doc / .docx / .pdf / .txt 格式，单次最多 10 个文件，每个文件不超过 10MB。
          </template>
        </el-alert>

        <el-upload
          ref="uploadRef"
          drag
          multiple
          :auto-upload="false"
          :limit="MAX_FILES"
          accept=".doc,.docx,.pdf,.txt"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :on-exceed="handleExceed"
          :file-list="fileList"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将简历文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .doc / .docx / .pdf / .txt 格式，单次最多 {{ MAX_FILES }} 个文件，每个文件不超过 {{ MAX_FILE_MB }}MB
            </div>
          </template>
        </el-upload>

        <div style="margin-top: 16px; display: flex; align-items: center; justify-content: space-between;">
          <span style="color: var(--el-text-color-secondary); font-size: 13px;">
            已选择 {{ validFiles.length }} / {{ MAX_FILES }} 个文件
          </span>
          <div>
            <el-button @click="handleClearAll" :disabled="validFiles.length === 0 || uploading">清空</el-button>
            <el-button type="primary" :loading="uploading" :disabled="validFiles.length === 0" @click="handleBatchUpload">
              <el-icon><Upload /></el-icon> 开始批量上传
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- ===== 解析进度 ===== -->
    <div v-if="activeTab === 'progress' && currentBatchId">
      <el-card shadow="never">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 600;">解析进度</span>
            <el-tag v-if="batchData" :type="batchTagType" size="small">{{ batchStatusText }}</el-tag>
          </div>
        </template>

        <!-- 整体进度 -->
        <div style="margin-bottom: 24px;" v-if="batchData">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 14px;">整体进度</span>
            <span style="font-size: 14px; font-weight: 600;">{{ batchData.completed + batchData.failed }} / {{ batchData.total }}（{{ batchData.overallProgress }}%）</span>
          </div>
          <el-progress :percentage="batchData.overallProgress" :status="batchData.allDone ? (batchData.failed > 0 ? 'warning' : 'success') : ''" :stroke-width="20" :text-inside="true" />
          <div style="margin-top: 8px; color: var(--el-text-color-secondary); font-size: 13px;">
            <span v-if="batchData.pending > 0">等待中：{{ batchData.pending }}</span>
            <span v-if="batchData.parsing > 0" style="margin-left: 12px;">解析中：{{ batchData.parsing }}</span>
            <span v-if="batchData.completed > 0" style="margin-left: 12px; color: var(--el-color-success);">已完成：{{ batchData.completed }}</span>
            <span v-if="batchData.failed > 0" style="margin-left: 12px; color: var(--el-color-danger);">失败：{{ batchData.failed }}</span>
          </div>
        </div>

        <!-- 文件列表 -->
        <el-table :data="batchData?.tasks || []" style="width: 100%;" v-loading="batchLoading">
          <el-table-column label="#" type="index" width="50" />
          <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getTaskDisplayStatus(row).type" size="small">
                <el-icon v-if="row.status === 'parsing' && !isTaskStuck(row)" class="is-loading" style="margin-right: 4px;"><Loading /></el-icon>
                {{ getTaskDisplayStatus(row).text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="160">
            <template #default="{ row }">
              <el-progress :percentage="row.progress" :status="row.status === 'failed' ? 'exception' : row.status === 'completed' ? 'success' : ''" :stroke-width="14" :text-inside="true" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'failed'"
                type="primary"
                size="small"
                link
                @click="handleRetry(row.id)"
              >
                重新解析
              </el-button>
              <el-button
                v-if="row.status === 'parsing' && isTaskStuck(row)"
                type="danger"
                size="small"
                link
                @click="handleRetry(row.id)"
              >
                重启解析
              </el-button>
              <el-button
                v-if="row.status === 'completed' && row.candidate_id"
                type="primary"
                size="small"
                link
                @click="$router.push(`/candidates/${row.candidate_id}`)"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 失败详情 -->
        <el-card v-if="failedTasks.length > 0" shadow="never" style="margin-top: 16px;">
          <template #header>
            <span style="color: var(--el-color-danger);">失败详情（{{ failedTasks.length }} 个）</span>
          </template>
          <el-table :data="failedTasks" size="small" max-height="240">
            <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="error_message" label="失败原因" min-width="300" show-overflow-tooltip />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="handleRetry(row.id)">重试</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 确认按钮 -->
        <div style="margin-top: 24px; text-align: center;" v-if="batchData?.allDone">
          <el-alert
            :type="batchData.failed > 0 ? 'warning' : 'success'"
            :title="batchData.failed > 0 ? `解析完成：成功 ${batchData.completed} 个，失败 ${batchData.failed} 个` : `全部 ${batchData.completed} 个简历解析完成`"
            :closable="false"
            show-icon
            style="margin-bottom: 16px;"
          />
          <el-button type="primary" size="large" @click="handleConfirmProgress">
            确认
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- ===== 历史记录 ===== -->
    <div v-if="activeTab === 'history'">
      <el-card shadow="never" v-loading="historyLoading">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 600;">历史批量上传记录</span>
            <el-button size="small" @click="loadHistory">刷新</el-button>
          </div>
        </template>

        <el-empty v-if="historyBatches.length === 0" description="暂无历史记录" />

        <div v-for="batch in historyBatches" :key="batch.batchId" style="margin-bottom: 20px;">
          <el-card shadow="hover" style="margin-bottom: 0;">
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <span style="font-weight: 600; margin-right: 8px;">批次 {{ batch.batchId.substring(0, 8) }}...</span>
                  <span style="color: var(--el-text-color-secondary); font-size: 12px;">{{ formatTime(batch.createdAt) }}</span>
                </div>
                <div>
                  <el-tag size="small" type="info">{{ batch.tasks.length }} 个文件</el-tag>
                  <el-tag v-if="batch.tasks.every(t => t.status === 'completed')" size="small" type="success" style="margin-left: 4px;">全部完成</el-tag>
                  <el-tag v-else-if="batch.tasks.some(t => t.status === 'failed')" size="small" type="danger" style="margin-left: 4px;">部分失败</el-tag>
                  <el-tag v-else size="small" type="warning" style="margin-left: 4px;">处理中</el-tag>
                </div>
              </div>
            </template>
            <el-table :data="batch.tasks" size="small">
              <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTaskDisplayStatus(row).type" size="small">{{ getTaskDisplayStatus(row).text }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140">
                    <template #default="{ row }">
                      <el-button
                        v-if="row.status === 'failed'"
                        type="primary"
                        size="small"
                        link
                        @click="handleRetry(row.id)"
                      >
                        重新解析
                      </el-button>
                      <el-button
                        v-if="row.status === 'parsing' && isTaskStuck(row)"
                        type="danger"
                        size="small"
                        link
                        @click="handleRetry(row.id)"
                      >
                        重启解析
                      </el-button>
                      <el-button
                        v-if="row.status === 'completed' && row.candidate_id"
                        type="primary"
                        size="small"
                        link
                        @click="$router.push(`/candidates/${row.candidate_id}`)"
                      >
                        查看
                      </el-button>
                    </template>
                  </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Upload, Loading } from '@element-plus/icons-vue'
import { getBatchUploadUrl, createBatchParseTasks, getBatchStatus, getParseTaskHistory, retryParseTask } from '../api'
import { formatTime } from '../utils/constants'

const MAX_FILES = 10
const MAX_FILE_MB = 10
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.pdf', '.txt']
const POLL_INTERVAL = 3000
const STUCK_THRESHOLD_MINUTES = 25

const activeTab = ref('upload')
const uploadRef = ref(null)
const fileList = ref([])
const uploading = ref(false)

// 解析进度
const currentBatchId = ref(null)
const batchData = ref(null)
const batchLoading = ref(false)
let pollTimer = null

// 历史记录
const historyBatches = ref([])
const historyLoading = ref(false)

const validFiles = computed(() => {
  return fileList.value.filter(f => f.raw && validateFile(f.raw))
})

const progressTabLabel = computed(() => {
  if (!batchData.value) return '解析进度'
  if (batchData.value.allDone) return `解析进度 (${batchData.value.completed}/${batchData.value.total})`
  return `解析进度 (${batchData.value.completed + batchData.value.failed}/${batchData.value.total})`
})

const batchTagType = computed(() => {
  if (!batchData.value) return 'info'
  if (batchData.value.allDone) return batchData.value.failed > 0 ? 'warning' : 'success'
  return 'primary'
})

const batchStatusText = computed(() => {
  if (!batchData.value) return ''
  if (batchData.value.allDone) return batchData.value.failed > 0 ? '部分失败' : '全部完成'
  return '解析中'
})

const failedTasks = computed(() => {
  if (!batchData.value) return []
  return batchData.value.tasks.filter(t => t.status === 'failed')
})

function validateFile(file) {
  if (!file) return false
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false
  if (file.size > MAX_FILE_SIZE) return false
  return true
}

function taskStatusText(status) {
  const map = { pending: '等待中', parsing: '解析中', completed: '已完成', failed: '解析失败' }
  return map[status] || status
}

function getTaskDisplayStatus(row) {
  if (row.status === 'parsing' && isTaskStuck(row)) {
    return { text: '解析卡住', type: 'danger' }
  }
  return { text: taskStatusText(row.status), type: taskStatusTagType(row.status) }
}

function taskStatusTagType(status) {
  const map = { pending: 'info', parsing: 'warning', completed: 'success', failed: 'danger' }
  return map[status] || 'info'
}

function isTaskStuck(task) {
  if (task.status !== 'parsing') return false
  if (!task.updated_at) return false
  const updatedAt = new Date(task.updated_at.replace(' ', 'T'))
  const now = new Date()
  const elapsedMinutes = (now - updatedAt) / (1000 * 60)
  return elapsedMinutes > STUCK_THRESHOLD_MINUTES
}

function handleFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) return

  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    ElMessage.error(`不支持的文件格式：${file.name}（仅支持 ${ALLOWED_EXTENSIONS.join(' / ')}）`)
    uploadRef.value?.handleRemove(uploadFile)
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error(`文件大小超过限制：${file.name}（最大 ${MAX_FILE_MB}MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`)
    uploadRef.value?.handleRemove(uploadFile)
    return
  }

  // 检查是否超出最大文件数
  if (fileList.value.length >= MAX_FILES) {
    ElMessage.warning(`单次最多上传 ${MAX_FILES} 个文件`)
    uploadRef.value?.handleRemove(uploadFile)
    return
  }

  // 添加到文件列表（:file-list 为单向绑定，el-upload 不会自动更新父组件数组）
  const exists = fileList.value.some(f => f.uid === uploadFile.uid)
  if (!exists) {
    fileList.value.push(uploadFile)
  }
}

function handleFileRemove(uploadFile) {
  fileList.value = fileList.value.filter(f => f.uid !== uploadFile.uid)
}

function handleExceed() {
  ElMessage.warning(`单次最多上传 ${MAX_FILES} 个文件，请先移除部分文件`)
}

function handleClearAll() {
  fileList.value = []
  uploadRef.value?.clearFiles()
}

// 批量上传：获取签名URL → 上传至OSS → 创建解析任务
async function handleBatchUpload() {
  const files = validFiles.value.map(f => f.raw)
  if (files.length === 0) {
    ElMessage.warning('请至少选择一个有效文件')
    return
  }

  uploading.value = true
  try {
    // 1. 为每个文件获取 OSS 签名上传 URL
    const uploadInfos = []
    for (const file of files) {
      const res = await getBatchUploadUrl({ file_name: file.name, file_size: file.size })
      uploadInfos.push({ ...res.data.data, rawFile: file })
    }

    // 2. 并行上传所有文件到 OSS
    const uploadResults = await Promise.allSettled(
      uploadInfos.map(info => uploadToOSS(info.uploadUrl, info.rawFile, info.contentType))
    )

    // 检查上传结果
    const successUploads = []
    let failedCount = 0
    for (let i = 0; i < uploadResults.length; i++) {
      if (uploadResults[i].status === 'fulfilled') {
        successUploads.push({
          ossKey: uploadInfos[i].ossKey,
          fileName: uploadInfos[i].fileName,
          fileType: uploadInfos[i].fileType,
          fileSize: uploadInfos[i].fileSize
        })
      } else {
        failedCount++
        ElMessage.error(`文件上传失败：${uploadInfos[i].fileName}`)
      }
    }

    if (successUploads.length === 0) {
      ElMessage.error('所有文件上传失败，请重试')
      return
    }

    // 3. 创建批量解析任务
    const batchRes = await createBatchParseTasks({ files: successUploads })
    currentBatchId.value = batchRes.data.data.batchId

    ElMessage.success(`上传成功！${successUploads.length} 个文件已加入解析队列${failedCount > 0 ? `，${failedCount} 个文件上传失败` : ''}`)

    // 切换到进度面板
    activeTab.value = 'progress'
    startPolling()

    // 清空上传列表
    fileList.value = []
    uploadRef.value?.clearFiles()
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || '批量上传失败'
    ElMessage.error(msg)
  } finally {
    uploading.value = false
  }
}

function uploadToOSS(uploadUrl, file, contentType) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    // 使用后端返回的真实 MIME 类型，使 OSS 保存正确的 Content-Type 元数据
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`OSS 上传失败 (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('OSS 上传网络错误'))
    xhr.send(file)
  })
}

// 轮询批次状态（使用 setTimeout 避免重叠请求）
function startPolling() {
  stopPolling()
  fetchBatchStatus()
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function fetchBatchStatus() {
  if (!currentBatchId.value) return
  batchLoading.value = true
  try {
    const res = await getBatchStatus(currentBatchId.value)
    batchData.value = res.data.data

    // 全部完成后停止轮询
    if (batchData.value.allDone) {
      stopPolling()
      return
    }
  } catch (e) {
    debugLog('BatchStatus fetch error:', e?.message)
  } finally {
    batchLoading.value = false
  }
  // 等当前请求完成后再设定下一次轮询，避免重叠
  if (currentBatchId.value && !batchData.value?.allDone) {
    pollTimer = setTimeout(fetchBatchStatus, POLL_INTERVAL)
  }
}

function debugLog(...args) {
  console.log('[BatchImport]', ...args)
}

function handleConfirmProgress() {
  // 确认后切换到上传页面，保留进度数据供后续查看
  activeTab.value = 'upload'
  ElMessage.info('已确认解析结果，可在"历史记录"中查看')
}

async function handleRetry(taskId) {
  try {
    const res = await retryParseTask(taskId)
    ElMessage.success(res.data.message || '已重新加入解析队列')
    if (currentBatchId.value && activeTab.value === 'progress') {
      startPolling()
    }
    if (activeTab.value === 'history') {
      loadHistory()
    }
  } catch (e) {
    ElMessage.error('操作失败：' + (e?.response?.data?.message || e?.message || '未知错误'))
  }
}

// 历史记录
async function loadHistory() {
  historyLoading.value = true
  try {
    const res = await getParseTaskHistory({ page: 1, pageSize: 100 })
    historyBatches.value = res.data.data.batches
  } catch (e) {
    ElMessage.error('加载历史记录失败')
  } finally {
    historyLoading.value = false
  }
}

function handleTabChange(tab) {
  if (tab === 'progress' && currentBatchId.value) {
    if (!batchData.value?.allDone) {
      startPolling()
    }
  } else if (tab === 'history') {
    loadHistory()
  } else {
    stopPolling()
  }
}

onMounted(() => {
  // 如果有正在进行的批次，直接跳到进度面板
  if (currentBatchId.value) {
    activeTab.value = 'progress'
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>
