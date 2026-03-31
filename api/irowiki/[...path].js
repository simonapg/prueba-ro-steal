export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const pathParts = req.query.path || []
  const path = Array.isArray(pathParts) ? pathParts.join('/') : pathParts

  const queryEntries = Object.entries(req.query).filter(([k]) => k !== 'path')
  const qs = queryEntries.length
    ? '?' + queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : ''

  const url = `https://db.irowiki.org/${path}${qs}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://db.irowiki.org/'
      }
    })

    const text = await response.text()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(response.status).send(text)
  } catch (error) {
    console.error('[irowiki] Fetch error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch from iROWiki', detail: error.message })
  }
}
