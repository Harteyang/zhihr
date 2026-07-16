<template>
  <div style="max-width: 1000px;" v-loading="loading">
    <el-page-header @back="$router.push('/candidates')" title="返回列表" style="margin-bottom: 16px;" />

    <el-card shadow="never" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 20px;">
        <el-avatar :size="56" style="background: var(--el-color-primary); font-size: 22px; flex-shrink: 0;">{{ candidate.name?.charAt(0) }}</el-avatar>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <span style="font-size: 20px; font-weight: 600;">{{ candidate.name }}</span>
            <el-tag :type="getStatusType(candidate.status)" size="default" effect="light">{{ getStatusLabel(candidate.status) }}</el-tag>
          </div>
          <div style="display: flex; gap: 20px; color: var(--el-text-color-secondary); font-size: 14px;">
            <span v-if="candidate.phone"><el-icon><Phone /></el-icon> {{ candidate.phone }}</span>
            <span v-if="candidate.email"><el-icon><Message /></el-icon> {{ candidate.email }}</span>
            <span v-if="candidate.position"><el-icon><Briefcase /></el-icon> {{ candidate.position }}</span>
          </div>
        </div>
        <div class="detail-actions" style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
          <el-button type="primary" size="small" @click="$router.push(`/candidates/${route.params.id}/edit`)">编辑</el-button>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; color: var(--el-text-color-secondary);">快速改状态:</span>
            <StatusSelect v-model="candidate.status" size="small" @update:model-value="handleStatusChange" />
          </div>
        </div>
      </div>
    </el-card>

    <el-card v-if="previewVisible" shadow="never" style="margin-bottom: 16px;" id="preview-section">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">预览：{{ previewFileName }}</span>
          <el-button text size="small" @click="closePreview">关闭预览</el-button>
        </div>
      </template>
      <div v-loading="previewLoading" style="min-height: 300px;">
        <iframe v-if="previewType === 'pdf'" :src="previewUrl" style="width: 100%; height: 600px; border: none;" />
        <div v-else-if="previewType === 'html'" class="word-preview" v-html="previewHtml" />
      </div>
    </el-card>

    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="手机号">{{ candidate.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ candidate.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="目标岗位">{{ candidate.position || '-' }}</el-descriptions-item>
            <el-descriptions-item label="学历">{{ candidate.education || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工作年限">{{ candidate.experience_years ? `${candidate.experience_years}年` : '-' }}</el-descriptions-item>
            <el-descriptions-item label="来源渠道">{{ candidate.source || '-' }}</el-descriptions-item>
            <el-descriptions-item label="技能" :span="3">
              <el-tag v-for="skill in parsedSkills" :key="skill" size="small" style="margin-right: 6px; margin-bottom: 4px;">{{ skill }}</el-tag>
              <span v-if="parsedSkills.length === 0">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ candidate.created_at }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ candidate.updated_at }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane :label="`工作经历 (${candidate.experiences?.length || 0})`" name="experience">
          <el-timeline v-if="candidate.experiences && candidate.experiences.length > 0">
            <el-timeline-item
              v-for="exp in candidate.experiences"
              :key="exp.id"
              :timestamp="`${exp.start_date || '?'} ~ ${exp.end_date || '至今'}`"
              placement="top"
            >
              <el-card shadow="never" style="padding: 12px;">
                <div style="font-weight: 600;">{{ exp.title }}</div>
                <div style="color: var(--el-text-color-secondary); margin-bottom: 4px;">{{ exp.company }}</div>
                <div v-if="exp.description" style="color: var(--el-text-color-regular);">{{ exp.description }}</div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无工作经历" :image-size="60" />
        </el-tab-pane>

        <el-tab-pane :label="`附件 (${candidate.attachments?.length || 0})`" name="attachments">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
            <el-upload
              :auto-upload="true"
              action="#"
              accept=".pdf,.doc,.docx,.txt"
              :show-file-list="false"
              :http-request="handleUploadRequest"
              :before-upload="beforeUpload"
              @success="handleUploadSuccess"
              @error="handleUploadError"
              :disabled="quota && !quota.unlimited && quota.remaining <= 0"
            >
              <el-button type="primary" size="small" :disabled="quota && !quota.unlimited && quota.remaining <= 0">上传简历附件</el-button>
            </el-upload>
            <span v-if="quota && quota.unlimited" style="font-size: 12px; color: var(--el-text-color-secondary);">
              管理员账户：上传不受限制
            </span>
            <span v-else-if="quota" style="font-size: 12px;" :style="{ color: quota.remaining <= 10 ? 'var(--el-color-danger)' : 'var(--el-text-color-secondary)' }">
              今日剩余上传：{{ quota.remaining }} / {{ quota.limit }} 份
            </span>
          </div>
          <el-alert
            v-if="quota && !quota.unlimited && quota.remaining <= 0"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px;"
          >
            每日简历上传上限为 {{ quota.limit }} 份，今日已达上限，无法继续上传。管理员账户不受此限制。
          </el-alert>
          <el-table :data="candidate.attachments || []" v-if="candidate.attachments && candidate.attachments.length > 0" stripe>
            <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="file_type" label="类型" width="80" />
            <el-table-column prop="file_size" label="大小" width="100">
              <template #default="{ row }">{{ row.file_size ? `${(row.file_size / 1024).toFixed(1)} KB` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="created_at" label="上传时间" width="170" />
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handlePreview(row)">预览</el-button>
                <el-button type="success" link size="small" @click="handleDownload(row)">下载</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无附件" :image-size="60" />
        </el-tab-pane>

        <el-tab-pane label="备注" name="notes">
          <p style="white-space: pre-wrap; color: var(--el-text-color-regular); line-height: 1.8;">{{ candidate.summary || '暂无备注' }}</p>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Message, Briefcase } from '@element-plus/icons-vue'
import { getCandidate, updateCandidateStatus, deleteAttachment, previewAttachment, getUploadUrl, confirmUpload, getDownloadUrl, getUploadQuota } from '../api'
import StatusSelect from '../components/StatusSelect.vue'
import { getStatusLabel, getStatusType } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const candidate = ref({})
const activeTab = ref('info')

// 预览相关状态
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewType = ref('') // 'pdf' | 'html'
const previewHtml = ref('')
const previewUrl = ref('')
const previewFileName = ref('')

// 上传配额
const quota = ref(null)

// 文件大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// 上传前校验（Element Plus before-upload 返回 false 阻止上传）
function beforeUpload(file) {
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error(`文件大小不能超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB（当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`)
    return false
  }
  return true
}

async function handleUploadRequest(options) {
  const { file, onProgress, onSuccess, onError } = options
  try {
    // 1. 从 Worker 获取 OSS 预签名上传 URL
    const urlRes = await getUploadUrl(route.params.id, {
      file_name: file.name,
      file_size: file.size
    })
    const { uploadUrl, ossKey, fileName, fileType, fileSize } = urlRes.data.data

    // 2. 使用 XMLHttpRequest 直传到 OSS，支持进度
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      // OSS 预签名 URL 的签名使用 application/octet-stream，保持一致
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
      xhr.upload.onprogress = (e) => {
        if (e.total > 0) {
          onProgress({ percent: Math.round((e.loaded / e.total) * 100) })
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`OSS 上传失败 (${xhr.status})`))
        }
      }
      xhr.onerror = () => reject(new Error('OSS 上传网络错误'))
      xhr.send(file)
    })

    // 3. 通知后端写入数据库
    const confirmRes = await confirmUpload(route.params.id, {
      ossKey,
      fileName,
      fileType,
      fileSize: fileSize || file.size
    })

    onSuccess(confirmRes.data)
  } catch (e) {
    onError(e)
  }
}

const parsedSkills = computed(() => {
  if (!candidate.value.skills) return []
  if (typeof candidate.value.skills === 'string') {
    try { return JSON.parse(candidate.value.skills) } catch { return [] }
  }
  return candidate.value.skills
})

async function fetchCandidate() {
  loading.value = true
  try {
    const res = await getCandidate(route.params.id)
    candidate.value = res.data.data
  } finally {
    loading.value = false
  }
}

async function handleStatusChange(val) {
  try {
    await updateCandidateStatus(candidate.value.id, val)
    candidate.value.status = val
    ElMessage.success('状态已更新')
  } catch (e) {
    ElMessage.error('状态更新失败')
  }
}

async function handlePreview(row) {
  // 切换到附件 Tab 以便用户能看到附件列表上下文
  activeTab.value = 'attachments'
  // 关闭上一次预览，释放 ObjectURL
  closePreview()
  previewFileName.value = row.file_name
  previewVisible.value = true
  previewLoading.value = true
  previewType.value = ''
  previewHtml.value = ''
  previewUrl.value = ''

  try {
    const fileType = (row.file_type || '').toLowerCase()
    if (fileType === 'pdf') {
      // PDF：获取 OSS 直链并通过 iframe 内嵌预览
      const res = await getDownloadUrl(row.id)
      previewUrl.value = res.data.data.url
      previewType.value = 'pdf'
    } else if (fileType === 'doc' || fileType === 'docx' || fileType === 'txt') {
      // Word/TXT：调用预览接口拿到 HTML 后渲染
      const res = await previewAttachment(row.id)
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
    // 预览卡片可能在视口外，滚动至可见
    await nextTick()
    document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    ElMessage.warning(e.response?.data?.message || e.message || '预览失败，请尝试下载后查看')
    closePreview()
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  // previewUrl 是 OSS 直链（非 blob: URL），无需调用 revokeObjectURL
  previewVisible.value = false
  previewType.value = ''
  previewHtml.value = ''
  previewUrl.value = ''
  previewFileName.value = ''
}

async function handleDownload(row) {
  try {
    const res = await getDownloadUrl(row.id)
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
  }
}

async function handleDeleteAttachment(row) {
  // 简历附件上传后不支持删除（后端会返回 403）
  try {
    await deleteAttachment(candidate.value.id, row.id)
  } catch (e) {
    ElMessage.warning(e.response?.data?.message || '简历附件上传后不支持删除操作')
  }
}

function handleUploadSuccess(response) {
  ElMessage.success('上传成功')
  // 后端返回最新配额信息，同步更新前端
  if (response?.quota) {
    quota.value = response.quota
  }
  fetchCandidate()
}

function handleUploadError(err) {
  let message = '上传失败，请稍后重试'
  try {
    // 优先从 axios 响应中提取服务端错误消息
    if (err?.response?.data?.message) {
      message = err.response.data.message
    } else if (err?.message) {
      // el-upload 错误对象的 message 为后端响应体文本
      const parsed = JSON.parse(err.message)
      message = parsed.message || message
    }
  } catch {
    // 非 JSON 响应，使用默认消息
  }
  ElMessage.error(message)
  // 达到上限时刷新配额状态
  fetchQuota()
}

async function fetchQuota() {
  try {
    const res = await getUploadQuota()
    quota.value = res.data.data
  } catch {
    // 配额查询失败不阻塞页面
  }
}

async function initAutoPreview() {
  // 支持 ?attachment=<id> 直接预览指定附件
  const attachId = route.query.attachment
  if (!attachId) return
  const target = (candidate.value.attachments || []).find(a => String(a.id) === String(attachId))
  if (target) {
    await handlePreview(target)
  } else {
    ElMessage.warning('未找到指定的预览附件')
  }
}

onMounted(async () => {
  await Promise.all([fetchCandidate(), fetchQuota()])
  await initAutoPreview()
})
</script>

<style scoped>
.word-preview {
  line-height: 1.8;
  color: var(--el-text-color-primary);
  font-size: 14px;
  word-break: break-word;
}
.word-preview :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 6px;
}
.word-preview :deep(p) {
  margin: 6px 0;
}
.word-preview :deep(strong) {
  font-weight: 600;
}
</style>
