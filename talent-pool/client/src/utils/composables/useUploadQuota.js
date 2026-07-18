import { ref, computed } from 'vue'
import { getUploadQuota } from '../../api'

export function useUploadQuota() {
  const quota = ref(null)
  const loading = ref(false)

  const canUpload = computed(() => {
    if (!quota.value) return true
    return quota.value.unlimited || quota.value.remaining > 0
  })

  const quotaWarning = computed(() => {
    if (!quota.value || quota.value.unlimited) return null
    if (quota.value.remaining <= 0) {
      return `每日简历上传上限为 ${quota.value.limit} 份，今日已达上限，无法继续上传。管理员账户不受此限制。`
    }
    if (quota.value.remaining <= 10) {
      return { remaining: quota.value.remaining, limit: quota.value.limit }
    }
    return null
  })

  async function fetchQuota() {
    loading.value = true
    try {
      const res = await getUploadQuota()
      quota.value = res.data.data
    } catch {
      // 配额查询失败不阻塞页面
    } finally {
      loading.value = false
    }
  }

  function updateQuota(newQuota) {
    if (newQuota) {
      quota.value = newQuota
    }
  }

  return {
    quota,
    loading,
    canUpload,
    quotaWarning,
    fetchQuota,
    updateQuota
  }
}