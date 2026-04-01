<template>
  <div v-if="isPlayerEnabled" class="floating-media-stack">
    <div
      class="music-player"
      :class="{ minimized: isPlayerMinimized }"
      @click="handleMinimizedPlayerClick"
      :title="isPlayerMinimized ? t('openPlayer') : undefined"
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
            @click.stop="$emit('togglePlayerMinimized')"
            type="button"
            class="toggle-player-btn"
            :title="t('minimizePlayer')"
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
            <button @click="$emit('prevSong')" class="icon-btn" :title="t('previousSong')">⏮</button>
            <button @click="$emit('toggleMusic')" class="music-btn" :class="{ playing: isPlaying }">
              <span class="music-icon">{{ isPlaying ? '⏸' : '▶' }}</span>
              <span class="music-label">{{ isPlaying ? t('pause') : 'SoundTemp' }}</span>
            </button>
            <button @click="$emit('nextSong')" class="icon-btn" :title="t('nextSong')">⏭</button>
          </div>

          <div class="volume-row">
            <button @click="$emit('toggleMute')" class="icon-btn" :title="t('muteToggle')">
              {{ isMuted ? '🔇' : '🔊' }}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              :value="volume"
              @input="$emit('setVolume', Number($event.target.value))"
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

<script setup>
defineProps({
  t: { type: Function, required: true },
  isPlayerEnabled: { type: Boolean, required: true },
  isPlayerMinimized: { type: Boolean, required: true },
  isMinimizedRailVisible: { type: Boolean, required: true },
  currentSongTitle: { type: String, required: true },
  currentSongAuthor: { type: String, required: true },
  angelingGif: { type: String, required: true },
  angelingStill: { type: String, required: true },
  isPlaying: { type: Boolean, required: true },
  isMuted: { type: Boolean, required: true },
  volume: { type: Number, required: true },
  handleMinimizedPlayerClick: { type: Function, required: true }
})

defineEmits(['togglePlayerMinimized', 'prevSong', 'toggleMusic', 'nextSong', 'toggleMute', 'setVolume'])
</script>
