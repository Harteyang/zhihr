<template>
  <div class="pdf-preview-container">
    <div v-if="loading" class="pdf-loading">
      <el-icon class="is-loading" size="32"><Loading /></el-icon>
      <span>正在加载 PDF...</span>
    </div>
    <div v-show="!loading && !error" class="pdf-pages-container" ref="pagesContainerRef">
      <canvas 
        v-for="page in pageCanvases" 
        :key="page.pageNum" 
        :ref="el => setCanvasRef(page.pageNum, el)"
        class="pdf-canvas"
      />
    </div>
    <div v-if="error" class="pdf-error">
      <el-icon><Warning /></el-icon>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({
  src: {
    type: String,
    default: ''
  }
})

const pagesContainerRef = ref(null)
const canvasRefs = ref({})
const pageCanvases = ref([])
const loading = ref(false)
const error = ref('')
let pdfDoc = null
let currentScale = 1.5
let baseViewport = null
let isRendering = false

const MIN_SCALE = 0.6
const MAX_SCALE = 2.0

function setCanvasRef(pageNum, el) {
  if (el) {
    canvasRefs.value[pageNum] = el
  }
}

function computeScaleForContainer(containerWidth) {
  if (!baseViewport || !containerWidth) return 1.5
  const padding = 48
  const availableWidth = containerWidth - padding
  // 保留一点边距，不要让 canvas 完全贴边
  const targetWidth = Math.min(availableWidth, baseViewport.width)
  const scale = targetWidth / baseViewport.width
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
}

async function loadPdf() {
  if (!props.src) return

  loading.value = true
  error.value = ''
  isRendering = false

  try {
    const arrayBuffer = await fetch(props.src).then(res => res.arrayBuffer())
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    // 以 scale=1 获取基准 viewport，用于后续响应式缩放计算
    const firstPage = await pdfDoc.getPage(1)
    baseViewport = firstPage.getViewport({ scale: 1 })

    // 根据容器宽度计算初始缩放
    const container = pagesContainerRef.value
    const containerWidth = container ? container.clientWidth : window.innerWidth
    currentScale = computeScaleForContainer(containerWidth)

    const pageCount = pdfDoc.numPages
    pageCanvases.value = Array.from({ length: pageCount }, (_, i) => ({ pageNum: i + 1 }))

    loading.value = false
    await nextTick()
    await renderPages()
  } catch (e) {
    error.value = 'PDF 加载失败，请尝试下载后查看'
    console.error('PDF loading error:', e)
  } finally {
    loading.value = false
  }
}

async function renderPages() {
  if (!pdfDoc || isRendering) return
  isRendering = true

  const pageCount = pdfDoc.numPages
  const devicePixelRatio = window.devicePixelRatio || 1

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfDoc.getPage(i)
      const viewport = page.getViewport({ scale: currentScale })

      const canvas = canvasRefs.value[i]
      if (!canvas) continue

      canvas.width = Math.floor(viewport.width * devicePixelRatio)
      canvas.height = Math.floor(viewport.height * devicePixelRatio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const ctx = canvas.getContext('2d')
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise
    }
  } finally {
    isRendering = false
  }
}

function handleResize() {
  if (!pdfDoc || !baseViewport || loading.value || isRendering) return

  const container = pagesContainerRef.value
  if (!container) return

  const newScale = computeScaleForContainer(container.clientWidth)

  if (Math.abs(newScale - currentScale) > 0.02) {
    currentScale = newScale
    renderPages()
  }
}

watch(() => props.src, () => {
  loadPdf()
})

onMounted(() => {
  loadPdf()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (pdfDoc) {
    pdfDoc.destroy()
    pdfDoc = null
  }
})
</script>

<style scoped>
.pdf-preview-container {
  width: 100%;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  border-radius: 8px;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
}

.pdf-pages-container {
  width: 100%;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pdf-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.pdf-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-danger);
  padding: 20px;
}

@media (max-width: 768px) {
  .pdf-pages-container {
    padding: 16px 8px;
    gap: 12px;
  }
}
</style>