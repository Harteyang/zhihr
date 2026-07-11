<template>
  <div style="border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-weight: 500;">{{ experience.company || '新工作经历' }}</span>
      <el-button type="danger" link size="small" @click="$emit('remove')">
        <el-icon><Delete /></el-icon> 删除
      </el-button>
    </div>
    <el-form label-width="80px" size="default">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="公司" required>
            <el-input v-model="experience.company" placeholder="公司名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="职位" required>
            <el-input v-model="experience.title" placeholder="职位名称" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="开始时间">
            <el-input v-model="experience.start_date" placeholder="如 2020-03" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间">
            <el-input v-model="experience.end_date" placeholder="留空表示在职" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="工作描述">
        <el-input v-model="experience.description" type="textarea" :rows="2" placeholder="工作内容描述" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue'

defineProps({ experience: { type: Object, required: true } })
defineEmits(['remove'])
</script>
