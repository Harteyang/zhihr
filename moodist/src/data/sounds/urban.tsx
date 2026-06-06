import { BiSolidTraffic } from 'react-icons/bi/index';
import { FaCity, FaRoad } from 'react-icons/fa/index';
import { PiRoadHorizonFill, PiSirenBold } from 'react-icons/pi/index';
import { BsSoundwave, BsPeopleFill } from 'react-icons/bs/index';
import { RiSparkling2Fill } from 'react-icons/ri/index';

import type { Category } from '../types';

import { getAssetPath } from '@/helpers/path';

export const urban: Category = {
  icon: <FaCity />,
  id: 'urban',
  sounds: [
    {
      icon: <PiRoadHorizonFill />,
      id: 'highway',
      label: '高速公路',
      src: getAssetPath('/sounds/urban/highway.mp3'),
    },
    {
      icon: <FaRoad />,
      id: 'road',
      label: '公路',
      src: getAssetPath('/sounds/urban/road.mp3'),
    },
    {
      icon: <PiSirenBold />,
      id: 'ambulance-siren',
      label: '救护车',
      src: getAssetPath('/sounds/urban/ambulance-siren.mp3'),
    },
    {
      icon: <BsSoundwave />,
      id: 'busy-street',
      label: '繁忙街道',
      src: getAssetPath('/sounds/urban/busy-street.mp3'),
    },
    {
      icon: <BsPeopleFill />,
      id: 'crowd',
      label: '人群',
      src: getAssetPath('/sounds/urban/crowd.mp3'),
    },
    {
      icon: <BiSolidTraffic />,
      id: 'traffic',
      label: '车流',
      src: getAssetPath('/sounds/urban/traffic.mp3'),
    },
    {
      icon: <RiSparkling2Fill />,
      id: 'fireworks',
      label: '烟花',
      src: getAssetPath('/sounds/urban/fireworks.mp3'),
    },
  ],
  title: '城市',
};
