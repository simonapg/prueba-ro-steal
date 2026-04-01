<template>
  <div id="app" :style="{ backgroundImage: `url(${bgImage})` }">
    <div class="app-wrapper">
      <div class="logo-wrapper">
        <img :src="roLogo" alt="Ragnarok Online" class="ro-logo" />
      </div>
      <div class="container">
      <div class="novice-character">
        <img :src="noviceImage" alt="Novice" class="novice-img" />
      </div>
      <h1 class="title-16bit">Calculadora de Steal - Ragnarok Online</h1>
      <p class="subtitle">Formula Hercules: StealBase = floor((DEX user - DEX mob)/2) + 6xSkill + 4 | Chance slot = (StealBase x DropRatio)/100</p>
      
      <div class="calculator">
        <div class="input-group">
          <label for="userDex">DEX del Usuario:</label>
          <input 
            v-model.number="userDex" 
            type="number" 
            id="userDex" 
            placeholder="Ej: 80"
          >
        </div>

        <div class="input-group">
          <label for="monsterDex">DEX del Monstruo:</label>
          <input 
            v-model.number="monsterDex" 
            type="number" 
            id="monsterDex" 
            placeholder="Ej: 50"
          >
        </div>

        <div class="input-group">
          <label for="skillLevel">Nivel de Steal:</label>
          <input 
            v-model.number="skillLevel" 
            type="number" 
            id="skillLevel" 
            placeholder="Ej: 10"
            min="1"
            max="10"
          >
        </div>
      </div>

      <div class="manual-slots-section">
        <h2>Simulador Manual por Slots</h2>
        <p class="manual-slots-subtitle">
          Agrega slots manualmente con su % de drop para simular el orden de Steal cuando el monstruo no existe en la base.
        </p>

        <div class="manual-slot-controls">
          <div class="input-group">
            <label for="manualSlotChance">Chance del nuevo slot (%):</label>
            <input
              v-model.number="manualSlotChance"
              type="number"
              id="manualSlotChance"
              placeholder="Ej: 12.5"
              min="0"
              max="100"
            >
          </div>
          <button type="button" class="manual-slot-btn" @click="addManualSlot">Agregar Slot</button>
        </div>

        <p v-if="manualSlotsError" class="manual-slot-error">{{ manualSlotsError }}</p>

        <div v-if="manualSlots.length" class="manual-slot-strip-wrap">
          <div class="manual-slot-strip">
            <button
              type="button"
              class="manual-slot-chip"
              v-for="(slot, idx) in manualSlots"
              :key="slot.id"
              :title="`Slot #${idx + 1} · ${Number(slot.rate || 0).toFixed(2)}%`"
              @click="removeManualSlot(idx)"
            >
              <img :src="poringCoinImage" alt="Slot" class="manual-slot-chip-icon" />
              <span class="manual-slot-chip-index">#{{ idx + 1 }}</span>
              <span class="manual-slot-chip-rate">{{ Number(slot.rate || 0).toFixed(2) }}%</span>
              <span class="manual-slot-chip-remove">✕</span>
            </button>
          </div>
          <p class="manual-slot-strip-hint">Haz clic en un icono para quitar ese slot.</p>
        </div>

        <div v-if="manualSlotResults.length" class="manual-slot-results">
          <h3>Resultado Encadenado por Slot</h3>
          <div class="drop-list">
            <div
              v-for="slot in manualSlotResults"
              :key="slot.uniqueKey"
              class="drop-card result-box"
              :class="resultTierClass(slot.isLastSlot ? 0 : slot.adjustedChance)"
            >
              <div class="drop-card-left">
                <div class="drop-card-copy">
                  <p class="drop-name">#{{ slot.slotIndex }} · Slot Manual</p>
                  <div class="drop-meta-row">
                    <p class="drop-base">DropRatio: {{ slot.targetRate.toFixed(2) }}%</p>
                    <div class="result-gif-shell drop-tier-gif">
                      <img :src="resultGifFor(slot.isLastSlot ? 0 : slot.adjustedChance)" alt="Tier de chance" class="result-gif-inline" />
                    </div>
                  </div>
                  <p class="drop-rate-flow">Steal base (Hercules): {{ slot.stealBaseChance.toFixed(2) }}% · Drop check: {{ slot.itemCheckChance.toFixed(2) }}%</p>
                  <p class="drop-rate-flow">Roll drop: {{ slot.itemRollThreshold }} / 10000 · Roll steal: {{ slot.stealRollThreshold }} / 10000</p>
                  <p class="drop-rate-flow">Chance de llegar a este slot: {{ slot.reachChance.toFixed(2) }}% · Chance local: {{ slot.slotChanceLocal.toFixed(2) }}%</p>
                  <p class="drop-adjusted" v-if="!slot.isLastSlot">Chance Steal final (encadenada): {{ slot.slotFinalChance.toFixed(2) }}%</p>
                  <p class="drop-adjusted" v-else>Ultimo slot: 0% (no robable)</p>
                </div>
              </div>
            </div>
          </div>

          <div class="steal-summary">
            <p><strong>Probabilidad total de robar algun slot:</strong> {{ manualStealSummary.totalStealChance.toFixed(2) }}%</p>
            <p><strong>Probabilidad de no robar nada:</strong> {{ manualStealSummary.noStealChance.toFixed(2) }}%</p>
          </div>
        </div>
      </div>

      <div class="monster-search-section">
        <div class="novice-character-right">
          <img :src="noviceImageRight" alt="Novice" class="novice-img" />
        </div>
        <h2 class="title-16bit">Buscador de Drops por Monstruo (Pre-Renewal)</h2>
        <p class="monster-search-subtitle">
          Buscas un monstruo en especifico? Escribe el nombre o ID y te mostramos sus drops con la chance ajustada de Steal segun tus stats.
        </p>

        <form class="monster-search-form" @submit.prevent="searchMonsterDrops">
          <div class="monster-inputs">
            <div class="input-group monster-query-group">
              <label for="monsterQuery">Nombre o ID del Monstruo:</label>
              <input
                v-model.trim="monsterQuery"
                type="text"
                id="monsterQuery"
                placeholder="Ej: scorpion o 1001"
              >
            </div>

            <div class="input-group" :class="{ 'input-group-invalid': monsterFieldErrors.userDex }">
              <label for="monsterUserDex">Cuanta dex tienes en total?</label>
              <input
                v-model.number="monsterUserDex"
                type="number"
                id="monsterUserDex"
                placeholder="Ej: 80"
              >
            </div>

            <div class="input-group" :class="{ 'input-group-invalid': monsterFieldErrors.skillLevel }">
              <label for="monsterSkillLevel">Nivel de skill Steal?</label>
              <input
                v-model.number="monsterSkillLevel"
                type="number"
                id="monsterSkillLevel"
                placeholder="Ej: 10"
                min="1"
                max="10"
              >
            </div>

          </div>

          <button type="submit" class="monster-search-btn" :disabled="isMonsterLoading">
            {{ isMonsterLoading ? 'Buscando...' : 'Buscar Monstruo' }}
          </button>
        </form>

        <p v-if="monsterError" class="monster-error">{{ monsterError }}</p>

        <div v-if="monsterData" class="monster-result-wrap">
          <div class="monster-header">
            <img :src="monsterData.gif" :alt="monsterData.monster_info" class="monster-thumb" />
            <div class="monster-meta">
              <h3>{{ formatLabel(monsterData.monster_info) }}</h3>
              <p>ID: {{ monsterData.monster_id }}</p>
            </div>
          </div>

          <div class="drop-list">
            <div
              v-for="drop in monsterDropResults"
              :key="drop.uniqueKey"
              class="drop-card result-box"
              :class="resultTierClass(drop.isLastSlot ? 0 : drop.adjustedChance)"
            >
              <div class="drop-card-left">
                <img v-if="drop.img" :src="normalizeAssetUrl(drop.img)" :alt="drop.name" class="drop-item-thumb" />
                <div class="drop-card-copy">
                    <p class="drop-name">#{{ drop.slotIndex }} · {{ formatLabel(drop.name) }}</p>
                  <div class="drop-meta-row">
                    <p class="drop-base">DropRatio formula x{{ drop.targetMultiplier }}: {{ drop.targetRate.toFixed(2) }}%</p>
                    <div class="result-gif-shell drop-tier-gif">
                      <img :src="resultGifFor(drop.isLastSlot ? 0 : drop.adjustedChance)" alt="Tier de chance" class="result-gif-inline" />
                    </div>
                  </div>
                    <p class="drop-adjusted" v-if="!drop.isLastSlot">Chance Steal final (encadenada): {{ drop.slotFinalChance.toFixed(2) }}%</p>
                    <p class="drop-adjusted" v-else>Ultimo slot: 0% (no robable)</p>
                </div>
              </div>
            </div>
          </div>

            <div class="steal-summary" v-if="monsterDropResults.length">
              <p><strong>Probabilidad total de robar algun item:</strong> {{ stealChainSummary.totalStealChance.toFixed(2) }}%</p>
              <p><strong>Probabilidad de no robar nada:</strong> {{ stealChainSummary.noStealChance.toFixed(2) }}%</p>
            </div>
        </div>
      </div>
    </div>
    </div>
  </div>

  <!-- Player oculto de YouTube -->
  <div v-if="isPlayerEnabled" id="yt-player" aria-hidden="true"></div>

  <div v-if="isPlayerEnabled" class="floating-media-stack">
    <div
      class="music-player"
      :class="{ minimized: isPlayerMinimized }"
      @click="handleMinimizedPlayerClick"
      :title="isPlayerMinimized ? 'Abrir reproductor' : undefined"
    >
      <div
        v-show="isMinimizedRailVisible"
        class="minimized-rail"
        :class="{ active: isPlayerMinimized }"
        :title="`${currentSongTitle} - ${currentSongAuthor}`"
      >
          <img :src="angelingGif" alt="Angeling animado" class="minimized-angeling" />
          <div class="marquee-window">
            <div class="marquee-track">
              <span class="marquee-item">{{ currentSongTitle }} · {{ currentSongAuthor }}</span>
              <span class="marquee-separator">✦</span>
              <span class="marquee-item">{{ currentSongTitle }} · {{ currentSongAuthor }}</span>
              <span class="marquee-separator">✦</span>
            </div>
          </div>
          <img :src="angelingGif" alt="Angeling animado" class="minimized-angeling" />
          <span class="minimized-toggle-indicator" aria-hidden="true">▲</span>
      </div>

      <div class="player-expanded-content" :class="{ hidden: isPlayerMinimized }">
          <div class="music-player-header">
            <button
              @click.stop="togglePlayerMinimized"
              type="button"
              class="toggle-player-btn"
              title="Minimizar reproductor"
            >
              <span aria-hidden="true">▼</span>
            </button>
          </div>

          <div class="music-player-body">
        <div class="music-player-hero">
          <div v-if="isPlaying" class="hero-equalizer hero-equalizer-left" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>

          <div class="music-hero-center">
            <img
              :src="isPlaying ? angelingGif : angelingStill"
              :alt="isPlaying ? 'Angeling animado' : 'Angeling en reposo'"
              class="job-gif"
            />

            <div class="music-now-playing">
              <p class="song-title" :title="currentSongTitle">{{ currentSongTitle }}</p>
            </div>
          </div>

          <div v-if="isPlaying" class="hero-equalizer hero-equalizer-right" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>

        <div class="music-controls-row">
          <button @click="prevSong" class="icon-btn" title="Cancion anterior">⏮</button>
          <button @click="toggleMusic" class="music-btn" :class="{ playing: isPlaying }">
            <span class="music-icon">{{ isPlaying ? '⏸' : '▶' }}</span>
            <span class="music-label">{{ isPlaying ? 'Pausar' : 'SoundTemp' }}</span>
          </button>
          <button @click="nextSong" class="icon-btn" title="Siguiente cancion">⏭</button>
        </div>

        <div class="volume-row">
          <button @click="toggleMute" class="icon-btn" title="Silenciar o activar sonido">
            {{ isMuted ? '🔇' : '🔊' }}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            v-model.number="volume"
            @input="setVolume"
            class="volume-slider"
            :style="{ '--volume-percent': `${volume}%` }"
            aria-label="Volumen"
          >
          <span class="volume-value">{{ volume }}%</span>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import bgImage from '@/assets/images/wallpaperflare-cropped.jpg'
import roLogo from '@/assets/images/Ragnarok_Online_Logo.svg'
import angelingGif from '@/assets/images/4_ANGELING.gif'
import angelingStill from '@/assets/images/4_ANGELING_static.png'
import noviceImage from '@/assets/images/noviceprueba.png'
import noviceImageRight from '@/assets/images/noviceprueba2.png'
import poringCoinImage from '@/assets/images/poring coin.JPG?url'
import gifZero from '@/assets/images/0.gif'
import gifRed from '@/assets/images/red.gif'
import gifAmarillo from '@/assets/images/amarillo.gif'
import gifAzul from '@/assets/images/azul.gif'
import gifVerde from '@/assets/images/verde.gif'

const PLAYLIST_ID = 'PL_ePhf-qAdCT8-i7apNym6qmB9giYhWp3'
const PRE_RE_TARGET_RATE = 5
const PLAYER_MIN_WIDTH = 1025
const HERCULES_MOB_DB_URL = 'https://raw.githubusercontent.com/HerculesWS/Hercules/stable/db/pre-re/mob_db.conf'

let herculesDbCacheById = null
let herculesDbCacheList = null

export default {
  name: 'App',
  setup() {
    const userDex = ref(null)
    const monsterDex = ref(null)
    const skillLevel = ref(null)
    const monsterQuery = ref('')
    const monsterUserDex = ref(null)
    const monsterSkillLevel = ref(null)
    const monsterSearchTouched = ref(false)
    const monsterFieldErrors = ref({
      userDex: false,
      skillLevel: false
    })
    const manualSlotChance = ref(null)
    const manualSlots = ref([])
    const manualSlotsError = ref('')
    const manualSlotResults = ref([])
    const manualStealSummary = ref({
      totalStealChance: 0,
      noStealChance: 100
    })
    const isMonsterLoading = ref(false)
    const monsterError = ref('')
    const monsterData = ref(null)
    const monsterDropResults = ref([])
    const stealChainSummary = ref({
      totalStealChance: 0,
      noStealChance: 100
    })
    const rateMyServerDrops = ref({})

    const toValidNumber = (value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    const parseDropRate = (rate) => {
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

    const normalizeAssetUrl = (url) => {
      if (!url || typeof url !== 'string') return ''
      return url.startsWith('http://') ? url.replace('http://', 'https://') : url
    }

    const formatLabel = (value) => {
      if (!value || typeof value !== 'string') return '-'
      return value
        .replaceAll('_', ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    const normalizeItemKey = (value) => {
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

    const isPreRenewalMode = () => true

    const herculesStealBaseChance = (dexUserValue, dexMobValue, skillLevelValue, bonus = 0) => {
      const dexUser = toValidNumber(dexUserValue)
      const dexMob = toValidNumber(dexMobValue)
      const stealLevel = toValidNumber(skillLevelValue)
      if (dexUser === null || dexMob === null || stealLevel === null) return 0

      const rawChance = Math.floor((dexUser - dexMob) / 2) + (stealLevel * 6) + 4 + bonus
      return clampPercent(rawChance)
    }

    const slotLocalChancePercent = (stealBaseChancePercent, itemDropChancePercent) => {
      return clampPercent((clampPercent(stealBaseChancePercent) * clampPercent(itemDropChancePercent)) / 100)
    }

    const clampPercent = (value) => {
      if (!Number.isFinite(value)) return 0
      return Math.max(0, Math.min(100, value))
    }

    const hasManualBaseInputs = () => {
      const dexUser = toValidNumber(userDex.value)
      const dexMob = toValidNumber(monsterDex.value)
      const stealLvl = toValidNumber(skillLevel.value)
      return !!(dexUser !== null && dexMob !== null && stealLvl !== null && stealLvl >= 1 && stealLvl <= 10)
    }

    const resolveMonsterDex = (monsterPayload) => {
      return toValidNumber(
        monsterPayload?.main_atb?.dex
        ?? monsterPayload?.dex
        ?? monsterPayload?.monster_dex
      ) ?? 0
    }

    const validateMonsterSearchInputs = () => {
      const dexUser = toValidNumber(monsterUserDex.value)
      const stealLvl = toValidNumber(monsterSkillLevel.value)

      const dexInvalid = dexUser === null || dexUser <= 0
      const skillInvalid = stealLvl === null || stealLvl < 1 || stealLvl > 10

      monsterFieldErrors.value = {
        userDex: dexInvalid,
        skillLevel: skillInvalid
      }

      return !dexInvalid && !skillInvalid
    }

    const percentToThreshold10k = (percent) => {
      const clamped = clampPercent(percent)
      return Math.round(clamped * 100)
    }

    const refreshMonsterDropResults = () => {
      if (!monsterData.value || !Array.isArray(monsterData.value.drops)) {
        monsterDropResults.value = []
        stealChainSummary.value = {
          totalStealChance: 0,
          noStealChance: 100
        }
        return
      }

      let remainingChance = 1
      const monsterDexValue = resolveMonsterDex(monsterData.value)
      const stealBaseChance = herculesStealBaseChance(
        monsterUserDex.value,
        monsterDexValue,
        monsterSkillLevel.value
      )
      const dropsWithCoin = [
        {
          name: 'poring_coin',
          img: poringCoinImage,
          rate: 5,
          isSynthetic: true
        },
        ...monsterData.value.drops
      ]

      monsterDropResults.value = dropsWithCoin.map((drop, index) => {
        const rawRate = parseDropRate(drop.rate)
        const vanillaRate = rawRate
        const targetMultiplier = drop.isSynthetic
          ? 1
          : (isPreRenewalMode() ? PRE_RE_TARGET_RATE : 1)
        const targetRateRaw = vanillaRate * targetMultiplier
        const targetRate = Math.min(targetRateRaw, 100)
        const isLastSlot = index === (dropsWithCoin.length - 1)
        const itemCheckChance = isLastSlot ? 0 : targetRate
        const slotChanceLocal = slotLocalChancePercent(stealBaseChance, itemCheckChance)
        const perSlotSuccessChance = slotChanceLocal / 100
        const reachChance = remainingChance * 100
        const slotFinalChance = remainingChance * perSlotSuccessChance * 100
        remainingChance *= (1 - perSlotSuccessChance)
        return {
          ...drop,
          rawRate,
          vanillaRate,
          targetRateRaw,
          targetRate,
          targetMultiplier,
          isSynthetic: !!drop.isSynthetic,
          adjustedChance: slotFinalChance,
          slotIndex: index + 1,
          isLastSlot,
          itemCheckChance,
          stealBaseChance,
          slotChanceLocal,
          reachChance,
          slotFinalChance,
          itemRollThreshold: percentToThreshold10k(itemCheckChance),
          stealRollThreshold: percentToThreshold10k(stealBaseChance),
          uniqueKey: `${drop.name}-${drop.img || ''}-${index}`
        }
      })

      stealChainSummary.value = {
        totalStealChance: (1 - remainingChance) * 100,
        noStealChance: remainingChance * 100
      }
    }

    const refreshManualSlotResults = () => {
      if (!manualSlots.value.length) {
        manualSlotResults.value = []
        manualStealSummary.value = {
          totalStealChance: 0,
          noStealChance: 100
        }
        return
      }

      const dexUser = toValidNumber(userDex.value)
      const dexMob = toValidNumber(monsterDex.value)
      const stealLvl = toValidNumber(skillLevel.value)

      if (dexUser === null || dexMob === null || stealLvl === null || stealLvl < 1 || stealLvl > 10) {
        manualSlotResults.value = []
        manualStealSummary.value = {
          totalStealChance: 0,
          noStealChance: 100
        }
        return
      }

      const stealBaseChance = herculesStealBaseChance(dexUser, dexMob, stealLvl)
      let remainingChance = 1

      manualSlotResults.value = manualSlots.value.map((slot, index) => {
        const targetRate = clampPercent(toValidNumber(slot.rate) ?? 0)
        const isLastSlot = index === manualSlots.value.length - 1
        const itemCheckChance = isLastSlot ? 0 : targetRate
        const slotChanceLocal = slotLocalChancePercent(stealBaseChance, itemCheckChance)
        const perSlotSuccessChance = slotChanceLocal / 100
        const reachChance = remainingChance * 100
        const slotFinalChance = remainingChance * perSlotSuccessChance * 100
        remainingChance *= (1 - perSlotSuccessChance)

        return {
          id: slot.id,
          slotIndex: index + 1,
          targetRate,
          adjustedChance: slotFinalChance,
          stealBaseChance,
          itemCheckChance,
          slotChanceLocal,
          reachChance,
          slotFinalChance,
          isLastSlot,
          itemRollThreshold: percentToThreshold10k(itemCheckChance),
          stealRollThreshold: percentToThreshold10k(stealBaseChance),
          uniqueKey: `manual-${slot.id}-${index}`
        }
      })

      manualStealSummary.value = {
        totalStealChance: (1 - remainingChance) * 100,
        noStealChance: remainingChance * 100
      }
    }

    const addManualSlot = () => {
      if (!hasManualBaseInputs()) {
        manualSlotsError.value = 'Completa DEX de usuario, DEX del monstruo y nivel de Steal antes de agregar slots.'
        return
      }

      const rate = toValidNumber(manualSlotChance.value)
      if (rate === null || rate < 0 || rate > 100) {
        manualSlotsError.value = 'Ingresa una chance valida entre 0 y 100 para agregar el slot.'
        return
      }

      manualSlots.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        rate
      })
      manualSlotChance.value = null
      manualSlotsError.value = ''
      refreshManualSlotResults()
    }

    const removeManualSlot = (index) => {
      manualSlots.value.splice(index, 1)
      manualSlotsError.value = ''
      refreshManualSlotResults()
    }

    watch([monsterUserDex, monsterSkillLevel], () => {
      if (monsterSearchTouched.value) {
        validateMonsterSearchInputs()
      }
      refreshMonsterDropResults()
    })

    watch([userDex, monsterDex, skillLevel], () => {
      refreshManualSlotResults()
    })

    const buildMonsterRequestCandidates = (query) => {
      const normalized = query.trim()
      const slug = normalized.toLowerCase().replaceAll(' ', '_')
      const compact = normalized.toLowerCase().replaceAll(' ', '')
      const candidates = [normalized, slug, compact]
      return [...new Set(candidates.filter(Boolean))]
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

    const searchMonsterDrops = async () => {
      monsterSearchTouched.value = true
      monsterError.value = ''
      monsterData.value = null
      monsterDropResults.value = []
      rateMyServerDrops.value = {}

      if (!validateMonsterSearchInputs()) {
        monsterError.value = 'Antes de buscar, ingresa DEX y nivel de Steal en el bloque del buscador (1-10).'
        return
      }

      const query = monsterQuery.value.trim()
      if (!query) {
        monsterError.value = 'Ingresa un nombre o ID de monstruo.'
        return
      }

      isMonsterLoading.value = true

      try {
        const foundMonster = await findMonsterInHerculesDb(query)
        if (!foundMonster) {
          monsterError.value = 'No encontramos ese monstruo en la API. Prueba con otro nombre o con ID numerico (ej: 1001).'
          return
        }

        const visualData = await fetchMonsterVisualDataById(foundMonster.monster_id)
        const dropsWithImages = mergeDropImagesFromApi(foundMonster.drops || [], visualData.drops || [])
        monsterData.value = {
          ...foundMonster,
          gif: visualData.gif,
          drops: dropsWithImages
        }
        refreshMonsterDropResults()
      } catch (err) {
        console.error('[Steal Search Error]', err)
        monsterError.value = 'Error inesperado al buscar. Revisa la consola o intenta con el ID numerico del monstruo.'
      } finally {
        isMonsterLoading.value = false
      }
    }

    const resultGifFor = (currentResult) => {
      if (currentResult >= 75) return gifVerde
      if (currentResult >= 50) return gifAzul
      if (currentResult >= 25) return gifAmarillo
      if (currentResult > 0) return gifRed
      return gifZero
    }

    const resultTierClass = (currentResult) => {
      if (currentResult >= 75) return 'tier-success'
      if (currentResult >= 50) return 'tier-good'
      if (currentResult >= 25) return 'tier-medium'
      if (currentResult > 0) return 'tier-low'
      return 'tier-zero'
    }

    // YouTube Player
    const isPlaying = ref(false)
    const isMuted = ref(false)
    const volume = ref(55)
    const isPlayerEnabled = ref(true)
    const currentSongTitle = ref('Lista lista para reproducir')
    const currentSongAuthor = ref('Playlist de YouTube')
    const isPlayerMinimized = ref(false)
    const isMinimizedRailVisible = ref(false)
    let ytPlayer = null
    let songTitlePoller = null
    let minimizedRailTimeout = null
    let playerResizeHandler = null

    const updateCurrentSongTitle = () => {
      if (!ytPlayer || typeof ytPlayer.getVideoData !== 'function') return
      const videoData = ytPlayer.getVideoData()
      if (videoData && videoData.title) {
        currentSongTitle.value = videoData.title
      }
      if (videoData && videoData.author) {
        currentSongAuthor.value = videoData.author
      }
    }

    const loadYouTubeAPI = () => {
      return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve()
          return
        }
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
        window.onYouTubeIframeAPIReady = resolve
      })
    }

    const initPlayer = async () => {
      if (ytPlayer) return
      await loadYouTubeAPI()
      ytPlayer = new window.YT.Player('yt-player', {
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: 0,
          controls: 0,
          listType: 'playlist',
          list: PLAYLIST_ID,
          loop: 1,
          rel: 0,
          origin: window.location.origin,
          playsinline: 1
        },
        events: {
          onReady: () => {
            ytPlayer.setVolume(volume.value)
            ytPlayer.setShuffle(true)
            updateCurrentSongTitle()
            songTitlePoller = window.setInterval(updateCurrentSongTitle, 1500)
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              isPlaying.value = true
              updateCurrentSongTitle()
            }
            if (event.data === window.YT.PlayerState.PAUSED) {
              isPlaying.value = false
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              updateCurrentSongTitle()
            }
          }
        }
      })
    }

    const toggleMusic = () => {
      if (!ytPlayer) return
      if (isPlaying.value) {
        ytPlayer.pauseVideo()
        isPlaying.value = false
      } else {
        ytPlayer.playVideo()
        isPlaying.value = true
        window.setTimeout(updateCurrentSongTitle, 250)
      }
    }

    const nextSong = () => {
      if (!ytPlayer) return
      ytPlayer.nextVideo()
      window.setTimeout(updateCurrentSongTitle, 250)
      if (!isPlaying.value) {
        ytPlayer.playVideo()
        isPlaying.value = true
      }
    }

    const prevSong = () => {
      if (!ytPlayer) return
      ytPlayer.previousVideo()
      window.setTimeout(updateCurrentSongTitle, 250)
      if (!isPlaying.value) {
        ytPlayer.playVideo()
        isPlaying.value = true
      }
    }

    const setVolume = () => {
      if (!ytPlayer) return
      ytPlayer.setVolume(volume.value)
      if (isMuted.value && volume.value > 0) {
        ytPlayer.unMute()
        isMuted.value = false
      }
    }

    const toggleMute = () => {
      if (!ytPlayer) return
      if (isMuted.value) {
        ytPlayer.unMute()
        isMuted.value = false
      } else {
        ytPlayer.mute()
        isMuted.value = true
      }
    }

    const clearMinimizedRailTimeout = () => {
      if (minimizedRailTimeout) {
        window.clearTimeout(minimizedRailTimeout)
        minimizedRailTimeout = null
      }
    }

    const destroyPlayer = () => {
      clearMinimizedRailTimeout()
      isPlayerMinimized.value = false
      isMinimizedRailVisible.value = false
      isPlaying.value = false

      if (songTitlePoller) {
        window.clearInterval(songTitlePoller)
        songTitlePoller = null
      }

      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy()
      }
      ytPlayer = null
    }

    const syncPlayerByViewport = async () => {
      const enabled = window.matchMedia(`(min-width: ${PLAYER_MIN_WIDTH}px)`).matches

      if (enabled === isPlayerEnabled.value) return

      isPlayerEnabled.value = enabled

      if (enabled) {
        await nextTick()
        initPlayer()
      } else {
        destroyPlayer()
      }
    }

    const togglePlayerMinimized = () => {
      clearMinimizedRailTimeout()

      if (isPlayerMinimized.value) {
        isMinimizedRailVisible.value = false
        isPlayerMinimized.value = false
        return
      }

      isPlayerMinimized.value = true
      minimizedRailTimeout = window.setTimeout(() => {
        isMinimizedRailVisible.value = true
        minimizedRailTimeout = null
      }, 320)
    }

    const handleMinimizedPlayerClick = () => {
      if (isPlayerMinimized.value) {
        togglePlayerMinimized()
      }
    }

    onMounted(() => {
      isPlayerEnabled.value = window.matchMedia(`(min-width: ${PLAYER_MIN_WIDTH}px)`).matches
      if (isPlayerEnabled.value) {
        initPlayer()
      }

      playerResizeHandler = () => {
        syncPlayerByViewport()
      }
      window.addEventListener('resize', playerResizeHandler)
    })

    onUnmounted(() => {
      if (playerResizeHandler) {
        window.removeEventListener('resize', playerResizeHandler)
        playerResizeHandler = null
      }
      destroyPlayer()
    })

    return {
      userDex,
      monsterDex,
      skillLevel,
      resultGifFor,
      resultTierClass,
      monsterQuery,
      monsterUserDex,
      monsterSkillLevel,
      monsterFieldErrors,
      isMonsterLoading,
      monsterError,
      monsterData,
      monsterDropResults,
      stealChainSummary,
      searchMonsterDrops,
      normalizeAssetUrl,
      formatLabel,
      manualSlotChance,
      manualSlots,
      manualSlotsError,
      manualSlotResults,
      manualStealSummary,
      addManualSlot,
      removeManualSlot,
      refreshManualSlotResults,
      bgImage,
      roLogo,
      angelingGif,
      angelingStill,
      noviceImage,
      noviceImageRight,
      poringCoinImage,
      isPlayerEnabled,
      isPlaying,
      isMuted,
      volume,
      currentSongTitle,
      currentSongAuthor,
      isPlayerMinimized,
      isMinimizedRailVisible,
      toggleMusic,
      nextSong,
      prevSong,
      setVolume,
      toggleMute,
      togglePlayerMinimized,
      handleMinimizedPlayerClick
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Jersey+10&display=swap');

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  background-color: #08090f;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

input,
button,
select,
textarea {
  font-family: inherit;
}

#app {
  min-height: 100vh;
}

#yt-player,
iframe#yt-player {
  position: fixed !important;
  left: -10000px !important;
  top: -10000px !important;
  width: 1px !important;
  height: 1px !important;
  border: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}
</style>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100dvh;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.app-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 600px;
  width: 100%;
  position: relative;
}

.container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  position: relative;
  z-index: 2;
}

.novice-character {
  position: absolute;
  left: -80px;
  top: 210px;
  transform: translateY(-50%);
  z-index: 10;
  pointer-events: none;
}

.novice-img {
  height: 300px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
}

.title-16bit {
  font-family: 'Jersey 10', 'Trebuchet MS', sans-serif;
  letter-spacing: 0.2px;
}

h1 {
  color: #1a1a2e;
  text-align: center;
  margin-bottom: 10px;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 0px;
}

.ro-logo {
  height: 384px;
  width: auto;
  object-fit: contain;
}

.subtitle {
  text-align: center;
  color: #666;
  font-size: 12px;
  margin-bottom: 30px;
  font-style: italic;
}

.calculator {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.input-group {
  display: flex;
  flex-direction: column;
  position: relative;
}

label {
  color: #1a1a2e;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

input {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
}

input:focus {
  outline: none;
  border-color: #ff6b6b;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

select {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
}

select:focus {
  outline: none;
  border-color: #ff6b6b;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.unit {
  position: absolute;
  right: 12px;
  top: 38px;
  color: #999;
  pointer-events: none;
}

.result-section {
  margin-top: 30px;
}

.result-box {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  color: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.2);
  flex: 1;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.result-box-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.result-copy {
  flex: 1;
  min-width: 0;
}

.result-box.tier-success {
  background: linear-gradient(135deg, #29a44d 0%, #1f8f41 100%);
  box-shadow: 0 10px 30px rgba(41, 164, 77, 0.32);
}

.result-box.tier-success .result-gif-shell {
  border-color: rgba(54, 179, 95, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 3px rgba(54, 179, 95, 0.24), 0 10px 22px rgba(25, 110, 53, 0.24);
}

.result-box.tier-good {
  background: linear-gradient(135deg, #2e84db 0%, #2a69c7 100%);
  box-shadow: 0 10px 30px rgba(46, 132, 219, 0.32);
}

.result-box.tier-good .result-gif-shell {
  border-color: rgba(67, 142, 223, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 3px rgba(67, 142, 223, 0.24), 0 10px 22px rgba(25, 86, 161, 0.24);
}

.result-box.tier-medium {
  background: linear-gradient(135deg, #f2ad2b 0%, #db8d1a 100%);
  box-shadow: 0 10px 30px rgba(242, 173, 43, 0.32);
}

.result-box.tier-medium .result-gif-shell {
  border-color: rgba(232, 165, 35, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 3px rgba(232, 165, 35, 0.25), 0 10px 22px rgba(151, 101, 13, 0.24);
}

.result-box.tier-low {
  background: linear-gradient(135deg, #e25555 0%, #ca2f2f 100%);
  box-shadow: 0 10px 30px rgba(226, 85, 85, 0.32);
}

.result-box.tier-low .result-gif-shell {
  border-color: rgba(216, 76, 76, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 3px rgba(216, 76, 76, 0.24), 0 10px 22px rgba(134, 33, 33, 0.24);
}

.result-box.tier-zero {
  background: linear-gradient(135deg, #6d2735 0%, #4d1a23 100%);
  box-shadow: 0 10px 30px rgba(109, 39, 53, 0.34);
}

.result-box.tier-zero .result-gif-shell {
  border-color: rgba(139, 55, 73, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 3px rgba(139, 55, 73, 0.25), 0 10px 22px rgba(67, 20, 30, 0.28);
}

.result-gif-inline {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
  object-fit: contain;
}

.result-gif-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 158px;
  height: 158px;
  border-radius: 16px;
  background: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 22px rgba(0, 0, 0, 0.18);
}

.result-gif-shell .result-gif-inline {
  width: 132px;
  height: 132px;
}

.result-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.result-box h2 {
  font-size: 18px;
  margin-bottom: 15px;
  opacity: 0.9;
}

.result-percentage {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 10px;
}

.result-text {
  font-size: 16px;
}

.success,
.good,
.medium,
.low,
.zero {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 5px 10px;
  border-radius: 5px;
}

.details {
  background-color: #f0f0f0;
  padding: 20px;
  border-radius: 10px;
  border-left: 4px solid #ff6b6b;
}

.details h3 {
  color: #1a1a2e;
  margin-bottom: 15px;
  font-size: 16px;
}

.details ul {
  list-style: none;
}

.details li {
  color: #333;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #e0e0e0;
}

.details li:last-child {
  border-bottom: none;
}

.placeholder {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.manual-slots-section {
  margin-top: 14px;
  padding-top: 8px;
}

.manual-slots-section h2 {
  color: #1a1a2e;
  font-size: 20px;
  margin-bottom: 6px;
}

.manual-slots-subtitle {
  color: #5f6377;
  font-size: 13px;
  line-height: 1.45;
  margin-bottom: 14px;
}

.manual-slot-controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.manual-slot-controls .input-group {
  flex: 1;
}

.manual-slot-btn {
  background: linear-gradient(135deg, #2b93e8 0%, #236fcb 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(26, 113, 192, 0.24);
}

.manual-slot-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(26, 113, 192, 0.3);
}

.manual-slot-error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  color: #8f1f34;
  background: #ffe9ee;
  border: 1px solid #ffc2cf;
  font-size: 12px;
}

.manual-slot-strip-wrap {
  margin-top: 12px;
}

.manual-slot-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  overflow: visible;
  padding-bottom: 0;
}

.manual-slot-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d6e5fb;
  background: #f4f8ff;
  color: #1e4369;
  border-radius: 999px;
  padding: 5px 8px 5px 6px;
  cursor: pointer;
  white-space: nowrap;
}

.manual-slot-chip:hover {
  border-color: #b9d3f6;
  background: #eef6ff;
}

.manual-slot-chip-icon {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid rgba(30, 67, 105, 0.15);
  background: #fff;
}

.manual-slot-chip-index {
  font-size: 12px;
  font-weight: 700;
}

.manual-slot-chip-rate {
  font-size: 12px;
  font-weight: 600;
}

.manual-slot-chip-remove {
  font-size: 11px;
  font-weight: 700;
  color: #a01934;
  margin-left: 2px;
}

.manual-slot-strip-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #69718a;
}

.manual-slot-results {
  margin-top: 16px;
}

.manual-slot-results h3 {
  color: #1a1a2e;
  font-size: 16px;
  margin-bottom: 10px;
}

.monster-search-section {
  position: relative;
  margin-top: 56px;
  border-top: 1px solid rgba(0, 0, 0, 0.09);
  padding-top: 34px;
}

.novice-character-right {
  position: absolute;
  right: -115px;
  top: 210px;
  transform: translateY(-50%);
  z-index: 10;
  pointer-events: none;
}

.monster-search-section h2 {
  color: #1a1a2e;
  font-size: 22px;
  margin-bottom: 8px;
}

.monster-search-subtitle {
  color: #5f6377;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 18px;
}

.monster-search-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.monster-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.monster-query-group {
  grid-column: 1 / -1;
}

.monster-search-btn {
  align-self: flex-start;
  background: linear-gradient(135deg, #2b93e8 0%, #236fcb 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(26, 113, 192, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.monster-search-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(26, 113, 192, 0.3);
}

.monster-search-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.monster-search-section .input-group-invalid label {
  color: #b42338;
}

.monster-search-section .input-group-invalid input {
  border-color: #d92d20;
  background-color: #fff1f3;
  box-shadow: inset 0 0 0 1px rgba(217, 45, 32, 0.08);
}

.monster-search-section .input-group-invalid input:focus {
  border-color: #d92d20;
  box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.16);
}

.monster-error {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #8f1f34;
  background: #ffe9ee;
  border: 1px solid #ffc2cf;
  font-size: 13px;
}

.monster-result-wrap {
  margin-top: 18px;
}

.monster-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: 12px;
  background: #f2f8ff;
  border: 1px solid #d9e9ff;
  margin-bottom: 14px;
}

.monster-thumb {
  width: 78px;
  height: 78px;
  object-fit: contain;
  border-radius: 10px;
  background: white;
  border: 1px solid #cfe0f7;
}

.monster-meta h3 {
  margin: 0;
  color: #1b3f5c;
  font-size: 18px;
}

.monster-meta p {
  margin: 6px 0 0;
  color: #516375;
  font-size: 13px;
}

.drop-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.drop-card {
  margin-bottom: 0;
  padding: 12px 14px;
}

.drop-card::before {
  width: 6px;
}

.drop-card-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.drop-item-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.85);
  padding: 4px;
  flex-shrink: 0;
}

.drop-card-copy {
  min-width: 0;
  text-align: left;
  flex: 1;
}

.drop-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.drop-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}

.drop-base,
.drop-adjusted {
  margin: 0;
  font-size: 12px;
  opacity: 0.95;
}

.drop-rate-flow {
  margin: 4px 0 0;
  font-size: 11px;
  opacity: 0.82;
}

.steal-summary {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #edf6ff;
  border: 1px solid #cfe3fb;
}

.steal-summary p {
  margin: 4px 0;
  color: #214d74;
  font-size: 12px;
}

.drop-tier-gif {
  width: 62px;
  height: 62px;
  border-radius: 10px;
  flex-shrink: 0;
}

.drop-tier-gif .result-gif-inline {
  width: 48px;
  height: 48px;
}

@media (max-width: 760px) {
  .result-box-content {
    flex-direction: column;
  }

  .result-gif-shell {
    width: 140px;
    height: 140px;
  }

  .result-gif-shell .result-gif-inline {
    width: 116px;
    height: 116px;
    max-height: 116px;
  }

  .monster-inputs {
    grid-template-columns: 1fr;
  }

  .drop-list {
    grid-template-columns: 1fr;
  }

  .drop-card .result-box-content {
    align-items: stretch;
  }

  .drop-card-left {
    width: 100%;
  }

  .manual-slot-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .manual-slot-btn {
    width: 100%;
  }
}

/* Music Player flotante */

.music-player {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 360px;
  padding: 10px 16px 14px;
  border: 3px solid #8ccaff;
  border-radius: 34px 38px 30px 34px;
  background: linear-gradient(180deg, #ffffff 0%, #f3fbff 42%, #d9efff 100%);
  box-shadow: 0 18px 38px rgba(8, 30, 61, 0.28), inset 0 2px 0 rgba(255, 255, 255, 0.95), inset 0 -6px 14px rgba(125, 189, 243, 0.24);
  z-index: 1000;
  overflow: hidden;
  transition: width 0.32s ease, padding 0.32s ease, transform 0.32s ease, box-shadow 0.32s ease, border-radius 0.32s ease;
}

.floating-media-stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  z-index: 1000;
}

.job-gif {
  display: block;
  max-width: 100%;
  max-height: 184px;
  width: auto;
  height: auto;
  object-fit: contain;
  image-rendering: auto;
  margin-top: -12px;
  margin-bottom: 12px;
}

.music-player.minimized {
  width: 360px;
  padding: 12px 14px;
  cursor: pointer;
}

.player-expanded-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 560px;
  overflow: hidden;
  transform: translateY(0);
  transition: max-height 0.32s ease, transform 0.32s ease;
}

.player-expanded-content.hidden {
  max-height: 0;
  transform: translateY(-10px);
}

.music-player-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-bottom: 0;
}

.music-player.minimized .music-player-header {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
}

.minimized-rail {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  max-height: 0;
  padding: 0 8px;
  overflow: hidden;
  border-radius: 999px;
  background: transparent;
  transform: translateY(10px);
  transition: max-height 0.32s ease, padding 0.32s ease, transform 0.32s ease;
}

.minimized-rail.active {
  max-height: 96px;
  padding: 6px 8px;
  transform: translateY(0);
}

.minimized-angeling {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.marquee-window {
  position: relative;
  flex: 1;
  overflow: hidden;
  min-width: 0;
  mask-image: linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%);
}

.marquee-track {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  width: max-content;
  white-space: nowrap;
  animation: marquee-scroll 13s linear infinite;
}

.marquee-item {
  color: #20587e;
  font-size: 15px;
  font-weight: 700;
}

.marquee-separator {
  color: #61aee6;
  font-size: 14px;
  font-weight: 900;
}

.minimized-toggle-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff, #dff2ff);
  border: 1px solid rgba(86, 166, 233, 0.55);
  color: #24679d;
  font-size: 14px;
  box-shadow: 0 6px 14px rgba(88, 154, 210, 0.16);
}

.song-title {
  color: #1a4668;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-player-btn {
  background: linear-gradient(180deg, #ffffff, #dff2ff);
  color: #24679d;
  border: 1px solid rgba(86, 166, 233, 0.55);
  border-radius: 999px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.toggle-player-btn:hover {
  background: linear-gradient(180deg, #ffffff, #cfeeff);
  border-color: #5faeee;
}

.music-player-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 0;
}

.music-player-hero {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-height: 0;
  gap: 10px;
  padding: 0 6px 2px;
  text-align: center;
}

.music-hero-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.music-now-playing {
  min-width: 0;
  width: 100%;
  margin-top: 0;
}

.hero-equalizer {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  width: 18px;
  min-height: 96px;
  flex-shrink: 0;
}

.hero-equalizer span {
  display: block;
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, #55b8ff, #248fd9);
  border-radius: 999px;
  animation: equalizer-side 0.8s ease-in-out infinite alternate;
}

.hero-equalizer span:nth-child(1) { animation-delay: 0s; }
.hero-equalizer span:nth-child(2) { animation-delay: 0.2s; }
.hero-equalizer span:nth-child(3) { animation-delay: 0.4s; }
.hero-equalizer span:nth-child(4) { animation-delay: 0.6s; }

.music-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(132, 194, 244, 0.5);
}

.volume-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(232, 246, 255, 0.92);
  border: 1px solid rgba(132, 194, 244, 0.5);
}

.icon-btn {
  background: linear-gradient(180deg, #ffffff, #dff1ff);
  color: #24679d;
  border: 1px solid rgba(97, 170, 232, 0.45);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.icon-btn:hover {
  background: linear-gradient(180deg, #ffffff, #cae9ff);
  border-color: #59acee;
}

.music-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(180deg, #ffffff, #d9efff);
  color: #165784;
  border: 1px solid rgba(90, 170, 235, 0.55);
  border-radius: 50px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 8px 18px rgba(110, 177, 232, 0.18);
  flex: 1;
  justify-content: center;
}

.music-btn:hover {
  background: linear-gradient(180deg, #ffffff, #caeaff);
  border-color: #5aaeee;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(109, 176, 232, 0.26);
}

.music-btn.playing {
  background: linear-gradient(180deg, #8dd3ff, #62b6f2);
  border-color: #2f90d3;
  color: white;
}

.music-icon {
  font-size: 16px;
}

.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  flex: 1;
  height: 8px;
  border-radius: 999px;
  outline: none;
  background: linear-gradient(
    to right,
    #ff6b6b 0%,
    #ff6b6b var(--volume-percent, 55%),
    rgba(255, 255, 255, 0.28) var(--volume-percent, 55%),
    rgba(255, 255, 255, 0.28) 100%
  );
  margin: 0;
  padding: 0;
}

.volume-slider::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
  border-radius: 999px;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #ff6b6b;
  margin-top: -4px;
  cursor: pointer;
}

.volume-slider::-moz-range-track {
  height: 8px;
  background: transparent;
  border-radius: 999px;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #ff6b6b;
  cursor: pointer;
}

.volume-value {
  color: #205f90;
  font-size: 12px;
  min-width: 38px;
  text-align: right;
  font-weight: 700;
}

@keyframes equalizer-side {
  from { width: 8px; opacity: 0.55; }
  to   { width: 18px; opacity: 1; }
}

@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (max-width: 480px) {
  .calculator {
    grid-template-columns: 1fr;
  }

  .container {
    padding: 20px;
  }

  h1 {
    font-size: 22px;
  }

  .result-percentage {
    font-size: 36px;
  }

  .music-player {
    width: calc(100vw - 20px);
    max-width: 360px;
  }

  .music-player.minimized {
    width: calc(100vw - 20px);
  }

  .floating-media-stack {
    right: 10px;
    bottom: 10px;
  }

  .minimized-angeling {
    width: 40px;
    height: 40px;
  }

  .marquee-item {
    font-size: 14px;
  }

  .music-player-hero {
    gap: 6px;
    padding: 0 2px 2px;
  }

  .hero-equalizer {
    width: 14px;
    min-height: 82px;
  }

  @keyframes equalizer-side {
    from { width: 6px; opacity: 0.55; }
    to   { width: 14px; opacity: 1; }
  }
}
</style>
