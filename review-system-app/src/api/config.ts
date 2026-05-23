import { apiRequest } from './client'

interface ConfigResponse {
  success: boolean
  data: { config: string | null }
}

export async function getConfig(): Promise<ConfigResponse> {
  return apiRequest('/api/config')
}

export async function updateConfig(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/config', {
    method: 'PUT',
    body: { config },
  })
}
