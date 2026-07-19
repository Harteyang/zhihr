import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/share/:token', name: 'ShareEvaluation', component: () => import('../views/ShareEvaluation.vue'), meta: { public: true, title: '面试评价', bare: true } },
  { path: '/resume-share/:token', name: 'ResumeShare', component: () => import('../views/ResumeShare.vue'), meta: { public: true, title: '简历分享', bare: true } },
  { path: '/', redirect: '/candidates' },
  { path: '/candidates', name: 'CandidateList', component: () => import('../views/CandidateList.vue'), meta: { title: '候选人列表' } },
  { path: '/candidates/new', name: 'CandidateForm', component: () => import('../views/CandidateForm.vue'), meta: { title: '新增候选人' } },
  { path: '/candidates/:id/edit', name: 'CandidateEdit', component: () => import('../views/CandidateForm.vue'), meta: { title: '编辑候选人' } },
  { path: '/candidates/:id', name: 'CandidateDetail', component: () => import('../views/CandidateDetail.vue'), meta: { title: '候选人详情' } },
  { path: '/import', name: 'BatchImport', component: () => import('../views/BatchImport.vue'), meta: { title: '批量上传' } },
  { path: '/users', name: 'UserList', component: () => import('../views/UserList.vue'), meta: { title: '用户管理', requireAdmin: true } },
  { path: '/users/new', name: 'UserForm', component: () => import('../views/UserForm.vue'), meta: { title: '新增用户', requireAdmin: true } },
  { path: '/users/:id/edit', name: 'UserEdit', component: () => import('../views/UserForm.vue'), meta: { title: '编辑用户', requireAdmin: true } },
  { path: '/operation-logs', name: 'OperationLogs', component: () => import('../views/OperationLogs.vue'), meta: { title: '操作日志', requireAdmin: true } }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, _from, next) => {
  if (to.meta.public) {
    return next()
  }

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    return next('/login')
  }

  if (to.meta.requireAdmin && !authStore.isAdmin) {
    ElMessage.error('需要管理员权限')
    return next('/candidates')
  }

  next()
})

export default router
