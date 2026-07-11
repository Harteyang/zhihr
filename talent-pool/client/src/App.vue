<template>
  <el-config-provider :locale="zhCn">
    <el-container style="min-height: 100vh">
      <el-aside width="220px" style="background: #1d2129; display: flex; flex-direction: column;">
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
          <el-menu-item index="/import" v-if="authStore.isAdmin">
            <el-icon><Upload /></el-icon><span>批量导入</span>
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
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/candidates' }">人才库</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
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
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UserFilled, List, Plus, Upload, Document } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => {
  if (route.path.startsWith('/candidates/new')) return '/candidates/new'
  if (route.path.startsWith('/candidates/') && !route.path.includes('/edit')) return '/candidates'
  if (route.path.startsWith('/candidates/') && route.path.includes('/edit')) return '/candidates'
  return route.path
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  if (authStore.isLoggedIn && !authStore.user?.role) {
    authStore.fetchCurrentUser()
  }
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
</style>
