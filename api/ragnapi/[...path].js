export default async function handler(req, res) {
  const pathParts = req.query.path || []
  const path = Array.isArray(pathParts) ? pathParts.join('/') : pathParts

  const queryEntries = Object.entries(req.query).filter(([k]) => k !== 'path')
  const qs = queryEntries.length ? '?' + new URLSearchParams(Object.fromEntries(queryEntries)).toString() : ''

  const url = `https://ragnapi.com/${path}${qs}`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    })
    const data = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from RagnAPI', detail: error.message })
  }
}
