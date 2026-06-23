const SOUND_BASE = '.';
const STORAGE_KEY = 'moodist-lite';
const FADE_DURATION = 250;

const CATEGORIES = [
  {
    id: 'nature', title: '自然', icon: 'solar-panel',
    sounds: [
      { id: 'river', label: '溪流', src: SOUND_BASE + '/sounds/nature/river.mp3' },
      { id: 'waves', label: '海浪', src: SOUND_BASE + '/sounds/nature/waves.mp3' },
      { id: 'campfire', label: '篝火', src: SOUND_BASE + '/sounds/nature/campfire.mp3' },
      { id: 'wind', label: '风声', src: SOUND_BASE + '/sounds/nature/wind.mp3' },
      { id: 'howling-wind', label: '呼啸的风', src: SOUND_BASE + '/sounds/nature/howling-wind.mp3' },
      { id: 'wind-in-trees', label: '林间风声', src: SOUND_BASE + '/sounds/nature/wind-in-trees.mp3' },
      { id: 'waterfall', label: '瀑布', src: SOUND_BASE + '/sounds/nature/waterfall.mp3' },
      { id: 'walk-in-snow', label: '雪地行走', src: SOUND_BASE + '/sounds/nature/walk-in-snow.mp3' },
      { id: 'walk-on-leaves', label: '踩落叶', src: SOUND_BASE + '/sounds/nature/walk-on-leaves.mp3' },
      { id: 'walk-on-gravel', label: '踩石子路', src: SOUND_BASE + '/sounds/nature/walk-on-gravel.mp3' },
      { id: 'droplets', label: '水滴', src: SOUND_BASE + '/sounds/nature/droplets.mp3' },
      { id: 'jungle', label: '丛林', src: SOUND_BASE + '/sounds/nature/jungle.mp3' },
    ]
  },
  {
    id: 'rain', title: '雨', icon: 'cloud-rain',
    sounds: [
      { id: 'light-rain', label: '小雨', src: SOUND_BASE + '/sounds/rain/light-rain.mp3' },
      { id: 'heavy-rain', label: '大雨', src: SOUND_BASE + '/sounds/rain/heavy-rain.mp3' },
      { id: 'thunder', label: '雷声', src: SOUND_BASE + '/sounds/rain/thunder.mp3' },
      { id: 'rain-on-window', label: '雨打窗户', src: SOUND_BASE + '/sounds/rain/rain-on-window.mp3' },
      { id: 'rain-on-car-roof', label: '雨打车顶', src: SOUND_BASE + '/sounds/rain/rain-on-car-roof.mp3' },
      { id: 'rain-on-umbrella', label: '雨打伞面', src: SOUND_BASE + '/sounds/rain/rain-on-umbrella.mp3' },
      { id: 'rain-on-tent', label: '雨打帐篷', src: SOUND_BASE + '/sounds/rain/rain-on-tent.mp3' },
      { id: 'rain-on-leaves', label: '雨打树叶', src: SOUND_BASE + '/sounds/rain/rain-on-leaves.mp3' },
    ]
  },
  {
    id: 'animals', title: '动物', icon: 'dog',
    sounds: [
      { id: 'birds', label: '鸟鸣', src: SOUND_BASE + '/sounds/animals/birds.mp3' },
      { id: 'crickets', label: '蟋蟀', src: SOUND_BASE + '/sounds/animals/crickets.mp3' },
      { id: 'owl', label: '猫头鹰', src: SOUND_BASE + '/sounds/animals/owl.mp3' },
      { id: 'seagulls', label: '海鸥', src: SOUND_BASE + '/sounds/animals/seagulls.mp3' },
      { id: 'crows', label: '乌鸦', src: SOUND_BASE + '/sounds/animals/crows.mp3' },
      { id: 'frog', label: '青蛙', src: SOUND_BASE + '/sounds/animals/frog.mp3' },
      { id: 'dog-barking', label: '狗吠', src: SOUND_BASE + '/sounds/animals/dog-barking.mp3' },
      { id: 'wolf', label: '狼嚎', src: SOUND_BASE + '/sounds/animals/wolf.mp3' },
      { id: 'horse-gallop', label: '马奔腾', src: SOUND_BASE + '/sounds/animals/horse-gallop.mp3' },
      { id: 'cat-purring', label: '猫呼噜', src: SOUND_BASE + '/sounds/animals/cat-purring.mp3' },
      { id: 'beehive', label: '蜜蜂', src: SOUND_BASE + '/sounds/animals/beehive.mp3' },
      { id: 'chickens', label: '鸡', src: SOUND_BASE + '/sounds/animals/chickens.mp3' },
      { id: 'cows', label: '牛', src: SOUND_BASE + '/sounds/animals/cows.mp3' },
      { id: 'sheep', label: '羊', src: SOUND_BASE + '/sounds/animals/sheep.mp3' },
      { id: 'woodpecker', label: '啄木鸟', src: SOUND_BASE + '/sounds/animals/woodpecker.mp3' },
      { id: 'whale', label: '鲸鱼', src: SOUND_BASE + '/sounds/animals/whale.mp3' },
    ]
  },
  {
    id: 'binaural', title: '双耳节拍', icon: 'headphones',
    sounds: [
      { id: 'binaural-delta', label: 'Delta (1-4Hz)', src: SOUND_BASE + '/sounds/binaural/binaural-delta.mp3' },
      { id: 'binaural-theta', label: 'Theta (4-8Hz)', src: SOUND_BASE + '/sounds/binaural/binaural-theta.mp3' },
      { id: 'binaural-alpha', label: 'Alpha (8-12Hz)', src: SOUND_BASE + '/sounds/binaural/binaural-alpha.mp3' },
      { id: 'binaural-beta', label: 'Beta (12-30Hz)', src: SOUND_BASE + '/sounds/binaural/binaural-beta.mp3' },
      { id: 'binaural-gamma', label: 'Gamma (30-50Hz)', src: SOUND_BASE + '/sounds/binaural/binaural-gamma.mp3' },
    ]
  },
  {
    id: 'urban', title: '城市', icon: 'building-2',
    sounds: [
      { id: 'highway', label: '高速公路', src: SOUND_BASE + '/sounds/urban/highway.mp3' },
      { id: 'road', label: '马路', src: SOUND_BASE + '/sounds/urban/road.mp3' },
      { id: 'ambulance-siren', label: '救护车', src: SOUND_BASE + '/sounds/urban/ambulance-siren.mp3' },
      { id: 'busy-street', label: '繁华街道', src: SOUND_BASE + '/sounds/urban/busy-street.mp3' },
      { id: 'crowd', label: '人群', src: SOUND_BASE + '/sounds/urban/crowd.mp3' },
      { id: 'traffic', label: '交通', src: SOUND_BASE + '/sounds/urban/traffic.mp3' },
      { id: 'fireworks', label: '烟花', src: SOUND_BASE + '/sounds/urban/fireworks.mp3' },
    ]
  },
  {
    id: 'places', title: '场所', icon: 'map-pin',
    sounds: [
      { id: 'cafe', label: '咖啡馆', src: SOUND_BASE + '/sounds/places/cafe.mp3' },
      { id: 'airport', label: '机场', src: SOUND_BASE + '/sounds/places/airport.mp3' },
      { id: 'church', label: '教堂', src: SOUND_BASE + '/sounds/places/church.mp3' },
      { id: 'temple', label: '寺庙', src: SOUND_BASE + '/sounds/places/temple.mp3' },
      { id: 'construction-site', label: '建筑工地', src: SOUND_BASE + '/sounds/places/construction-site.mp3' },
      { id: 'underwater', label: '水下', src: SOUND_BASE + '/sounds/places/underwater.mp3' },
      { id: 'crowded-bar', label: '拥挤的酒吧', src: SOUND_BASE + '/sounds/places/crowded-bar.mp3' },
      { id: 'night-village', label: '夜晚乡村', src: SOUND_BASE + '/sounds/places/night-village.mp3' },
      { id: 'subway-station', label: '地铁站', src: SOUND_BASE + '/sounds/places/subway-station.mp3' },
      { id: 'supermarket', label: '超市', src: SOUND_BASE + '/sounds/places/supermarket.mp3' },
      { id: 'restaurant', label: '餐厅', src: SOUND_BASE + '/sounds/places/restaurant.mp3' },
      { id: 'library', label: '图书馆', src: SOUND_BASE + '/sounds/places/library.mp3' },
      { id: 'office', label: '办公室', src: SOUND_BASE + '/sounds/places/office.mp3' },
      { id: 'laundry-room', label: '洗衣房', src: SOUND_BASE + '/sounds/places/laundry-room.mp3' },
      { id: 'laboratory', label: '实验室', src: SOUND_BASE + '/sounds/places/laboratory.mp3' },
      { id: 'carousel', label: '旋转木马', src: SOUND_BASE + '/sounds/places/carousel.mp3' },
    ]
  },
  {
    id: 'transport', title: '交通', icon: 'car',
    sounds: [
      { id: 'train', label: '火车', src: SOUND_BASE + '/sounds/transport/train.mp3' },
      { id: 'inside-a-train', label: '火车内', src: SOUND_BASE + '/sounds/transport/inside-a-train.mp3' },
      { id: 'airplane', label: '飞机', src: SOUND_BASE + '/sounds/transport/airplane.mp3' },
      { id: 'submarine', label: '潜艇', src: SOUND_BASE + '/sounds/transport/submarine.mp3' },
      { id: 'sailboat', label: '帆船', src: SOUND_BASE + '/sounds/transport/sailboat.mp3' },
      { id: 'rowing-boat', label: '划船', src: SOUND_BASE + '/sounds/transport/rowing-boat.mp3' },
    ]
  },
  {
    id: 'things', title: '物品', icon: 'bot',
    sounds: [
      { id: 'keyboard', label: '键盘', src: SOUND_BASE + '/sounds/things/keyboard.mp3' },
      { id: 'typewriter', label: '打字机', src: SOUND_BASE + '/sounds/things/typewriter.mp3' },
      { id: 'paper', label: '纸', src: SOUND_BASE + '/sounds/things/paper.mp3' },
      { id: 'clock', label: '时钟', src: SOUND_BASE + '/sounds/things/clock.mp3' },
      { id: 'wind-chimes', label: '风铃', src: SOUND_BASE + '/sounds/things/wind-chimes.mp3' },
      { id: 'singing-bowl', label: '颂钵', src: SOUND_BASE + '/sounds/things/singing-bowl.mp3' },
      { id: 'ceiling-fan', label: '吊扇', src: SOUND_BASE + '/sounds/things/ceiling-fan.mp3' },
      { id: 'dryer', label: '吹风机', src: SOUND_BASE + '/sounds/things/dryer.mp3' },
      { id: 'slide-projector', label: '幻灯片放映机', src: SOUND_BASE + '/sounds/things/slide-projector.mp3' },
      { id: 'boiling-water', label: '烧开水', src: SOUND_BASE + '/sounds/things/boiling-water.mp3' },
      { id: 'bubbles', label: '气泡', src: SOUND_BASE + '/sounds/things/bubbles.mp3' },
      { id: 'morse-code', label: '摩斯密码', src: SOUND_BASE + '/sounds/things/morse-code.mp3' },
      { id: 'tuning-radio', label: '调频电台', src: SOUND_BASE + '/sounds/things/tuning-radio.mp3' },
      { id: 'vinyl-effect', label: '黑胶唱片', src: SOUND_BASE + '/sounds/things/vinyl-effect.mp3' },
      { id: 'washing-machine', label: '洗衣机', src: SOUND_BASE + '/sounds/things/washing-machine.mp3' },
      { id: 'windshield-wipers', label: '雨刮器', src: SOUND_BASE + '/sounds/things/windshield-wipers.mp3' },
    ]
  },
  {
    id: 'noise', title: '噪音', icon: 'audio-waveform',
    sounds: [
      { id: 'white-noise', label: '白噪音', src: SOUND_BASE + '/sounds/noise/white-noise.mp3' },
      { id: 'pink-noise', label: '粉红噪音', src: SOUND_BASE + '/sounds/noise/pink-noise.mp3' },
      { id: 'brown-noise', label: '布朗噪音', src: SOUND_BASE + '/sounds/noise/brown-noise.mp3' },
    ]
  }
];

const LUCIDE_MAP = {
  // Nature
  river: 'droplets', waves: 'waves', campfire: 'flame', wind: 'wind',
  'howling-wind': 'wind', 'wind-in-trees': 'trees', waterfall: 'cloud-drizzle',
  'walk-in-snow': 'snowflake', 'walk-on-leaves': 'leaf', 'walk-on-gravel': 'mountain',
  droplets: 'droplet', jungle: 'tree-pine',
  // Rain
  'light-rain': 'cloud-rain', 'heavy-rain': 'cloud-rain', thunder: 'cloud-lightning',
  'rain-on-window': 'rectangle-vertical', 'rain-on-car-roof': 'car',
  'rain-on-umbrella': 'umbrella', 'rain-on-tent': 'tent', 'rain-on-leaves': 'leaf',
  // Animals
  birds: 'bird', seagulls: 'bird', crickets: 'music', wolf: 'dog',
  owl: 'bird', frog: 'bug', 'dog-barking': 'dog', 'horse-gallop': 'horse',
  'cat-purring': 'cat', crows: 'bird', whale: 'ship', beehive: 'hexagon',
  chickens: 'egg', cows: 'dog', sheep: 'cloud', woodpecker: 'bird',
  // Urban
  highway: 'waypoints', road: 'waypoints', 'ambulance-siren': 'ambulance',
  'busy-street': 'building-2', crowd: 'users', traffic: 'car', fireworks: 'sparkles',
  // Places
  cafe: 'coffee', airport: 'plane', church: 'church', temple: 'building',
  'construction-site': 'hard-hat', underwater: 'waves', 'crowded-bar': 'beer',
  'night-village': 'home', 'subway-station': 'train', office: 'building',
  supermarket: 'shopping-cart', carousel: 'party-popper', laboratory: 'flask-conical',
  'laundry-room': 'washing-machine', restaurant: 'utensils', library: 'book-open',
  // Transport
  train: 'train', 'inside-a-train': 'train', airplane: 'plane', submarine: 'ship',
  sailboat: 'sailboat', 'rowing-boat': 'ship',
  // Things
  keyboard: 'keyboard', typewriter: 'type', paper: 'file-text', clock: 'clock',
  'wind-chimes': 'wind', 'singing-bowl': 'circle', 'ceiling-fan': 'fan',
  dryer: 'wind', 'slide-projector': 'presentation', 'boiling-water': 'cooking-pot',
  bubbles: 'circle-dot', 'tuning-radio': 'radio', 'morse-code': 'radio',
  'washing-machine': 'washing-machine', 'vinyl-effect': 'disc-3',
  'windshield-wipers': 'scan-line',
  // Noise
  'white-noise': 'audio-waveform', 'pink-noise': 'audio-waveform', 'brown-noise': 'audio-waveform',
};

function findSrc(id) {
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const sounds = CATEGORIES[ci].sounds;
    for (let si = 0; si < sounds.length; si++) {
      if (sounds[si].id === id) return sounds[si].src;
    }
  }
  return '';
}

function getSoundIcon(id) {
  const name = LUCIDE_MAP[id] || 'volume-2';
  return '<i data-lucide="' + name + '" class="sound-lucide-icon"></i>';
}