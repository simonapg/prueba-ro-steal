export default async function handler(req, res) {
  const pathParts = req.query.path || []
  const path = Array.isArray(pathParts) ? pathParts.join('/') : pathParts

  const queryEntries = Object.entries(req.query).filter(([k]) => k !== 'path')
  const qs = queryEntries.length ? '?' + new URLSearchParams(Object.fromEntries(queryEntries)).toString() : ''

  const url = `https://ratemyserver.net/${path}${qs}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })
    const text = await response.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(response.status).send(text)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from RateMyServer', detail: error.message })
  }
}
