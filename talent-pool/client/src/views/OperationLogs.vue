<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 16px;">
      <el-form :model="filters" inline>
        <el-form-item label="用户">
          <el-input v-model="filters.username" placeholder="用户名" clearable @clear="handleSearch" @keyup.enter="handleSearch" style="width: 180px;" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filters.action" placeholder="全部" clearable style="width: 180px;" @change="handleSearch">
            <el-option v-for="a in actionOptions" :key="a.value" :label="a.label" :value="a.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div style="margin-bottom: 12px; color: var(--el-text-color-secondary);">共 {{ total }} 条记录</div>

      <el-table :data="logs" v-loading="loading" stripe size="default">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="username" label="操作人" width="120" show-overflow-tooltip />
        <el-table-column label="操作类型" width="180">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small" effect="light">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resource_type" label="资源类型" width="110">
          <template #default="{ row }">{{ getResourceLabel(row.resource_type) }}</template>
        </el-table-column>
        <el-table-column prop="resource_id" label="资源ID" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.resource_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="详情" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.detail">{{ formatDetail(row.detail) }}</span>
            <span v-else style="color: var(--el-text-color-placeholder);">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP地址" width="130">
          <template #default="{ row }">{{ row.ip_address || '-' }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end;"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOperationLogs } from '../api'
import { formatTime } from '../utils/constants'

const loading = ref(false)
const logs = ref([])
const total = ref(0)

const filters = reactive({
  username: '',
  action: '',
  page: 1,
  pageSize: 50
})

const actionOptions = [
  { label: '创建候选人', value: 'create_candidate' },
  { label: '更新候选人', value: 'update_candidate' },
  { label: '更新状态', value: 'update_status' },
  { label: '删除候选人', value: 'delete_candidate' },
  { label: '批量导入', value: 'batch_import' },
  { label: '创建用户', value: 'create_user' },
  { label: '更新用户', value: 'update_user' },
  { label: '删除用户', value: 'delete_user' },
  { label: '更新用户状态', value: 'update_user_status' },
  { label: '批量更新状态', value: 'batch_update_status' },
  { label: '批量删除用户', value: 'batch_delete_users' },
  { label: '更新岗位权限', value: 'update_positions' },
  { label: '批量更新岗位', value: 'batch_update_positions' },
  { label: '登录', value: 'login' }
]

const actionLabelMap = actionOptions.reduce((acc, cur) => {
  acc[cur.value] = cur.label
  return acc
}, {})

function getActionLabel(action) {
  return actionLabelMap[action] || action
}

function getActionTagType(action) {
  if (action?.includes('delete') || action?.includes('batch_delete')) return 'danger'
  if (action?.includes('create') || action?.includes('batch_import')) return 'success'
  if (action?.includes('update') || action?.includes('batch')) return 'warning'
  if (action === 'login') return 'info'
  return 'info'
}

function getResourceLabel(type) {
  const map = { candidate: '候选人', user: '用户' }
  return map[type] || type || '-'
}

function formatDetail(detail) {
  try {
    const obj = typeof detail === 'string' ? JSON.parse(detail) : detail
    return JSON.stringify(obj)
  } catch {
    return detail
  }
}

function buildParams() {
  const params = { page: filters.page, pageSize: filters.pageSize }
  if (filters.username) params.username = filters.username
  if (filters.action) params.action = filters.action
  return params
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getOperationLogs(buildParams())
    logs.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取日志失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.page = 1
  fetchData()
}

function resetFilters() {
  filters.username = ''
  filters.action = ''
  filters.page = 1
  fetchData()
}

onMounted(fetchData)
</script>
