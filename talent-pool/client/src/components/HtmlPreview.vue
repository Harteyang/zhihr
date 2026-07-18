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

/* 简历内容容器：A4 纸感 + 响应式边距 */
.resume-html {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 40px;
  line-height: 1.7;
  color: #2c3e50;
  font-size: 15px;
  word-break: break-word;
  background: #ffffff;
}

/* 标题层级：字号梯度清晰，颜色深浅区分 */
.resume-html :deep(h1) {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 24px 0 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
  line-height: 1.3;
}

.resume-html :deep(h2) {
  font-size: 20px;
  font-weight: 650;
  color: #303133;
  margin: 20px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e4e7ed;
  line-height: 1.35;
}

.resume-html :deep(h3) {
  font-size: 17px;
  font-weight: 600;
  color: #606266;
  margin: 16px 0 8px;
  line-height: 1.4;
}

.resume-html :deep(h4),
.resume-html :deep(h5),
.resume-html :deep(h6) {
  font-size: 15px;
  font-weight: 600;
  color: #606266;
  margin: 14px 0 6px;
}

/* 正文：紧凑但可读的段落间距 */
.resume-html :deep(p) {
  margin: 6px 0;
  line-height: 1.75;
}

/* 字段行（姓名：张三、电话：138...）：整齐的两栏布局 */
.resume-html :deep(.resume-field) {
  margin: 5px 0;
  line-height: 1.7;
}

.resume-html :deep(.resume-label) {
  display: inline-block;
  min-width: 6em;
  color: #606266;
  font-weight: 600;
}

.resume-html :deep(.resume-value) {
  color: #2c3e50;
}

/* 强调文字 */
.resume-html :deep(strong),
.resume-html :deep(b) {
  font-weight: 650;
  color: #1a1a1a;
}

/* 兜底：当后端/旧 DOCX 把标题做成整段加粗时，将其提升为伪标题 */
.resume-html :deep(p:has(> strong:only-child, > b:only-child)) {
  margin: 14px 0 6px;
  font-size: 16px;
}

.resume-html :deep(p:has(> strong:only-child, > b:only-child)) strong,
.resume-html :deep(p:has(> strong:only-child, > b:only-child)) b {
  color: #303133;
}

/* 图片自适应 */
.resume-html :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 8px 0;
  border-radius: 4px;
}

/* 列表：缩进合理，项间距紧凑 */
.resume-html :deep(ul),
.resume-html :deep(ol) {
  margin: 6px 0;
  padding-left: 22px;
}

.resume-html :deep(li) {
  margin: 3px 0;
  line-height: 1.65;
}

.resume-html :deep(li)::marker {
  color: #909399;
}

/* 表格：专业简洁 */
.resume-html :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
}

.resume-html :deep(th),
.resume-html :deep(td) {
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  text-align: left;
  vertical-align: top;
}

.resume-html :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
  color: #303133;
}

.resume-html :deep(tr:nth-child(even)) {
  background: #fafafa;
}

/* 链接 */
.resume-html :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.resume-html :deep(a:hover) {
  text-decoration: underline;
}

/* 水平分隔线 */
.resume-html :deep(hr) {
  border: none;
  border-top: 1px solid #e4e7ed;
  margin: 16px 0;
}

/* 代码/预格式化文本 */
.resume-html :deep(code) {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
}

.resume-html :deep(pre) {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 10px 0;
  line-height: 1.5;
}

/* 响应式：小屏设备优化 */
@media (max-width: 768px) {
  .resume-html {
    padding: 20px 16px;
    font-size: 14px;
  }

  .resume-html :deep(h1) {
    font-size: 22px;
    margin: 20px 0 10px;
  }

  .resume-html :deep(h2) {
    font-size: 18px;
    margin: 16px 0 8px;
  }

  .resume-html :deep(h3) {
    font-size: 16px;
    margin: 14px 0 6px;
  }

  .resume-html :deep(table) {
    font-size: 13px;
  }

  .resume-html :deep(th),
  .resume-html :deep(td) {
    padding: 6px 8px;
  }

  .resume-html :deep(.resume-label) {
    min-width: 5em;
  }

  .resume-html :deep(p:has(> strong:only-child, > b:only-child)) {
    font-size: 15px;
  }
}

/* 打印样式 */
@media print {
  .resume-html {
    max-width: none;
    padding: 0;
    color: #000;
  }
}
</style>