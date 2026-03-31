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

  const url = `https://ragnapi.com/api/${path}${qs}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://ragnapi.com',
        'Referer': 'https://ragnapi.com/'
      }
    })

    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error('[ragnapi] Non-JSON response:', text.slice(0, 200))
      return res.status(502).json({ error: 'Invalid JSON from RagnAPI', raw: text.slice(0, 200) })
    }

    return res.status(response.status).json(data)
  } catch (error) {
    console.error('[ragnapi] Fetch error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch from RagnAPI', detail: error.message })
  }
}
