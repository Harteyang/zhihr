import { useAuthStore } from '@/stores/auth'
import { generateId } from './utils'

export interface UserCustomItem {
  id: string
  label: string
  placeholder: string
}

const CUSTOM_ITEMS_PREFIX = 'zh_dim_custom_'
const REMOVED_ITEMS_PREFIX = 'zh_dim_removed_'

function getUserIdentifier(): string {
  const { userId } = useAuthStore.getState()
  if (userId) return userId
  let guestId = localStorage.getItem('zhihr_guest_id')
  if (!guestId) {
    guestId = `guest_${generateId()}`
    localStorage.setItem('zhihr_guest_id', guestId)
  }
  return guestId
}

export function loadCustomItems(dimKey: string): UserCustomItem[] {
  const uid = getUserIdentifier()
  const key = `${CUSTOM_ITEMS_PREFIX}${uid}_${dimKey}`
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveCustomItems(dimKey: string, items: UserCustomItem[]): void {
  const uid = getUserIdentifier()
  localStorage.setItem(`${CUSTOM_ITEMS_PREFIX}${uid}_${dimKey}`, JSON.stringify(items))
}

export function loadRemovedItemIds(dimKey: string): string[] {
  const uid = getUserIdentifier()
  const key = `${REMOVED_ITEMS_PREFIX}${uid}_${dimKey}`
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveRemovedItemIds(dimKey: string, ids: string[]): void {
  const uid = getUserIdentifier()
  localStorage.setItem(`${REMOVED_ITEMS_PREFIX}${uid}_${dimKey}`, JSON.stringify(ids))
}
