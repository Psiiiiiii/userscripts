// ==UserScript==
// @name         CW Shaders
// @version      1.0
// @description  Шейдеры погоды и времени суток с безопасной фильтровой молнией (фикс мерцания)
// @author       Psiii
// @copyright    Amina Kotenkova ( https://vk.ru/psiiiiiii / https://github.com/Psiiiiiii )
// @updateURL    https://raw.githubusercontent.com/Psiiiiiii/userscripts/main/weather.user.js
// @downloadURL  https://raw.githubusercontent.com/Psiiiiiii/userscripts/main/weather.user.js
// @match        http*://*.catwar.su/cw3*
// @match        http*://*.catwar.net/cw3*
// @grant        GM_addStyle
// @icon         https://postav-druguyu-kartinku.com/pozhaluysta.png
// ==/UserScript==

(function() {
    'use strict';

    let settings = {
        isLocked: false,
        weatherOff: false,
        timeOff: false,
        hour: '12',
        weather: '1',
        windDir: 'auto',
        strongWind: false
    };

    let hourTimelapseInterval = null;
    const layerState = { time: 'a', weather: 'b' };

    let lastAppliedHour = null;
    let lastAppliedWeather = null;

    try {
        const saved = localStorage.getItem('cw_shader_settings_v5');
        if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (e) {
        console.warn('[CatWar Shader] Failed to load saved settings, using defaults:', e);
    }

    const TIME_CONFIG = {
        0:  { bg: 'rgba(30,35,58,0.36)', blend: 'soft-light', filter: 'brightness(0.80) saturate(0.78) contrast(1.06) grayscale(0.2)' },
        1:  { bg: 'rgba(28,32,54,0.34)', blend: 'soft-light', filter: 'brightness(0.80) saturate(0.76) contrast(1.06) grayscale(0.15)' },
        2:  { bg: 'rgba(36,32,55,0.32)', blend: 'soft-light', filter: 'brightness(0.82) saturate(0.78) contrast(1.05) grayscale(0.1)' },
        3:  { bg: 'rgba(46,36,57,0.30)', blend: 'soft-light', filter: 'brightness(0.83) saturate(0.80) contrast(1.04)' },
        4:  { bg: 'linear-gradient(15deg, rgba(62,45,60,0.28), rgba(78,52,55,0.20))', blend: 'overlay', filter: 'brightness(0.86) saturate(0.85) contrast(1.03) sepia(0.05)' },
        5:  { bg: 'linear-gradient(20deg, rgba(90,58,60,0.26), rgba(120,70,58,0.18))', blend: 'overlay', filter: 'brightness(0.90) saturate(0.90) contrast(1.02) sepia(0.04)' },
        6:  { bg: 'linear-gradient(35deg, rgba(150,95,62,0.24), rgba(185,118,72,0.15))', blend: 'overlay', filter: 'brightness(0.96) saturate(1.02) contrast(1.02)' },
        7:  { bg: 'linear-gradient(45deg, rgba(190,128,78,0.20), rgba(220,158,98,0.12))', blend: 'overlay', filter: 'brightness(1.01) saturate(1.06) contrast(1.02)' },
        8:  { bg: 'linear-gradient(50deg, rgba(205,168,115,0.14), rgba(220,188,135,0.08))', blend: 'overlay', filter: 'brightness(1.03) saturate(1.04)' },
        9:  { bg: 'linear-gradient(55deg, rgba(215,188,138,0.08), rgba(224,200,158,0.05))', blend: 'overlay', filter: 'brightness(1.02) saturate(1.02)' },
        10: { bg: 'rgba(224,210,182,0.04)', blend: 'overlay', filter: 'brightness(1.01) saturate(1.01)' },
        11: { bg: 'rgba(224,210,182,0.02)', blend: 'overlay', filter: 'brightness(1.0) saturate(1.0)' },
        12: { bg: 'transparent', blend: 'normal', filter: '' },
        13: { bg: 'transparent', blend: 'normal', filter: '' },
        14: { bg: 'rgba(255,248,236,0.03)', blend: 'overlay', filter: 'brightness(1.0) saturate(1.02)' },
        15: { bg: 'linear-gradient(-15deg, rgba(222,192,152,0.08), rgba(216,162,142,0.06))', blend: 'overlay', filter: 'brightness(1.0) saturate(1.04)' },
        16: { bg: 'linear-gradient(-20deg, rgba(222,142,112,0.18), rgba(198,112,102,0.14))', blend: 'overlay', filter: 'brightness(1.0) saturate(1.10) contrast(1.03)' },
        17: { bg: 'linear-gradient(-30deg, rgba(202,107,97,0.24), rgba(152,82,92,0.18))', blend: 'overlay', filter: 'brightness(0.98) saturate(1.14) contrast(1.05)' },
        18: { bg: 'linear-gradient(-40deg, rgba(162,86,91,0.28), rgba(112,66,81,0.22))', blend: 'overlay', filter: 'brightness(0.94) saturate(1.16) contrast(1.06)' },
        19: { bg: 'linear-gradient(-45deg, rgba(112,71,91,0.30), rgba(77,56,81,0.24))', blend: 'soft-light', filter: 'brightness(0.90) saturate(1.05) contrast(1.06)' },
        20: { bg: 'rgba(72,56,81,0.32)', blend: 'soft-light', filter: 'brightness(0.86) saturate(0.95) contrast(1.05)' },
        21: { bg: 'rgba(56,49,69,0.34)', blend: 'soft-light', filter: 'brightness(0.84) saturate(0.85) contrast(1.05)' },
        22: { bg: 'rgba(41,41,61,0.36)', blend: 'soft-light', filter: 'brightness(0.82) saturate(0.80) contrast(1.06)' },
        23: { bg: 'rgba(33,37,56,0.38)', blend: 'soft-light', filter: 'brightness(0.80) saturate(0.78) contrast(1.06) grayscale(0.15)' }
    };

    const DEFAULT_WEATHER = { tint: 'transparent', blend: 'normal', filter: '', particles: null };

    const WEATHER_CONFIG = {
        1: { label: 'Ясно', tint: 'transparent', blend: 'normal', filter: '', particles: null },
        2: {
            label: 'Небольшой дождь',
            tint: 'rgba(122,132,142,0.15)', blend: 'multiply', filter: 'saturate(0.9) brightness(0.9) contrast(0.95)',
            particles: { type: 'rain', dir: 0.35, count: 500, speed: 14, len: [14, 22], alpha: [0.15, 0.40], width: 1, depthPow: 0.8 }
        },
        4: {
            label: 'Сильный ливень',
            tint: 'rgba(28,32,42,0.30)', blend: 'multiply', filter: 'saturate(0.8) brightness(0.85) contrast(0.9)',
            particles: { type: 'rain', dir: -0.6, count: 600, speed: 26, len: [30, 48], alpha: [0.25, 0.50], width: 1.3, depthPow: 0.9 }
        },
        8: {
            label: 'Слабый снег',
            tint: 'rgba(72,77,92,0.18)', blend: 'multiply', filter: 'saturate(0.9) brightness(0.9) contrast(0.95)',
            particles: { type: 'snow', dir: -0.4, count: 400, speed: 5, size: [0.9, 3.2], alpha: [0.28, 0.55], depthPow: 0.8 }
        },
        7: {
            label: 'Снежная метель',
            tint: 'rgba(220,224,232,0.05)', blend: 'soft-light', filter: 'saturate(0.8) brightness(0.95) contrast(0.9)',
            particles: { type: 'snow', dir: -0.8, count: 550, speed: 8, size: [1.0, 4.2], alpha: [0.35, 0.60], gust: true, depthPow: 0.8 }
        },
    };

    if (!WEATHER_CONFIG[settings.weather]) settings.weather = Object.keys(WEATHER_CONFIG)[0];

    function saveSettings() { localStorage.setItem('cw_shader_settings_v5', JSON.stringify(settings)); }

    const CSS_STYLES = `
    :root {
        --bg-panel:     #1d1c1d;
        --bg-surface:   #2a2a2a;
        --bg-btn:       #2a2a2a;
        --bg-btn-hov:   #383838;
        --bg-btn-dis:   #141414;
        --bg-accent:    #707d45;
        --br:           rgba(255, 255, 255, 0.12);
        --br-div:       rgba(255, 255, 255, 0.08);
        --tx-main:      #e8e3e7;
        --tx-muted:     #a09ea0;
        --tx-white:     #ffffff;
        --clr-accent:   #b0c273;
        --shadow-light: rgba(0, 0, 0, 0.4);
        --shadow-heavy: rgba(0, 0, 0, 0.55);
        --shadow-panel: rgba(0, 0, 0, 0.5);
    }
    #cages_overflow { position: relative !important; }
    #cages_overflow.is-timelapse, #cages_overflow.is-timelapse .cw-tint-layer { transition: none !important; }
    .cw-tint-layer { position: absolute; inset: 0; pointer-events: none !important; opacity: 0; transition: opacity 1.8s ease-in-out; }
    #cw-time-a, #cw-time-b { z-index: 99997; }
    #cw-weather-a, #cw-weather-b { z-index: 99998; }
    #cw-weather-canvas { position: absolute; inset: 0; z-index: 100000; pointer-events: none !important; }
    #cw-shader-btn {
        position: fixed; bottom: 20px; right: 20px; width: 52px; height: 52px;
        background: var(--bg-surface); border: 1px solid var(--br); border-radius: 50%;
        display: flex; justify-content: center; align-items: center; cursor: pointer; z-index: 100001;
        box-shadow: 0 8px 24px var(--shadow-light); color: var(--clr-accent);
        transition: background 0.2s, transform 0.25s, border-color 0.2s; user-select: none;
    }
    #cw-shader-btn:hover { background: var(--bg-btn-hov); border-color: var(--clr-accent); transform: translateY(-2px) scale(1.04); }
    #cw-shader-btn svg { width: 26px; height: 26px; fill: currentColor; }
    #cw-shader-menu {
        position: fixed; bottom: 84px; right: 20px; width: 285px; background: var(--bg-panel);
        border: 1px solid var(--br); border-radius: 8px; box-shadow: 0 24px 60px var(--shadow-panel);
        z-index: 100001; font: 13px "Segoe UI", Tahoma, sans-serif; color: var(--tx-main);
        display: flex; flex-direction: column; max-height: 78vh; overflow: hidden; opacity: 0;
        transform: translateY(12px) scale(0.96); pointer-events: none; transition: opacity 0.22s, transform 0.22s; user-select: none;
    }
    #cw-shader-menu.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    #cw-menu-header {
        background: var(--bg-surface); padding: 10px 16px; cursor: grab; font-weight: 500; font-size: 15px;
        color: var(--tx-main); display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    #cw-menu-header svg { width: 18px; height: 18px; fill: var(--clr-accent); }
    .cw-menu-content { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
    .cw-section-title { font-size: 11px; text-transform: uppercase; color: var(--clr-accent); margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--br-div); font-weight: 600; }
    .cw-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; background: var(--bg-surface); border-radius: 5px; cursor: pointer; }
    .cw-toggle { position: relative; width: 36px; height: 21px; flex-shrink: 0; }
    .cw-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
    .cw-toggle .slider { position: absolute; inset: 0; background: var(--bg-btn-dis); border: 1px solid var(--br); border-radius: 20px; transition: background 0.25s; }
    .cw-toggle .slider::before { content: ''; position: absolute; width: 15px; height: 15px; left: 2px; top: 2px; background: var(--tx-main); border-radius: 50%; transition: transform 0.25s; }
    .cw-toggle input:checked + .slider { background: var(--bg-accent); border-color: transparent; }
    .cw-toggle input:checked + .slider::before { transform: translateX(15px); }
    .cw-setting-row { display: flex; flex-direction: column; gap: 5px; }
    .cw-setting-row label { font-weight: 500; color: var(--tx-muted); font-size: 11px; text-transform: uppercase; }
    .cw-select { position: relative; width: 100%; }
    .cw-select-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); color: var(--tx-main); border: 1px solid var(--br); padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12.5px; }
    .cw-select-chevron { width: 14px; height: 14px; fill: var(--clr-accent); transition: transform 0.2s; }
    .cw-select-btn.open .cw-select-chevron { transform: rotate(180deg); }
    .cw-select-list { position: fixed; background: var(--bg-panel); border: 1px solid var(--br); border-radius: 5px; box-shadow: 0 16px 40px var(--shadow-heavy); max-height: 220px; overflow-y: auto; z-index: 100002; opacity: 0; transform: translateY(-6px); pointer-events: none; transition: opacity 0.16s, transform 0.16s; padding: 4px; }
    .cw-select-list.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .cw-select-option { padding: 7px 10px; border-radius: 5px; font-size: 12.5px; color: var(--tx-main); cursor: pointer; }
    .cw-select-option:hover { background: var(--bg-btn-hov); color: var(--clr-accent); }
    .cw-select-option.selected { background: var(--bg-accent); color: var(--tx-white); }
    .cw-tl-controls { display: flex; gap: 6px; align-items: center; }
    .cw-tl-controls input { width: 56px; text-align: center; background: var(--bg-btn-dis); color: var(--tx-main); border: 1px solid var(--br); padding: 7px 6px; border-radius: 5px; outline: none; font-size: 12.5px; }
    .cw-btn { background: var(--bg-btn); color: var(--tx-main); border: 1px solid var(--br); padding: 7px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; flex: 1; }
    .cw-btn:hover { background: var(--bg-btn-hov); border-color: var(--clr-accent); }
    .cw-btn.active-tl { background: var(--bg-accent); border-color: var(--clr-accent); color: var(--tx-white); }
    .cw-disabled-block { opacity: 0.4; pointer-events: none; filter: saturate(0.6); }
    `;

    GM_addStyle(CSS_STYLES);

    function buildCustomSelect(id, items, initialValue, onChange) {
        const wrap = document.createElement('div');
        wrap.className = 'cw-select';
        wrap.id = id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cw-select-btn';
        btn.innerHTML = `<span class="cw-select-btn-label"></span><svg class="cw-select-chevron" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`;
        const list = document.createElement('div');
        list.className = 'cw-select-list';
        document.body.appendChild(list);

        function renderOptions() {
            list.innerHTML = '';
            items.forEach((item) => {
                const opt = document.createElement('div');
                opt.className = 'cw-select-option' + (item.value === wrap.dataset.value ? ' selected' : '');
                opt.textContent = item.label;
                opt.addEventListener('click', () => {
                    wrap.dataset.value = item.value;
                    btn.querySelector('.cw-select-btn-label').textContent = item.label;
                    closeList();
                    onChange(item.value);
                    renderOptions();
                });
                list.appendChild(opt);
            });
        }

        function openList() {
            const rect = btn.getBoundingClientRect();
            list.style.left = `${rect.left}px`;
            list.style.top = `${rect.bottom + 6}px`;
            list.style.width = `${rect.width}px`;
            list.classList.add('open');
            btn.classList.add('open');
            document.addEventListener('click', outsideHandler, true);
        }

        function closeList() {
            list.classList.remove('open');
            btn.classList.remove('open');
            document.removeEventListener('click', outsideHandler, true);
        }

        function outsideHandler(e) {
            if (!wrap.contains(e.target) && !list.contains(e.target)) closeList();
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (list.classList.contains('open')) closeList(); else openList();
        });

        wrap.appendChild(btn);
        wrap.setValue = (val) => {
            wrap.dataset.value = val;
            const found = items.find((i) => i.value === val);
            btn.querySelector('.cw-select-btn-label').textContent = found ? found.label : '';
            renderOptions();
        };
        wrap.setValue(initialValue);
        return wrap;
    }

    function createUI() {
        if (document.getElementById('cw-shader-btn')) return;
        const btn = document.createElement('div');
        btn.id = 'cw-shader-btn';
        btn.innerHTML = `<svg viewBox="0 0 512 512"><path d="M212.969,278.609c15.938-44.594,56.344-76.75,103.688-82.141c-15.469-44.016-57.375-75.5-106.656-75.5c-62.438,0-113.109,50.594-113.109,113.047c0,29.781,11.531,56.859,30.375,77.078c21.672-20.156,50.734-32.547,82.672-32.547C210.938,278.547,211.906,278.609,212.969,278.609z"/><rect x="193.516" y="24.047" width="32.938" height="63.406"/><polygon points="117.984,118.734 73.156,73.906 49.859,97.188 94.688,142.031"/><rect y="217.563" width="63.406" height="32.938"/><path d="M49.859,370.844l23.266,23.328l17.578-17.594c2.766-14.109,7.969-27.344,15.219-39.266l-11.266-11.266L49.859,370.844z"/><polygon points="370.125,97.188 346.813,73.891 302,118.734 325.281,142.031"/><path d="M422.578,304.344c-9.234-42.828-47.281-74.922-92.859-74.922c-46.063,0-84.438,32.75-93.156,76.25c-5.156-0.891-10.438-1.453-15.844-1.453c-50.75,0-91.875,41.125-91.875,91.859c0,50.75,41.125,91.875,91.875,91.875c43.359,0,156.75,0,199.406,0c50.75,0,91.875-41.125,91.875-91.875C512,346.156,472.188,305.641,422.578,304.344z"/></svg>`;
        document.body.appendChild(btn);

        const menu = document.createElement('div');
        menu.id = 'cw-shader-menu';
        menu.innerHTML = `
            <div id="cw-menu-header"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 8.94 10.06A7 7 0 0 1 12 3z"/></svg> Меню шейдеров</div>
            <div class="cw-menu-content">
                <label class="cw-toggle-row" for="cw-lock-cb">
                    <span>Зафиксировать время/погоду</span>
                    <span class="cw-toggle"><input type="checkbox" id="cw-lock-cb" ${settings.isLocked ? 'checked' : ''}><span class="slider"></span></span>
                </label>
                <div id="cw-override-toggles" class="${settings.isLocked ? 'cw-disabled-block' : ''}" style="display:flex; flex-direction:column; gap:10px;">
                    <label class="cw-toggle-row" for="cw-weather-off-cb">
                        <span>Отключить погоду</span>
                        <span class="cw-toggle"><input type="checkbox" id="cw-weather-off-cb" ${settings.weatherOff ? 'checked' : ''}><span class="slider"></span></span>
                    </label>
                    <label class="cw-toggle-row" for="cw-time-off-cb">
                        <span>Отключить время</span>
                        <span class="cw-toggle"><input type="checkbox" id="cw-time-off-cb" ${settings.timeOff ? 'checked' : ''}><span class="slider"></span></span>
                    </label>
                </div>
                <div id="cw-selectors-wrap" class="${settings.isLocked ? '' : 'cw-disabled-block'}" style="display:flex; flex-direction:column; gap:10px;">
                    <div class="cw-setting-row"><label>Время суток</label><div id="cw-time-sel-mount"></div></div>
                    <div class="cw-setting-row"><label>Погода</label><div id="cw-weather-sel-mount"></div></div>
                    <div class="cw-setting-row"><label>Направление ветра</label><div id="cw-wind-sel-mount"></div></div>
                </div>
                <div class="cw-section-title">Таймлапс времени</div>
                <div class="cw-tl-controls">
                    <input type="number" id="cw-tl-speed" value="0.35" min="0.05" step="0.1">
                    <button class="cw-btn" id="cw-tl-start">Старт</button>
                    <button class="cw-btn" id="cw-tl-stop">Стоп</button>
                </div>
                <div id="cw-dev-panel" style="display:none;">
                    <div class="cw-section-title" style="color: #e06c75;">Дев-панель</div>
                    <div class="cw-tl-controls">
                        <button class="cw-btn ${settings.strongWind ? 'active-tl' : ''}" id="cw-dev-wind">Сильный ветер</button>
                        <button class="cw-btn" id="cw-dev-lightning" style="border-color: #e06c75; color: #e06c75;">Вспышка</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(menu);

        const cbLock = document.getElementById('cw-lock-cb');
        const cbWeatherOff = document.getElementById('cw-weather-off-cb');
        const cbTimeOff = document.getElementById('cw-time-off-cb');
        const wrap = document.getElementById('cw-selectors-wrap');
        const overrideToggles = document.getElementById('cw-override-toggles');
        const devPanel = document.getElementById('cw-dev-panel');
        const menuHeader = document.getElementById('cw-menu-header');
        const btnTlStart = document.getElementById('cw-tl-start');
        const btnTlStop = document.getElementById('cw-tl-stop');
        const inpTlSpeed = document.getElementById('cw-tl-speed');

        const btnDevWind = document.getElementById('cw-dev-wind');
        const btnDevLightning = document.getElementById('cw-dev-lightning');

        const timeItems = Array.from({length: 24}, (_, i) => ({ value: String(i), label: `${i}:00` }));
        const weatherItems = Object.keys(WEATHER_CONFIG).map((k) => ({ value: k, label: WEATHER_CONFIG[k].label }));
        const windItems = [{ value: 'auto', label: 'Авто (динамика)' }, { value: 'left', label: 'Влево' }, { value: 'right', label: 'Вправо' }];

        const timeSelect = buildCustomSelect('cw-time-sel', timeItems, settings.hour, (val) => { settings.hour = val; saveSettings(); applyVisuals(); });
        document.getElementById('cw-time-sel-mount').appendChild(timeSelect);

        const weatherSelect = buildCustomSelect('cw-weather-sel', weatherItems, settings.weather, (val) => { settings.weather = val; saveSettings(); applyVisuals(); });
        document.getElementById('cw-weather-sel-mount').appendChild(weatherSelect);

        const windSelect = buildCustomSelect('cw-wind-sel', windItems, settings.windDir || 'auto', (val) => { settings.windDir = val; saveSettings(); applyVisuals(); });
        document.getElementById('cw-wind-sel-mount').appendChild(windSelect);

        btn.addEventListener('click', () => menu.classList.toggle('active'));

        cbLock.addEventListener('change', (e) => {
            settings.isLocked = e.target.checked;
            wrap.className = settings.isLocked ? '' : 'cw-disabled-block';
            overrideToggles.className = settings.isLocked ? 'cw-disabled-block' : '';
            if (!settings.isLocked) stopHourTimelapse();
            saveSettings();
            applyVisuals();
        });

        cbWeatherOff.addEventListener('change', (e) => {
            settings.weatherOff = e.target.checked;
            saveSettings();
            applyVisuals();
        });

        cbTimeOff.addEventListener('change', (e) => {
            settings.timeOff = e.target.checked;
            saveSettings();
            applyVisuals();
        });

        function stopHourTimelapse() {
            if (hourTimelapseInterval) clearInterval(hourTimelapseInterval);
            hourTimelapseInterval = null;
            btnTlStart.classList.remove('active-tl');
            const field = document.getElementById('cages_overflow');
            if (field) field.classList.remove('is-timelapse');
        }

        btnTlStart.addEventListener('click', () => {
            stopHourTimelapse();
            settings.isLocked = true;
            cbLock.checked = true;
            wrap.className = '';
            overrideToggles.className = 'cw-disabled-block';
            btnTlStart.classList.add('active-tl');
            const field = document.getElementById('cages_overflow');
            if (field) field.classList.add('is-timelapse');
            saveSettings();

            let currentTlHour = parseInt(settings.hour, 10) || 0;
            const speedMs = parseFloat(inpTlSpeed.value) * 1000 || 800;

            hourTimelapseInterval = setInterval(() => {
                currentTlHour = (currentTlHour + 1) % 24;
                settings.hour = currentTlHour.toString();
                timeSelect.setValue(settings.hour);
                applyVisuals();
            }, speedMs);
        });

        btnTlStop.addEventListener('click', stopHourTimelapse);

        btnDevWind.addEventListener('click', () => {
            settings.strongWind = !settings.strongWind;
            if (settings.strongWind) {
                btnDevWind.classList.add('active-tl');
            } else {
                btnDevWind.classList.remove('active-tl');
            }
            saveSettings();
        });

        let devClickTimes = [];
        let headerDragging = false;
        let headerMoved = false;
        let headerStartX = 0;
        let headerStartY = 0;
        let headerOffsetX = 0;
        let headerOffsetY = 0;

        menuHeader.addEventListener('mousedown', (e) => {
            headerDragging = true;
            headerMoved = false;
            headerStartX = e.clientX;
            headerStartY = e.clientY;
            const rect = menu.getBoundingClientRect();
            headerOffsetX = e.clientX - rect.left;
            headerOffsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!headerDragging) return;
            if (!headerMoved && (Math.abs(e.clientX - headerStartX) > 3 || Math.abs(e.clientY - headerStartY) > 3)) {
                headerMoved = true;
            }
            if (!headerMoved) return;
            const rect = menu.getBoundingClientRect();
            let left = e.clientX - headerOffsetX;
            let top = e.clientY - headerOffsetY;
            left = Math.min(Math.max(0, left), window.innerWidth - rect.width);
            top = Math.min(Math.max(0, top), window.innerHeight - rect.height);
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
            menu.style.right = 'auto';
            menu.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            headerDragging = false;
        });

        menuHeader.addEventListener('click', () => {
            if (headerMoved) { headerMoved = false; return; }
            const now = Date.now();
            devClickTimes.push(now);
            devClickTimes = devClickTimes.filter((t) => now - t <= 10000);
            if (devClickTimes.length >= 5) {
                devPanel.style.display = devPanel.style.display === 'none' ? 'block' : 'none';
                devClickTimes = [];
            }
        });

        btnDevLightning.addEventListener('click', () => {
            const activeType = particleEngine.config?.type;

            if (activeType === 'snow') {
                particleEngine.whiteoutState.active = true;
                particleEngine.whiteoutState.life = 0;
                particleEngine.whiteoutState.duration = 140;
                particleEngine.whiteoutState.peak = 0.14;
                particleEngine.whiteoutState.cooldown = 0;
            } else if (activeType === 'rain') {
                particleEngine.lightningState.active = true;
                particleEngine.lightningState.intensity = 0.50;
                particleEngine.lightningState.cooldown = 0;
            }
        });
    }

    function ensureLayers(field) {
        ['cw-time-a', 'cw-time-b', 'cw-weather-a', 'cw-weather-b'].forEach(id => {
            if (!document.getElementById(id)) {
                const div = document.createElement('div');
                div.id = id;
                div.className = 'cw-tint-layer';
                field.appendChild(div);
            }
        });
        if (!document.getElementById('cw-weather-canvas')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'cw-weather-canvas';
            field.appendChild(canvas);
        }
    }

    function crossfade(prefix, config) {
        const activeKey = layerState[prefix];
        const nextKey = activeKey === 'a' ? 'b' : 'a';
        const visible = document.getElementById(`cw-${prefix}-${activeKey}`);
        const hidden = document.getElementById(`cw-${prefix}-${nextKey}`);
        if (!visible || !hidden) return;

        const targetBg = config.bg !== undefined ? config.bg : config.tint;
        const targetBlend = config.blend || 'normal';

        if (!targetBg || targetBg === 'transparent') {
            visible.style.opacity = '0';
            hidden.style.opacity = '0';
            return;
        }

        hidden.style.background = targetBg;
        hidden.style.mixBlendMode = targetBlend;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                hidden.style.opacity = '1';
                visible.style.opacity = '0';
            });
        });

        layerState[prefix] = nextKey;
    }

    function applyVisuals() {
        const field = document.getElementById('cages_overflow');
        if (!field) return;

        ensureLayers(field);

        let hour = settings.isLocked ? settings.hour : '12';
        let weather = settings.isLocked ? settings.weather : '1';

        if (!settings.isLocked) {
            if (!settings.timeOff) {
                const hourImg = document.querySelector('#hour img');
                if (hourImg) {
                    const hourMatch = hourImg.src.match(/hours\/(\d+)\.png/);
                    if (hourMatch && hourMatch[1]) hour = hourMatch[1];
                }
            }
            if (!settings.weatherOff) {
                const skyDiv = document.getElementById('sky');
                if (skyDiv && skyDiv.style.backgroundImage) {
                    const weatherMatch = skyDiv.style.backgroundImage.match(/sky\/(\d+)\.png/);
                    if (weatherMatch && weatherMatch[1]) weather = weatherMatch[1];
                }
            }
        }

        const timeChanged = (hour !== lastAppliedHour);
        const weatherChanged = (weather !== lastAppliedWeather);

        lastAppliedHour = hour;
        lastAppliedWeather = weather;

        const timeConf = TIME_CONFIG[hour] || TIME_CONFIG['12'];
        let weatherConf = WEATHER_CONFIG[weather];
        if (!weatherConf) {
            console.warn(`[CatWar Shader] No config for weather id "${weather}", falling back to default.`);
            weatherConf = DEFAULT_WEATHER;
        }

        const baseFilter = [timeConf.filter, weatherConf.filter].filter(Boolean).join(' ') || 'none';
        particleEngine.baseFilter = baseFilter;

        if (timeChanged) {
            crossfade('time', timeConf);
        }
        if (weatherChanged) {
            crossfade('weather', weatherConf);
        }

        syncParticles(field, weatherConf.particles);

        if (!particleEngine.raf) {
            field.style.filter = baseFilter;
            particleEngine.lastFilterString = baseFilter;
        }
    }

    const particleEngine = { canvas: null, ctx: null, list: [], config: null, raf: null, width: 0, height: 0, clock: 0, baseFilter: '', lastFilterString: '', lightningState: { active: false, intensity: 0, cooldown: 0 }, whiteoutState: { active: false, life: 0, duration: 0, peak: 0, cooldown: 0 } };

    function randRange(min, max) { return min + Math.random() * (max - min); }

    function getEffectiveDir(confDir, clock, windDirSetting, gustIntensity = 0) {
        const absDir = Math.abs(confDir);
        if (windDirSetting === 'left') return -absDir;
        if (windDirSetting === 'right') return absDir;
        const baseWander = Math.sin(clock * 0.00005) * 0.12 + Math.cos(clock * 0.000023) * 0.05;
        let dir = absDir * (Math.sin(clock * 0.00003) + baseWander);

        if (gustIntensity > 0) {
            dir += Math.sin(clock * 0.00022) * gustIntensity * absDir * 0.8;
        }

        return dir;
    }

    function spawnParticle(conf, width, height, initial, baseDir) {
        const depth = Math.pow(Math.random(), conf.depthPow || 0.8);
        const margin = Math.max(300, height * 1.5);
        const x = randRange(-margin, width + margin);
        const y = initial ? randRange(-20, height) : -20;

        const drift = baseDir + randRange(-0.03, 0.03);
        const speedMult = settings.strongWind ? 2.2 : 1.0;

        if (conf.type === 'rain') {
            const len = conf.len[0] + (conf.len[1] - conf.len[0]) * depth;
            const dirMag = Math.sqrt(drift * drift + 1);

            return {
                x: x, y: y, depth: depth,
                speed: conf.speed * speedMult * (0.8 + depth * 0.4),
                len: len,
                alpha: conf.alpha[0] + (conf.alpha[1] - conf.alpha[0]) * depth,
                drift: drift,
                tailDX: -(len * drift) / dirMag,
                tailDY: -len / dirMag
            };
        }

        return {
            x: x, y: y, depth: depth,
            speed: conf.speed * speedMult * (0.7 + depth * 0.5),
            r: conf.size[0] + (conf.size[1] - conf.size[0]) * depth,
            alpha: conf.alpha[0] + (conf.alpha[1] - conf.alpha[0]) * depth,
            drift: drift,
            phase: randRange(0, Math.PI * 2),
            phaseSpeed: randRange(0.015, 0.03)
        };
    }

    function syncParticles(field, conf) {
        const canvas = document.getElementById('cw-weather-canvas');
        if (!canvas) return;

        const width = field.clientWidth;
        const height = field.clientHeight;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        particleEngine.canvas = canvas;
        particleEngine.ctx = canvas.getContext('2d');
        particleEngine.width = width;
        particleEngine.height = height;

        const confChanged = JSON.stringify(conf) !== JSON.stringify(particleEngine.config);

        if (!conf) {
            particleEngine.config = null;
            particleEngine.list = [];
            if (particleEngine.raf) { cancelAnimationFrame(particleEngine.raf); particleEngine.raf = null; }
            particleEngine.ctx.clearRect(0, 0, width, height);
            return;
        }

        if (confChanged) {
            particleEngine.config = conf;
            const area = width * height;
            const densityScale = Math.min(1, Math.max(0.3, area / (1280 * 720)));
            const effectiveCount = Math.max(20, Math.round(conf.count * densityScale));
            const initialDir = getEffectiveDir(conf.dir, particleEngine.clock, settings.windDir || 'auto', 0);
            particleEngine.list = Array.from({length: effectiveCount}, () => spawnParticle(conf, width, height, true, initialDir));
        }

        if (!particleEngine.raf) runParticleLoop();
    }

    let sizeCheckFrame = 0;

    function runParticleLoop() {
        const step = () => {
            const engine = particleEngine;
            if (!engine.config || !engine.ctx) {
                engine.raf = null;
                return;
            }

            const field = document.getElementById('cages_overflow');

            sizeCheckFrame++;
            if (field && sizeCheckFrame % 6 === 0) {
                const w = field.clientWidth;
                const h = field.clientHeight;
                if (engine.canvas.width !== w || engine.canvas.height !== h) {
                    engine.canvas.width = w;
                    engine.canvas.height = h;
                    engine.width = w;
                    engine.height = h;
                }
            }

            engine.clock += 16;

            const ctx = engine.ctx;
            const conf = engine.config;
            ctx.clearRect(0, 0, engine.width, engine.height);

            let gustIntensity = settings.strongWind ? 1.0 : 0;
            const isHeavy = (conf.type === 'rain' && conf.speed > 20) || conf.gust || settings.strongWind;
            if (isHeavy && !settings.strongWind) {
                const cycle = (engine.clock % 25000) / 25000;
                if (cycle >= 0.7 && cycle <= 0.9) {
                    const progress = (cycle - 0.7) / 0.2;
                    gustIntensity = Math.sin(progress * Math.PI);
                }
            }

            let lightningFilter = '';
            if (conf.type === 'rain') {
                if (engine.lightningState.cooldown > 0) {
                    engine.lightningState.cooldown--;
                } else if (!engine.lightningState.active && (Math.random() < 0.0003 || (gustIntensity > 0.8 && Math.random() < 0.005))) {
                    engine.lightningState.active = true;
                    engine.lightningState.intensity = randRange(0.30, 0.55);
                    engine.lightningState.cooldown = randRange(300, 800);
                }

                if (engine.lightningState.active) {
                    lightningFilter = ` brightness(${1 + engine.lightningState.intensity}) contrast(1)`;
                    engine.lightningState.intensity -= 0.07;
                    if (engine.lightningState.intensity <= 0) {
                        engine.lightningState.active = false;
                        if (Math.random() < 0.4) {
                            engine.lightningState.active = true;
                            engine.lightningState.intensity = 0.25;
                            engine.lightningState.cooldown = 12;
                        }
                    }
                }
            } else {
                engine.lightningState.active = false;
                engine.lightningState.intensity = 0;
            }

            let whiteoutFilter = '';
            if (conf.type === 'snow') {
                const wState = engine.whiteoutState;

                if (conf.gust) {
                    if (wState.cooldown > 0) {
                        wState.cooldown--;
                    } else if (!wState.active && gustIntensity > 0.55 && Math.random() < 0.01) {
                        wState.active = true;
                        wState.life = 0;
                        wState.duration = randRange(110, 170);
                        wState.peak = 0.24;
                        wState.cooldown = randRange(500, 1000);
                    }
                }

                if (wState.active) {
                    wState.life++;
                    const progress = wState.life / wState.duration;
                    if (progress >= 1) {
                        wState.active = false;
                    } else {
                        const eased = wState.peak * Math.sin(progress * Math.PI);
                        whiteoutFilter = ` brightness(${(1 + eased).toFixed(2)}) saturate(${(1 - eased * 0.5).toFixed(2)})`;
                    }
                }
            } else {
                engine.whiteoutState.active = false;
            }

            if (field) {
                const composedFilter = (engine.baseFilter || 'none') + lightningFilter + whiteoutFilter;
                if (engine.lastFilterString !== composedFilter) {
                    field.style.filter = composedFilter;
                    engine.lastFilterString = composedFilter;
                }
            }

            const currentBaseDir = getEffectiveDir(conf.dir, engine.clock, settings.windDir || 'auto', gustIntensity);
            const margin = Math.max(300, engine.height * 1.5);

            if (conf.type === 'rain') {
                ctx.lineCap = 'round';
                ctx.lineWidth = conf.width;

                const buckets = new Map();

                for (const p of engine.list) {
                    const dy = p.speed;
                    const dx = dy * p.drift;

                    p.x += dx;
                    p.y += dy;

                    if (p.y > engine.height + 30 || p.x < -margin || p.x > engine.width + margin) {
                        Object.assign(p, spawnParticle(conf, engine.width, engine.height, false, currentBaseDir));
                        continue;
                    }

                    const tailX = p.x + p.tailDX;
                    const tailY = p.y + p.tailDY;

                    const bucketKey = Math.round(p.alpha * 10);
                    let path = buckets.get(bucketKey);
                    if (!path) {
                        path = new Path2D();
                        buckets.set(bucketKey, path);
                    }
                    path.moveTo(p.x, p.y);
                    path.lineTo(tailX, tailY);
                }

                for (const [bucketKey, path] of buckets) {
                    ctx.strokeStyle = `rgba(190,210,230,${bucketKey / 10})`;
                    ctx.stroke(path);
                }
            } else if (conf.type === 'snow') {
                const buckets = new Map();

                for (const p of engine.list) {
                    p.phase += p.phaseSpeed;
                    const dy = p.speed;
                    const dx = dy * p.drift;

                    p.x += dx + Math.sin(p.phase) * 0.3;
                    p.y += dy;

                    if (p.y > engine.height + 20 || p.x < -margin || p.x > engine.width + margin) {
                        Object.assign(p, spawnParticle(conf, engine.width, engine.height, false, currentBaseDir));
                        continue;
                    }

                    const bucketKey = Math.round(p.alpha * 10);
                    let path = buckets.get(bucketKey);
                    if (!path) {
                        path = new Path2D();
                        buckets.set(bucketKey, path);
                    }
                    path.moveTo(p.x + p.r, p.y);
                    path.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                }

                for (const [bucketKey, path] of buckets) {
                    ctx.fillStyle = `rgba(255,255,255,${bucketKey / 10})`;
                    ctx.fill(path);
                }
            }

            engine.raf = requestAnimationFrame(step);
        };

        particleEngine.raf = requestAnimationFrame(step);
    }

    let observerPending = false;

    function scheduleVisualsUpdate() {
        if (observerPending) return;
        observerPending = true;
        requestAnimationFrame(() => {
            observerPending = false;
            createUI();
            applyVisuals();
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                const target = mutation.target;
                if (target.id === 'sky' || target.closest?.('#hour')) {
                    scheduleVisualsUpdate();
                    break;
                }
                continue;
            }
            if (mutation.addedNodes.length) {
                scheduleVisualsUpdate();
                break;
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style'] });

    window.addEventListener('load', () => { createUI(); applyVisuals(); });
    window.addEventListener('resize', scheduleVisualsUpdate);

})();
