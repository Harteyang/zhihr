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
          <div style="display: flex; gap: 8px;">
            <el-button type="primary" size="small" @click="$router.push(`/candidates/${route.params.id}/edit`)">编辑</el-button>
            <el-button size="small" @click="openShareDialog">分享评价</el-button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; color: var(--el-text-color-secondary);">快速改状态:</span>
            <StatusSelect v-model="candidate.status" size="small" @update:model-value="handleStatusChange" />
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
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
            <el-descriptions-item label="创建时间">{{ formatTime(candidate.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatTime(candidate.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="面试评价" name="evaluations">
          <!-- 评价列表区域（始终展示） -->
          <div class="evaluation-list-header">
            <span class="evaluation-list-title">评价列表 ({{ evaluations.length }})</span>
            <el-button
              v-if="!evalFormVisible"
              type="primary"
              size="small"
              :icon="Plus"
              @click="startAddEvaluation"
            >
              添加评价
            </el-button>
          </div>

          <div v-loading="evalLoading" class="evaluation-list-wrapper">
            <el-empty v-if="!evalLoading && evaluations.length === 0" description="暂无评价，点击右上角「添加评价」开始填写" :image-size="60" />
            <div v-for="ev in evaluations" :key="ev.id" class="evaluation-item" :class="{ 'is-editing': editingEvalId === ev.id }">
              <div class="evaluation-item-header">
                <span class="evaluator-name">{{ ev.evaluator_name }}</span>
                <el-tag size="small" :type="ev.source === 'share' ? 'success' : 'info'" effect="plain">
                  {{ ev.source === 'share' ? '分享链接提交' : '内部填写' }}
                </el-tag>
                <span class="eval-time">提交：{{ formatTime(ev.created_at) }}</span>
                <span v-if="ev.updated_at && ev.updated_at !== ev.created_at" class="eval-time">
                  · 修改：{{ formatTime(ev.updated_at) }}
                </span>
              </div>
              <div class="evaluation-content">{{ ev.content }}</div>
              <div class="evaluation-item-actions">
                <el-button
                  v-if="ev.source !== 'share'"
                  type="primary"
                  link
                  size="small"
                  :disabled="evalFormVisible && editingEvalId !== ev.id"
                  @click="startEditEvaluation(ev)"
                >
                  修改
                </el-button>
                <el-button
                  type="danger"
                  link
                  size="small"
                  :disabled="editingEvalId === ev.id"
                  @click="handleDeleteEvaluation(ev)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>

          <!-- 评价输入框（折叠态默认隐藏，添加/修改时展开） -->
          <transition name="eval-form-slide">
            <div v-if="evalFormVisible" class="evaluation-form-wrapper">
              <div class="evaluation-form-header">
                <span class="evaluation-form-title">
                  {{ editingEvalId ? '修改评价' : '新增评价' }}
                </span>
                <el-button text size="small" @click="cancelEditEvaluation">收起</el-button>
              </div>
              <el-form label-position="top">
                <el-form-item label="评价人" required>
                  <el-input
                    v-model="newEvaluation.evaluator_name"
                    placeholder="请输入评价人姓名"
                    maxlength="50"
                    show-word-limit
                    style="max-width: 320px;"
                  />
                </el-form-item>
                <el-form-item label="评价内容" required>
                  <el-input
                    v-model="newEvaluation.content"
                    type="textarea"
                    :rows="5"
                    placeholder="请输入面试评价内容"
                    maxlength="5000"
                    show-word-limit
                  />
                </el-form-item>
                <div class="evaluation-form-actions">
                  <el-button type="primary" :loading="submittingEval" @click="submitEvaluation">
                    {{ editingEvalId ? '保存修改' : '提交评价' }}
                  </el-button>
                  <el-button @click="cancelEditEvaluation">取消</el-button>
                </div>
              </el-form>
            </div>
          </transition>
        </el-tab-pane>

        <el-tab-pane label="跟进记录" name="followRecords">
          <div v-loading="followLoading">
            <div v-if="followRecords?.candidate" class="follow-summary">
              <el-tag size="default" effect="plain">当前状态：{{ followRecords.candidate.status_label || '-' }}</el-tag>
              <el-tag size="default" type="info" effect="plain">创建：{{ formatTime(followRecords.candidate.created_at) }}</el-tag>
              <el-tag size="default" type="info" effect="plain">最近更新：{{ formatTime(followRecords.candidate.updated_at) }}</el-tag>
            </div>
            <el-empty v-if="!followLoading && (!followRecords?.events || followRecords.events.length === 0)" description="暂无跟进记录" :image-size="60" />
            <div v-else-if="followRecords?.events && followRecords.events.length > 0" style="margin-top: 16px;">
              <div class="follow-sort-indicator">
                <el-icon><SortDown /></el-icon>
                <span class="follow-sort-text">排序：时间倒序（最新记录优先）</span>
                <span class="follow-sort-count">共 {{ followRecords.events.length }} 条记录</span>
              </div>
              <el-timeline style="margin-top: 12px;">
                <el-timeline-item
                  v-for="(evt, idx) in followRecords.events"
                  :key="idx"
                  :timestamp="formatTime(evt.time)"
                  placement="top"
                  :type="getEventTimelineType(evt.type)"
                >
                  <div style="font-weight: 600;">{{ evt.title }}</div>
                  <div v-if="evt.description" style="color: var(--el-text-color-regular); font-size: 13px; margin-top: 2px;">
                    {{ evt.description }}
                  </div>
                  <div v-if="evt.operator" style="color: var(--el-text-color-secondary); font-size: 12px; margin-top: 2px;">
                    操作人：{{ evt.operator }}
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 附件展示区域：仅在"基本信息" tab 下展示，面试评价/跟进记录 tab 中不显示 -->
    <el-card v-if="activeTab === 'info'" shadow="never" style="margin-top: 16px;" id="attachments-section">
      <template #header>
        <span style="font-weight: 600;">附件 ({{ candidate.attachments?.length || 0 }})</span>
      </template>
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
        <el-table-column label="上传时间" width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handlePreview(row)">预览</el-button>
            <el-button type="success" link size="small" @click="handleDownload(row)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无附件" :image-size="60" />
    </el-card>

    <!-- 简历预览区域：同样仅在"基本信息" tab 下展示 -->
    <el-card v-if="activeTab === 'info' && previewVisible" shadow="never" style="margin-top: 16px;" id="preview-section">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">预览：{{ previewFileName }}</span>
          <el-button text size="small" @click="closePreview">关闭预览</el-button>
        </div>
      </template>
      <div v-loading="previewLoading" class="resume-preview-container">
        <PdfPreview v-if="previewType === 'pdf'" :src="previewUrl" />
        <HtmlPreview v-else-if="previewType === 'html'" :html="previewHtml" :loading="previewLoading" :error="''" />
      </div>
    </el-card>

    <!-- 分享链接管理对话框 -->
    <el-dialog v-model="shareDialogVisible" title="生成评价分享链接" width="560px">
      <el-form label-position="top">
        <el-form-item label="评价人姓名" required>
          <el-input v-model="shareForm.evaluator_name" placeholder="分享链接中评价人姓名将被锁定，不可修改" maxlength="50" show-word-limit />
          <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">
            评价人姓名将写死在分享页面，分享对象只能用此姓名提交评价
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="creatingShareLink" @click="handleCreateShareLink">生成分享链接</el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <div style="margin-bottom: 8px; font-weight: 600;">已生成的分享链接</div>
      <div v-loading="shareLinksLoading">
        <el-empty v-if="!shareLinksLoading && shareLinks.length === 0" description="暂无分享链接" :image-size="40" />
        <div v-for="link in shareLinks" :key="link.id" class="share-link-item">
          <div class="share-link-info">
            <div class="share-link-evaluator">评价人：{{ link.evaluator_name }}</div>
            <div class="share-link-meta">
              生成时间：{{ formatTime(link.created_at) }} · 评价数：{{ link.evaluation_count || 0 }}
            </div>
            <div class="share-link-url">{{ buildShareUrl(link.token) }}</div>
          </div>
          <div class="share-link-actions">
            <el-button type="primary" link size="small" @click="copyShareUrl(link.token)">复制链接</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteShareLink(link)">删除</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Phone, Message, Briefcase, Plus, SortDown } from '@element-plus/icons-vue'
import {
  getCandidate, updateCandidateStatus, previewAttachment,
  getUploadUrl, confirmUpload, getDownloadUrl, getUploadQuota,
  getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation,
  getShareLinks, createShareLink, deleteShareLink,
  getFollowRecords
} from '../api'
import StatusSelect from '../components/StatusSelect.vue'
import PdfPreview from '../components/PdfPreview.vue'
import HtmlPreview from '../components/HtmlPreview.vue'
import { getStatusLabel, getStatusType, formatTime } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const candidate = ref({})
const activeTab = ref('info')

// 预览相关状态
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewType = ref('')
const previewHtml = ref('')
const previewUrl = ref('')
const previewFileName = ref('')

// 上传配额
const quota = ref(null)

// 文件大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// 面试评价
const evaluations = ref([])
const evalLoading = ref(false)
const submittingEval = ref(false)
const editingEvalId = ref(null)
const evalFormVisible = ref(false) // 评价输入框默认折叠
const newEvaluation = ref({ evaluator_name: '', content: '' })

// 跟进记录
const followRecords = ref(null)
const followLoading = ref(false)

// 分享链接
const shareDialogVisible = ref(false)
const shareForm = ref({ evaluator_name: '' })
const creatingShareLink = ref(false)
const shareLinks = ref([])
const shareLinksLoading = ref(false)

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
    const urlRes = await getUploadUrl(route.params.id, {
      file_name: file.name,
      file_size: file.size
    })
    const { uploadUrl, ossKey, fileName, fileType, fileSize, contentType } = urlRes.data.data

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
      xhr.upload.onprogress = (e) => {
        if (e.total > 0) {
          onProgress({ percent: Math.round((e.loaded / e.total) * 100) })
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
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

    const confirmRes = await confirmUpload(route.params.id, {
      ossKey,
      fileName,
      fileType,
      fileSize: fileSize || file.size
    })

    onSuccess(confirmRes.data)
  } catch (e) {
    const errMsg = e.response?.data?.message || e.message || '上传失败'
    ElMessage.error(errMsg)
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
    // 状态变更会写入跟进记录，如果当前在跟进记录 tab，刷新一下
    if (activeTab.value === 'followRecords') {
      fetchFollowRecords()
    }
  } catch (e) {
    ElMessage.error('状态更新失败')
  }
}

// ====== 面试评价 ======
async function fetchEvaluations() {
  evalLoading.value = true
  try {
    const res = await getEvaluations(route.params.id)
    evaluations.value = res.data.data || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载评价失败')
  } finally {
    evalLoading.value = false
  }
}

async function submitEvaluation() {
  const evaluatorName = newEvaluation.value.evaluator_name.trim()
  const content = newEvaluation.value.content.trim()
  if (!evaluatorName) {
    ElMessage.warning('请输入评价人姓名')
    return
  }
  if (!content) {
    ElMessage.warning('请输入评价内容')
    return
  }
  submittingEval.value = true
  try {
    if (editingEvalId.value) {
      const res = await updateEvaluation(route.params.id, editingEvalId.value, {
        evaluator_name: evaluatorName,
        content
      })
      const idx = evaluations.value.findIndex(e => e.id === editingEvalId.value)
      if (idx >= 0) evaluations.value[idx] = res.data.data
      ElMessage.success('评价已更新')
    } else {
      const res = await createEvaluation(route.params.id, {
        evaluator_name: evaluatorName,
        content
      })
      evaluations.value.unshift(res.data.data)
      ElMessage.success('评价已提交')
    }
    // 提交成功后自动折叠输入框并清空内容
    collapseEvalForm()
    // 评价变更会影响跟进记录，刷新跟进记录
    if (activeTab.value === 'followRecords') {
      fetchFollowRecords()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败')
  } finally {
    submittingEval.value = false
  }
}

function startAddEvaluation() {
  // 切换到新增模式：清空内容并展开输入框
  editingEvalId.value = null
  newEvaluation.value.evaluator_name = ''
  newEvaluation.value.content = ''
  evalFormVisible.value = true
  // 滚动到表单位置，确保用户能看到展开的输入框
  nextTick(() => {
    document.querySelector('.evaluation-form-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function startEditEvaluation(ev) {
  // 切换到编辑模式：加载原评价内容并展开输入框
  editingEvalId.value = ev.id
  newEvaluation.value.evaluator_name = ev.evaluator_name
  newEvaluation.value.content = ev.content
  evalFormVisible.value = true
  nextTick(() => {
    document.querySelector('.evaluation-form-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function cancelEditEvaluation() {
  collapseEvalForm()
}

function collapseEvalForm() {
  evalFormVisible.value = false
  editingEvalId.value = null
  newEvaluation.value.evaluator_name = ''
  newEvaluation.value.content = ''
}

async function handleDeleteEvaluation(ev) {
  try {
    await ElMessageBox.confirm(`确定删除「${ev.evaluator_name}」的评价吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await deleteEvaluation(route.params.id, ev.id)
    evaluations.value = evaluations.value.filter(e => e.id !== ev.id)
    ElMessage.success('已删除')
    if (activeTab.value === 'followRecords') {
      fetchFollowRecords()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

// ====== 跟进记录 ======
async function fetchFollowRecords() {
  followLoading.value = true
  try {
    const res = await getFollowRecords(route.params.id)
    followRecords.value = res.data.data
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载跟进记录失败')
  } finally {
    followLoading.value = false
  }
}

function getEventTimelineType(type) {
  if (type === 'candidate_created') return 'primary'
  if (type === 'update_candidate_status') return 'warning'
  if (type === 'create_evaluation' || type === 'submit_share_evaluation' || type === 'evaluation_submitted') return 'success'
  if (type === 'update_evaluation' || type === 'update_share_evaluation' || type === 'evaluation_updated') return 'info'
  if (type === 'candidate_updated') return 'info'
  return ''
}

function handleTabChange(tab) {
  // 切换到评价/跟进记录 tab 时始终拉取最新数据，确保状态变更后不展示陈旧内容
  if (tab === 'evaluations') {
    fetchEvaluations()
  } else if (tab === 'followRecords') {
    fetchFollowRecords()
  }
}

// ====== 简历预览 ======
async function handlePreview(row) {
  previewFileName.value = row.file_name
  previewVisible.value = true
  previewLoading.value = true
  previewType.value = ''
  previewHtml.value = ''
  previewUrl.value = ''

  try {
    const fileType = (row.file_type || '').toLowerCase()
    if (fileType === 'pdf') {
      const apiBase = import.meta.env.VITE_API_BASE || 'https://api.zhihr.vip/api'
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`${apiBase}/talent/attachments/${row.id}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: '预览失败' }))
        throw new Error(errData.message || '预览失败')
      }
      const blob = await res.blob()
      previewUrl.value = URL.createObjectURL(blob)
      previewType.value = 'pdf'
    } else if (fileType === 'doc' || fileType === 'docx' || fileType === 'txt') {
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
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
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

function handleUploadSuccess(response) {
  ElMessage.success('上传成功')
  if (response?.quota) {
    quota.value = response.quota
  }
  fetchCandidate()
}

function handleUploadError(err) {
  let message = '上传失败，请稍后重试'
  try {
    if (err?.response?.data?.message) {
      message = err.response.data.message
    } else if (err?.message) {
      const parsed = JSON.parse(err.message)
      message = parsed.message || message
    }
  } catch {
    // 非 JSON 响应，使用默认消息
  }
  ElMessage.error(message)
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

// ====== 分享链接 ======
function buildShareUrl(token) {
  const base = import.meta.env.BASE_URL || '/talent-pool/'
  const origin = window.location.origin
  return `${origin}${base}share/${token}`
}

async function openShareDialog() {
  shareDialogVisible.value = true
  shareForm.value.evaluator_name = ''
  await fetchShareLinks()
}

async function fetchShareLinks() {
  shareLinksLoading.value = true
  try {
    const res = await getShareLinks(route.params.id)
    shareLinks.value = res.data.data || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载分享链接失败')
  } finally {
    shareLinksLoading.value = false
  }
}

async function handleCreateShareLink() {
  const evaluatorName = shareForm.value.evaluator_name.trim()
  if (!evaluatorName) {
    ElMessage.warning('请输入评价人姓名')
    return
  }
  creatingShareLink.value = true
  try {
    const res = await createShareLink(route.params.id, { evaluator_name: evaluatorName })
    shareLinks.value.unshift(res.data.data)
    // 给新链接补 evaluation_count 字段，便于一致渲染
    shareLinks.value[0].evaluation_count = 0
    shareForm.value.evaluator_name = ''
    ElMessage.success('分享链接已生成')
    // 自动复制到剪贴板
    copyShareUrl(res.data.data.token)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '生成分享链接失败')
  } finally {
    creatingShareLink.value = false
  }
}

async function copyShareUrl(token) {
  const url = buildShareUrl(token)
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('分享链接已复制到剪贴板')
  } catch {
    // 剪贴板 API 失败时回退到 textarea 选中复制
    const textarea = document.createElement('textarea')
    textarea.value = url
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('分享链接已复制')
    } catch {
      ElMessage.warning('复制失败，请手动复制：' + url)
    }
    document.body.removeChild(textarea)
  }
}

async function handleDeleteShareLink(link) {
  try {
    await ElMessageBox.confirm(`确定删除该分享链接吗？关联的评价也会被删除。`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await deleteShareLink(route.params.id, link.id)
    shareLinks.value = shareLinks.value.filter(l => l.id !== link.id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([fetchCandidate(), fetchQuota()])
})
</script>

<style scoped>
.resume-preview-container {
  min-height: 300px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

/* 评价列表区域 */
.evaluation-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 4px;
}

.evaluation-list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.evaluation-list-wrapper {
  min-height: 60px;
  padding-top: 4px;
}

.evaluation-item {
  padding: 12px 8px;
  border-radius: 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s ease;
}

.evaluation-item:last-child {
  border-bottom: none;
}

.evaluation-item.is-editing {
  background: var(--el-color-primary-light-9);
  border-left: 3px solid var(--el-color-primary);
  padding-left: 12px;
}

.evaluation-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.evaluator-name {
  font-weight: 600;
  font-size: 14px;
}

.eval-time {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.evaluation-content {
  color: var(--el-text-color-regular);
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 6px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.evaluation-item-actions {
  display: flex;
  gap: 8px;
}

/* 评价表单区域 */
.evaluation-form-wrapper {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.evaluation-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--el-border-color);
}

.evaluation-form-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.evaluation-form-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* 表单展开/折叠过渡动画 */
.eval-form-slide-enter-active,
.eval-form-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
  opacity: 1;
  overflow: hidden;
}

.eval-form-slide-enter-from,
.eval-form-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  transform: translateY(-8px);
}

.follow-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

/* 跟进记录排序标识 */
.follow-sort-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-color-primary);
}

.follow-sort-indicator .el-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.follow-sort-text {
  font-weight: 500;
}

.follow-sort-count {
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: normal;
}

.share-link-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 8px;
}

.share-link-info {
  flex: 1;
  min-width: 0;
}

.share-link-evaluator {
  font-weight: 600;
  margin-bottom: 4px;
}

.share-link-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.share-link-url {
  font-size: 12px;
  color: var(--el-color-primary);
  word-break: break-all;
}

.share-link-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
</style>
