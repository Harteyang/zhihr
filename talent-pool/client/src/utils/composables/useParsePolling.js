import { ref, computed, onUnmounted } from 'vue'
import { getBatchStatus, retryParseTask } from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const POLL_INTERVAL = 3000
const STUCK_THRESHOLD_MINUTES = 25

export function useParsePolling() {
  const batchId = ref(null)
  const batchData = ref(null)
  const loading = ref(false)
  let pollTimer = null

  const isCompleted = computed(() => batchData.value?.allDone)
  const overallProgress = computed(() => batchData.value?.overallProgress || 0)
  const completedCount = computed(() => batchData.value?.completed || 0)
  const failedCount = computed(() => batchData.value?.failed || 0)
  const pendingCount = computed(() => batchData.value?.pending || 0)
  const parsingCount = computed(() => batchData.value?.parsing || 0)
  const totalCount = computed(() => batchData.value?.total || 0)

  const failedTasks = computed(() => {
    if (!batchData.value) return []
    return batchData.value.tasks.filter(t => t.status === 'failed')
  })

  const batchStatus = computed(() => {
    if (!batchData.value) return 'pending'
    if (batchData.value.allDone) return batchData.value.failed > 0 ? 'partial' : 'success'
    return 'parsing'
  })

  function isTaskStuck(task) {
    if (task.status !== 'parsing') return false
    if (!task.updated_at) return false
    const updatedAtStr = task.updated_at.replace(' ', 'T') + 'Z'
    const updatedAt = new Date(updatedAtStr)
    const now = new Date()
    const elapsedMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60)
    return elapsedMinutes > STUCK_THRESHOLD_MINUTES
  }

  function getTaskDisplayStatus(task) {
    const statusMap = { pending: '等待中', parsing: '解析中', completed: '已完成', failed: '解析失败' }
    const typeMap = { pending: 'info', parsing: 'warning', completed: 'success', failed: 'danger' }

    if (task.status === 'parsing' && isTaskStuck(task)) {
      return { text: '解析卡住', type: 'danger' }
    }
    return { text: statusMap[task.status] || task.status, type: typeMap[task.status] || 'info' }
  }

  function stopPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  async function fetchBatchStatus() {
    if (!batchId.value) return
    loading.value = true
    try {
      const res = await getBatchStatus(batchId.value)
      batchData.value = res.data.data

      if (batchData.value.allDone) {
        stopPolling()
        return
      }
    } catch (e) {
      console.log('[ParsePolling] Fetch error:', e?.message)
    } finally {
      loading.value = false
    }

    if (batchId.value && !batchData.value?.allDone) {
      pollTimer = setTimeout(fetchBatchStatus, POLL_INTERVAL)
    }
  }

  function startPolling(newBatchId) {
    stopPolling()
    batchId.value = newBatchId
    batchData.value = null
    fetchBatchStatus()
  }

  async function retryTask(taskId, reason = 'failed') {
    try {
      const confirmMessage = reason === 'stuck'
        ? '该任务已长时间无响应，可能处于卡住状态。重启解析将强制重新处理该文件，确定继续吗？'
        : '确定要重新解析该文件吗？'

      await ElMessageBox.confirm(confirmMessage, '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: reason === 'stuck' ? 'warning' : 'info'
      })

      const res = await retryParseTask(taskId)
      ElMessage.success(res.data.message || '已重新加入解析队列')
      if (batchId.value) {
        fetchBatchStatus()
      }
    } catch (e) {
      if (e !== 'cancel') {
        ElMessage.error('操作失败：' + (e?.response?.data?.message || e?.message || '未知错误'))
      }
    }
  }

  function reset() {
    stopPolling()
    batchId.value = null
    batchData.value = null
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    batchId,
    batchData,
    loading,
    isCompleted,
    overallProgress,
    completedCount,
    failedCount,
    pendingCount,
    parsingCount,
    totalCount,
    failedTasks,
    batchStatus,
    isTaskStuck,
    getTaskDisplayStatus,
    startPolling,
    stopPolling,
    fetchBatchStatus,
    retryTask,
    reset
  }
}