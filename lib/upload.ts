export async function uploadImage(file: File, groupId: string, workshopId: string, voiceId?: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('group_id', groupId);
  form.append('workshop_id', workshopId);
  if (voiceId) form.append('voice_id', voiceId);

  const res = await fetch(`/api/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
