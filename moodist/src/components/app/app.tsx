import { useMemo, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BiSolidHeart } from 'react-icons/bi/index';
import { Howler } from 'howler';

import { useSoundStore } from '@/stores/sound';

import { Container } from '@/components/container';
import { StoreConsumer } from '@/components/store-consumer';
import { Buttons } from '@/components/buttons';
import { Categories } from '@/components/categories';
import { SharedModal } from '@/components/modals/shared';
import { Toolbar } from '@/components/toolbar';
import { SnackbarProvider, useSnackbar } from '@/contexts/snackbar';
import { MediaControls } from '@/components/media-controls';

import { sounds } from '@/data/sounds';
import { FADE_OUT } from '@/constants/events';

import type { Sound } from '@/data/types';
import { subscribe } from '@/lib/event';

function ShareHandler() {
  const show = useSnackbar();
  const override = useSoundStore(state => state.override);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || typeof window === 'undefined') return;
    initialized.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    const shareParam = searchParams.get('share');

    if (shareParam) {
      try {
        const raw = JSON.parse(decodeURIComponent(shareParam));
        if (typeof raw !== 'object' || raw === null) return;

        // Validate that all values are numbers
        const selectedSounds: Record<string, number> = {};
        for (const [key, value] of Object.entries(raw)) {
          if (typeof value === 'number' && !Number.isNaN(value)) {
            selectedSounds[key] = value;
          }
        }

        if (Object.keys(selectedSounds).length > 0) {
          override(selectedSounds);
          show('已加载分享的声音选择，点击播放按钮开始播放', 5000);
          // Clean up the URL by removing the share parameter
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        }
      } catch (e) {
        console.error('Failed to parse share link:', e);
      }
    }
  }, [override, show]);

  return null;
}

export function App() {
  const categories = useMemo(() => sounds.categories, []);

  const favorites = useSoundStore(useShallow(state => state.getFavorites()));
  const pause = useSoundStore(state => state.pause);
  const lock = useSoundStore(state => state.lock);
  const unlock = useSoundStore(state => state.unlock);

  const favoriteSounds = useMemo(() => {
    const favoriteSounds = categories
      .map(category => category.sounds)
      .flat()
      .filter(sound => favorites.includes(sound.id));

    /**
     * Reorder based on the order of favorites
     */
    return favorites.map(favorite =>
      favoriteSounds.find(sound => sound.id === favorite),
    );
  }, [favorites, categories]);

  useEffect(() => {
    const onChange = () => {
      const { ctx } = Howler;

      if (ctx && !document.hidden) {
        setTimeout(() => {
          if (ctx.state === 'closed') {
            Howler.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          (Howler.ctx as AudioContext).resume();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', onChange, false);

    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(FADE_OUT, (e: { duration: number }) => {
      lock();

      setTimeout(() => {
        pause();
        unlock();
      }, e.duration);
    });

    return unsubscribe;
  }, [pause, lock, unlock]);

  const allCategories = useMemo(() => {
    const favorites = [];

    if (favoriteSounds.length) {
      favorites.push({
        icon: <BiSolidHeart />,
        id: 'favorites',
        sounds: favoriteSounds as Array<Sound>,
        title: '收藏',
      });
    }

    return [...favorites, ...categories];
  }, [favoriteSounds, categories]);

  return (
    <SnackbarProvider>
      <StoreConsumer>
        <MediaControls />
        <Container>
          <div id="app" />
          <Buttons />
          <Categories categories={allCategories} />
        </Container>

        <Toolbar />
        <SharedModal />
        <ShareHandler />
      </StoreConsumer>
    </SnackbarProvider>
  );
}
