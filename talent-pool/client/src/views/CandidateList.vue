<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 16px;">
      <el-form :model="filters" inline>
        <el-form-item label="搜索">
          <el-input v-model="filters.keyword" placeholder="姓名 / 手机号 / 邮箱" clearable @clear="handleSearch" @keyup.enter="handleSearch" style="width: 220px;" />
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-select v-model="filters.position" placeholder="全部" clearable style="width: 160px;">
            <el-option v-for="p in store.filterOptions.positions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="学历">
          <el-select v-model="filters.education" placeholder="全部" clearable style="width: 120px;">
            <el-option v-for="e in EDUCATION_OPTIONS" :key="e" :label="e" :value="e" />
          </el-select>
        </el-form-item>
        <el-form-item label="年限">
          <el-select v-model="filters.experienceRange" placeholder="全部" clearable style="width: 130px;">
            <el-option v-for="r in EXPERIENCE_RANGES" :key="r.label" :label="r.label" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable multiple collapse-tags style="width: 200px;">
            <el-option v-for="s in STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="filters.source" placeholder="全部" clearable style="width: 140px;">
            <el-option v-for="s in store.filterOptions.sources" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: var(--el-text-color-secondary);">共 {{ store.total }} 条记录</span>
        <el-button type="primary" @click="$router.push('/candidates/new')">
          <el-icon><Plus /></el-icon> 新增候选人
        </el-button>
      </div>

      <el-table :data="store.candidates" v-loading="store.loading" stripe size="default">
        <el-table-column label="姓名" min-width="160">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 10px;">
              <el-avatar :size="32" style="background: var(--el-color-primary); flex-shrink: 0; font-size: 14px;">{{ row.name?.charAt(0) }}</el-avatar>
              <router-link :to="`/candidates/${row.id}`" style="color: var(--el-color-primary); text-decoration: none; font-weight: 500;">{{ row.name }}</router-link>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="position" label="目标岗位" min-width="120" show-overflow-tooltip />
        <el-table-column prop="education" label="学历" width="80" />
        <el-table-column prop="experience_years" label="工作年限" width="100">
          <template #default="{ row }">{{ row.experience_years ? `${row.experience_years}年` : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="light">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="100" show-overflow-tooltip />
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ row.updated_at }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/candidates/${row.id}/edit`)">编辑</el-button>
            <el-popconfirm title="确定删除该候选人吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        :total="store.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end;"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCandidateStore } from '../stores/candidate'
import { deleteCandidate } from '../api'
import { STATUS_OPTIONS, EDUCATION_OPTIONS, EXPERIENCE_RANGES, getStatusLabel, getStatusType } from '../utils/constants'

const store = useCandidateStore()

const filters = reactive({
  keyword: '', position: '', education: '', experienceRange: null,
  status: [], source: '', page: 1, pageSize: 20
})

function buildParams() {
  const params = { page: filters.page, pageSize: filters.pageSize }
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.position) params.position = filters.position
  if (filters.education) params.education = filters.education
  if (filters.experienceRange) {
    params.experience_min = filters.experienceRange.min
    params.experience_max = filters.experienceRange.max
  }
  if (filters.status.length > 0) params.status = filters.status.join(',')
  if (filters.source) params.source = filters.source
  return params
}

function fetchData() {
  store.fetchList(buildParams())
}

function handleSearch() {
  filters.page = 1
  fetchData()
}

function resetFilters() {
  Object.assign(filters, { keyword: '', position: '', education: '', experienceRange: null, status: [], source: '', page: 1 })
  fetchData()
}

async function handleDelete(row) {
  try {
    await deleteCandidate(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  store.fetchFilterOptions()
  fetchData()
})
</script>
