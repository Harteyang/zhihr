import {
  GiCricket,
  GiSeagull,
  GiWolfHead,
  GiOwl,
  GiWhaleTail,
  GiTreeBeehive,
  GiEgyptianBird,
  GiChicken,
  GiCow,
  GiSheep,
} from 'react-icons/gi/index';
import {
  FaDog,
  FaFrog,
  FaHorseHead,
  FaCat,
  FaCrow,
} from 'react-icons/fa/index';
import { PiBirdFill, PiDogBold } from 'react-icons/pi/index';

import type { Category } from '../types';

import { getAssetPath } from '@/helpers/path';

export const animals: Category = {
  icon: <FaDog />,
  id: 'animals',
  sounds: [
    {
      icon: <PiBirdFill />,
      id: 'birds',
      label: '鸟鸣',
      src: getAssetPath('/sounds/animals/birds.mp3'),
    },
    {
      icon: <GiSeagull />,
      id: 'seagulls',
      label: '海鸥',
      src: getAssetPath('/sounds/animals/seagulls.mp3'),
    },
    {
      icon: <GiCricket />,
      id: 'crickets',
      label: '蟋蟀',
      src: getAssetPath('/sounds/animals/crickets.mp3'),
    },
    {
      icon: <GiWolfHead />,
      id: 'wolf',
      label: '狼嚎',
      src: getAssetPath('/sounds/animals/wolf.mp3'),
    },
    {
      icon: <GiOwl />,
      id: 'owl',
      label: '猫头鹰',
      src: getAssetPath('/sounds/animals/owl.mp3'),
    },
    {
      icon: <FaFrog />,
      id: 'frog',
      label: '青蛙',
      src: getAssetPath('/sounds/animals/frog.mp3'),
    },
    {
      icon: <PiDogBold />,
      id: 'dog-barking',
      label: '狗叫',
      src: getAssetPath('/sounds/animals/dog-barking.mp3'),
    },
    {
      icon: <FaHorseHead />,
      id: 'horse-gallop',
      label: '马蹄声',
      src: getAssetPath('/sounds/animals/horse-gallop.mp3'),
    },
    {
      icon: <FaCat />,
      id: 'cat-purring',
      label: '猫呼噜',
      src: getAssetPath('/sounds/animals/cat-purring.mp3'),
    },
    {
      icon: <FaCrow />,
      id: 'crows',
      label: '乌鸦',
      src: getAssetPath('/sounds/animals/crows.mp3'),
    },
    {
      icon: <GiWhaleTail />,
      id: 'whale',
      label: '鲸鱼',
      src: getAssetPath('/sounds/animals/whale.mp3'),
    },
    {
      icon: <GiTreeBeehive />,
      id: 'beehive',
      label: '蜂巢',
      src: getAssetPath('/sounds/animals/beehive.mp3'),
    },
    {
      icon: <GiEgyptianBird />,
      id: 'woodpecker',
      label: '啄木鸟',
      src: getAssetPath('/sounds/animals/woodpecker.mp3'),
    },
    {
      icon: <GiChicken />,
      id: 'chickens',
      label: '鸡群',
      src: getAssetPath('/sounds/animals/chickens.mp3'),
    },
    {
      icon: <GiCow />,
      id: 'cows',
      label: '牛群',
      src: getAssetPath('/sounds/animals/cows.mp3'),
    },
    {
      icon: <GiSheep />,
      id: 'sheep',
      label: '羊群',
      src: getAssetPath('/sounds/animals/sheep.mp3'),
    },
  ],
  title: '动物',
};
