export async function api<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); }
    catch { throw new Error('计算服务暂时不可用。请确认后端已启动，然后重新计算。'); }
    if (!response.ok) {
      const error = data as { error?: string; message?: string; details?: unknown[] };
      throw new Error([error.error || error.message || '请求失败', ...(error.details || []).map(String)].join(' · '));
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('计算超时，请缩小搜索范围后重试。');
    if (error instanceof TypeError) throw new Error('无法连接本地计算服务，请确认后端服务正在运行。');
    throw error;
  } finally { clearTimeout(timeout); }
}

export function download(content: string, filename: string, mime: string) {
  const href = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function toCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+@\t\r]/.test(raw) || (/^-/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw)) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
