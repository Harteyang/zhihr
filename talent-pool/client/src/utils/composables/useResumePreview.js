import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { previewAttachment, previewPdfAttachment } from '../../api/attachments.js'

export function useResumePreview() {
  const visible = ref(false)
  const loading = ref(false)
  const previewType = ref('')
  const previewHtml = ref('')
  const previewUrl = ref('')
  const fileName = ref('')
  const error = ref('')

  async function openPreview(attachment) {
    fileName.value = attachment.file_name
    visible.value = true
    loading.value = true
    previewType.value = ''
    previewHtml.value = ''
    previewUrl.value = ''
    error.value = ''

    try {
      const fileType = (attachment.file_type || '').toLowerCase()
      if (fileType === 'pdf') {
        const res = await previewPdfAttachment(attachment.id)
        const blob = new Blob([res.data], { type: 'application/pdf' })
        previewUrl.value = URL.createObjectURL(blob)
        previewType.value = 'pdf'
      } else if (fileType === 'doc' || fileType === 'docx' || fileType === 'txt') {
        const res = await previewAttachment(attachment.id)
        const data = res.data.data
        if (data?.type === 'html') {
          previewHtml.value = data.html
          previewType.value = 'html'
        } else {
          throw new Error('不支持的预览类型')
        }
      } else {
        throw new Error('该文件类型不支持在线预览，请下载后查看')
      }
    } catch (e) {
      error.value = e.response?.data?.message || e.message || '预览失败'
      ElMessage.warning(error.value)
      closePreview()
    } finally {
      loading.value = false
    }
  }

  function closePreview() {
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
    visible.value = false
    previewType.value = ''
    previewHtml.value = ''
    previewUrl.value = ''
    fileName.value = ''
    error.value = ''
  }

  return {
    visible,
    loading,
    previewType,
    previewHtml,
    previewUrl,
    fileName,
    error,
    openPreview,
    closePreview
  }
}