import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { Howl } from 'howler';

import { useLoadingStore } from '@/stores/loading';
import { subscribe } from '@/lib/event';
import { useSSR } from './use-ssr';
import { FADE_OUT, STOP_ALL, STOP_SINGLE, STAGGERED_PLAY } from '@/constants/events';

const DEFAULT_FADE_DURATION = 250;
const FADE_IN_DURATION = 500; // 500ms fade-in for smooth entry
const KEEP_ALIVE_INTERVAL = 3000;

/**
 * A custom React hook to manage sound playback using Howler.js with additional features.
 *
 * This hook initializes a Howl instance for playing sound effects in the browser,
 * and provides control functions to play, stop, pause, and fade out the sound.
 * It also handles loading state management and supports event subscription for fade-out effects.
 *
 * @param {string} src - The source URL of the sound file.
 * @param {Object} [options] - Options for sound playback.
 * @param {boolean} [options.loop=false] - Whether the sound should loop.
 * @param {number} [options.volume=0.5] - The initial volume of the sound, ranging from 0.0 to 1.0.
 * @returns {{ play: () => void, stop: () => void, pause: () => void, fadeOut: (duration: number) => void, isLoading: boolean }} An object containing control functions for the sound:
 *   - play: Function to play the sound.
 *   - stop: Function to stop the sound.
 *   - pause: Function to pause the sound.
 *   - fadeOut: Function to fade out the sound over a given duration.
 *   - isLoading: A boolean indicating if the sound is currently loading.
 */
export function useSound(
  src: string,
  options: { loop?: boolean; preload?: boolean; volume?: number } = {},
  html5: boolean = false,
) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const isLoading = useLoadingStore(state => state.loaders[src]);
  const setIsLoading = useLoadingStore(state => state.set);
  const transitionToken = useRef(0);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetVolume = useRef(options.volume ?? 0.5);
  const isFadingOut = useRef(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const loopRef = useRef(options.loop ?? false);

  const { isBrowser } = useSSR();
  const sound = useMemo<Howl | null>(() => {
    let sound: Howl | null = null;

    if (isBrowser) {
      sound = new Howl({
        html5,
        onload: () => {
          setIsLoading(src, false);
          setHasLoaded(true);
        },
        preload: options.preload ?? false,
        src: src,
      });

      if (window.navigator.audioSession) {
        window.navigator.audioSession.type = 'playback';
      }
    }

    return sound;
  }, [src, isBrowser, setIsLoading, html5, options.preload]);

  useEffect(() => {
    if (sound) {
      sound.loop(options.loop ?? false);
    }
  }, [sound, options.loop]);

  useEffect(() => {
    targetVolume.current = options.volume ?? 0.5;

    if (sound && !isFadingOut.current) {
      sound.volume(targetVolume.current);
    }
  }, [sound, options.volume]);

  // Sync refs for keep-alive interval (avoids stale closures)
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    loopRef.current = options.loop ?? false;
  }, [options.loop]);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const startKeepAlive = useCallback(() => {
    stopKeepAlive();

    // Periodically check if the sound has stopped unexpectedly (e.g., mobile
    // screen-off pausing HTML5 audio) and restart it when loop is enabled.
    keepAliveRef.current = setInterval(() => {
      const s = soundRef.current;
      if (s && loopRef.current && !s.playing()) {
        s.play();
      }
    }, KEEP_ALIVE_INTERVAL);
  }, [stopKeepAlive]);

  const clearFadeTimeout = useCallback(() => {
    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current);
      fadeTimeout.current = null;
    }
  }, []);

  const play = useCallback(
    (cb?: () => void) => {
      if (sound) {
        transitionToken.current += 1;
        isFadingOut.current = false;
        clearFadeTimeout();

        if (!hasLoaded && !isLoading) {
          setIsLoading(src, true);
          sound.load();
        }

        if (!sound.playing()) {
          sound.play();
        }

        const currentVolume = sound.volume();
        const nextVolume = targetVolume.current;

        if (currentVolume !== nextVolume) {
          sound.fade(currentVolume, nextVolume, DEFAULT_FADE_DURATION);
        }

        if (typeof cb === 'function') sound.once('end', cb);
      }

      startKeepAlive();
    },
    [src, setIsLoading, sound, hasLoaded, isLoading, clearFadeTimeout, startKeepAlive],
  );

  const stop = useCallback(() => {
    stopKeepAlive();

    transitionToken.current += 1;
    isFadingOut.current = false;
    clearFadeTimeout();

    if (sound) {
      sound.stop();
      sound.volume(targetVolume.current);
    }
  }, [sound, clearFadeTimeout, stopKeepAlive]);

  // Handle STOP_ALL event - stop immediately without fade
  useEffect(() => {
    const handler = () => {
      if (sound && sound.playing()) {
        stopKeepAlive();
        sound.stop();
        sound.volume(targetVolume.current);
      }
    };

    const unsubscribe = subscribe(STOP_ALL, handler);
    return unsubscribe;
  }, [sound, stopKeepAlive]);

  // Handle STOP_SINGLE event - stop only if this sound's ID matches
  useEffect(() => {
    const handler = (e: { id: string }) => {
      if (e.id === src && sound && sound.playing()) {
        stopKeepAlive();
        sound.stop();
        sound.volume(targetVolume.current);
      }
    };

    const unsubscribe = subscribe(STOP_SINGLE, handler);
    return unsubscribe;
  }, [sound, src, stopKeepAlive]);

  // Handle STAGGERED_PLAY event - play only if this sound's ID matches
  useEffect(() => {
    const handler = (e: { id: string }) => {
      if (e.id === src && sound && !sound.playing()) {
        transitionToken.current += 1;
        isFadingOut.current = false;
        clearFadeTimeout();

        // Start from 0 volume for fade-in effect
        sound.volume(0);
        sound.play();
        startKeepAlive();

        // Fade in to target volume
        sound.fade(0, targetVolume.current, FADE_IN_DURATION);
      }
    };

    const unsubscribe = subscribe(STAGGERED_PLAY, handler);
    return unsubscribe;
  }, [sound, src, startKeepAlive, clearFadeTimeout]);

  const pause = useCallback(
    (duration: number = DEFAULT_FADE_DURATION) => {
      if (!sound) return;

      stopKeepAlive();

      transitionToken.current += 1;
      const token = transitionToken.current;
      isFadingOut.current = true;
      clearFadeTimeout();

      if (!sound.playing()) {
        isFadingOut.current = false;
        sound.volume(targetVolume.current);
        return;
      }

      const currentVolume = sound.volume();

      if (duration <= 0 || currentVolume <= 0) {
        sound.pause();
        isFadingOut.current = false;
        sound.volume(targetVolume.current);
        return;
      }

      sound.fade(currentVolume, 0, duration);

      fadeTimeout.current = setTimeout(() => {
        if (transitionToken.current !== token) return;

        sound.pause();
        isFadingOut.current = false;
        sound.volume(targetVolume.current);
      }, duration);
    },
    [sound, clearFadeTimeout, stopKeepAlive],
  );

  const fadeOut = useCallback(
    (duration: number) => {
      pause(duration);
    },
    [pause],
  );

  useEffect(() => {
    const listener = (e: { duration: number }) => fadeOut(e.duration);

    return subscribe(FADE_OUT, listener);
  }, [fadeOut]);

  useEffect(() => {
    return () => clearFadeTimeout();
  }, [clearFadeTimeout]);

  useEffect(() => {
    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    };
  }, []);

  const control = useMemo(
    () => ({ fadeOut, isLoading, pause, play, stop }),
    [play, stop, pause, isLoading, fadeOut],
  );

  return control;
}
