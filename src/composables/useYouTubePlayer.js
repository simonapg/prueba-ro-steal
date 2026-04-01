import { nextTick, onMounted, onUnmounted, ref, unref, watch } from 'vue'

let ytApiLoadPromise = null

const loadYouTubeAPI = () => {
  if (window.YT?.Player) return Promise.resolve()
  if (ytApiLoadPromise) return ytApiLoadPromise

  ytApiLoadPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady()
      resolve()
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (existingScript) return

    const scriptTag = document.createElement('script')
    scriptTag.src = 'https://www.youtube.com/iframe_api'
    scriptTag.async = true
    document.head.appendChild(scriptTag)
  })

  return ytApiLoadPromise
}

export const useYouTubePlayer = ({ playlistId, playerMinWidth, defaultSongTitle, defaultSongAuthor }) => {
  const isPlaying = ref(false)
  const isMuted = ref(false)
  const volume = ref(55)
  const isPlayerEnabled = ref(true)
  const currentSongTitle = ref(unref(defaultSongTitle) || '')
  const currentSongAuthor = ref(unref(defaultSongAuthor) || '')
  const isPlayerMinimized = ref(false)
  const isMinimizedRailVisible = ref(false)

  let ytPlayer = null
  let songTitlePoller = null
  let minimizedRailTimeout = null
  let viewportMediaQuery = null
  let viewportChangeHandler = null
  let isPlayerReady = false

  const updateCurrentSongTitle = () => {
    if (!ytPlayer || !isPlayerReady || typeof ytPlayer.getVideoData !== 'function') return

    const videoData = ytPlayer.getVideoData()
    if (videoData?.title) {
      currentSongTitle.value = videoData.title
    }
    if (videoData?.author) {
      currentSongAuthor.value = videoData.author
    }
  }

  const clearSongTitlePoller = () => {
    if (!songTitlePoller) return
    window.clearInterval(songTitlePoller)
    songTitlePoller = null
  }

  const clearMinimizedRailTimeout = () => {
    if (!minimizedRailTimeout) return
    window.clearTimeout(minimizedRailTimeout)
    minimizedRailTimeout = null
  }

  const destroyPlayer = () => {
    clearMinimizedRailTimeout()
    clearSongTitlePoller()

    isPlayerMinimized.value = false
    isMinimizedRailVisible.value = false
    isPlaying.value = false
    isMuted.value = false
    isPlayerReady = false

    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
      try {
        ytPlayer.destroy()
      } catch {
        // Silently ignore third-party teardown race conditions.
      }
    }

    ytPlayer = null
    currentSongTitle.value = unref(defaultSongTitle) || ''
    currentSongAuthor.value = unref(defaultSongAuthor) || ''
  }

  const initPlayer = async () => {
    if (ytPlayer) return

    await nextTick()
    const playerHost = document.getElementById('yt-player')
    if (!playerHost) return

    await loadYouTubeAPI()
    if (!window.YT?.Player) return

    ytPlayer = new window.YT.Player('yt-player', {
      playerVars: {
        autoplay: 0,
        controls: 0,
        listType: 'playlist',
        list: playlistId,
        loop: 1,
        rel: 0,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          isPlayerReady = true
          ytPlayer.setVolume(volume.value)
          ytPlayer.setShuffle(true)
          updateCurrentSongTitle()
          clearSongTitlePoller()
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

  const syncPlayerByViewport = async () => {
    const enabled = viewportMediaQuery?.matches ?? window.matchMedia(`(min-width: ${playerMinWidth}px)`).matches
    if (enabled === isPlayerEnabled.value) return

    isPlayerEnabled.value = enabled
    if (!enabled && isPlayerMinimized.value) {
      isPlayerMinimized.value = false
      isMinimizedRailVisible.value = false
    }
  }

  const toggleMusic = () => {
    if (!ytPlayer || !isPlayerReady) return

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
    if (!ytPlayer || !isPlayerReady) return

    ytPlayer.nextVideo()
    window.setTimeout(updateCurrentSongTitle, 250)

    if (!isPlaying.value) {
      ytPlayer.playVideo()
      isPlaying.value = true
    }
  }

  const prevSong = () => {
    if (!ytPlayer || !isPlayerReady) return

    ytPlayer.previousVideo()
    window.setTimeout(updateCurrentSongTitle, 250)

    if (!isPlaying.value) {
      ytPlayer.playVideo()
      isPlaying.value = true
    }
  }

  const setVolume = (nextVolume) => {
    if (Number.isFinite(nextVolume)) {
      volume.value = Math.max(0, Math.min(100, nextVolume))
    }

    if (!ytPlayer || !isPlayerReady) return

    ytPlayer.setVolume(volume.value)
    if (isMuted.value && volume.value > 0) {
      ytPlayer.unMute()
      isMuted.value = false
    }
  }

  const toggleMute = () => {
    if (!ytPlayer || !isPlayerReady) return

    if (isMuted.value) {
      ytPlayer.unMute()
      isMuted.value = false
      return
    }

    ytPlayer.mute()
    isMuted.value = true
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

  onMounted(async () => {
    viewportMediaQuery = window.matchMedia(`(min-width: ${playerMinWidth}px)`)
    isPlayerEnabled.value = viewportMediaQuery.matches
    await initPlayer()

    viewportChangeHandler = () => {
      syncPlayerByViewport()
    }

    if (typeof viewportMediaQuery.addEventListener === 'function') {
      viewportMediaQuery.addEventListener('change', viewportChangeHandler)
    } else {
      viewportMediaQuery.addListener(viewportChangeHandler)
    }
  })

  onUnmounted(() => {
    if (viewportMediaQuery && viewportChangeHandler) {
      if (typeof viewportMediaQuery.removeEventListener === 'function') {
        viewportMediaQuery.removeEventListener('change', viewportChangeHandler)
      } else {
        viewportMediaQuery.removeListener(viewportChangeHandler)
      }
    }

    viewportChangeHandler = null
    viewportMediaQuery = null
    destroyPlayer()
  })

  watch(defaultSongTitle, (nextTitle) => {
    if (!isPlaying.value) {
      currentSongTitle.value = nextTitle || ''
    }
  })

  watch(defaultSongAuthor, (nextAuthor) => {
    if (!isPlaying.value) {
      currentSongAuthor.value = nextAuthor || ''
    }
  })

  return {
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
  }
}
