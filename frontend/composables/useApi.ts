export function useApi() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase as string;

  async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    const token = useCookie('auth_token').value;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await $fetch.raw<T>(`${baseURL}${path}`, {
      ...options,
      headers,
    });

    return { data: res._data as T, status: res.status };
  }

  return { apiFetch, baseURL };
}
