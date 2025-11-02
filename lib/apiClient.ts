// Utility functions for making API requests

function getAuthToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Do not auto-redirect here; let the caller handle auth failures so UI can show messages
  // But keep behavior easily changeable if needed
  // if (response.status === 401) { ... }

  return response
}

export async function get(url: string) {
  return fetchWithAuth(url)
}

export async function post(url: string, data: any) {
  return fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function patch(url: string, data: any) {
  return fetchWithAuth(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function del(url: string) {
  return fetchWithAuth(url, {
    method: 'DELETE',
  })
}

export default {
  get,
  post,
  patch,
  delete: del,
  fetchWithAuth,
}