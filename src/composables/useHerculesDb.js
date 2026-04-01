import { HERCULES_ITEM_DB_URL, HERCULES_MOB_DB_URL } from '@/constants/appConstants'

let herculesDbCacheById = null
let herculesDbCacheList = null
let herculesItemDbCache = null

export const toValidNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const parseDropRate = (rate) => {
  if (typeof rate === 'number') return rate
  if (typeof rate !== 'string') return 0

  const clean = rate.replace('%', '').trim()
  if (clean.includes('~')) {
    const parts = clean.split('~').map((part) => toValidNumber(part.trim())).filter((part) => part !== null)
    if (parts.length === 2) {
      return (parts[0] + parts[1]) / 2
    }
  }

  const asNumber = toValidNumber(clean)
  return asNumber === null ? 0 : asNumber
}

export const normalizeAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return ''
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url
}

export const formatLabel = (value) => {
  if (!value || typeof value !== 'string') return '-'
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const normalizeItemKey = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeMonsterKey = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const parseHerculesItemDb = (raw) => {
  if (!raw || typeof raw !== 'string') return {}

  const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  const withoutLineComments = withoutBlockComments
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')

  const marker = 'item_db: ('
  const markerIndex = withoutLineComments.indexOf(marker)
  if (markerIndex === -1) return {}

  const body = withoutLineComments.slice(markerIndex + marker.length)
  const entries = []
  let depth = 0
  let start = -1

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        entries.push(body.slice(start, i + 1))
        start = -1
      }
    }
  }

  const byName = {}
  for (const entry of entries) {
    const idMatch = entry.match(/\bId:\s*(\d+)/)
    if (!idMatch) continue
    const itemId = Number(idMatch[1])

    const aegisMatch = entry.match(/\bAegisName:\s*"([^"]+)"/)
    const nameMatch = entry.match(/\bName:\s*"([^"]+)"/)
    const jNameMatch = entry.match(/\bJName:\s*"([^"]+)"/)

    const keys = [aegisMatch?.[1], nameMatch?.[1], jNameMatch?.[1]]
      .map((v) => normalizeItemKey(v || ''))
      .filter(Boolean)

    for (const key of keys) {
      if (!byName[key]) {
        byName[key] = itemId
      }
    }
  }

  return byName
}

const parseHerculesMobDb = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return { byId: {}, list: [] }
  }

  const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  const withoutLineComments = withoutBlockComments
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')

  const marker = 'mob_db: ('
  const markerIndex = withoutLineComments.indexOf(marker)
  if (markerIndex === -1) {
    return { byId: {}, list: [] }
  }

  const body = withoutLineComments.slice(markerIndex + marker.length)
  const entries = []
  let depth = 0
  let start = -1

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        entries.push(body.slice(start, i + 1))
        start = -1
      }
    }
  }

  const byId = {}
  const list = []

  for (const entry of entries) {
    const idMatch = entry.match(/\bId:\s*(\d+)/)
    if (!idMatch) continue
    const id = idMatch[1]

    const nameMatch = entry.match(/\bName:\s*"([^"]+)"/)
    const spriteMatch = entry.match(/\bSpriteName:\s*"([^"]+)"/)
    const jNameMatch = entry.match(/\bJName:\s*"([^"]+)"/)
    const dexMatch = entry.match(/\bStats:\s*\{[\s\S]*?\bDex:\s*(\d+)/)
    const dropsBlockMatch = entry.match(/\bDrops:\s*\{([\s\S]*?)\n\s*\}/)

    const drops = []
    if (dropsBlockMatch?.[1]) {
      const dropLines = dropsBlockMatch[1].split('\n')
      for (const line of dropLines) {
        const dm = line.match(/^\s*([A-Za-z0-9_]+):\s*([\d.]+)/)
        if (!dm) continue
        const dropName = dm[1]
        const dropRateRaw = toValidNumber(dm[2])
        if (dropRateRaw === null) continue
        drops.push({
          name: dropName,
          rate: dropRateRaw / 100,
          img: ''
        })
      }
    }

    const mob = {
      monster_id: Number(id),
      monster_info: nameMatch?.[1] || spriteMatch?.[1] || `Mob ${id}`,
      alt_name: jNameMatch?.[1] || '',
      sprite_name: spriteMatch?.[1] || '',
      main_atb: {
        dex: toValidNumber(dexMatch?.[1]) ?? 0
      },
      drops
    }

    byId[id] = mob
    list.push(mob)
  }

  return { byId, list }
}

export const useHerculesDb = () => {
  const ensureHerculesItemDb = async () => {
    if (herculesItemDbCache) return herculesItemDbCache

    const response = await fetch(HERCULES_ITEM_DB_URL, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('No se pudo descargar item_db de Hercules')
    }

    const raw = await response.text()
    herculesItemDbCache = parseHerculesItemDb(raw)
    return herculesItemDbCache
  }

  const getHerculesItemImage = (dropName, itemDbByName) => {
    const key = normalizeItemKey(dropName)
    const itemId = itemDbByName?.[key]
    if (!itemId) return ''
    return `https://db.irowiki.org/image/item/${itemId}.png`
  }

  const ensureHerculesDb = async () => {
    if (herculesDbCacheById && herculesDbCacheList) {
      return { byId: herculesDbCacheById, list: herculesDbCacheList }
    }

    const response = await fetch(HERCULES_MOB_DB_URL, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('No se pudo descargar la DB de Hercules')
    }
    const raw = await response.text()
    const parsed = parseHerculesMobDb(raw)
    herculesDbCacheById = parsed.byId
    herculesDbCacheList = parsed.list
    return parsed
  }

  const findMonsterInHerculesDb = async (query) => {
    const { byId, list } = await ensureHerculesDb()
    if (/^\d+$/.test(query)) {
      return byId[query] || null
    }

    const q = normalizeMonsterKey(query)
    if (!q) return null

    const exact = list.find((mob) => {
      const n1 = normalizeMonsterKey(mob.monster_info)
      const n2 = normalizeMonsterKey(mob.sprite_name)
      const n3 = normalizeMonsterKey(mob.alt_name)
      return n1 === q || n2 === q || n3 === q
    })
    if (exact) return exact

    const contains = list.filter((mob) => {
      const n1 = normalizeMonsterKey(mob.monster_info)
      const n2 = normalizeMonsterKey(mob.sprite_name)
      const n3 = normalizeMonsterKey(mob.alt_name)
      return n1.includes(q) || n2.includes(q) || n3.includes(q) || q.includes(n1)
    })

    if (!contains.length) return null
    contains.sort((a, b) => {
      const an = normalizeMonsterKey(a.monster_info)
      const bn = normalizeMonsterKey(b.monster_info)
      return Math.abs(an.length - q.length) - Math.abs(bn.length - q.length)
    })
    return contains[0]
  }

  const fetchMonsterVisualDataById = async (monsterId) => {
    const endpoint = `/api/ragnapi/v1/old-times/monsters/${encodeURIComponent(monsterId)}`
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (!response.ok) {
      return { gif: '', drops: [] }
    }
    const text = await response.text()
    if (!text || !text.trim()) {
      return { gif: '', drops: [] }
    }

    try {
      const data = JSON.parse(text)
      const drops = Array.isArray(data?.drops) ? data.drops : []
      return {
        gif: normalizeAssetUrl(data?.gif || ''),
        drops
      }
    } catch {
      return { gif: '', drops: [] }
    }
  }

  const mergeDropImagesFromApi = (herculesDrops, apiDrops) => {
    if (!Array.isArray(herculesDrops) || !Array.isArray(apiDrops)) return herculesDrops

    const imageBuckets = {}
    for (const apiDrop of apiDrops) {
      const key = normalizeItemKey(apiDrop?.name)
      if (!key) continue
      const img = normalizeAssetUrl(apiDrop?.img || '')
      if (!img) continue
      if (!imageBuckets[key]) imageBuckets[key] = []
      imageBuckets[key].push(img)
    }

    const keyUsage = {}
    return herculesDrops.map((drop) => {
      if (drop?.img) {
        return { ...drop, img: normalizeAssetUrl(drop.img) }
      }

      const key = normalizeItemKey(drop?.name)
      if (!key || !imageBuckets[key]?.length) {
        return { ...drop, img: '' }
      }

      const currentIndex = keyUsage[key] || 0
      const pickedImage = imageBuckets[key][currentIndex] || imageBuckets[key][0] || ''
      keyUsage[key] = currentIndex + 1

      return {
        ...drop,
        img: pickedImage
      }
    })
  }

  return {
    ensureHerculesItemDb,
    getHerculesItemImage,
    findMonsterInHerculesDb,
    fetchMonsterVisualDataById,
    mergeDropImagesFromApi
  }
}
