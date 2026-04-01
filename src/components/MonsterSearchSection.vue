<template>
  <div class="monster-search-section">
    <div class="novice-character-right">
      <img :src="noviceImageRight" alt="Novice" class="novice-img" />
    </div>
    <h2 class="title-16bit">{{ t('monsterSearchTitle') }}</h2>
    <p class="monster-search-subtitle">{{ t('monsterSearchSubtitle') }}</p>

    <form class="monster-search-form" @submit.prevent="$emit('searchMonsterDrops')">
      <div class="monster-inputs">
        <div class="input-group monster-query-group">
          <label for="monsterQuery">{{ t('monsterNameOrIdLabel') }}</label>
          <input
            :value="monsterQuery"
            type="text"
            id="monsterQuery"
            :placeholder="t('monsterQueryPlaceholder')"
            @input="onQueryInput"
          >
        </div>

        <div class="input-group" :class="{ 'input-group-invalid': monsterFieldErrors.userDex }">
          <label for="monsterUserDex">{{ t('searchDexLabel') }}</label>
          <input
            :value="monsterUserDex"
            type="number"
            id="monsterUserDex"
            :placeholder="t('example80')"
            @input="onUserDexInput"
          >
        </div>

        <div class="input-group" :class="{ 'input-group-invalid': monsterFieldErrors.skillLevel }">
          <label for="monsterSkillLevel">{{ t('searchStealLevelLabel') }}</label>
          <input
            :value="monsterSkillLevel"
            type="number"
            id="monsterSkillLevel"
            :placeholder="t('example10')"
            min="1"
            max="10"
            @input="onSkillInput"
          >
        </div>
      </div>

      <button type="submit" class="monster-search-btn" :disabled="isMonsterLoading">
        {{ isMonsterLoading ? t('searchingButton') : t('searchMonsterButton') }}
      </button>
    </form>

    <p v-if="monsterError" class="monster-error">{{ monsterError }}</p>

    <div v-if="monsterData" class="monster-result-wrap">
      <div class="monster-header">
        <img :src="monsterData.gif" :alt="monsterData.monster_info" class="monster-thumb" />
        <div class="monster-meta">
          <h3>{{ formatLabel(monsterData.monster_info) }}</h3>
          <p>{{ t('idLabel') }}: {{ monsterData.monster_id }}</p>
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
                <p class="drop-base">{{ t('dropRatioFormulaLabel') }} x{{ drop.targetMultiplier }}: {{ drop.targetRate.toFixed(2) }}%</p>
                <div class="result-gif-shell drop-tier-gif">
                  <img :src="resultGifFor(drop.isLastSlot ? 0 : drop.adjustedChance)" :alt="t('chanceTierAlt')" class="result-gif-inline" />
                </div>
              </div>
              <p class="drop-adjusted" v-if="!drop.isLastSlot">{{ t('finalChainedChanceLabel') }}: {{ drop.slotFinalChance.toFixed(2) }}%</p>
              <p class="drop-adjusted" v-else>{{ t('lastSlotZeroLabel') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="steal-summary" v-if="monsterDropResults.length">
        <p><strong>{{ t('totalStealAnyItemLabel') }}:</strong> {{ stealChainSummary.totalStealChance.toFixed(2) }}%</p>
        <p><strong>{{ t('noStealChanceLabel') }}:</strong> {{ stealChainSummary.noStealChance.toFixed(2) }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  t: { type: Function, required: true },
  noviceImageRight: { type: String, required: true },
  monsterQuery: { type: String, default: '' },
  monsterUserDex: { type: [Number, String], default: null },
  monsterSkillLevel: { type: [Number, String], default: null },
  monsterFieldErrors: { type: Object, required: true },
  isMonsterLoading: { type: Boolean, required: true },
  monsterError: { type: String, default: '' },
  monsterData: { type: Object, default: null },
  monsterDropResults: { type: Array, required: true },
  stealChainSummary: { type: Object, required: true },
  normalizeAssetUrl: { type: Function, required: true },
  formatLabel: { type: Function, required: true },
  resultGifFor: { type: Function, required: true },
  resultTierClass: { type: Function, required: true }
})

const emit = defineEmits([
  'update:monsterQuery',
  'update:monsterUserDex',
  'update:monsterSkillLevel',
  'searchMonsterDrops'
])

const onQueryInput = (event) => {
  emit('update:monsterQuery', event.target.value)
}

const onUserDexInput = (event) => {
  const value = event.target.value
  emit('update:monsterUserDex', value === '' ? null : Number(value))
}

const onSkillInput = (event) => {
  const value = event.target.value
  emit('update:monsterSkillLevel', value === '' ? null : Number(value))
}
</script>
