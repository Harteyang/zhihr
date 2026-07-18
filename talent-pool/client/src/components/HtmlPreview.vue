<template>
  <div class="html-preview-container">
    <div v-if="loading" class="preview-loading">
      <el-icon class="is-loading" size="32"><Loading /></el-icon>
      <span>正在加载文档...</span>
    </div>
    <div v-else-if="error" class="preview-error">
      <el-icon><Warning /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div v-else class="resume-html" v-html="htmlContent" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  html: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const htmlContent = ref('')

watch(() => props.html, (newVal) => {
  htmlContent.value = newVal || '<p>文档内容为空</p>'
}, { immediate: true })
</script>

<style scoped>
.html-preview-container {
  width: 100%;
  min-height: 300px;
  background: #ffffff;
  border-radius: 8px;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 300px;
  color: var(--el-text-color-secondary);
}

.preview-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 300px;
  color: var(--el-color-danger);
}

.resume-html {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  line-height: 1.8;
  color: #303133;
  font-size: 14px;
  word-break: break-word;
}

.resume-html :deep(h1) {
  font-size: 20px;
  font-weight: 700;
  margin: 20px 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.resume-html :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  margin: 18px 0 8px;
}

.resume-html :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px;
}

.resume-html :deep(p) {
  margin: 8px 0;
}

.resume-html :deep(strong) {
  font-weight: 600;
}

.resume-html :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 8px 0;
}

.resume-html :deep(ul),
.resume-html :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.resume-html :deep(li) {
  margin: 4px 0;
}
</style>