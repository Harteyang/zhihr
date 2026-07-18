import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.csv']

export function useOssUpload() {
  const uploading = ref(false)
  const progress = ref(0)

  function validateFile(file) {
    if (!file) return { valid: false, message: '文件不能为空' }
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, message: `不支持的文件格式：${file.name}（仅支持 ${ALLOWED_EXTENSIONS.join(' / ')}）` }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, message: `文件大小超过限制：${file.name}（最大 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）` }
    }
    return { valid: true, message: '' }
  }

  function uploadToOSS(uploadUrl, file, contentType) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
      xhr.upload.onprogress = (e) => {
        if (e.total > 0) {
          progress.value = Math.round((e.loaded / e.total) * 100)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          progress.value = 100
          resolve()
        } else {
          let detail = `HTTP ${xhr.status}`
          try {
            const xml = xhr.responseText || ''
            const codeMatch = xml.match(/<Code>([^<]+)<\/Code>/)
            const msgMatch = xml.match(/<Message>([^<]+)<\/Message>/)
            if (codeMatch) detail = `${codeMatch[1]}: ${msgMatch ? msgMatch[1] : ''} (${xhr.status})`
          } catch { /* ignore */ }
          reject(new Error(`OSS 上传失败 - ${detail}`))
        }
      }
      xhr.onerror = () => reject(new Error('OSS 上传网络错误（可能是 CORS 或网络中断）'))
      xhr.send(file)
    })
  }

  async function uploadFile(getUploadUrlFn, confirmUploadFn, file, onProgress) {
    const validation = validateFile(file)
    if (!validation.valid) {
      ElMessage.error(validation.message)
      return null
    }

    uploading.value = true
    progress.value = 0

    try {
      const urlRes = await getUploadUrlFn(file.name, file.size)
      const { uploadUrl, ossKey, fileName, fileType, fileSize, contentType } = urlRes.data.data

      await uploadToOSS(uploadUrl, file, contentType)

      const confirmRes = await confirmUploadFn({
        ossKey,
        fileName,
        fileType,
        fileSize: fileSize || file.size
      })

      ElMessage.success('上传成功')
      return confirmRes.data
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message || '上传失败'
      ElMessage.error(errMsg)
      return null
    } finally {
      uploading.value = false
      progress.value = 0
    }
  }

  async function batchUploadFiles(getUploadUrlFn, createParseTasksFn, files) {
    const validFiles = files.filter(f => validateFile(f).valid)
    if (validFiles.length === 0) {
      ElMessage.warning('请至少选择一个有效文件')
      return null
    }

    uploading.value = true

    try {
      const uploadInfos = []
      for (const file of validFiles) {
        const res = await getUploadUrlFn({ file_name: file.name, file_size: file.size })
        uploadInfos.push({ ...res.data.data, rawFile: file })
      }

      const uploadResults = await Promise.allSettled(
        uploadInfos.map(info => uploadToOSS(info.uploadUrl, info.rawFile, info.contentType))
      )

      const successUploads = []
      let failedCount = 0
      for (let i = 0; i < uploadResults.length; i++) {
        if (uploadResults[i].status === 'fulfilled') {
          successUploads.push({
            ossKey: uploadInfos[i].ossKey,
            fileName: uploadInfos[i].fileName,
            fileType: uploadInfos[i].fileType,
            fileSize: uploadInfos[i].fileSize
          })
        } else {
          failedCount++
          ElMessage.error(`文件上传失败：${uploadInfos[i].fileName}`)
        }
      }

      if (successUploads.length === 0) {
        ElMessage.error('所有文件上传失败，请重试')
        return null
      }

      const batchRes = await createParseTasksFn({ files: successUploads })
      const batchId = batchRes.data.data.batchId

      ElMessage.success(`上传成功！${successUploads.length} 个文件已加入解析队列${failedCount > 0 ? `，${failedCount} 个文件上传失败` : ''}`)

      return { batchId, successCount: successUploads.length, failedCount }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '批量上传失败'
      ElMessage.error(msg)
      return null
    } finally {
      uploading.value = false
      progress.value = 0
    }
  }

  return {
    uploading,
    progress,
    validateFile,
    uploadToOSS,
    uploadFile,
    batchUploadFiles
  }
}