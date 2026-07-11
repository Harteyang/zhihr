<template>
  <div>
    <!-- 批量操作工具栏 -->
    <el-card v-if="selectedIds.length > 0" shadow="never" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="color: var(--el-color-primary); font-weight: 500;">已选 {{ selectedIds.length }} 项</span>
        <el-divider direction="vertical" />
        <el-button size="small" @click="openBatchStatusDialog('active')">批量启用</el-button>
        <el-button size="small" @click="openBatchStatusDialog('disabled')">批量禁用</el-button>
        <el-button size="small" type="primary" @click="openBatchPositionDialog">批量分配岗位</el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
        <el-button size="small" link @click="clearSelection">取消选择</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <el-input v-model="filters.keyword" placeholder="搜索用户名/显示名" clearable style="width: 220px;" @clear="fetchData" @keyup.enter="fetchData">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button @click="fetchData">搜索</el-button>
        </div>
        <el-button type="primary" @click="$router.push('/users/new')">
          <el-icon><Plus /></el-icon> 新增用户
        </el-button>
      </div>

      <el-table :data="filteredUsers" v-loading="loading" stripe @selection-change="handleSelectionChange" ref="tableRef">
        <el-table-column type="selection" width="45" :selectable="canSelect" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 10px;">
              <el-avatar :size="32" style="background: var(--el-color-primary); flex-shrink: 0; font-size: 13px;">
                {{ (row.display_name || row.username)?.charAt(0) }}
              </el-avatar>
              <div>
                <div style="font-weight: 500;">{{ row.display_name || row.username }}</div>
                <div style="font-size: 12px; color: var(--el-text-color-secondary);">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small" effect="light">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small" effect="plain">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="岗位权限" min-width="200">
          <template #default="{ row }">
            <template v-if="row.role === 'admin'">
              <el-tag type="warning" size="small" effect="plain">全部岗位</el-tag>
            </template>
            <template v-else-if="row.positions?.length > 0">
              <el-tag v-for="p in row.positions" :key="p" size="small" style="margin-right: 4px; margin-bottom: 4px;">{{ p }}</el-tag>
            </template>
            <span v-else style="color: var(--el-text-color-placeholder);">未分配</span>
          </template>
        </el-table-column>
        <el-table-column prop="last_login_at" label="最近登录" width="170">
          <template #default="{ row }">{{ row.last_login_at || '从未登录' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/users/${row.id}/edit`)">编辑</el-button>
            <el-button type="primary" link size="small" @click="openPositionDialog(row)">岗位</el-button>
            <el-button :type="row.status === 'active' ? 'warning' : 'success'" link size="small" @click="handleToggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm
              :title="`确定删除用户 ${row.username} 吗？`"
              @confirm="handleDelete(row)"
              :disabled="row.id === currentUserId"
            >
              <template #reference>
                <el-button type="danger" link size="small" :disabled="row.id === currentUserId">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 单用户岗位分配对话框 -->
    <el-dialog v-model="positionDialogVisible" title="分配岗位权限" width="480px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px;">
        <template #title>普通用户只能查看分配岗位下的候选人。管理员默认拥有全部岗位权限。</template>
      </el-alert>
      <el-form v-if="positionTarget && positionTarget.role !== 'admin'" label-position="top">
        <el-form-item label="可选岗位">
          <el-select v-model="positionForm.positions" multiple filterable allow-create default-first-option placeholder="选择或输入岗位" style="width: 100%;">
            <el-option v-for="p in availablePositions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-empty v-else description="管理员默认拥有全部岗位权限，无需分配" />
      <template #footer>
        <el-button @click="positionDialogVisible = false">取消</el-button>
        <el-button v-if="positionTarget && positionTarget.role !== 'admin'" type="primary" :loading="positionSaving" @click="handleSavePositions">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量岗位分配对话框 -->
    <el-dialog v-model="batchPositionDialogVisible" title="批量分配岗位权限" width="480px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px;">
        <template #title>将覆盖所选用户现有的岗位权限。管理员账号不受影响。</template>
      </el-alert>
      <el-form label-position="top">
        <el-form-item label="岗位">
          <el-select v-model="batchPositionForm.positions" multiple filterable allow-create default-first-option placeholder="选择或输入岗位" style="width: 100%;">
            <el-option v-for="p in availablePositions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchPositionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchPositionSaving" @click="handleBatchSavePositions">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  getUsers, deleteUser, updateUserStatus, setUserPositions,
  getAvailablePositions, batchUpdateUserStatus, batchDeleteUsers, batchSetPositions
} from '../api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.userId)

const loading = ref(false)
const users = ref([])
const filters = reactive({ keyword: '' })
const selectedIds = ref([])
const tableRef = ref(null)
const availablePositions = ref([])

const filteredUsers = computed(() => {
  if (!filters.keyword) return users.value
  const kw = filters.keyword.toLowerCase()
  return users.value.filter(u =>
    u.username?.toLowerCase().includes(kw) || u.display_name?.toLowerCase().includes(kw)
  )
})

function canSelect(row) {
  return row.id !== currentUserId.value
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getUsers()
    users.value = res.data.data || []
  } catch (e) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map(r => r.id)
}

function clearSelection() {
  tableRef.value?.clearSelection()
}

// ===== 单个用户操作 =====
async function handleToggleStatus(row) {
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  try {
    await updateUserStatus(row.id, newStatus)
    ElMessage.success(newStatus === 'active' ? '已启用' : '已禁用')
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

async function handleDelete(row) {
  try {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

// ===== 单用户岗位对话框 =====
const positionDialogVisible = ref(false)
const positionTarget = ref(null)
const positionForm = reactive({ positions: [] })
const positionSaving = ref(false)

function openPositionDialog(row) {
  positionTarget.value = row
  positionForm.positions = [...(row.positions || [])]
  positionDialogVisible.value = true
}

async function handleSavePositions() {
  positionSaving.value = true
  try {
    await setUserPositions(positionTarget.value.id, positionForm.positions)
    ElMessage.success('岗位权限已更新')
    positionDialogVisible.value = false
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    positionSaving.value = false
  }
}

// ===== 批量操作 =====
function openBatchStatusDialog(status) {
  const action = status === 'active' ? '启用' : '禁用'
  ElMessageBox.confirm(
    `确定批量${action}选中的 ${selectedIds.value.length} 个用户吗？`,
    `批量${action}`,
    { type: 'warning' }
  ).then(async () => {
    try {
      await batchUpdateUserStatus(selectedIds.value, status)
      ElMessage.success(`已批量${action} ${selectedIds.value.length} 个账号`)
      clearSelection()
      fetchData()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '批量操作失败')
    }
  }).catch(() => {})
}

async function handleBatchDelete() {
  ElMessageBox.confirm(
    `确定删除选中的 ${selectedIds.value.length} 个用户吗？此操作不可恢复。`,
    '批量删除',
    { type: 'error', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).then(async () => {
    try {
      await batchDeleteUsers(selectedIds.value)
      ElMessage.success(`已删除 ${selectedIds.value.length} 个账号`)
      clearSelection()
      fetchData()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '批量删除失败')
    }
  }).catch(() => {})
}

// ===== 批量岗位对话框 =====
const batchPositionDialogVisible = ref(false)
const batchPositionForm = reactive({ positions: [] })
const batchPositionSaving = ref(false)

function openBatchPositionDialog() {
  batchPositionForm.positions = []
  batchPositionDialogVisible.value = true
}

async function handleBatchSavePositions() {
  batchPositionSaving.value = true
  try {
    await batchSetPositions(selectedIds.value, batchPositionForm.positions)
    ElMessage.success(`已为 ${selectedIds.value.length} 个用户更新岗位权限`)
    batchPositionDialogVisible.value = false
    clearSelection()
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量分配失败')
  } finally {
    batchPositionSaving.value = false
  }
}

onMounted(() => {
  fetchData()
  loadAvailablePositions()
})

async function loadAvailablePositions() {
  try {
    const res = await getAvailablePositions()
    availablePositions.value = res.data.data || []
  } catch (e) {
    // 忽略，岗位列表非阻塞
  }
}
</script>
