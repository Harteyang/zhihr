<template>
  <div class="pdf-preview-container">
    <div v-if="loading" class="pdf-loading">
      <el-icon class="is-loading" size="32"><Loading /></el-icon>
      <span>正在加载 PDF...</span>
    </div>
    <canvas v-show="!loading && !error" ref="canvasRef" class="pdf-canvas" />
    <div v-if="error" class="pdf-error">
      <el-icon><Warning /></el-icon>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  src: {
    type: String,
    default: ''
  }
})

const canvasRef = ref(null)
const loading = ref(false)
const error = ref('')
let pdfDoc = null
let scale = 2

async function loadPdf() {
  if (!props.src) return
  
  loading.value = true
  error.value = ''
  
  try {
    const pdfjs = await import('pdfjs-dist')
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.js')
    
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default
    
    const arrayBuffer = await fetch(props.src).then(res => res.arrayBuffer())
    pdfDoc = await pdfjs.getDocument({ data: arrayBuffer, disableFontFace: true }).promise
    
    loading.value = false
    await nextTick()
    await renderAllPages()
  } catch (e) {
    error.value = 'PDF 加载失败，请尝试下载后查看'
    console.error('PDF loading error:', e)
  } finally {
    loading.value = false
  }
}

async function renderAllPages() {
  if (!pdfDoc || !canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const pageCount = pdfDoc.numPages
  
  const pages = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i)
    pages.push(page)
  }
  
  const viewport = pages[0].getViewport({ scale })
  const pageWidth = viewport.width
  const pageHeight = viewport.height
  
  let totalHeight = 0
  for (const page of pages) {
    const vp = page.getViewport({ scale })
    totalHeight += vp.height
  }
  
  canvas.width = pageWidth
  canvas.height = totalHeight
  
  let currentY = 0
  for (const page of pages) {
    const vp = page.getViewport({ scale })
    await page.render({
      canvasContext: ctx,
      viewport: vp,
      transform: [1, 0, 0, 1, 0, currentY]
    }).promise
    currentY += vp.height
  }
}

function handleResize() {
  if (pdfDoc && !loading.value) {
    const container = canvasRef.value?.parentElement
    if (container) {
      const maxWidth = container.clientWidth - 48
      const pdfWidth = pdfDoc.numPages > 0 ? pdfDoc.getPage(1).then(p => p.getViewport({ scale }).width) : 800
      pdfWidth.then(w => {
        if (w > maxWidth) {
          scale = maxWidth / w
        } else {
          scale = 1
        }
        renderAllPages()
      })
    }
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

.pdf-canvas {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pdf-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-danger);
  padding: 20px;
}
</style>