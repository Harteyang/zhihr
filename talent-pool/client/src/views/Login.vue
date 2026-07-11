<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5;">
    <el-card style="width: 400px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);" shadow="never">
      <div style="text-align: center; margin-bottom: 24px;">
        <el-icon style="font-size: 40px; color: var(--el-color-primary);"><UserFilled /></el-icon>
        <h2 style="margin: 12px 0 4px; color: var(--el-text-color-primary);">人才库管理</h2>
        <p style="color: var(--el-text-color-secondary); font-size: 14px;">{{ isFirstUser ? '首次使用，请注册管理员账号' : '请登录以继续' }}</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="账号" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" :prefix-icon="Lock" show-password @keyup.enter="handleSubmit" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%;" :loading="loading" @click="handleSubmit">
            {{ isFirstUser ? '注册并成为管理员' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="!isFirstUser" style="text-align: center; color: var(--el-text-color-secondary); font-size: 13px;">
        首次使用？<el-button type="primary" link @click="isFirstUser = true">注册管理员</el-button>
      </div>
      <div v-else style="text-align: center; color: var(--el-text-color-secondary); font-size: 13px;">
        已有账号？<el-button type="primary" link @click="isFirstUser = false">返回登录</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const isFirstUser = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    if (isFirstUser.value) {
      await authStore.register(form.username, form.password)
      ElMessage.success('注册成功，您已成为系统管理员')
    } else {
      await authStore.login(form.username, form.password)
      ElMessage.success('登录成功')
    }
    router.push('/candidates')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>
