import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      currentTrack: null,
      currentPlay: null,
      queue: [],
      isPlaying: false,
      progress: 0,
      duration: 0,
      volume: 1,
      progressMap: {},

      playPlay: (play) => {
        const parts = play.parts.map(p => ({
          ...p,
          playId: play.id,
          playTitle: play.title,
          playAuthor: play.author,
        }))
        set({
          queue: parts,
          currentTrack: parts[0],
          currentPlay: play,
          isPlaying: true,
          progress: get().progressMap[parts[0].url] || 0,
        })
      },

      playPart: (play, index, track) => {
        if (track) {
          set({
            currentTrack: track,
            currentPlay: null,
            isPlaying: true,
            progress: get().progressMap[track.url] || 0,
          })
          return
        }
        const parts = play.parts.map(p => ({
          ...p,
          playId: play.id,
          playTitle: play.title,
          playAuthor: play.author,
        }))
        set({
          queue: parts,
          currentTrack: parts[index],
          currentPlay: play,
          isPlaying: true,
          progress: get().progressMap[parts[index].url] || 0,
        })
      },

      addPlayToQueue: (play) => {
        const parts = play.parts.map(p => ({
          ...p,
          playId: play.id,
          playTitle: play.title,
          playAuthor: play.author,
        }))
        set(s => ({ queue: [...s.queue, ...parts] }))
      },

      togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

      next: () => {
        const { queue, currentTrack, progressMap } = get()
        if (!queue.length) return
        const idx = queue.findIndex(t => t.id === currentTrack?.id)
        const nextIdx = idx + 1
        if (nextIdx >= queue.length) {
          set({ isPlaying: false, progress: 0 })
          return
        }
        const nextTrack = queue[nextIdx]
        set({
          currentTrack: nextTrack,
          progress: progressMap[nextTrack.url] || 0,
        })
      },

      prev: () => {
        const { queue, currentTrack, progressMap } = get()
        if (!queue.length) return
        const idx = queue.findIndex(t => t.id === currentTrack?.id)
        const prevIdx = (idx - 1 + queue.length) % queue.length
        const prevTrack = queue[prevIdx]
        set({
          currentTrack: prevTrack,
          progress: progressMap[prevTrack.url] || 0,
        })
      },

      removeFromQueue: (index) => set(s => ({
        queue: s.queue.filter((_, i) => i !== index),
      })),

      clearQueue: () => set({ queue: [], currentTrack: null, currentPlay: null, isPlaying: false }),

      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),

      saveProgress: (url, seconds) => set(s => ({
        progressMap: { ...s.progressMap, [url]: seconds },
      })),

      getPartProgress: (url) => get().progressMap[url] || 0,

      clearPartProgress: (url) => set(s => {
        const { [url]: _, ...rest } = s.progressMap
        return { progressMap: rest }
      }),
    }),
    {
      name: 'golosa-player',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        progressMap: state.progressMap,
        queue: state.queue,
        currentTrack: state.currentTrack,
        currentPlay: state.currentPlay,
      }),
    }
  )
)
