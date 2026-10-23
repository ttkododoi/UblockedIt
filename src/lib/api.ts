export type Json = any;

const jsonHeaders = { 'content-type': 'application/json' };

async function handle<T = Json>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err: any = new Error((data && data.message) || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = Json>(url: string) => fetch(url, { credentials: 'include' }).then((r) => handle<T>(r)),
  post: <T = Json>(url: string, body?: any) =>
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: jsonHeaders,
      body: JSON.stringify(body ?? {}),
    }).then((r) => handle<T>(r)),
  patch: <T = Json>(url: string, body?: any) =>
    fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers: jsonHeaders,
      body: JSON.stringify(body ?? {}),
    }).then((r) => handle<T>(r)),
  del: <T = Json>(url: string) =>
    fetch(url, { method: 'DELETE', credentials: 'include' }).then((r) => handle<T>(r)),
  upload: <T = Json>(url: string, file: File, field = 'apk', onProgress?: (pct: number) => void) =>
    new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(Object.assign(new Error(data?.message || 'Upload failed'), { status: xhr.status, data }));
        } catch (err) {
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Network error while uploading'));
      const form = new FormData();
      form.append(field, file);
      xhr.send(form);
    }),
};

export const fmt = {
  num: (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  },
  bytes: (n: number) => {
    if (!n) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
  },
  ago: (iso: string) => {
    const t = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').getTime();
    const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(t).toLocaleDateString();
  },
};
