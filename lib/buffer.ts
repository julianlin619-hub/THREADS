export async function postToBuffer(text: string): Promise<{ id: string; status: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const profileId = process.env.BUFFER_THREADS_PROFILE_ID;

  if (!token || !profileId) {
    throw new Error('BUFFER_ACCESS_TOKEN and BUFFER_THREADS_PROFILE_ID must be set in .env.local');
  }

  const body = new URLSearchParams({
    access_token: token,
    'profile_ids[]': profileId,
    text,
    now: 'false',
  });

  const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Buffer API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { id?: string; updates?: { id: string }[] };

  // Buffer returns either { id } or { updates: [{ id }] }
  const id = data.id ?? data.updates?.[0]?.id ?? 'unknown';
  return { id, status: 'queued' };
}
