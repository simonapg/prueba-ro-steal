<template>
  <div class="manual-slots-section">
    <h2>{{ t('manualSlotsTitle') }}</h2>
    <p class="manual-slots-subtitle">{{ t('manualSlotsSubtitle') }}</p>

    <div class="manual-slot-controls">
      <div class="input-group">
        <label for="manualSlotChance">{{ t('newSlotChanceLabel') }}</label>
        <input
          :value="manualSlotChance"
          type="number"
          id="manualSlotChance"
          :placeholder="t('example125')"
          min="0"
          max="100"
          @input="onSlotChanceInput"
        >
      </div>
      <button type="button" class="manual-slot-btn" @click="$emit('addManualSlot')">{{ t('addSlotButton') }}</button>
    </div>

    <p v-if="manualSlotsError" class="manual-slot-error">{{ manualSlotsError }}</p>

    <div v-if="manualSlots.length" class="manual-slot-strip-wrap">
      <div class="manual-slot-strip">
        <button
          type="button"
          class="manual-slot-chip"
          v-for="(slot, idx) in manualSlots"
          :key="slot.id"
          :title="manualSlotChipTitle(idx, slot.rate)"
          @click="$emit('removeManualSlot', idx)"
        >
          <img :src="poringCoinImage" alt="Slot" class="manual-slot-chip-icon" />
          <span class="manual-slot-chip-index">#{{ idx + 1 }}</span>
          <span class="manual-slot-chip-rate">{{ Number(slot.rate || 0).toFixed(2) }}%</span>
          <span class="manual-slot-chip-remove">✕</span>
        </button>
      </div>
      <p class="manual-slot-strip-hint">{{ t('removeSlotHint') }}</p>
    </div>

    <div v-if="manualSlotResults.length" class="manual-slot-results">
      <h3>{{ t('chainedResultTitle') }}</h3>
      <div class="drop-list">
        <div
          v-for="slot in manualSlotResults"
          :key="slot.uniqueKey"
          class="drop-card result-box"
          :class="resultTierClass(slot.isLastSlot ? 0 : slot.adjustedChance)"
        >
          <div class="drop-card-left">
            <div class="drop-card-copy">
              <p class="drop-name">#{{ slot.slotIndex }} · {{ t('manualSlotName') }}</p>
              <div class="drop-meta-row">
                <p class="drop-base">{{ t('dropRatioLabel') }}: {{ slot.targetRate.toFixed(2) }}%</p>
                <div class="result-gif-shell drop-tier-gif">
                  <img :src="resultGifFor(slot.isLastSlot ? 0 : slot.adjustedChance)" :alt="t('chanceTierAlt')" class="result-gif-inline" />
                </div>
              </div>
              <p class="drop-rate-flow">{{ t('stealBaseLabel') }}: {{ slot.stealBaseChance.toFixed(2) }}% · {{ t('dropCheckLabel') }}: {{ slot.itemCheckChance.toFixed(2) }}%</p>
              <p class="drop-rate-flow">{{ t('rollDropLabel') }}: {{ slot.itemRollThreshold }} / 10000 · {{ t('rollStealLabel') }}: {{ slot.stealRollThreshold }} / 10000</p>
              <p class="drop-rate-flow">{{ t('reachChanceLabel') }}: {{ slot.reachChance.toFixed(2) }}% · {{ t('localChanceLabel') }}: {{ slot.slotChanceLocal.toFixed(2) }}%</p>
              <p class="drop-adjusted" v-if="!slot.isLastSlot">{{ t('finalChainedChanceLabel') }}: {{ slot.slotFinalChance.toFixed(2) }}%</p>
              <p class="drop-adjusted" v-else>{{ t('lastSlotZeroLabel') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="steal-summary">
        <p><strong>{{ t('totalStealAnySlotLabel') }}:</strong> {{ manualStealSummary.totalStealChance.toFixed(2) }}%</p>
        <p><strong>{{ t('noStealChanceLabel') }}:</strong> {{ manualStealSummary.noStealChance.toFixed(2) }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  t: { type: Function, required: true },
  manualSlotChance: { type: [Number, String, null], default: null },
  manualSlots: { type: Array, required: true },
  manualSlotsError: { type: String, default: '' },
  manualSlotResults: { type: Array, required: true },
  manualStealSummary: { type: Object, required: true },
  poringCoinImage: { type: String, required: true },
  manualSlotChipTitle: { type: Function, required: true },
  resultGifFor: { type: Function, required: true },
  resultTierClass: { type: Function, required: true }
})

const emit = defineEmits(['update:manualSlotChance', 'addManualSlot', 'removeManualSlot'])

const onSlotChanceInput = (event) => {
  const value = event.target.value
  emit('update:manualSlotChance', value === '' ? null : Number(value))
}
</script>
