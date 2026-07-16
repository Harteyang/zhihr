<template>
  <el-config-provider :locale="zhCn">
    <el-container style="min-height: 100vh">
      <el-aside v-if="!isMobile" width="220px" style="background: #1d2129; display: flex; flex-direction: column;">
        <div style="height: 56px; display: flex; align-items: center; padding: 0 20px; color: #fff; font-size: 17px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <el-icon style="margin-right: 8px; color: var(--el-color-primary);"><UserFilled /></el-icon>
          人才库管理
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#1d2129"
          text-color="rgba(255,255,255,0.65)"
          active-text-color="#fff"
          style="border: none; flex: 1; padding-top: 8px;"
        >
          <el-menu-item index="/candidates">
            <el-icon><List /></el-icon><span>候选人列表</span>
          </el-menu-item>
          <el-menu-item index="/candidates/new">
            <el-icon><Plus /></el-icon><span>新增候选人</span>
          </el-menu-item>
          <el-menu-item index="/import">
            <el-icon><Upload /></el-icon><span>批量上传</span>
          </el-menu-item>
          <el-menu-item index="/users" v-if="authStore.isAdmin">
            <el-icon><UserFilled /></el-icon><span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/operation-logs" v-if="authStore.isAdmin">
            <el-icon><Document /></el-icon><span>操作日志</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header style="height: 56px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--el-border-color-light); background: #fff;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <el-button v-if="isMobile" class="mobile-header-btn" link @click="drawerVisible = true">
              <el-icon size="22"><Menu /></el-icon>
            </el-button>
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/candidates' }">人才库</el-breadcrumb-item>
              <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <el-dropdown>
            <span style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--el-text-color-regular);">
              <el-avatar :size="28" style="background: var(--el-color-primary); font-size: 12px;">{{ authStore.user?.displayName?.charAt(0) || 'U' }}</el-avatar>
              {{ authStore.user?.displayName || authStore.user?.username }}
              <el-tag v-if="authStore.isAdmin" size="small" type="danger" effect="plain">管理员</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-header>
        <el-main style="background: #f5f7fa; padding: 20px;">
          <div style="max-width: 1400px; margin: 0 auto;">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>

    <el-drawer v-model="drawerVisible" v-if="isMobile" direction="ltr" size="260px" :with-header="false">
      <div style="background: #1d2129; min-height: 100%; display: flex; flex-direction: column;">
        <div style="height: 56px; display: flex; align-items: center; padding: 0 20px; color: #fff; font-size: 17px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <el-icon style="margin-right: 8px; color: var(--el-color-primary);"><UserFilled /></el-icon>
          人才库管理
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#1d2129"
          text-color="rgba(255,255,255,0.65)"
          active-text-color="#fff"
          style="border: none; flex: 1; padding-top: 8px;"
        >
          <el-menu-item index="/candidates">
            <el-icon><List /></el-icon><span>候选人列表</span>
          </el-menu-item>
          <el-menu-item index="/candidates/new">
            <el-icon><Plus /></el-icon><span>新增候选人</span>
          </el-menu-item>
          <el-menu-item index="/import">
            <el-icon><Upload /></el-icon><span>批量上传</span>
          </el-menu-item>
          <el-menu-item index="/users" v-if="authStore.isAdmin">
            <el-icon><UserFilled /></el-icon><span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/operation-logs" v-if="authStore.isAdmin">
            <el-icon><Document /></el-icon><span>操作日志</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-drawer>
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted, ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UserFilled, List, Plus, Upload, Document, Menu } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isMobile = ref(false)
const drawerVisible = ref(false)

function checkMobile() {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
  if (!isMobile.value) drawerVisible.value = false
}

const activeMenu = computed(() => {
  if (route.path.startsWith('/candidates/new')) return '/candidates/new'
  if (route.path.startsWith('/candidates/') && !route.path.includes('/edit')) return '/candidates'
  if (route.path.startsWith('/candidates/') && route.path.includes('/edit')) return '/candidates'
  return route.path
})

watch(() => route.path, () => {
  if (isMobile.value) drawerVisible.value = false
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (authStore.isLoggedIn && !authStore.user?.role) {
    authStore.fetchCurrentUser()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style>
body { margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }

:root {
  --el-color-primary: #3b82f6;
  --el-border-radius-base: 6px;
  --el-border-radius-small: 4px;
}
.el-menu-item.is-active { background-color: rgba(59, 130, 246, 0.15) !important; }
.el-aside { transition: width 0.2s; }
.mobile-header-btn { display: none; }

@media (max-width: 768px) {
  .mobile-header-btn { display: inline-flex !important; }

  .el-main { padding: 12px !important; }
  .el-main > div { max-width: 100% !important; }

  .el-table__body-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .el-table { min-width: 600px; }

  .el-col-12 { max-width: 100% !important; flex: 0 0 100% !important; }
  .el-form--inline .el-form-item { width: 100%; margin-right: 0; margin-bottom: 12px; }
  .el-form--inline .el-form-item .el-input,
  .el-form--inline .el-form-item .el-select { width: 100% !important; }
  .el-form-item__label { width: 80px !important; }

  .el-descriptions__body .el-descriptions__table { display: block; }
  .el-descriptions__body .el-descriptions__table tbody,
  .el-descriptions__body .el-descriptions__table tr,
  .el-descriptions__body .el-descriptions__table td { display: block; width: 100% !important; }

  .el-dialog { width: 92% !important; margin: 5vh auto !important; }
  .el-dialog__body { max-height: 70vh; overflow-y: auto; }

  .el-pagination { flex-wrap: wrap; justify-content: center !important; }
  .el-pagination .el-pagination__sizes,
  .el-pagination .el-pager li:not(.is-active) { display: none; }

  .el-message-box { width: 88% !important; }

  .login-card { width: 92% !important; }

  .detail-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .detail-actions { width: 100% !important; flex-direction: row !important; justify-content: flex-end !important; }

  .list-toolbar { flex-wrap: wrap !important; gap: 8px !important; }
  .batch-toolbar { flex-wrap: wrap !important; gap: 8px !important; }
}
</style>
