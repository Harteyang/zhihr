<template>
  <el-card shadow="never">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600;">预览：{{ fileName }}</span>
        <el-button text size="small" @click="$emit('close')">关闭预览</el-button>
      </div>
    </template>
    <div v-loading="loading" class="resume-preview-container">
      <PdfPreview v-if="previewType === 'pdf'" :src="previewUrl" />
      <HtmlPreview v-else-if="previewType === 'html'" :html="previewHtml" :loading="loading" :error="error" />
    </div>
  </el-card>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import PdfPreview from './PdfPreview.vue'
import HtmlPreview from './HtmlPreview.vue'

defineProps({
  fileName: {
    type: String,
    default: ''
  },
  previewType: {
    type: String,
    default: ''
  },
  previewUrl: {
    type: String,
    default: ''
  },
  previewHtml: {
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

defineEmits(['close'])
</script>

<style scoped>
.resume-preview-container {
  min-height: 300px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}
</style>