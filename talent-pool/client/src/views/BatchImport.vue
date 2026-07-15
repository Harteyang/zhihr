<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <span style="font-weight: 600;">批量导入候选人</span>
      </template>

      <el-steps :active="step" align-center style="margin-bottom: 32px;">
        <el-step title="下载模板" description="获取 Excel 模板" />
        <el-step title="上传文件" description="上传填好的 Excel" />
        <el-step title="导入结果" description="查看导入情况" />
      </el-steps>

      <!-- 步骤 1：下载模板 -->
      <div v-if="step === 0" style="max-width: 560px; margin: 0 auto;">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
          <template #title>请先下载 Excel 模板，按列填写候选人信息后上传。</template>
        </el-alert>
        <el-descriptions :column="1" border style="margin-bottom: 20px;">
          <el-descriptions-item label="支持的列">姓名(必填)、手机号、邮箱、目标岗位、技能(逗号分隔)、学历、工作年限、状态、来源、备注</el-descriptions-item>
          <el-descriptions-item label="文件格式">.xlsx / .xls</el-descriptions-item>
          <el-descriptions-item label="文件大小限制">10 MB</el-descriptions-item>
        </el-descriptions>
        <div style="text-align: center;">
          <el-button type="primary" size="large" :loading="downloading" @click="handleDownloadTemplate">
            <el-icon><Download /></el-icon> 下载 Excel 模板
          </el-button>
          <div style="margin-top: 16px;">
            <el-button type="primary" @click="step = 1">已下载，下一步</el-button>
          </div>
        </div>
      </div>

      <!-- 步骤 2：上传文件 -->
      <div v-if="step === 1" style="max-width: 560px; margin: 0 auto;">
        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          :on-exceed="handleExceed"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          accept=".xlsx,.xls"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将 Excel 文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .xlsx / .xls 格式，文件不超过 10MB</div>
          </template>
        </el-upload>

        <div style="text-align: center; margin-top: 20px;">
          <el-button @click="step = 0">上一步</el-button>
          <el-button type="primary" :loading="importing" :disabled="!selectedFile" @click="handleImport">
            开始导入
          </el-button>
        </div>
      </div>

      <!-- 步骤 2.5：导入进度 -->
      <div v-if="step === 2" style="max-width: 560px; margin: 0 auto; text-align: center;">
        <el-icon class="is-loading" :size="48" color="var(--el-color-primary)"><Loading /></el-icon>
        <p style="margin-top: 16px; color: var(--el-text-color-secondary);">正在解析并导入数据，请稍候...</p>
      </div>

      <!-- 步骤 3：导入结果 -->
      <div v-if="step === 3" style="max-width: 720px; margin: 0 auto;">
        <el-result :icon="importResult.failed === 0 ? 'success' : 'warning'" :title="resultTitle" :sub-title="resultSubTitle">
          <template #extra>
            <el-button type="primary" @click="$router.push('/candidates')">查看候选人列表</el-button>
            <el-button @click="handleReset">再次导入</el-button>
          </template>
        </el-result>

        <el-card v-if="importResult.errors?.length > 0" shadow="never" style="margin-top: 16px;">
          <template #header>
            <span style="color: var(--el-color-danger);">失败明细（{{ importResult.errors.length }} 条）</span>
          </template>
          <el-table :data="importResult.errors" size="small" max-height="320">
            <el-table-column prop="row" label="行号" width="80" />
            <el-table-column prop="name" label="姓名" width="120" show-overflow-tooltip />
            <el-table-column prop="error" label="失败原因" show-overflow-tooltip />
          </el-table>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, UploadFilled, Loading } from '@element-plus/icons-vue'
import { importCandidates, getImportTemplateUrl } from '../api'

const step = ref(0)
const downloading = ref(false)
const importing = ref(false)
const selectedFile = ref(null)
const uploadRef = ref(null)
const importResult = ref({ success: 0, failed: 0, errors: [] })

const resultTitle = computed(() => {
  const { success, failed } = importResult.value
  if (failed === 0) return `成功导入 ${success} 条`
  return `成功 ${success} 条，失败 ${failed} 条`
})

const resultSubTitle = computed(() => {
  if (importResult.value.failed === 0) return '所有候选人已成功导入'
  return '部分数据导入失败，请查看下方明细'
})

async function handleDownloadTemplate() {
  downloading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(getImportTemplateUrl(), {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '候选人导入模板.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch (e) {
    ElMessage.error('模板下载失败：' + (e.message || '未知错误'))
  } finally {
    downloading.value = false
  }
}

function handleFileChange(file) {
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    uploadRef.value?.clearFiles()
    return
  }
  selectedFile.value = file.raw
}

function handleFileRemove() {
  selectedFile.value = null
}

function handleExceed() {
  ElMessage.warning('只能上传一个文件，请先移除已有文件')
}

async function handleImport() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  importing.value = true
  step.value = 2
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    const res = await importCandidates(formData)
    const data = res.data.data
    importResult.value = {
      success: data.success || 0,
      failed: data.failed || 0,
      errors: (data.errors || []).map(errMsg => {
        // 后端返回 "第 N 行: 错误描述" 格式的字符串，解析为结构化对象
        const match = String(errMsg).match(/^第\s*(\d+)\s*行[：:]?\s*(.*)/)
        if (match) {
          return { row: parseInt(match[1], 10), name: '', error: match[2] }
        }
        return { row: '-', name: '', error: errMsg }
      })
    }
    step.value = 3
    if (data.success > 0) {
      ElMessage.success(`成功导入 ${data.success} 条`)
    }
  } catch (e) {
    step.value = 1
    const msg = e.response?.data?.message || '导入失败，请检查文件格式'
    ElMessage.error(msg)
  } finally {
    importing.value = false
  }
}

function handleReset() {
  step.value = 0
  selectedFile.value = null
  importResult.value = { success: 0, failed: 0, errors: [] }
  uploadRef.value?.clearFiles()
}
</script>
