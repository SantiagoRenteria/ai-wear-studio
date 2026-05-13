const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function uploadAsset(designId: string, blob: Blob, token: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'asset');

  const res = await fetch(`${API_BASE}/api/v1/designs/${designId}/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Asset upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { assetId: string; url: string };
  return data.url;
}
