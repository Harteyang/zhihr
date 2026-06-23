import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import merge from 'deepmerge';

import { sounds as soundCategories } from '@/data/sounds';
import { pickMany, random } from '@/helpers/random';

type SoundValue = {
  isFavorite: boolean;
  isSelected: boolean;
  volume: number;
};

interface SoundStore {
  getFavorites: () => Array<string>;
  history: Record<string, SoundValue> | null;
  isPlaying: boolean;
  lock: () => void;
  locked: boolean;
  noSelected: () => boolean;
  override: (sounds: Record<string, number>) => void;
  pause: () => void;
  play: () => void;
  restoreHistory: () => void;
  select: (id: string) => void;
  setVolume: (id: string, volume: number) => void;
  shuffle: () => void;
  sounds: Record<string, SoundValue>;
  staggeredPlay: () => void;
  stopAll: () => void;
  toggleFavorite: (id: string) => void;
  togglePlay: () => void;
  unlock: () => void;
  unselect: (id: string) => void;
  unselectAll: (pushToHistory?: boolean) => void;
}

function createInitialSounds() {
  const initialSounds: Record<string, SoundValue> = {};

  soundCategories.categories.forEach(category => {
    category.sounds.forEach(sound => {
      initialSounds[sound.id] = {
        isFavorite: false,
        isSelected: false,
        volume: 0.5,
      };
    });
  });

  return initialSounds;
}

export const useSoundStore = create<SoundStore>()(
  persist(
    (set, get) => ({
      getFavorites() {
        const { sounds } = get();
        const ids = Object.keys(sounds);
        const favorites = ids.filter(id => sounds[id].isFavorite);

        return favorites;
      },

      history: null,
      isPlaying: false,

      lock() {
        set({ locked: true });
      },

      locked: false,

      noSelected() {
        const { sounds } = get();
        const keys = Object.keys(sounds);

        return keys.every(key => !sounds[key].isSelected);
      },

      override(newSounds) {
        get().unselectAll();

        const sounds = get().sounds;

        Object.keys(newSounds).forEach(sound => {
          if (sounds[sound]) {
            sounds[sound].isSelected = true;
            sounds[sound].volume = newSounds[sound];
          }
        });

        set({ history: null, sounds: { ...sounds } });
      },

      pause() {
        get().stopAll();
      },

      play() {
        get().staggeredPlay();
      },

      restoreHistory() {
        const history = get().history;

        if (!history) return;

        set({ history: null, sounds: history });
      },

      select(id) {
        set({
          history: null,
          sounds: {
            ...get().sounds,
            [id]: { ...get().sounds[id], isSelected: true },
          },
        });

        // If already playing, dispatch staggered play for this specific sound
        // with a delay based on its position in the sequence
        if (get().isPlaying) {
          const { sounds } = get();
          const selectedIds = Object.keys(sounds).filter(s => sounds[s].isSelected);
          const index = selectedIds.indexOf(id);
          if (index >= 0) {
            const STAGGER_DELAY = 2000;
            setTimeout(() => {
              const currentSounds = get().sounds;
              if (currentSounds[id]?.isSelected && !get().locked) {
                document.dispatchEvent(
                  new CustomEvent('STAGGERED_PLAY', { detail: { id } }),
                );
              }
            }, index * STAGGER_DELAY);
          }
        }
      },

      setVolume(id, volume) {
        set({
          sounds: {
            ...get().sounds,
            [id]: { ...get().sounds[id], volume },
          },
        });
      },

      shuffle() {
        const { sounds } = get();

        // Build a new sounds object instead of mutating the existing one
        const ids = Object.keys(sounds);
        const nextSounds: Record<string, SoundValue> = {};

        for (const id of ids) {
          nextSounds[id] = {
            ...sounds[id],
            isSelected: false,
            volume: 0.5,
          };
        }

        const randomIDs = pickMany(ids, 4);

        for (const id of randomIDs) {
          nextSounds[id] = {
            ...nextSounds[id],
            isSelected: true,
            volume: random(0.2, 1),
          };
        }

        // Lock during shuffle to prevent re-entrance
        set({ locked: true, history: null, isPlaying: false, sounds: nextSounds });

        // Use staggered play instead of immediate play
        setTimeout(() => {
          get().staggeredPlay();
        }, 100);
      },

      staggeredPlay() {
        // Get all selected sounds
        const { sounds } = get();
        const selectedIds = Object.keys(sounds).filter(id => sounds[id].isSelected);

        if (selectedIds.length === 0) {
          set({ isPlaying: false });
          return;
        }

        // Staggered play: each sound starts 2 seconds after the previous one
        const STAGGER_DELAY = 2000; // 2 seconds between each sound

        selectedIds.forEach((id, index) => {
          setTimeout(() => {
            // Only play if still selected and store is not locked
            const currentSounds = get().sounds;
            if (currentSounds[id]?.isSelected && !get().locked) {
              // Dispatch a custom event to trigger play for this specific sound
              const event = new CustomEvent('STAGGERED_PLAY', {
                detail: { id, index },
              });
              document.dispatchEvent(event);
            }
          }, index * STAGGER_DELAY);
        });

        set({ isPlaying: true });
      },

      stopAll() {
        // Dispatch a custom event to stop all sounds
        document.dispatchEvent(new CustomEvent('STOP_ALL'));
        set({ isPlaying: false });
      },

      sounds: createInitialSounds(),

      toggleFavorite(id) {
        const sounds = get().sounds;
        const sound = sounds[id];

        set({
          history: null,
          sounds: {
            ...sounds,
            [id]: { ...sound, isFavorite: !sound.isFavorite },
          },
        });
      },

      togglePlay() {
        const currentlyPlaying = get().isPlaying;
        if (currentlyPlaying) {
          get().stopAll();
        } else {
          get().staggeredPlay();
        }
      },

      unlock() {
        set({ locked: false });
      },

      unselect(id) {
        // Stop this specific sound if playing
        document.dispatchEvent(
          new CustomEvent('STOP_SINGLE', { detail: { id } }),
        );
        set({
          sounds: {
            ...get().sounds,
            [id]: { ...get().sounds[id], isSelected: false },
          },
        });
      },

      unselectAll(pushToHistory = false) {
        const noSelected = get().noSelected();

        if (noSelected) return;

        const sounds = get().sounds;

        if (pushToHistory) {
          const history = JSON.parse(JSON.stringify(sounds));
          set({ history });
        }

        const ids = Object.keys(sounds);

        ids.forEach(id => {
          sounds[id].isSelected = false;
          sounds[id].volume = 0.5;
        });

        set({ sounds });
      },
    }),
    {
      merge: (persisted, current) =>
        merge(
          current,
          // @ts-expect-error
          persisted,
        ),
      name: 'moodist-sounds',
      partialize: state => ({
        sounds: state.sounds,
      }),
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      version: 0,
    },
  ),
);
