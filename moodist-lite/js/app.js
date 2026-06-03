/* ==============================
   Moodist Lite - App Logic
   ============================== */

// ── State ──
const state = {
  currentCategory: 'nature',
  sounds: {},
  howlers: {},
  timerId: null,
  showingFavorites: false,
  presets: [],
};

CATEGORIES.forEach(cat => {
  cat.sounds.forEach(s => {
    state.sounds[s.id] = { active: false, volume: 0.5, favorite: false, paused: false };
  });
});

// ── State Persistence ──
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.favorites) {
      Object.keys(saved.favorites).forEach(id => {
        if (state.sounds[id]) state.sounds[id].favorite = saved.favorites[id];
      });
    }
    state.presets = saved.presets || [];
  } catch (e) {}
}

function saveState() {
  const favorites = {};
  Object.keys(state.sounds).forEach(id => {
    favorites[id] = state.sounds[id].favorite;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites, presets: state.presets }));
}

function savePresets() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    saved.presets = state.presets;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (e) {}
}

// ── Share ──
function getShareUrl() {
  const active = Object.keys(state.sounds).filter(id => state.sounds[id].active);
  if (!active.length) return '';
  const ids = active.join(',');
  const vols = active.map(id => state.sounds[id].volume).join(',');
  return window.location.origin + window.location.pathname + '?s=' + ids + '&v=' + vols;
}

function applyShareParams() {
  const params = new URLSearchParams(window.location.search);
  const ids = params.get('s');
  const vols = params.get('v');
  if (!ids) return;
  const idArr = ids.split(',');
  const volArr = vols ? vols.split(',').map(Number) : [];
  idArr.forEach((id, i) => {
    if (state.sounds[id]) {
      state.sounds[id].active = true;
      state.sounds[id].volume = volArr[i] || 0.5;
    }
  });
  setTimeout(() => {
    idArr.forEach(id => {
      if (state.sounds[id] && state.sounds[id].active) {
        playSound(id);
      }
    });
  }, 500);
}

// ── Audio ──
function getHowl(soundId, src) {
  if (!state.howlers[soundId]) {
    state.howlers[soundId] = new Howl({
      src: [src],
      loop: true,
      volume: 0,
      preload: true,
    });
  }
  return state.howlers[soundId];
}

function playSound(id) {
  const s = state.sounds[id];
  if (!s) return;
  const src = findSrc(id);
  if (!src) return;
  const howl = getHowl(id, src);
  howl.volume(0);
  if (s.paused) {
    howl.play();
    s.paused = false;
  } else {
    howl.play();
  }
  howl.fade(0, s.volume, FADE_DURATION);
}

function pauseSound(id) {
  const s = state.sounds[id];
  if (!s) return;
  const howl = state.howlers[id];
  if (!howl || !howl.playing()) return;
  const currentVol = howl.volume();
  howl.fade(currentVol, 0, FADE_DURATION);
  setTimeout(function () {
    howl.pause();
  }, FADE_DURATION + 50);
  s.paused = true;
}

function stopSound(id) {
  const howl = state.howlers[id];
  if (!howl || !howl.playing()) return;
  const currentVol = howl.volume();
  howl.fade(currentVol, 0, FADE_DURATION);
  setTimeout(function () { howl.stop(); }, FADE_DURATION + 50);
}

function toggleSound(id) {
  const s = state.sounds[id];
  if (!s) return;
  s.active = !s.active;
  if (s.active) {
    playSound(id);
  } else {
    stopSound(id);
  }
  renderSounds();
  updateSelectedCount();
  updateStopAllButton();
}

function updateVolume(id, volume) {
  const s = state.sounds[id];
  if (!s) return;
  s.volume = volume;
  const howl = state.howlers[id];
  if (howl && howl.playing()) {
    howl.volume(volume);
  }
}

function pauseAll() {
  const ids = Object.keys(state.howlers);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const howl = state.howlers[id];
    if (howl && howl.playing()) {
      const vol = howl.volume();
      howl.fade(vol, 0, FADE_DURATION);
      (function (h) { setTimeout(function () { h.pause(); }, FADE_DURATION + 50); })(howl);
    }
    if (state.sounds[id]) {
      state.sounds[id].paused = true;
    }
  }
  updateStopAllButton();
}

function resumeAll() {
  const ids = Object.keys(state.sounds);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const s = state.sounds[id];
    if (s.active && s.paused) {
      playSound(id);
    }
  }
  updateStopAllButton();
}

function stopAll() {
  const ids = Object.keys(state.howlers);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const howl = state.howlers[id];
    if (howl && howl.playing()) {
      const vol = howl.volume();
      howl.fade(vol, 0, FADE_DURATION);
      (function (h) { setTimeout(function () { h.stop(); }, FADE_DURATION + 50); })(howl);
    }
    if (state.sounds[id]) {
      state.sounds[id].active = false;
      state.sounds[id].paused = false;
    }
  }
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
    document.getElementById('timerSelect').value = '';
  }
  renderSounds();
  updateSelectedCount();
  updateStopAllButton();
}

function togglePauseAll() {
  const hasPlaying = Object.values(state.sounds).some(s => s.active && !s.paused);
  if (hasPlaying) {
    pauseAll();
  } else {
    resumeAll();
  }
}

function shuffle() {
  const howlIds = Object.keys(state.howlers);
  for (let i = 0; i < howlIds.length; i++) {
    const howl = state.howlers[howlIds[i]];
    if (howl && howl.playing()) howl.pause();
    if (state.sounds[howlIds[i]]) {
      state.sounds[howlIds[i]].active = false;
      state.sounds[howlIds[i]].paused = true;
    }
  }

  let candidates = [];
  if (state.showingFavorites) {
    candidates = Object.keys(state.sounds).filter(function (id) { return state.sounds[id].favorite; });
  } else {
    for (let ci = 0; ci < CATEGORIES.length; ci++) {
      if (CATEGORIES[ci].id === state.currentCategory) {
        for (let si = 0; si < CATEGORIES[ci].sounds.length; si++) {
          candidates.push(CATEGORIES[ci].sounds[si].id);
        }
      }
    }
  }

  if (!candidates.length) {
    for (let ci = 0; ci < CATEGORIES.length; ci++) {
      for (let si = 0; si < CATEGORIES[ci].sounds.length; si++) {
        candidates.push(CATEGORIES[ci].sounds[si].id);
      }
    }
  }

  const count = Math.min(Math.max(5, Math.floor(Math.random() * 4) + 5), candidates.length);
  const shuffled = candidates.slice().sort(function () { return Math.random() - 0.5; }).slice(0, count);

  for (let i = 0; i < shuffled.length; i++) {
    const id = shuffled[i];
    state.sounds[id].active = true;
    state.sounds[id].volume = 0.3 + Math.random() * 0.4;
    playSound(id);
  }

  renderSounds();
  updateSelectedCount();
  updateStopAllButton();
  showToast('随机选择了 ' + count + ' 个声音');
}

function setTimer(minutes) {
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
  if (!minutes) return;
  state.timerId = setTimeout(function () {
    showToast('⏰ 定时停止');
    stopAll();
    state.timerId = null;
    document.getElementById('timerSelect').value = '';
  }, minutes * 60 * 1000);
  showToast('将在 ' + minutes + ' 分钟后停止');
}

// ── Toast ──
let toastTimeout;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function () { toast.classList.remove('show'); }, 2500);
}

// ── Modal ──
function openModal(id) { document.getElementById(id).classList.add('active'); }

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ── Favorites ──
function toggleFavorite(id) {
  if (!state.sounds[id]) return;
  state.sounds[id].favorite = !state.sounds[id].favorite;
  saveState();
  if (state.showingFavorites) {
    renderSounds();
  } else {
    const card = document.querySelector('[data-sound-id="' + id + '"]');
    if (card) {
      card.classList.toggle('favorite');
    }
  }
}

function toggleFavoritesView() {
  state.showingFavorites = !state.showingFavorites;
  const btn = document.getElementById('btnFavorites');
  btn.classList.toggle('active');
  if (state.showingFavorites) {
    document.querySelectorAll('.category-tab').forEach(function (t) { t.classList.remove('active'); });
    renderFavorites();
  } else {
    document.querySelector('.category-tab[data-cat="' + state.currentCategory + '"]')?.classList.add('active');
    renderSounds();
  }
}

// ── UI Rendering ──
function renderSoundCard(sound) {
  const s = state.sounds[sound.id];
  if (!s) return '';
  const isActive = s.active;
  return '<div class="sound-card' + (isActive ? ' active' : '') + (s.favorite ? ' favorite' : '') + '" data-sound-id="' + sound.id + '">' +
    '<button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite(\'' + sound.id + '\')" title="收藏">' +
    '<i data-lucide="heart" class="icon-sm"></i>' +
    '</button>' +
    '<div class="sound-card-inner">' +
    '<div class="sound-icon">' + getSoundIcon(sound.id) + '</div>' +
    '<div class="sound-name">' + sound.label + '</div>' +
    '<div class="sound-volume">' +
    '<input type="range" min="0" max="1" step="0.05" value="' + s.volume + '"' +
    ' onchange="event.stopPropagation(); updateVolume(\'' + sound.id + '\', parseFloat(this.value))"' +
    ' onclick="event.stopPropagation()" />' +
    '</div>' +
    '</div>' +
    '</div>';
}

function renderSounds() {
  const grid = document.getElementById('soundGrid');
  let sounds = [];
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    if (CATEGORIES[ci].id === state.currentCategory) {
      sounds = CATEGORIES[ci].sounds;
      break;
    }
  }
  if (!sounds.length) {
    grid.innerHTML = '<div class="empty-state"><div class="text">没有声音</div></div>';
    lucide.createIcons();
    return;
  }
  grid.innerHTML = sounds.map(function (s) { return renderSoundCard(s); }).join('');
  lucide.createIcons();
}

function renderFavorites() {
  const grid = document.getElementById('soundGrid');
  const favoriteIds = Object.keys(state.sounds).filter(function (id) { return state.sounds[id].favorite; });
  const favoriteSounds = [];
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    for (let si = 0; si < CATEGORIES[ci].sounds.length; si++) {
      if (favoriteIds.indexOf(CATEGORIES[ci].sounds[si].id) !== -1) {
        favoriteSounds.push(CATEGORIES[ci].sounds[si]);
      }
    }
  }

  if (!favoriteSounds.length) {
    grid.innerHTML = '<div class="empty-state"><div style="font-size:40px">&#x2764;&#xFE0F;</div><div class="text">还没有收藏的声音<br/>点击声音卡片上的&#x2764;&#xFE0F;来收藏</div></div>';
    lucide.createIcons();
    return;
  }

  grid.innerHTML = favoriteSounds.map(function (s) { return renderSoundCard(s); }).join('');
  lucide.createIcons();
}

function updateSelectedCount() {
  const ids = Object.keys(state.sounds);
  let count = 0;
  for (let i = 0; i < ids.length; i++) {
    if (state.sounds[ids[i]].active) count++;
  }
  document.getElementById('selectedCount').textContent = count > 0 ? '已选中 ' + count + ' 个声音' : '未选择声音';
}

function updateStopAllButton() {
  const hasPlaying = Object.values(state.sounds).some(s => s.active);
  const iconEl = document.getElementById('btnStopAllIcon');
  const textEl = document.getElementById('btnStopAllText');
  if (hasPlaying) {
    iconEl.setAttribute('data-lucide', 'pause');
    textEl.textContent = '全部暂停';
  } else {
    iconEl.setAttribute('data-lucide', 'play');
    textEl.textContent = '全部播放';
  }
  lucide.createIcons();
}

function renderCategories() {
  const container = document.getElementById('categories');
  container.innerHTML = CATEGORIES.map(function (cat) {
    return '<button class="category-tab' + (cat.id === state.currentCategory ? ' active' : '') + '" data-cat="' + cat.id + '" onclick="switchCategory(\'' + cat.id + '\')">' +
      '<i data-lucide="' + cat.icon + '" class="icon-xs"></i> ' + cat.title +
      '</button>';
  }).join('');
  lucide.createIcons();
}

function switchCategory(catId) {
  state.showingFavorites = false;
  document.getElementById('btnFavorites').classList.remove('active');
  state.currentCategory = catId;
  document.querySelectorAll('.category-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelector('.category-tab[data-cat="' + catId + '"]').classList.add('active');
  renderSounds();
}

// ── Presets ──
function openPresets() {
  renderPresetList();
  openModal('modalPresets');
}

function savePreset() {
  const name = document.getElementById('presetName').value.trim();
  if (!name) { showToast('请输入预设名称'); return; }
  const active = Object.keys(state.sounds).filter(function (id) { return state.sounds[id].active; });
  if (!active.length) { showToast('请先选择声音'); return; }
  const data = {};
  for (let i = 0; i < active.length; i++) { data[active[i]] = state.sounds[active[i]].volume; }
  state.presets.push({ name: name, data: data, createdAt: Date.now() });
  document.getElementById('presetName').value = '';
  savePresets();
  renderPresetList();
  showToast('预设 "' + name + '" 已保存');
}

function loadPreset(preset) {
  const howlIds = Object.keys(state.howlers);
  for (let i = 0; i < howlIds.length; i++) {
    const howl = state.howlers[howlIds[i]];
    if (howl && howl.playing()) howl.pause();
    if (state.sounds[howlIds[i]]) {
      state.sounds[howlIds[i]].active = false;
      state.sounds[howlIds[i]].paused = true;
    }
  }
  const keys = Object.keys(preset.data);
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    if (state.sounds[id]) {
      state.sounds[id].active = true;
      state.sounds[id].volume = preset.data[id];
      playSound(id);
    }
  }
  closeModal('modalPresets');
  renderSounds();
  updateSelectedCount();
  updateStopAllButton();
  showToast('已加载预设 "' + preset.name + '"');
}

function deletePreset(index) {
  state.presets.splice(index, 1);
  savePresets();
  renderPresetList();
}

function renderPresetList() {
  const container = document.getElementById('presetList');
  if (!state.presets.length) {
    container.innerHTML = '<p style="font-size:13px;color:var(--color-text-subtle);text-align:center;padding:20px 0;">暂无预设</p>';
    return;
  }
  container.innerHTML = state.presets.map(function (p, i) {
    return '<div class="preset-item">' +
      '<span class="preset-name">' + p.name + '</span>' +
      '<div class="preset-actions">' +
      '<button onclick="loadPreset(state.presets[' + i + '])">加载</button>' +
      '<button class="danger" onclick="deletePreset(' + i + ')">删除</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ── Share ──
function openShare() {
  const url = getShareUrl();
  if (!url) { showToast('请先选择声音'); return; }
  document.getElementById('shareLink').value = url;
  openModal('modalShare');
}

function copyShareLink() {
  const input = document.getElementById('shareLink');
  try {
    navigator.clipboard.writeText(input.value).then(function () {
      showToast('链接已复制到剪贴板');
    }).catch(function () {
      input.select();
      document.execCommand('copy');
      showToast('链接已复制');
    });
  } catch (e) {
    input.select();
    document.execCommand('copy');
    showToast('链接已复制');
  }
}

// ── Theme ──
function getTheme() {
  return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
}

function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
  const sunIcon = document.querySelector('#themeToggle [data-lucide="sun"]');
  const moonIcon = document.querySelector('#themeToggle [data-lucide="moon"]');
  if (sunIcon) sunIcon.classList.toggle('hidden', theme !== 'dark');
  if (sunIcon) sunIcon.classList.toggle('block', theme === 'dark');
  if (moonIcon) moonIcon.classList.toggle('hidden', theme === 'dark');
  if (moonIcon) moonIcon.classList.toggle('block', theme !== 'dark');
  lucide.createIcons();
}

function toggleTheme() {
  setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}

function initTheme() {
  setTheme(getTheme());
}

// ── Init ──
function init() {
  loadState();
  renderCategories();
  applyShareParams();
  renderSounds();
  updateSelectedCount();
  updateStopAllButton();
  initTheme();

  document.getElementById('btnFavorites').addEventListener('click', toggleFavoritesView);
  document.getElementById('btnPresets').addEventListener('click', openPresets);
  document.getElementById('btnShare').addEventListener('click', openShare);
  document.getElementById('btnShuffle').addEventListener('click', shuffle);
  document.getElementById('btnStopAll').addEventListener('click', togglePauseAll);
  document.getElementById('timerSelect').addEventListener('change', function (e) {
    setTimer(e.target.value ? parseInt(e.target.value) : 0);
  });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.getElementById('soundGrid').addEventListener('click', function (e) {
    const card = e.target.closest('.sound-card');
    if (!card || e.target.closest('.favorite-btn') || e.target.closest('input')) return;
    const id = card.dataset.soundId;
    if (id) toggleSound(id);
  });

  document.querySelectorAll('.modal-overlay').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target === el) el.classList.remove('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', init);