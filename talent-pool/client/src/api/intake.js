import api from './index.js'

// 获取候选人面试登记信息（登记表 + 联系人）
export function getCandidateIntake(candidateId) {
  return api.get(`/talent/candidates/${candidateId}/intake`)
}

// 更新候选人面试登记信息（登记表字段 + 联系人整体替换）
export function updateCandidateIntake(candidateId, data) {
  return api.put(`/talent/candidates/${candidateId}/intake`, data)
}
