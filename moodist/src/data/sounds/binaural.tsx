import { TbWaveSine } from 'react-icons/tb/index';
import { BsSoundwave } from 'react-icons/bs/index';

import type { Category } from '../types';

import { getAssetPath } from '@/helpers/path';

export const binaural: Category = {
  icon: <TbWaveSine />,
  id: 'binaural',
  sounds: [
    {
      icon: <BsSoundwave />,
      id: 'binaural-delta',
      label: 'δ波',
      src: getAssetPath('/sounds/binaural/binaural-delta.wav'),
    },
    {
      icon: <BsSoundwave />,
      id: 'binaural-theta',
      label: 'θ波',
      src: getAssetPath('/sounds/binaural/binaural-theta.wav'),
    },
    {
      icon: <BsSoundwave />,
      id: 'binaural-alpha',
      label: 'α波',
      src: getAssetPath('/sounds/binaural/binaural-alpha.wav'),
    },
    {
      icon: <BsSoundwave />,
      id: 'binaural-beta',
      label: 'β波',
      src: getAssetPath('/sounds/binaural/binaural-beta.wav'),
    },
    {
      icon: <BsSoundwave />,
      id: 'binaural-gamma',
      label: 'γ波',
      src: getAssetPath('/sounds/binaural/binaural-gamma.wav'),
    },
  ],
  title: '双耳节拍',
};
