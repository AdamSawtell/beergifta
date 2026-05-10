/** Public site URL for links and QR (optional env override for staging). */
export function getShareSiteUrl(): string {
  const raw = import.meta.env.VITE_SITE_URL?.trim()
  let url = raw && raw.length > 0 ? raw : 'https://beergifta.com'
  url = url.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}
