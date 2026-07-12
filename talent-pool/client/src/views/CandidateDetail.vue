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
          <div style="margin-bottom: 12px;">
            <el-upload
              :auto-upload="true"
              :action="uploadAction"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :on-error="() => ElMessage.error('上传失败')"
              :headers="uploadHeaders"
              name="file"
            >
              <el-button type="primary" size="small">上传附件</el-button>
            </el-upload>
          </div>
          <el-table :data="candidate.attachments || []" v-if="candidate.attachments && candidate.attachments.length > 0" stripe>
            <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="file_type" label="类型" width="80" />
            <el-table-column prop="file_size" label="大小" width="100">
              <template #default="{ row }">{{ row.file_size ? `${(row.file_size / 1024).toFixed(1)} KB` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="created_at" label="上传时间" width="170" />
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleDownload(row)">下载</el-button>
                <el-popconfirm title="确定删除该附件吗？" @confirm="handleDeleteAttachment(row)">
                  <template #reference>
                    <el-button type="danger" link size="small">删除</el-button>
                  </template>
                </el-popconfirm>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Message, Briefcase } from '@element-plus/icons-vue'
import { getCandidate, updateCandidateStatus, deleteAttachment, downloadUrl } from '../api'
import StatusSelect from '../components/StatusSelect.vue'
import { getStatusLabel, getStatusType } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const candidate = ref({})
const activeTab = ref('info')

const uploadAction = computed(() => {
  const base = import.meta.env.VITE_API_BASE || '/api'
  return `${base}/talent/candidates/${route.params.id}/attachments`
})

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

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

function handleDownload(row) {
  window.open(downloadUrl(row.id), '_blank')
}

async function handleDeleteAttachment(row) {
  try {
    await deleteAttachment(candidate.value.id, row.id)
    ElMessage.success('删除成功')
    fetchCandidate()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function handleUploadSuccess() {
  ElMessage.success('上传成功')
  fetchCandidate()
}

onMounted(fetchCandidate)
</script>
