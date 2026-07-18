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
let currentScale = 2
let firstPageViewport = null

function setCanvasRef(pageNum, el) {
  if (el) {
    canvasRefs.value[pageNum] = el
  }
}

async function loadPdf() {
  if (!props.src) return

  loading.value = true
  error.value = ''

  try {
    const arrayBuffer = await fetch(props.src).then(res => res.arrayBuffer())
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

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
  if (!pdfDoc) return
  
  const pageCount = pdfDoc.numPages
  const devicePixelRatio = window.devicePixelRatio || 1
  
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: currentScale })
    
    if (i === 1) {
      firstPageViewport = viewport
    }
    
    const canvas = canvasRefs.value[i]
    if (!canvas) continue
    
    canvas.width = viewport.width * devicePixelRatio
    canvas.height = viewport.height * devicePixelRatio
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    
    const ctx = canvas.getContext('2d')
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise
  }
}

function handleResize() {
  if (!pdfDoc || !firstPageViewport || loading.value) return
  
  const container = pagesContainerRef.value
  if (!container) return
  
  const maxWidth = container.clientWidth - 48
  const pdfWidth = firstPageViewport.width
  
  let newScale = currentScale
  if (pdfWidth > maxWidth) {
    newScale = maxWidth / pdfWidth
  } else {
    newScale = 1
  }
  
  if (Math.abs(newScale - currentScale) > 0.01) {
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
  background: #ffffff;
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pdf-canvas {
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  max-width: 100%;
  height: auto;
}

.pdf-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-danger);
  padding: 20px;
}
</style>