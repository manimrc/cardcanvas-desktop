export type MediaKind = 'image' | 'pdf' | 'link' | 'audio' | 'video';

export function inferMediaType(url: string, mimeHint?: string): MediaKind {
  if (mimeHint) {
    if (mimeHint.startsWith('image/')) return 'image';
    if (mimeHint === 'application/pdf') return 'pdf';
    if (mimeHint.startsWith('audio/')) return 'audio';
    if (mimeHint.startsWith('video/')) return 'video';
  }
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpe?g|gif|png|webp|svg|bmp|ico)$/.test(path)) return 'image';
  if (/\.pdf$/i.test(path)) return 'pdf';
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(path)) return 'audio';
  if (/\.(mp4|webm|ogv|mov)$/i.test(path)) return 'video';
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return 'link';
  if (t.startsWith('media://') || t.startsWith('asset://')) {
    if (mimeHint?.includes('pdf')) return 'pdf';
    if (mimeHint?.startsWith('image/')) return 'image';
    if (mimeHint?.startsWith('audio/')) return 'audio';
    if (mimeHint?.startsWith('video/')) return 'video';
    return 'image';
  }
  return 'link';
}
