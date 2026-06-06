import { BiSolidTrain, BiSolidPlaneAlt } from 'react-icons/bi/index';
import { FaCarSide } from 'react-icons/fa/index';
import { GiSubmarine, GiSailboat } from 'react-icons/gi/index';
import { TbSailboat } from 'react-icons/tb/index';

import type { Category } from '../types';

import { getAssetPath } from '@/helpers/path';

export const transport: Category = {
  icon: <FaCarSide />,
  id: 'transport',
  sounds: [
    {
      icon: <BiSolidTrain />,
      id: 'train',
      label: '火车',
      src: getAssetPath('/sounds/transport/train.mp3'),
    },
    {
      icon: <BiSolidTrain />,
      id: 'inside-a-train',
      label: '列车内',
      src: getAssetPath('/sounds/transport/inside-a-train.mp3'),
    },
    {
      icon: <BiSolidPlaneAlt />,
      id: 'airplane',
      label: '飞机',
      src: getAssetPath('/sounds/transport/airplane.mp3'),
    },
    {
      icon: <GiSubmarine />,
      id: 'submarine',
      label: '潜艇',
      src: getAssetPath('/sounds/transport/submarine.mp3'),
    },
    {
      icon: <GiSailboat />,
      id: 'sailboat',
      label: '帆船',
      src: getAssetPath('/sounds/transport/sailboat.mp3'),
    },
    {
      icon: <TbSailboat />,
      id: 'rowing-boat',
      label: '划船',
      src: getAssetPath('/sounds/transport/rowing-boat.mp3'),
    },
  ],
  title: '交通',
};
