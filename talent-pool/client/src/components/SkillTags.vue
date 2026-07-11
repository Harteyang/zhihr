<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
      <el-tag v-for="tag in modelValue" :key="tag" closable @close="removeTag(tag)" size="default">
        {{ tag }}
      </el-tag>
    </div>
    <el-input
      v-if="inputVisible"
      ref="inputRef"
      v-model="inputValue"
      size="small"
      style="width: 150px;"
      placeholder="输入后回车"
      @keyup.enter="addTag"
      @blur="addTag"
    />
    <el-button v-else size="small" @click="showInput">+ 添加技能</el-button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({ modelValue: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])

const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref(null)

function showInput() {
  inputVisible.value = true
  nextTick(() => inputRef.value?.focus())
}

function addTag() {
  const val = inputValue.value.trim()
  if (val && !props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
  }
  inputValue.value = ''
  inputVisible.value = false
}

function removeTag(tag) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}
</script>
