import type { AuthTokens } from '../types'
import { apiRequest } from './client'

export function login(username: string, password: string) {
  return apiRequest<AuthTokens>('/auth/login/', {
    method: 'POST',
    body: { username, password },
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ detail: string }>('/auth/change-password/', {
    method: 'POST',
    auth: true,
    body: { current_password: currentPassword, new_password: newPassword },
  })
}
