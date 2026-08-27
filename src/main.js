import './style.css';
import * as OpenCC from 'opencc-js';

const demoLyrics = `[00:12.00]夜空中最亮的星，能否听清
[00:18.50]那仰望的人，心底的孤独和叹息
[00:27.00]夜空中最亮的星，能否记起
[00:33.50]曾与我同行，消失在风里的身影
[00:42.00]我祈祷拥有一颗透明的心灵
[00:49.00]和会流泪的眼睛
[00:56.00]给我再去相信的勇气
[01:03.00]越过谎言去拥抱你`;

const savedState = (() => {
  try { return JSON.parse(localStorage.getItem('simple-lyric-state') || 'null'); } catch { return null; }
})();
let activeLanguage = savedState?.settings?.language || 'simplified';
const converters = { simplified: OpenCC.Converter({ from: 't', to: 'cn' }), traditional: OpenCC.Converter({ from: 'cn', to: 't' }), none: text => text };
function convertText(text) { return converters[activeLanguage](text); }
const state = {
  id: savedState?.id || null,
  title: convertText(savedState?.title || '夜空中最亮的星'),
  artist: convertText(savedState?.artist || '逃跑计划'),
  lines: parseLrc(demoLyrics),
  progress: 0,
  active: 0,
  playing: false,
  history: Array.isArray(savedState?.history) ? savedState.history.filter(item => item.id).slice(0, 20) : [],
  settings: { hideExtras: false, fontSize: 25, lineHeight: 1.5, highlight: '#f2a052', themeColor: '#f2a052', theme: 'system', language: activeLanguage, ...savedState?.settings }
};

document.querySelector('#app').innerHTML = `
  <header class="topbar"><div class="brand"><span>♫</span> 极简歌词</div><div class="search"><span>⌕</span><input id="searchInput" placeholder="搜索歌曲或歌手"/><button id="searchBtn">搜索</button></div><button class="theme-toggle" id="themeBtn" title="切换主题">◐</button></header>
  <main class="layout">
    <aside class="history-panel"><div class="panel-title">历史记录</div><div id="history"></div></aside>
    <section class="lyrics-panel"><div class="song"><div><h1 id="songTitle">夜空中最亮的星</h1><p id="songArtist">逃跑计划</p></div></div><div class="lyrics-wrap"><div class="lyrics" id="lyrics"></div></div><div class="player"><div class="time"><span id="currentTime">00:00</span><span id="totalTime">01:03</span></div><div class="controls"><button class="history-toggle" id="historyBtn"><span class="playlist-icon">☰</span><small>历史记录</small></button><button class="play" id="playBtn">▶</button><button class="settings-toggle" id="settingsBtn"><span>⚙</span><small>显示设置</small></button></div></div></section>
  </main>
  <section class="settings-panel" id="settingsPanel"><div class="settings-title"><b>显示设置</b><button id="closeSettings">×</button></div><label class="setting-check"><input id="hideExtras" type="checkbox"> 隐藏歌词外的其他元素</label><label>主题<select id="themeSelect"><option value="system">跟随系统</option><option value="light">浅色模式</option><option value="dark">黑暗模式</option></select></label><label>简繁转换<select id="languageSelect"><option value="simplified">简体</option><option value="traditional">繁体</option><option value="none">不转换</option></select></label><label>字体大小 <output id="fontSizeValue">25px</output><input id="fontSize" type="range" min="16" max="36" value="25"></label><label>行间距 <output id="lineHeightValue">1.5</output><input id="lineHeight" type="range" min="1.1" max="2.2" step="0.1" value="1.5"></label><label>高亮颜色 / 主题色 <span class="color-picker"><input id="highlight" type="color" value="#f2a052"></span></label><div class="color-presets" id="colorPresets"><button data-color="#f2a052" title="金黄色" style="background:#f2a052"></button><button data-color="#35c7d0" title="青蓝色" style="background:#35c7d0"></button><button data-color="#ed6d9e" title="玫红色" style="background:#ed6d9e"></button><button data-color="#9bd34d" title="荧光绿" style="background:#9bd34d"></button><button data-color="#a477e8" title="紫色" style="background:#a477e8"></button><label class="custom-color" title="自定义主题色"><span>🎨</span><input id="themeColor" type="color" value="#f2a052"></label></div><button class="reset-button" id="resetSettings">恢复默认设置</button></section>
  <div class="minimal-controls"><button id="minimalToggle">显示界面</button><button id="minimalPlay">▶</button></div>
  <div class="search-results" id="results"></div>
`;

const searchInput = document.querySelector('#searchInput');
const searchBtn = document.querySelector('#searchBtn');
const results = document.querySelector('#results');
const songTitle = document.querySelector('#songTitle');
const songArtist = document.querySelector('#songArtist');
const currentTime = document.querySelector('#currentTime');
const totalTime = document.querySelector('#totalTime');
const playBtn = document.querySelector('#playBtn');
const lyrics = document.querySelector('#lyrics');
const history = document.querySelector('#history');
const historyBtn = document.querySelector('#historyBtn');
const historyPanel = document.querySelector('.history-panel');
const settingsBtn = document.querySelector('#settingsBtn');
const settingsPanel = document.querySelector('#settingsPanel');
const closeSettings = document.querySelector('#closeSettings');
const hideExtras = document.querySelector('#hideExtras');
const fontSize = document.querySelector('#fontSize');
const fontSizeValue = document.querySelector('#fontSizeValue');
const lineHeight = document.querySelector('#lineHeight');
const lineHeightValue = document.querySelector('#lineHeightValue');
const highlight = document.querySelector('#highlight');
const themeBtn = document.querySelector('#themeBtn');
const themeSelect = document.querySelector('#themeSelect');
const themeColor = document.querySelector('#themeColor');
const languageSelect = document.querySelector('#languageSelect');
const resetSettings = document.querySelector('#resetSettings');
const colorPresets = document.querySelector('#colorPresets');
const minimalToggle = document.querySelector('#minimalToggle');
const minimalPlay = document.querySelector('#minimalPlay');

function parseLrc(text) { return text.split('\n').flatMap(line => { const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/); return m ? [{ time: +m[1] * 60 + +m[2], text: convertText(m[3].trim()) || '♪' }] : line.trim() ? [{ time: null, text: convertText(line.trim()) }] : []; }); }
function parseKaraoke(text) { return text.split('\n').flatMap(line => { const lineMatch = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]/); if (!lineMatch) return []; const lineTime = +lineMatch[1] * 60 + +lineMatch[2]; const body = line.slice(lineMatch[0].length); const marks = [...body.matchAll(/<(\d+):(\d+(?:\.\d+)?)>/g)]; if (!marks.length) return [{ time: lineTime, text: convertText(body.trim()) }]; const words = marks.map((mark, i) => ({ time: +mark[1] * 60 + +mark[2], text: convertText(body.slice(mark.index + mark[0].length, marks[i + 1]?.index ?? body.length)) })); return [{ time: lineTime, text: words.map(word => word.text).join(''), words }]; }); }
function parseLyrics(text) { return text.includes('<00:') || /<\d{2}:\d{2}/.test(text) ? parseKaraoke(text) : parseLrc(text); }
function formatTime(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
function getStartTime() { return state.lines.find(line => line.time != null)?.time ?? 0; }
function getEndTime() { const timed = state.lines.filter(line => line.time != null); if (!timed.length) return Math.max(60, state.lines.length * 4); const last = timed[timed.length - 1]; return last.time + Math.max(2.5, Array.from(last.text).length * 0.22); }
function getDuration() { return Math.max(0, getEndTime() - getStartTime()); }
function getLineEnd(index) { const start = state.lines[index].time; const next = state.lines.slice(index + 1).find(line => line.time != null); return next?.time ?? getEndTime(); }
function wordMarkup(word, index, line) { const start = word.time; const end = line.words[index + 1]?.time ?? getLineEnd(state.active); const ratio = end > start ? Math.min(1, Math.max(0, (state.progress - start) / (end - start))) : 1; const text = escapeHtml(word.text); return `<span class="word-stack"><span class="word-base">${text}</span><span class="word-fill" style="width:${ratio * 100}%">${text}</span></span>`; }
function renderLineText(line, index) { const text = escapeHtml(line.text); if (line.time != null && index < state.active) return `<span class="karaoke-complete">${text}</span>`; if (index !== state.active || line.time == null) return text; if (line.words?.length) return line.words.map((word, wordIndex) => wordMarkup(word, wordIndex, line)).join(''); const span = getLineEnd(index) - line.time; const ratio = span > 0 ? Math.min(1, Math.max(0, (state.progress - line.time) / span)) : 1; return `<span class="karaoke-stack"><span class="karaoke-base">${text}</span><span class="karaoke-fill" style="width:${ratio * 100}%">${text}</span></span>`; }
function updatePlaybackVisual() { const start = getStartTime(); currentTime.textContent = formatTime(Math.max(0, state.progress - start)); const line = state.lines[state.active]; if (line?.words?.length) line.words.forEach((word, index) => { const end = line.words[index + 1]?.time ?? getLineEnd(state.active); const ratio = end > word.time ? Math.min(1, Math.max(0, (state.progress - word.time) / (end - word.time))) : 1; document.querySelectorAll('.lyric-line.active .word-fill')[index]?.style.setProperty('width', `${ratio * 100}%`); }); else { const fill = document.querySelector('.lyric-line.active .karaoke-fill'); if (fill) { const end = getLineEnd(state.active); const ratio = end > line.time ? Math.min(1, Math.max(0, (state.progress - line.time) / (end - line.time))) : 1; fill.style.width = `${ratio * 100}%`; } } }
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function render() {
  // 只保存歌曲 ID、标题、歌手和历史索引，不保存歌词正文或播放进度。
  localStorage.setItem('simple-lyric-state', JSON.stringify({ id: state.id, title: state.title, artist: state.artist, history: state.history, settings: state.settings }));
  const isMobile = window.matchMedia('(max-width:700px)').matches; const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches; const dark = state.settings.theme === 'dark' || (state.settings.theme === 'system' && systemDark); document.documentElement.style.setProperty('--lyric-size', `${state.settings.fontSize}px`); document.documentElement.style.setProperty('--lyric-spacing', state.settings.lineHeight); document.documentElement.style.setProperty('--accent', state.settings.themeColor); document.documentElement.style.setProperty('--highlight-color', state.settings.highlight); document.body.classList.toggle('dark-mode', dark); document.body.classList.toggle('minimal-mode', isMobile && state.settings.hideExtras); hideExtras.checked = state.settings.hideExtras; fontSize.value = state.settings.fontSize; fontSizeValue.value = `${state.settings.fontSize}px`; lineHeight.value = state.settings.lineHeight; lineHeightValue.value = state.settings.lineHeight; highlight.value = state.settings.highlight; themeColor.value = state.settings.themeColor; themeSelect.value = state.settings.theme; languageSelect.value = state.settings.language; themeBtn.textContent = dark ? '☀' : '☾'; themeBtn.title = dark ? '切换到浅色模式' : '切换到深色模式'; colorPresets.querySelectorAll('button').forEach(button => button.classList.toggle('selected', button.dataset.color === state.settings.highlight && button.dataset.color === state.settings.themeColor)); minimalPlay.textContent = state.playing ? 'Ⅱ' : '▶';
  const start = getStartTime(); const duration = getDuration(); state.progress = Math.min(Math.max(state.progress, start), getEndTime()); songTitle.textContent = state.title; songArtist.textContent = state.artist; currentTime.textContent = formatTime(Math.max(0, state.progress - start)); totalTime.textContent = formatTime(duration); playBtn.textContent = state.playing ? 'Ⅱ' : '▶';
  lyrics.innerHTML = state.lines.map((line, i) => `<button class="lyric-line ${i === state.active ? 'active' : ''}" data-index="${i}">${renderLineText(line, i)}</button>`).join('');
  lyrics.querySelectorAll('button').forEach(btn => btn.onclick = () => { state.active = +btn.dataset.index; state.progress = state.lines[state.active].time ?? state.progress; render(); scrollActive(); });
  history.innerHTML = state.history.length ? state.history.map((item, i) => `<button class="history-item" data-history="${i}"><span>♫</span><b>${escapeHtml(convertText(item.title))}</b><small>${escapeHtml(convertText(item.artist))}</small></button>`).join('') : '<div class="empty">搜索过的歌曲会显示在这里</div>';
  history.querySelectorAll('button').forEach(btn => btn.onclick = () => { document.querySelector('.history-panel').classList.remove('mobile-open'); loadTrack(state.history[+btn.dataset.history]); });
}
function scrollActive() { document.querySelector('.lyric-line.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
async function loadTrack(track) {
  results.textContent = '正在加载歌词…';
  try {
    const data = track.syncedLyrics || track.plainLyrics ? track : await (await fetch(`https://lrclib.net/api/get/${encodeURIComponent(track.id)}`)).json();
    const lyricsText = data.karaoke || data.enhancedLyrics || data.syncedLyrics || data.plainLyrics;
    if (!lyricsText) throw new Error('empty lyrics');
    state.rawLyrics = lyricsText; state.id = data.id || track.id; state.title = convertText(data.trackName || track.title); state.artist = convertText(data.artistName || track.artist); state.lines = parseLyrics(lyricsText); state.progress = getStartTime(); state.active = 0;
    state.history = [{ id: state.id, title: state.title, artist: state.artist }, ...state.history.filter(item => item.id !== state.id)].slice(0, 20);
    results.innerHTML = ''; render();
  } catch { results.textContent = '歌词加载失败，请重新搜索'; }
}
async function search() {
  const q = searchInput.value.trim(); if (!q) return; results.textContent = '搜索中…';
  try { const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`); const data = await res.json(); const list = data.slice(0, 6).filter(x => x.id && (x.plainLyrics || x.syncedLyrics)); results.innerHTML = list.length ? list.map((x, i) => `<button data-result="${i}"><b>${escapeHtml(x.trackName || '未命名')}</b><small>${escapeHtml(x.artistName || '未知歌手')}</small></button>`).join('') : '没有找到歌词'; results._data = list; results.querySelectorAll('button').forEach(btn => btn.onclick = () => loadTrack(results._data[+btn.dataset.result])); } catch { results.textContent = '暂时无法连接歌词服务'; }
}
searchBtn.onclick = search; searchInput.onkeydown = e => e.key === 'Enter' && search();
playBtn.onclick = () => { state.playing = !state.playing; render(); if (state.playing) scrollActive(); };
historyBtn.onclick = () => historyPanel.classList.toggle('mobile-open');
settingsBtn.onclick = () => settingsPanel.classList.toggle('open'); closeSettings.onclick = () => settingsPanel.classList.remove('open');
hideExtras.onchange = e => { state.settings.hideExtras = e.target.checked; render(); };
fontSize.oninput = e => { state.settings.fontSize = +e.target.value; render(); };
lineHeight.oninput = e => { state.settings.lineHeight = +e.target.value; render(); };
highlight.oninput = e => { state.settings.highlight = e.target.value; render(); };
themeColor.oninput = e => { state.settings.themeColor = e.target.value; render(); };
languageSelect.onchange = e => { activeLanguage = e.target.value; state.settings.language = activeLanguage; state.lines = parseLyrics(state.rawLyrics || demoLyrics); state.progress = getStartTime(); state.active = 0; render(); };
resetSettings.onclick = () => { activeLanguage = 'simplified'; state.settings = { hideExtras: false, fontSize: 25, lineHeight: 1.5, highlight: '#f2a052', themeColor: '#f2a052', theme: 'system', language: 'simplified' }; state.lines = parseLyrics(state.rawLyrics || demoLyrics); state.progress = getStartTime(); state.active = 0; settingsPanel.classList.remove('open'); render(); };
themeSelect.onchange = e => { state.settings.theme = e.target.value; render(); };
themeBtn.onclick = () => { state.settings.theme = document.body.classList.contains('dark-mode') ? 'light' : 'dark'; render(); };
colorPresets.querySelectorAll('button').forEach(button => button.onclick = () => { state.settings.highlight = button.dataset.color; state.settings.themeColor = button.dataset.color; render(); });
minimalToggle.onclick = () => { state.settings.hideExtras = false; render(); };
minimalPlay.onclick = () => { state.playing = !state.playing; render(); if (state.playing) scrollActive(); };
window.addEventListener('resize', render);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.settings.theme === 'system') render(); });
document.addEventListener('click', event => { if (settingsPanel.classList.contains('open') && !settingsPanel.contains(event.target) && !event.target.closest('#settingsBtn')) settingsPanel.classList.remove('open'); if (historyPanel.classList.contains('mobile-open') && !historyPanel.contains(event.target) && !event.target.closest('#historyBtn')) historyPanel.classList.remove('mobile-open'); });
setInterval(() => { if (!state.playing) return; const end = getEndTime(); state.progress = Math.min(end, state.progress + .05); const timed = state.lines.map((l, i) => [l.time, i]).filter(x => x[0] != null && x[0] <= state.progress); if (timed.length) { const next = timed.at(-1)[1]; if (next !== state.active) { state.active = next; render(); scrollActive(); } } updatePlaybackVisual(); if (state.progress >= end) { state.playing = false; render(); } }, 50);
state.progress = getStartTime();
render();
if (state.id) loadTrack({ id: state.id, title: state.title, artist: state.artist });
