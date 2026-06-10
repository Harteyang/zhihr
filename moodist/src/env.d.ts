/// <reference types="astro/client" />

declare module '*.module.css';

declare global {
  interface Navigator {
    readonly audioSession?: {
      type: 'playback' | 'ambient';
    };
  }
}

export {};
