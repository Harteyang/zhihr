<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 16px;">
      <div class="search-area">
        <!-- 第一行：搜索输入框 + 搜索按钮 + 重置按钮 -->
        <div class="search-row search-row-primary">
          <el-input
            v-model="filters.keyword"
            placeholder="姓名、电话或邮箱"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            class="search-input"
          />
          <!-- 移动端折叠状态下仅保留搜索输入框，展开后显示搜索/重置按钮 -->
          <template v-if="!isMobile || showFilters">
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </template>
        </div>
        <!-- 折叠箭头 - 移至搜索框下方，仅移动端显示 -->
        <div v-if="isMobile" class="filters-toggle-row">
          <el-button
            class="filters-toggle"
            :type="showFilters ? 'primary' : ''"
            link
            @click="showFilters = !showFilters"
          >
            <el-icon class="toggle-icon" :class="{ 'is-expanded': showFilters }">
              <ArrowDown />
            </el-icon>
          </el-button>
        </div>
        <!-- 第二行：岗位、公司、状态、来源 筛选器 -->
        <transition name="filters-slide">
          <div v-show="showFilters" class="search-row search-row-filters">
            <el-select v-model="filters.position" placeholder="岗位" clearable @change="handleSearch" class="filter-select">
              <el-option v-for="p in store.filterOptions.positions" :key="p" :label="p" :value="p" />
            </el-select>
            <el-select v-model="filters.company" placeholder="公司" clearable filterable @change="handleSearch" class="filter-select">
              <el-option v-for="c in store.filterOptions.companies" :key="c" :label="c" :value="c" />
            </el-select>
            <el-select v-model="filters.status" placeholder="状态" clearable multiple collapse-tags @change="handleSearch" class="filter-select filter-select-status">
              <el-option v-for="s in STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
            <el-select v-model="filters.source" placeholder="来源" clearable @change="handleSearch" class="filter-select">
              <el-option v-for="s in store.filterOptions.sources" :key="s" :label="s" :value="s" />
            </el-select>
          </div>
        </transition>
      </div>
    </el-card>

    <el-card shadow="never">
      <div class="list-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
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
        <el-table-column prop="position" label="岗位" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="light">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.created_by_name || row.created_by || '-' }}</template>
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
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { Plus, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCandidateStore } from '../stores/candidate'
import { deleteCandidate } from '../api'
import { STATUS_OPTIONS, getStatusLabel, getStatusType } from '../utils/constants'

const store = useCandidateStore()

const filters = reactive({
  keyword: '', position: '', company: '',
  status: [], source: '', page: 1, pageSize: 20
})

// 移动端筛选器折叠状态：桌面端默认展开，移动端默认折叠
const showFilters = ref(true)
const isMobile = ref(false)

function checkScreenWidth() {
  const mobile = window.innerWidth < 768
  isMobile.value = mobile
  if (mobile) {
    showFilters.value = false
  } else {
    showFilters.value = true
  }
}

function buildParams() {
  const params = { page: filters.page, pageSize: filters.pageSize }
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.position) params.position = filters.position
  if (filters.company) params.company = filters.company
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
  Object.assign(filters, { keyword: '', position: '', company: '', status: [], source: '', page: 1 })
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
  checkScreenWidth()
  window.addEventListener('resize', checkScreenWidth)
  store.fetchFilterOptions()
  fetchData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenWidth)
})
</script>

<style scoped>
.search-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-row-primary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}

.search-row-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select {
  width: 160px;
}

.filter-select-status {
  width: 200px;
}

/* 折叠/展开箭头行：桌面端隐藏，移动端显示 */
.filters-toggle-row {
  display: none;
  justify-content: center;
  margin-top: -4px;
}

.filters-toggle {
  padding: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.toggle-icon {
  transition: transform 0.3s ease;
  font-size: 18px;
}

.toggle-icon.is-expanded {
  transform: rotate(180deg);
}

/* 移动端筛选条件过渡动画 */
.filters-slide-enter-active,
.filters-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.filters-slide-enter-from,
.filters-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: -12px;
}

.filters-slide-enter-to,
.filters-slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .filters-toggle-row {
    display: flex;
  }

  .filters-toggle {
    min-height: 36px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-input {
    max-width: none;
  }

  .search-row-primary {
    gap: 6px;
  }

  .search-row-primary .el-button {
    flex-shrink: 0;
    white-space: nowrap;
    padding-left: 14px;
    padding-right: 14px;
  }

  .filter-select {
    width: calc(50% - 4px);
    min-width: 140px;
  }

  .filter-select-status {
    width: calc(50% - 4px);
  }
}
</style>
