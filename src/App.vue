<template>
  <div id="app" :style="{ '--app-bg-image': `url(${bgImage})` }">
    <div class="app-wrapper">
      <div class="logo-wrapper">
        <img :src="roLogo" alt="Ragnarok Online" class="ro-logo" />
      </div>
      <div class="container">
        <button
          type="button"
          class="language-toggle"
          @click="toggleLanguage"
          :title="t('toggleLanguage')"
        >
          <span aria-hidden="true">🌐</span>
          <span>{{ language.toUpperCase() }}</span>
        </button>

        <div class="uaro-logo-wrapper">
          <a href="https://uaro.net/" target="_blank" rel="noopener noreferrer">
            <img :src="uaroLogo" alt="UA Ragnarok" class="uaro-logo" />
          </a>
        </div>

        <div class="novice-character">
          <img :src="noviceImage" alt="Novice" class="novice-img" />
        </div>

        <h1 class="title-16bit">{{ t('calcTitle') }}</h1>
        <p class="subtitle">{{ t('calcSubtitle') }}</p>

        <div class="calculator">
          <div class="input-group">
            <label for="userDex">{{ t('userDexLabel') }}</label>
            <input
              v-model.number="userDex"
              type="number"
              id="userDex"
              :placeholder="t('example80')"
            >
          </div>

          <div class="input-group">
            <label for="monsterDex">{{ t('monsterDexLabel') }}</label>
            <input
              v-model.number="monsterDex"
              type="number"
              id="monsterDex"
              :placeholder="t('example50')"
            >
          </div>

          <div class="input-group">
            <label for="skillLevel">{{ t('stealSkillLevelLabel') }}</label>
            <input
              v-model.number="skillLevel"
              type="number"
              id="skillLevel"
              :placeholder="t('example10')"
              min="1"
              max="10"
            >
          </div>
        </div>

        <ManualSlotsSection
          :t="t"
          :manual-slot-chance="manualSlotChance"
          :manual-slots="manualSlots"
          :manual-slots-error="manualSlotsError"
          :manual-slot-results="manualSlotResults"
          :manual-steal-summary="manualStealSummary"
          :poring-coin-image="poringCoinImage"
          :manual-slot-chip-title="manualSlotChipTitle"
          :result-gif-for="resultGifFor"
          :result-tier-class="resultTierClass"
          @update:manualSlotChance="manualSlotChance = $event"
          @addManualSlot="addManualSlot"
          @removeManualSlot="removeManualSlot"
        />

        <MonsterSearchSection
          :t="t"
          :novice-image-right="noviceImageRight"
          :monster-query="monsterQuery"
          :monster-user-dex="monsterUserDex"
          :monster-skill-level="monsterSkillLevel"
          :monster-field-errors="monsterFieldErrors"
          :is-monster-loading="isMonsterLoading"
          :monster-error="monsterError"
          :monster-data="monsterData"
          :monster-drop-results="monsterDropResults"
          :steal-chain-summary="stealChainSummary"
          :normalize-asset-url="normalizeAssetUrl"
          :format-label="formatLabel"
          :result-gif-for="resultGifFor"
          :result-tier-class="resultTierClass"
          @update:monsterQuery="monsterQuery = $event"
          @update:monsterUserDex="monsterUserDex = $event"
          @update:monsterSkillLevel="monsterSkillLevel = $event"
          @searchMonsterDrops="searchMonsterDrops"
        />
      </div>
    </div>
  </div>

  <!-- Player oculto de YouTube (siempre montado para evitar recreaciones del iframe) -->
  <div id="yt-player" aria-hidden="true"></div>

  <FloatingMusicPlayer
    :t="t"
    :is-player-enabled="isPlayerEnabled"
    :is-player-minimized="isPlayerMinimized"
    :is-minimized-rail-visible="isMinimizedRailVisible"
    :current-song-title="currentSongTitle"
    :current-song-author="currentSongAuthor"
    :angeling-gif="angelingGif"
    :angeling-still="angelingStill"
    :is-playing="isPlaying"
    :is-muted="isMuted"
    :volume="volume"
    :handle-minimized-player-click="handleMinimizedPlayerClick"
    @togglePlayerMinimized="togglePlayerMinimized"
    @prevSong="prevSong"
    @toggleMusic="toggleMusic"
    @nextSong="nextSong"
    @toggleMute="toggleMute"
    @setVolume="setVolume"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ManualSlotsSection from '@/components/ManualSlotsSection.vue'
import MonsterSearchSection from '@/components/MonsterSearchSection.vue'
import FloatingMusicPlayer from '@/components/FloatingMusicPlayer.vue'
import { useI18n } from '@/composables/useI18n'
import { useHerculesDb, toValidNumber, parseDropRate, normalizeAssetUrl, formatLabel } from '@/composables/useHerculesDb'
import { useYouTubePlayer } from '@/composables/useYouTubePlayer'
import { PLAYLIST_ID, PLAYER_MIN_WIDTH, PRE_RE_TARGET_RATE } from '@/constants/appConstants'
import bgImage from '@/assets/images/wallpaperflare-cropped.jpg'
import roLogo from '@/assets/images/Ragnarok_Online_Logo.svg'
import uaroLogo from '@/assets/images/uaro.webp'
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
const { language, t, toggleLanguage } = useI18n('en')
const {
  ensureHerculesItemDb,
  getHerculesItemImage,
  findMonsterInHerculesDb,
  fetchMonsterVisualDataById,
  mergeDropImagesFromApi
} = useHerculesDb()

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

const defaultSongTitle = computed(() => t('defaultSongTitle'))
const defaultSongAuthor = computed(() => t('defaultSongAuthor'))
const {
  isPlaying,
  isMuted,
  volume,
  isPlayerEnabled,
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
} = useYouTubePlayer({
  playlistId: PLAYLIST_ID,
  playerMinWidth: PLAYER_MIN_WIDTH,
  defaultSongTitle,
  defaultSongAuthor
})

const manualSlotChipTitle = (idx, rate) => {
  const value = Number(rate || 0).toFixed(2)
  return `Slot #${idx + 1} · ${value}%`
}

const clampPercent = (value) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

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

const percentToThreshold10k = (percent) => {
  const clamped = clampPercent(percent)
  return Math.round(clamped * 100)
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
        const targetMultiplier = drop.isSynthetic ? 1 : PRE_RE_TARGET_RATE
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
        manualSlotsError.value = t('errorFillManualBase')
        return
      }

      const rate = toValidNumber(manualSlotChance.value)
      if (rate === null || rate < 0 || rate > 100) {
        manualSlotsError.value = t('errorManualSlotRange')
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

const searchMonsterDrops = async () => {
      monsterSearchTouched.value = true
      monsterError.value = ''
      monsterData.value = null
      monsterDropResults.value = []
      if (!validateMonsterSearchInputs()) {
        monsterError.value = t('errorSearchFillStats')
        return
      }

      const query = monsterQuery.value.trim()
      if (!query) {
        monsterError.value = t('errorSearchQuery')
        return
      }

      isMonsterLoading.value = true

      try {
        const itemDbByName = await ensureHerculesItemDb()
        const foundMonster = await findMonsterInHerculesDb(query)
        if (!foundMonster) {
          monsterError.value = t('errorMonsterNotFound')
          return
        }

        const dropsWithHerculesImages = (foundMonster.drops || []).map((drop) => ({
          ...drop,
          img: getHerculesItemImage(drop.name, itemDbByName)
        }))

        const visualData = await fetchMonsterVisualDataById(foundMonster.monster_id)
        const dropsWithImages = mergeDropImagesFromApi(dropsWithHerculesImages, visualData.drops || [])
        monsterData.value = {
          ...foundMonster,
          gif: visualData.gif,
          drops: dropsWithImages
        }
        refreshMonsterDropResults()
      } catch (err) {
        console.error('[Steal Search Error]', err)
        monsterError.value = t('errorSearchUnexpected')
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
</script>





