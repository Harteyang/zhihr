import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCandidates, getFilterOptions } from '../api'

export const useCandidateStore = defineStore('candidate', () => {
  const candidates = ref([])
  const total = ref(0)
  const filterOptions = ref({ positions: [], sources: [] })
  const loading = ref(false)

  async function fetchList(params) {
    loading.value = true
    try {
      const res = await getCandidates(params)
      candidates.value = res.data.data
      total.value = res.data.total
    } finally {
      loading.value = false
    }
  }

  async function fetchFilterOptions() {
    const res = await getFilterOptions()
    filterOptions.value = res.data.data
  }

  return { candidates, total, filterOptions, loading, fetchList, fetchFilterOptions }
})
