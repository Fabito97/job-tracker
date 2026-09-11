const baseUrl = import.meta.env.VITE_API_URL ?? ''

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })

  if (!response.ok) throw new Error((await response.text()) || response.statusText)

  return response.json() as Promise<T>
}

/** Builds a query string, dropping the filters the user left blank. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }

  return search.toString()
}
