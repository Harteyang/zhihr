<template>
  <div>
    <el-card shadow="never" style="max-width: 640px;">
      <template #header>
        <span style="font-weight: 600;">{{ isEdit ? '编辑用户' : '新增用户' }}</span>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" label-position="right">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="3-50位，字母数字下划线中文" />
        </el-form-item>

        <el-form-item label="显示名称" prop="display_name">
          <el-input v-model="form.display_name" placeholder="用于界面显示，留空则使用用户名" />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio value="user">普通用户</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
          <div style="color: var(--el-text-color-secondary); font-size: 12px; margin-top: 4px;">
            管理员拥有全部权限；普通用户仅能查看分配岗位下的候选人
          </div>
        </el-form-item>

        <el-form-item v-if="form.role === 'user'" label="岗位权限">
          <el-select v-model="form.positions" multiple filterable allow-create default-first-option placeholder="选择或输入岗位" style="width: 100%;">
            <el-option v-for="p in availablePositions" :key="p" :label="p" :value="p" />
          </el-select>
          <div style="color: var(--el-text-color-secondary); font-size: 12px; margin-top: 4px;">
            限制该用户只能查看对应岗位的候选人
          </div>
        </el-form-item>

        <el-form-item :label="isEdit ? '重置密码' : '密码'" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit ? '留空则不修改密码' : '至少8位，含大小写字母和数字'" />
        </el-form-item>

        <el-form-item v-if="!isEdit" label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入密码" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
          <el-button @click="$router.push('/users')">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createUser, updateUser, getAvailablePositions } from '../api'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const saving = ref(false)
const availablePositions = ref([])

const form = reactive({
  username: '',
  display_name: '',
  role: 'user',
  positions: [],
  password: '',
  confirmPassword: ''
})

const validatePassword = (rule, value, callback) => {
  // 编辑模式且留空 → 不修改密码
  if (isEdit.value && !value) {
    return callback()
  }
  if (!value || value.length < 8) {
    return callback(new Error('密码至少8位'))
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return callback(new Error('密码必须包含大小写字母和数字'))
  }
  callback()
}

const validateConfirmPassword = (_rule, value, callback) => {
  if (isEdit.value) return callback()
  if (!value) {
    return callback(new Error('请再次输入密码'))
  }
  if (value !== form.password) {
    return callback(new Error('两次输入的密码不一致'))
  }
  callback()
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '3-50位', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: !isEdit.value, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

async function loadUser() {
  if (!isEdit.value) return
  // 从用户列表接口拿不到单个用户，但 listUsers 返回全部，这里直接用页面跳转前的列表数据不可靠
  // 改为：从 router push 时带的 query 或重新拉取。这里用 fetch 全量列表过滤。
  try {
    const { getUsers } = await import('../api')
    const res = await getUsers()
    const u = (res.data.data || []).find(x => x.id === route.params.id)
    if (!u) {
      ElMessage.error('用户不存在')
      router.push('/users')
      return
    }
    form.username = u.username
    form.display_name = u.display_name || ''
    form.role = u.role
    form.positions = [...(u.positions || [])]
  } catch (e) {
    ElMessage.error('加载用户信息失败')
  }
}

async function loadAvailablePositions() {
  try {
    const res = await getAvailablePositions()
    availablePositions.value = res.data.data || []
  } catch (e) {
    // 非阻塞
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      const payload = {
        display_name: form.display_name,
        role: form.role
      }
      if (form.password) {
        payload.password = form.password
      }
      await updateUser(route.params.id, payload)

      // 更新岗位权限
      if (form.role === 'user') {
        const { setUserPositions } = await import('../api')
        await setUserPositions(route.params.id, form.positions)
      } else {
        // 管理员清空岗位分配
        const { setUserPositions } = await import('../api')
        await setUserPositions(route.params.id, [])
      }

      ElMessage.success('更新成功')
    } else {
      const payload = {
        username: form.username,
        password: form.password,
        display_name: form.display_name,
        role: form.role
      }
      const res = await createUser(payload)
      const newId = res.data.data.userId

      // 新用户分配岗位
      if (form.role === 'user' && form.positions.length > 0) {
        const { setUserPositions } = await import('../api')
        await setUserPositions(newId, form.positions)
      }

      ElMessage.success('用户创建成功')
    }
    router.push('/users')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadAvailablePositions()
  loadUser()
})
</script>
