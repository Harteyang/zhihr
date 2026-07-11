<template>
  <el-select :model-value="modelValue" @change="$emit('update:modelValue', $event)" :size="size" :disabled="disabled">
    <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
  </el-select>
</template>

<script setup>
import { STATUS_OPTIONS } from '../utils/constants'

defineProps({
  modelValue: String,
  size: { type: String, default: 'default' },
  disabled: Boolean
})
defineEmits(['update:modelValue'])
</script>
