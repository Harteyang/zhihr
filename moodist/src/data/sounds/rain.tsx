import {
  BsFillCloudRainFill,
  BsFillCloudRainHeavyFill,
  BsUmbrellaFill,
} from 'react-icons/bs/index';
import { GiWindow } from 'react-icons/gi/index';
import { FaLeaf, FaCarSide } from 'react-icons/fa/index';
import { PiTentFill } from 'react-icons/pi/index';
import { MdOutlineThunderstorm } from 'react-icons/md/index';

import type { Category } from '../types';

import { getAssetPath } from '@/helpers/path';

export const rain: Category = {
  icon: <BsFillCloudRainFill />,
  id: 'rain',
  sounds: [
    {
      icon: <BsFillCloudRainFill />,
      id: 'light-rain',
      label: '小雨',
      src: getAssetPath('/sounds/rain/light-rain.mp3'),
    },
    {
      icon: <BsFillCloudRainHeavyFill />,
      id: 'heavy-rain',
      label: '大雨',
      src: getAssetPath('/sounds/rain/heavy-rain.mp3'),
    },
    {
      icon: <MdOutlineThunderstorm />,
      id: 'thunder',
      label: '雷声',
      src: getAssetPath('/sounds/rain/thunder.mp3'),
    },
    {
      icon: <GiWindow />,
      id: 'rain-on-window',
      label: '窗边雨声',
      src: getAssetPath('/sounds/rain/rain-on-window.mp3'),
    },
    {
      icon: <FaCarSide />,
      id: 'rain-on-car-roof',
      label: '车顶雨声',
      src: getAssetPath('/sounds/rain/rain-on-car-roof.mp3'),
    },
    {
      icon: <BsUmbrellaFill />,
      id: 'rain-on-umbrella',
      label: '伞上雨声',
      src: getAssetPath('/sounds/rain/rain-on-umbrella.mp3'),
    },
    {
      icon: <PiTentFill />,
      id: 'rain-on-tent',
      label: '帐篷雨声',
      src: getAssetPath('/sounds/rain/rain-on-tent.mp3'),
    },
    {
      icon: <FaLeaf />,
      id: 'rain-on-leaves',
      label: '叶上雨声',
      src: getAssetPath('/sounds/rain/rain-on-leaves.mp3'),
    },
  ],
  title: '雨声',
};
