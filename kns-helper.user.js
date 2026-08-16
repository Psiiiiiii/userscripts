// ==UserScript==
// @name         KNS Helper
// @version      1.2
// @description  Удобный инструмент для скачивания моделек из конструктора окрасов
// @author       Psiii
// @copyright    Amina Kotenkova ( https://vk.ru/psiiiiiii / https://github.com/Psiiiiiii )
// @updateURL    https://raw.githubusercontent.com/Psiiiiiii/userscripts/main/kns-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/Psiiiiiii/userscripts/main/kns-helper.user.js
// @match        https://catwar.su/cw3/kns*
// @match        https://catwar.net/cw3/kns**
// @match        https://alwiess.github.io
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @icon         https://i.ibb.co/DfRWc8hs/image.png
// @require      https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js
// @require      https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js
// @require      https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.js
// ==/UserScript==

// CHANGELOG
// 1.2 – Новые функции:
// - Редактор окраса: замена одного цвета на другой по всему коду
// - Перенос и копирование узоров между частями тела (лево/право)
// 1.1 – Новые функции:
// - Сохранение истории изменений в конструкторе окрасов
// - Работает и с кнопками на странице и с горячими клавишами Ctrl+Z/Ctrl+Y
// - Сохранение последнего окраса на странице при перезагрузке
// - Возможность сохранения окрасов в отдельную "галерею", из которой их можно восстановить или удалить.

(function () {
'use strict';

const CAT_W = 100;
const CAT_H = 150;
const WATERMARK = true;

const POSE_TYPE  = { '0': 'static', '1': 'apng', '-1': 'static', '5': 'gif_over' };
const POSE_ORDER = { '0': 0, '1': 1, '-1': 2, '5': 3 };
const POSE_NAMES = { '0': 'Сидит', '1': 'Спит', '-1': 'Маленькая', '5': 'Пьёт' };

const ANIMATED_TYPES = new Set(['apng', 'gif_over']);

const BODY_COLORS = [
    { id: 1,  name: 'кремовый' },
    { id: 2,  name: 'белоснежный' },
    { id: 3,  name: 'белый' },
    { id: 4,  name: 'серебристый' },
    { id: 5,  name: 'серый' },
    { id: 6,  name: 'дымчатый' },
    { id: 7,  name: 'чёрный' },
    { id: 8,  name: 'угольно-чёрный' },
    { id: 9,  name: 'иссиня-чёрный' },
    { id: 10, name: 'чернобурый' },
    { id: 11, name: 'бурый' },
    { id: 12, name: 'шоколадный' },
    { id: 13, name: 'фавн' },
    { id: 14, name: 'медный' },
    { id: 15, name: 'огненный' },
    { id: 16, name: 'красный' },
    { id: 17, name: 'рыжий' },
    { id: 18, name: 'золотистый' },
    { id: 19, name: 'палевый' },
    { id: 20, name: 'лиловый' },
    { id: 21, name: 'голубой' },
    { id: 22, name: 'серо-голубой' },
    { id: 23, name: 'дымчато-голубой' },
    { id: 24, name: 'черничный' },
];

const DEFAULT_FIELD_ROLES = [
    'body', 'skip', 'body', 'body', 'body', 'body', 'body', 'ear', 'ear', 'body',
    'body', 'body', 'body', 'body', 'body', 'body', 'body', 'body', 'body', 'skip',
    'body', 'cheek', 'skip', 'skip',
];

const DEFAULT_LEG_POSITIONS = { fl: 3, fr: 4, bl: 14, br: 15 };
const DEFAULT_EAR_POSITIONS = { el: 8, er: 9 };
const DEFAULT_CHEEK_FIELD_POS = 22;

const PART_LABELS = {
    fl: 'Перед. левая',
    fr: 'Перед. правая',
    bl: 'Задняя левая',
    br: 'Задняя правая',
    el: 'Левое ухо',
    er: 'Правое ухо',
    cl: 'Левая щека',
    cr: 'Правая щека',
};
const PART_GROUPS = {
    fl: 'swap', fr: 'swap', bl: 'swap', br: 'swap', el: 'swap', er: 'swap',
    cl: 'cheek', cr: 'cheek',
};
const CHEEK_SIDE_ELEMENTS = { cl: [1, 3, 5, 7], cr: [2, 4, 6, 8] };
const CHEEK_PAIR = { 1: 2, 2: 1, 3: 4, 4: 3, 5: 6, 6: 5, 7: 8, 8: 7 };

GM_addStyle(`

:root {
    --bg-panel:   #1d1c1d;
    --bg-surface: #2a2a2a;
    --bg-btn:     #2a2a2a;
    --bg-btn-hov: #383838;
    --bg-btn-dis: #141414;
    --bg-accent:  #707d45;

    --br:         rgba(255, 255, 255, 0.12);
    --br-dis:     rgba(255, 255, 255, 0.06);
    --br-div:     rgba(255, 255, 255, 0.08);

    --tx-main:    #e8e3e7;
    --tx-muted:   #a09ea0;
    --tx-white:   #ffffff;
    --tx-dis:     #55524f;
    --tx-green:   #8fbf7a;
    --tx-error:   #e06c75;
    --tx-em:      #7d7a7d;

    --clr-accent:   #b0c273;
    --shadow-light: rgba(0, 0, 0, 0.4);
    --shadow-panel: rgba(0, 0, 0, 0.5);
}

#kns-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    width: 300px;
    padding: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--br);
    border-radius: 8px;
    box-shadow: 0 24px 60px var(--shadow-panel);
    color: var(--tx-main);
    font: 13px "Segoe UI", Tahoma, sans-serif;
    user-select: none;
    accent-color: var(--bg-accent);
}

#kns-header {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 2px;
    cursor: grab;
}
#kns-header:active { cursor: grabbing; }

#kns-panel h3 {
    margin: 0;
    text-align: center;
    font-size: 15px;
    font-weight: 500;
    color: var(--tx-main);
    letter-spacing: 0.4px;
    flex: 1;
}

#kns-toggle:hover { color: var(--tx-main); }

#kns-panel.collapsed #kns-body { display: none; }

#kns-status {
    min-height: 17px;
    margin-bottom: 10px;
    font-size: 12px;
    text-align: center;
    color: var(--tx-green);
}
#kns-status.error { color: var(--tx-error); }

#kns-poses-wrap { min-height: 30px; }

#kns-poses-wrap em {
    font-size: 12px;
    color: var(--tx-em);
}
#kns-poses-wrap em.error { color: var(--tx-error); }

#kns-panel .pose-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-surface);
    border-radius: 5px;
    padding: 5px;
    margin-bottom: 5px;
}

#kns-panel .pose-name {
    width: 72px;
    font-weight: 500;
    color: var(--tx-main);
    flex-shrink: 0;
}

#kns-panel .pose-btns {
    display: flex;
    gap: 4px;
}

#kns-panel button {
    background: var(--bg-btn);
    border: 1px solid var(--br);
    color: var(--tx-main);
    padding: 3px 9px;
    border-radius: 5px;
    cursor: pointer;
    font: 12px "Segoe UI", Tahoma, sans-serif;
    transition: background 0.15s;
}
#kns-panel button:hover:not(:disabled) { background: var(--bg-btn-hov); border-color: var(--clr-accent); }
#kns-panel button:disabled {
    background: var(--bg-btn-dis);
    border-color: var(--br-dis);
    color: var(--tx-dis);
    cursor: not-allowed;
}

#kns-panel hr {
    border: none;
    border-top: 1px solid var(--br-div);
    margin: 8px 0 10px;
}

#kns-panel .section-title {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: var(--clr-accent);
    margin-bottom: 8px;
}

#kns-panel .radio-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 7px;
    font-size: 12px;
}
#kns-panel .radio-row span {
    color: var(--tx-muted);
    min-width: 92px;
}
#kns-panel .radio-row label { cursor: pointer; }

#kns-panel input[type="radio"] {
    appearance: none;
    width: 13px;
    height: 13px;
    border: 1.5px solid var(--tx-muted);
    border-radius: 50%;
    background: var(--bg-btn-dis);
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.15s;
    vertical-align: middle;
    margin: 0;
}
#kns-panel input[type="radio"]:checked {
    border-color: var(--clr-accent);
    background: var(--bg-accent);
    box-shadow: inset 0 0 0 3px var(--bg-panel);
}

#kns-panel select,
#kns-panel input[type="number"] {
    background: var(--bg-btn-dis);
    border: 1px solid var(--br);
    color: var(--tx-main);
    padding: 3px 6px;
    border-radius: 5px;
    font: 12px "Segoe UI", Tahoma, sans-serif;
    flex: 1;
    min-width: 0;
}
#kns-panel input[type="number"] { flex: none; width: 55px; }

#kns-panel #kns-dl-btn {
    width: 100%;
    margin-top: 8px;
    padding: 7px 0;
    background: var(--bg-accent);
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--tx-white);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: filter 0.15s, border-color 0.15s;
}
#kns-panel #kns-dl-btn:hover { filter: brightness(1.2); border-color: var(--clr-accent); }

#kns-panel #kns-color-apply {
    width: 100%;
    margin-top: 4px;
    padding: 7px 0;
    background: var(--bg-accent);
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--tx-white);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: filter 0.15s, border-color 0.15s;
}
#kns-panel #kns-color-apply:hover { filter: brightness(1.2); border-color: var(--clr-accent); }

.kns-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: var(--bg-surface);
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: 7px;
    font-size: 12px;
}
.kns-toggle { position: relative; width: 36px; height: 21px; flex-shrink: 0; }
.kns-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.kns-toggle .slider {
    position: absolute; inset: 0;
    background: var(--bg-btn-dis);
    border: 1px solid var(--br);
    border-radius: 20px;
    transition: background 0.25s;
}
.kns-toggle .slider::before {
    content: '';
    position: absolute;
    width: 15px; height: 15px;
    left: 2px; top: 2px;
    background: var(--tx-main);
    border-radius: 50%;
    transition: transform 0.25s;
}
.kns-toggle input:checked + .slider { background: var(--bg-accent); border-color: transparent; }
.kns-toggle input:checked + .slider::before { transform: translateX(15px); }

.kns-collapsible-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
}
.kns-collapsible-header:hover { color: var(--tx-main); }
.kns-chevron { color: var(--clr-accent); transition: transform 0.2s; display: inline-block; }
.kns-chevron.open { transform: rotate(90deg); }
#kns-saved-list, #kns-history-body, #kns-editor-body { display: flex; flex-direction: column; margin-top: 6px; }
#kns-saved-list { max-height: 220px; overflow-y: auto; }
#kns-saved-list em { font-size: 12px; color: var(--tx-em); }
.kns-saved-row .pose-name { width: auto; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px; }

#kns-toggle {
    position: absolute;
    top: 0px;
    right: 0px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    color: var(--tx-muted);
    line-height: 1;
    transition: color 0.15s;
    height: 23px;
}
`);

// ─────────────────────────────────────────────

function fetchBinary(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET', url,
            responseType: 'arraybuffer',
            onload: r => resolve(new Uint8Array(r.response)),
            onerror: reject,
        });
    });
}

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

let _rgbaCanvas = null, _rgbaCtx = null;
function getRGBA(canvas) {
    if (!_rgbaCanvas) {
        _rgbaCanvas = document.createElement('canvas');
        _rgbaCanvas.width = CAT_W;
        _rgbaCanvas.height = CAT_H;
        _rgbaCtx = _rgbaCanvas.getContext('2d', { willReadFrequently: true });
    }
    _rgbaCtx.clearRect(0, 0, CAT_W, CAT_H);
    _rgbaCtx.drawImage(canvas, 0, 0, CAT_W, CAT_H);
    return new Uint8Array(_rgbaCtx.getImageData(0, 0, CAT_W, CAT_H).data.buffer.slice(0));
}

function hashRGBA(rgba) {
    let h1 = 0x9e3779b9, h2 = 0x6c62272e;
    for (let i = 0; i < rgba.length; i += 4) {
        const px = rgba[i] | (rgba[i+1] << 8) | (rgba[i+2] << 16) | (rgba[i+3] << 24);
        h1 = (Math.imul(h1 ^ px, 0x9e3779b9) + 0x85ebca6b) >>> 0;
        h2 = (Math.imul(h2 ^ px, 0x6c62272e) + 0xc2b2ae35) >>> 0;
    }
    return h1 + '_' + h2;
}

const GCD = (a, b) => b === 0 ? a : GCD(b, a % b);
const LCM = (a, b) => (a === 0 || b === 0) ? Math.max(a, b) : a / GCD(a, b) * b;

function rgbaToCanvas(rgba, width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
    return c;
}

// ─────────────────────────────────────────────

function decodeGIFframes(data) {
    const gr = new GifReader(data instanceof Uint8Array ? data : new Uint8Array(data));
    const { width: gw, height: gh } = gr;
    const screen = new Uint8Array(gw * gh * 4);
    const frames = [];

    for (let i = 0; i < gr.numFrames(); i++) {
        const info = gr.frameInfo(i);
        const { x: fx, y: fy, width: fw, height: fh } = info;
        const prevScreen = screen.slice();

        gr.decodeAndBlitFrameRGBA(i, screen);

        const patch = new Uint8Array(gw * gh * 4);
        for (let row = 0; row < fh; row++) {
            for (let col = 0; col < fw; col++) {
                const si = ((fy + row) * gw + fx + col) * 4;
                if (screen[si + 3] === 0) continue;
                patch[si]     = screen[si];
                patch[si + 1] = screen[si + 1];
                patch[si + 2] = screen[si + 2];
                patch[si + 3] = 255;
            }
        }

        frames.push({ rgba: patch, delay: (info.delay || 10) * 10 });

        const dispose = info.disposal || 0;
        if (dispose === 2) {
            for (let row = 0; row < fh; row++) {
                const off = ((fy + row) * gw + fx) * 4;
                screen.fill(0, off, off + fw * 4);
            }
        } else if (dispose === 3) {
            screen.set(prevScreen);
        }
    }

    return frames;
}

async function captureAnimatedCanvas(canvas, maxFrames = 128, timeoutMs = 20000) {
    return new Promise(resolve => {
        const frames = [];
        let firstHash = null, lastHash = null, lastTime = performance.now();
        let loopCount = 0;
        const startTime = performance.now();
        let rafId;

        function finish() {
            cancelAnimationFrame(rafId);
            if (frames.length >= 2) {
                const avg = Math.round(
                    frames.slice(0, -1).reduce((s, f) => s + f.delay, 0) / (frames.length - 1)
                );
                frames[frames.length - 1].delay = avg;
            }
            resolve(frames.length > 0 ? frames : [{ rgba: getRGBA(canvas), delay: 100 }]);
        }

        function tick(now) {
            const rgba = getRGBA(canvas);
            const h = hashRGBA(rgba);

            if (h !== lastHash) {
                if (frames.length > 0)
                    frames[frames.length - 1].delay = Math.max(1, Math.round(now - lastTime));

                if (firstHash === null) {
                    firstHash = h;
                } else if (h === firstHash && ++loopCount >= 4) {
                    finish(); return;
                }

                frames.push({ rgba: rgba.slice(), delay: 100 });
                lastHash = h;
                lastTime = now;

                if (frames.length >= maxFrames) { finish(); return; }
            }

            if (now - startTime > timeoutMs) { finish(); return; }
            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
    });
}

function findOverlayImg(block, poseId) {
    const candidates = [
        () => block.querySelector('img[src*=".gif"]'),
        () => block.querySelector('img'),
        () => document.getElementById('top_' + poseId)?.querySelector('img[src*=".gif"]'),
        () => document.getElementById('top_' + poseId)?.querySelector('img'),
        () => block.parentElement?.querySelector('img[src*=".gif"]'),
    ];
    for (const get of candidates) {
        const img = get();
        if (img?.src) return img;
    }
    return null;
}

function getPoses() {
    const poses = [];

    for (const block of document.querySelectorAll('[name^="block-cat_"]')) {
        const id = block.getAttribute('name').match(/block-cat_(.+)/)?.[1] ?? 'unknown';
        const type = POSE_TYPE[id] ?? 'static';

        const mainCanvas     = block.querySelector('canvas[id^="cat_"]');
        const fallbackCanvas = document.getElementById(`cat_${id}_0`);
        const canvas = type === 'apng'
            ? mainCanvas
            : (fallbackCanvas?.height > 0 ? fallbackCanvas : mainCanvas);

        if (!canvas) continue;

        poses.push({
            id,
            type,
            canvas,
            overlayImg: type === 'gif_over' ? findOverlayImg(block, id) : null,
            name: POSE_NAMES[id] ?? `Поза ${id}`,
        });
    }

    return poses.sort((a, b) => (POSE_ORDER[a.id] ?? 99) - (POSE_ORDER[b.id] ?? 99));
}

async function getPoseFrames(pose, setStatus) {
    if (pose.type === 'static') {
        setStatus?.('Читаю кадр...');
        await new Promise(r => requestAnimationFrame(r));
        return [{ rgba: getRGBA(pose.canvas), delay: 100 }];
    }

    if (pose.type === 'apng') {
        setStatus?.('Захватываю кадры...');
        return captureAnimatedCanvas(pose.canvas);
    }

    if (pose.type === 'gif_over') {
        setStatus?.('Читаю тело...');
        await new Promise(r => requestAnimationFrame(r));
        const bodyRGBA = getRGBA(pose.canvas);

        if (!pose.overlayImg) {
            console.warn('[KNS] gif_over: оверлей не найден для позы', pose.id);
            return [{ rgba: bodyRGBA, delay: 100 }];
        }

        setStatus?.('Декодирую GIF...');
        const overlayFrames = decodeGIFframes(await fetchBinary(pose.overlayImg.src));

        return overlayFrames.map(({ rgba: ov, delay }) => {
            const rgba = bodyRGBA.slice();
            for (let i = 0; i < rgba.length; i += 4) {
                if (ov[i + 3] === 0) continue;
                rgba[i]     = ov[i];
                rgba[i + 1] = ov[i + 1];
                rgba[i + 2] = ov[i + 2];
                rgba[i + 3] = 255;
            }
            return { rgba, delay };
        });
    }

    return [{ rgba: getRGBA(pose.canvas), delay: 100 }];
}

// ─────────────────────────────────────────────

function encodeAPNG(frames, width, height) {
    const bufs   = frames.map(f => new Uint8Array(f.rgba).buffer);
    const delays = frames.map(f => f.delay);
    return new Blob([UPNG.encode(bufs, width, height, 0, delays)], { type: 'image/png' });
}

function drawWatermark(ctx, width, height, x, y) {
    const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.07));
    ctx.save();
    ctx.font = `100 ${fontSize}px "Segoe UI", Tahoma, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('KNS Helper', x, y + (fontSize * 0.2));
    ctx.restore();
}

function getFieldBgUrl() {
    const field = document.getElementById('field');
    if (!field) return null;
    const bg = field.style.background || field.style.backgroundImage || '';
    const m = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    return m ? m[1] : null;
}

async function drawBgOnCanvas(ctx, width, height, bgUrl) {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const sx = Math.max(0, (img.naturalWidth  - width)  / 2);
            const sy = Math.max(0, (img.naturalHeight - height) / 2);
            const sw = Math.min(img.naturalWidth,  width);
            const sh = Math.min(img.naturalHeight, height);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
            resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = bgUrl;
    });
}

async function loadBgCanvas(bgUrl, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ok = await drawBgOnCanvas(canvas.getContext('2d'), width, height, bgUrl);
    return ok ? canvas : null;
}

function makeReusableCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { c, ctx: c.getContext('2d') };
}

async function downloadPose(pose, format, setStatus) {
    try {
        const frames = await getPoseFrames(pose, setStatus);
        setStatus(`Кодирую ${format.toUpperCase()}...`);

        if (format === 'png') {
            const blob = await new Promise(r => rgbaToCanvas(frames[0].rgba, CAT_W, CAT_H).toBlob(r, 'image/png'));
            saveBlob(blob, `${pose.name}.png`);
        } else {
            saveBlob(encodeAPNG(frames, CAT_W, CAT_H), `${pose.name}.png`);
        }

        setStatus('Готово!');
    } catch (e) {
        console.error('[KNS]', e);
        setStatus(e.message, true);
    }
}

async function downloadCombined(layout, format, setStatus, opts = {}) {
    try {
        const poses = getPoses();
        const PADDING = 10;
        const cols  = layout === 'row' ? poses.length : 2;
        const WM_BAR = (WATERMARK && layout === 'row') ? 24 : 0;
        const TW  = CAT_W * cols + PADDING * 2;
        const TH  = CAT_H * Math.ceil(poses.length / cols) + WM_BAR + PADDING * 2;
        const wmX = TW / 2;
        const wmY = layout === 'row' ? TH - WM_BAR / 2 : TH / 2;
        const xy = i => layout === 'row'
            ? [PADDING + i * CAT_W, PADDING]
            : [PADDING + (i % 2) * CAT_W, PADDING + Math.floor(i / 2) * CAT_H];

        const bgUrl = opts.useBg ? getFieldBgUrl() : null;
        const bgCanvas = bgUrl ? await loadBgCanvas(bgUrl, TW, TH) : null;
        const drawBg = ctx => { if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0); };

        const poseSlots = poses.map(() => makeReusableCanvas(CAT_W, CAT_H));
        const blitPose = (ctx, pi, rgba, x, y) => {
            poseSlots[pi].ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), CAT_W, CAT_H), 0, 0);
            ctx.drawImage(poseSlots[pi].c, x, y);
        };

        const allFrames = [];
        for (let i = 0; i < poses.length; i++) {
            setStatus(`Поза ${i + 1}/${poses.length}...`);
            allFrames.push(await getPoseFrames(poses[i], setStatus));
        }

        if (format === 'png') {
            const c = Object.assign(document.createElement('canvas'), { width: TW, height: TH });
            const ctx = c.getContext('2d');
            drawBg(ctx);
            poses.forEach((_, pi) => {
                const [x, y] = xy(pi);
                blitPose(ctx, pi, allFrames[pi][0].rgba, x, y);
            });
            if (WATERMARK) drawWatermark(ctx, TW, TH, wmX, wmY);
            saveBlob(await new Promise(r => c.toBlob(r, 'image/png')), 'cat_combined.png');
            setStatus('Готово!');
            return;
        }

        setStatus('Собираю кадры...');

        const cycleLengths = allFrames.map(frames => frames.reduce((s, f) => s + f.delay, 0));
        const totalMs = Math.min(cycleLengths.reduce((a, b) => LCM(a, b), cycleLengths[0]), 30000);

        const events = new Set([0]);
        for (let pi = 0; pi < allFrames.length; pi++) {
            if (allFrames[pi].length <= 1) continue;
            let t = 0;
            while (t < totalMs) {
                for (const f of allFrames[pi]) {
                    if (t >= totalMs) break;
                    events.add(t);
                    t += Math.max(f.delay, 1);
                }
            }
        }
        const sortedEvents = [...events].sort((a, b) => a - b);

        const frameAt = (pi, t) => {
            const frames = allFrames[pi];
            if (frames.length <= 1) return 0;
            const tmod = t % cycleLengths[pi];
            let acc = 0;
            for (let i = 0; i < frames.length; i++) {
                acc += frames[i].delay;
                if (tmod < acc) return i;
            }
            return frames.length - 1;
        };

        const composite = [];
        for (let ei = 0; ei < sortedEvents.length; ei++) {
            const t = sortedEvents[ei];
            const delay = Math.max((sortedEvents[ei + 1] ?? totalMs) - t, 10);

            const c = Object.assign(document.createElement('canvas'), { width: TW, height: TH });
            const ctx = c.getContext('2d');
            drawBg(ctx);
            poses.forEach((_, pi) => {
                const [x, y] = xy(pi);
                blitPose(ctx, pi, allFrames[pi][frameAt(pi, t)].rgba, x, y);
            });
            if (WATERMARK) drawWatermark(ctx, TW, TH, wmX, wmY);
            composite.push({ rgba: new Uint8Array(ctx.getImageData(0, 0, TW, TH).data.buffer.slice(0)), delay });
        }

        saveBlob(encodeAPNG(composite, TW, TH), 'cat_combined.png');
        setStatus('Готово!');
    } catch (e) {
        console.error('[KNS]', e);
        setStatus(e.message, true);
    }
}

// ─────────────────────────────────────────────

function renderPoseButtons(panel, poses, setStatus) {
    const wrap = panel.querySelector('#kns-poses-wrap');

    if (!poses.length) {
        wrap.innerHTML = '<em>Нет доступных поз</em>';
        return;
    }

    wrap.innerHTML = poses.map(pose => {
        const canAnimate = ANIMATED_TYPES.has(pose.type);
        const btns = ['PNG', 'APNG'].map(fmt =>
            `<button class="kns-fmt" data-id="${pose.id}" data-fmt="${fmt}"
             ${canAnimate || fmt === 'PNG' ? '' : 'disabled title="Недоступно"'}>${fmt}</button>`
        ).join('');
        return `<div class="pose-row">
            <span class="pose-name">${escapeHtml(pose.name)}</span>
            <div class="pose-btns">${btns}</div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.kns-fmt').forEach(btn => {
        btn.onclick = () => {
            const pose = poses.find(p => p.id === btn.dataset.id);
            downloadPose(pose, btn.dataset.fmt.toLowerCase(), setStatus);
        };
    });
}

// ─────────────────────────────────────────────

function makeDraggable(panel, handle) {
    let ox = 0, oy = 0;

    handle.addEventListener('mousedown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        const rect = panel.getBoundingClientRect();
        ox = e.clientX - rect.left;
        oy = e.clientY - rect.top;

        function onMove(e) {
            panel.style.right = 'auto';
            panel.style.left = (e.clientX - ox) + 'px';
            panel.style.top  = (e.clientY - oy) + 'px';
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            localStorage.setItem('kns-pos', JSON.stringify({
                left: panel.style.left,
                top:  panel.style.top,
            }));
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// ─────────────────────────────────────────────

function lsGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn(`[KNS] не удалось прочитать localStorage["${key}"]`, e);
        return null;
    }
}

function lsSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`[KNS] не удалось записать localStorage["${key}"]`, e);
    }
}

// fallback возвращается если ключа нет, JSON битый, или validate(parsed) === false
function loadJSON(key, fallback, validate) {
    const raw = lsGet(key);
    if (raw === null) return fallback;
    try {
        const parsed = JSON.parse(raw);
        if (validate && !validate(parsed)) return fallback;
        return parsed;
    } catch (e) {
        console.warn(`[KNS] не удалось разобрать JSON localStorage["${key}"]`, e);
        return fallback;
    }
}

function saveJSON(key, value) {
    lsSet(key, JSON.stringify(value));
}

function loadHelperSettings() {
    return loadJSON('kns-helper-settings', {}, v => !!v);
}
function saveHelperSettings(patch) {
    const cur = loadHelperSettings();
    saveJSON('kns-helper-settings', Object.assign(cur, patch));
}

const helperSettings = Object.assign({
    historyButtons:  true,
    historyHotkeys:  true,
    restoreLastCode: true,
}, loadHelperSettings());

function getSavedColors() {
    try { return JSON.parse(localStorage.getItem('kns-saved-colors')) || {}; } catch (_) { return {}; }
}
function setSavedColors(obj) {
    try { localStorage.setItem('kns-saved-colors', JSON.stringify(obj)); } catch (_) {}
}
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderSavedColorsList() {
    const listEl = document.getElementById('kns-saved-list');
    if (!listEl) return;
    const saved = getSavedColors();
    const names = Object.keys(saved);

    if (!names.length) {
        listEl.innerHTML = '<em>Нет сохранённых окрасов</em>';
        return;
    }

    listEl.innerHTML = names.map(name => `
        <div class="pose-row kns-saved-row">
            <span class="pose-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
            <div class="pose-btns">
                <button class="kns-load-btn" data-name="${escapeHtml(name)}">Загрузить</button>
                <button class="kns-del-btn" data-name="${escapeHtml(name)}">Удалить</button>
            </div>
        </div>
    `).join('');

    listEl.querySelectorAll('.kns-load-btn').forEach(btn => {
        btn.onclick = () => loadSavedColor(btn.dataset.name);
    });
    listEl.querySelectorAll('.kns-del-btn').forEach(btn => {
        btn.onclick = () => deleteSavedColor(btn.dataset.name);
    });
}

function handleCodeValueChanged() {
    if (!codeState.input) return;
    const value = codeState.input.value;
    if (codeState.applyingHistory) return;
    pushHistory(value);
    if (helperSettings.restoreLastCode) {
        try { localStorage.setItem('kns-last-code', value); } catch (_) {}
    }
}

function installValueWatcher(input) {
    const nativeDesc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
        configurable: true,
        enumerable: true,
        get() { return nativeDesc.get.call(this); },
        set(v) {
            nativeDesc.set.call(this, v);
            handleCodeValueChanged();
        },
    });
}

function setCodeValue(value) {
    if (!codeState.input) return;
    codeState.input.value = value;
    codeState.input.dispatchEvent(new Event('change', { bubbles: true }));
}

function loadSavedColor(name) {
    const saved = getSavedColors();
    if (!(name in saved) || !codeState.input) return;
    setCodeValue(saved[name]);
}

function deleteSavedColor(name) {
    if (!window.confirm(`Удалить окрас «${name}»?`)) return;
    const saved = getSavedColors();
    delete saved[name];
    setSavedColors(saved);
    renderSavedColorsList();
}

function promptSaveColor(code) {
    const raw = window.prompt('Название окраса для сохранения:');
    if (raw === null) return;
    const name = raw.trim();
    if (!name) return;

    const saved = getSavedColors();
    if (name in saved && !window.confirm(`Окрас «${name}» уже существует. Перезаписать?`)) return;

    saved[name] = code;
    setSavedColors(saved);
    renderSavedColorsList();
}

const codeState = {
    history: [],
    pointer: -1,
    applyingHistory: false,
    input: null,
    btnBack: null,
    btnForward: null,
};

function updateHistoryButtons() {
    if (codeState.btnBack)    codeState.btnBack.disabled    = codeState.pointer <= 0;
    if (codeState.btnForward) codeState.btnForward.disabled = codeState.pointer >= codeState.history.length - 1;
}

function applyHistoryButtonsVisibility() {
    const display = helperSettings.historyButtons ? '' : 'none';
    if (codeState.btnBack)    codeState.btnBack.style.display    = display;
    if (codeState.btnForward) codeState.btnForward.style.display = display;
}

function pushHistory(value) {
    if (codeState.history[codeState.pointer] === value) return;
    codeState.history = codeState.history.slice(0, codeState.pointer + 1);
    codeState.history.push(value);
    codeState.pointer = codeState.history.length - 1;
    updateHistoryButtons();
}

function applyHistoryValue(idx) {
    if (idx < 0 || idx >= codeState.history.length || !codeState.input) return;
    const value = codeState.history[idx];
    codeState.applyingHistory = true;
    codeState.pointer = idx;
    setCodeValue(value);
    updateHistoryButtons();
    codeState.applyingHistory = false;
    if (helperSettings.restoreLastCode) {
        try { localStorage.setItem('kns-last-code', value); } catch (_) {}
    }
}

function historyBack()    { if (codeState.pointer > 0) applyHistoryValue(codeState.pointer - 1); }
function historyForward() { if (codeState.pointer < codeState.history.length - 1) applyHistoryValue(codeState.pointer + 1); }

function setupCodeHistory(input) {
    codeState.input = input;
    installValueWatcher(input);

    input.addEventListener('change', () => handleCodeValueChanged());
    input.addEventListener('input',  () => handleCodeValueChanged());

    pushHistory(input.value);

    if (helperSettings.restoreLastCode) {
        try {
            const last = localStorage.getItem('kns-last-code');
            if (last && last !== input.value) setCodeValue(last);
        } catch (_) {}
    }

    const btnBack = document.createElement('button');
    btnBack.type = 'button';
    btnBack.id = 'kns-code-back';
    btnBack.className = 'btn-kns';
    btnBack.textContent = '← Отменить';
    btnBack.title = 'Отменить (Ctrl+Z)';
    btnBack.style.marginLeft = '6px';
    btnBack.addEventListener('click', historyBack);

    const btnForward = document.createElement('button');
    btnForward.type = 'button';
    btnForward.id = 'kns-code-forward';
    btnForward.className = 'btn-kns';
    btnForward.textContent = 'Вернуть →';
    btnForward.title = 'Вернуть (Ctrl+Y)';
    btnForward.style.marginLeft = '6px';
    btnForward.addEventListener('click', historyForward);

    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.id = 'kns-code-save';
    btnSave.className = 'btn-kns';
    btnSave.textContent = 'Сохранить окрас';
    btnSave.style.marginLeft = '6px';
    btnSave.addEventListener('click', () => promptSaveColor(codeState.input.value));

    input.insertAdjacentElement('afterend', btnSave);
    btnSave.insertAdjacentElement('afterend', btnBack);
    btnBack.insertAdjacentElement('afterend', btnForward);

    codeState.btnBack = btnBack;
    codeState.btnForward = btnForward;
    applyHistoryButtonsVisibility();
    updateHistoryButtons();

    document.addEventListener('keydown', e => {
        if (!helperSettings.historyHotkeys || !e.ctrlKey) return;
        if (e.code === 'KeyZ') { e.preventDefault(); historyBack(); }
        else if (e.code === 'KeyY') { e.preventDefault(); historyForward(); }
    });
}

function waitForElement(id, timeout = 10000, interval = 200) {
    return pollUntil(() => document.getElementById(id), el => !!el, null, timeout, interval);
}

function setupCollapsible(header, body, chevron, openDisplay = 'flex') {
    header.addEventListener('click', () => {
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : openDisplay;
        chevron.classList.toggle('open', !isOpen);
    });
}

// ─────────────────────────────────────────────

function splitCodeFields(code) {
    return code.trim().split(/\s+/);
}

function parseFieldElements(field) {
    if (!field || field === '0') return [];
    return field.split('-').map(seg => {
        const m = seg.match(/^(\d+)\/(\d+)(\|(\d+))?$/);
        if (!m) return { raw: seg };
        return { element: m[1], color: m[2], alpha: m[4] || null };
    });
}

function stringifyFieldElements(elements) {
    if (!elements.length) return '0';
    return elements
        .map(e => (e.raw !== undefined ? e.raw : e.element + '/' + e.color + (e.alpha ? '|' + e.alpha : '')))
        .join('-');
}

function loadFieldRoles(len) {
    let stored;
    try { stored = JSON.parse(localStorage.getItem('kns-field-roles')); } catch (_) { stored = null; }
    if (!Array.isArray(stored)) stored = [];
    const roles = [];
    for (let i = 0; i < len; i++) {
        roles.push(stored[i] ?? DEFAULT_FIELD_ROLES[i] ?? 'skip');
    }
    return roles;
}

function saveFieldRoles(roles) {
    try { localStorage.setItem('kns-field-roles', JSON.stringify(roles)); } catch (_) {}
}

function loadLegPositions() {
    try {
        const saved = JSON.parse(localStorage.getItem('kns-leg-positions'));
        if (saved && saved.fl && saved.fr && saved.bl && saved.br) return saved;
    } catch (_) {}
    return Object.assign({}, DEFAULT_LEG_POSITIONS);
}

function saveLegPositions(pos) {
    try { localStorage.setItem('kns-leg-positions', JSON.stringify(pos)); } catch (_) {}
}

function loadEarPositions() {
    try {
        const saved = JSON.parse(localStorage.getItem('kns-ear-positions'));
        if (saved && saved.el && saved.er) return saved;
    } catch (_) {}
    return Object.assign({}, DEFAULT_EAR_POSITIONS);
}

function saveEarPositions(pos) {
    try { localStorage.setItem('kns-ear-positions', JSON.stringify(pos)); } catch (_) {}
}

function loadCheekPosition() {
    try {
        const saved = Number(JSON.parse(localStorage.getItem('kns-cheek-position')));
        if (saved > 0) return saved;
    } catch (_) {}
    return DEFAULT_CHEEK_FIELD_POS;
}

function saveCheekPosition(pos) {
    try { localStorage.setItem('kns-cheek-position', JSON.stringify(pos)); } catch (_) {}
}

function applyColorReplace(code, fromColor, toColor, roles) {
    const fields = splitCodeFields(code);
    let count = 0;

    for (let i = 0; i < fields.length; i++) {
        const role = roles[i] || 'skip';
        if (role !== 'body' && role !== 'ear' && role !== 'cheek') continue;

        const elements = parseFieldElements(fields[i]);
        if (!elements.length) continue;

        let changed = false;
        for (const el of elements) {
            if (el.raw !== undefined) continue;
            if (role === 'ear' && Number(el.element) >= 4) continue;
            if (Number(el.color) === Number(fromColor)) {
                el.color = String(toColor);
                changed = true;
                count++;
            }
        }

        if (changed) fields[i] = stringifyFieldElements(elements);
    }

    return { code: fields.join(' '), count };
}

function applyFieldSwapTransfer(code, fromKey, toKey, positions, mode) {
    const fields = splitCodeFields(code);
    const fromIdx = positions[fromKey] - 1;
    const toIdx = positions[toKey] - 1;

    if (fromIdx < 0 || toIdx < 0 || fromIdx >= fields.length || toIdx >= fields.length) return null;

    const value = fields[fromIdx];
    fields[toIdx] = value;
    if (mode === 'move') fields[fromIdx] = '0';

    return fields.join(' ');
}

// Щёки: обе стороны живут в ОДНОМ поле кода, разделённые по чётности номера
// элемента (1,3,5,7 — левая сторона; 2,4,6,8 — правая). Перенос/копирование
// здесь означает переписать элементы одной стороны в номера другой стороны
// внутри того же самого поля, а не поменять местами два разных поля.
function applyCheekTransfer(code, fromKey, toKey, cheekFieldPos, mode) {
    const fields = splitCodeFields(code);
    const idx = cheekFieldPos - 1;
    if (idx < 0 || idx >= fields.length) return null;

    const fromNums = CHEEK_SIDE_ELEMENTS[fromKey];
    const toNums = CHEEK_SIDE_ELEMENTS[toKey];
    if (!fromNums || !toNums) return null;

    const elements = parseFieldElements(fields[idx]);

    // убираем то, что уже было записано на стороне "куда" — перезаписываем её
    let result = elements.filter(el => el.raw !== undefined || !toNums.includes(Number(el.element)));

    // копируем цвета со стороны "откуда", подставляя парный номер элемента стороны "куда"
    for (const el of elements) {
        if (el.raw !== undefined) continue;
        const num = Number(el.element);
        if (!fromNums.includes(num)) continue;
        result.push({ element: String(CHEEK_PAIR[num]), color: el.color, alpha: el.alpha });
    }

    if (mode === 'move') {
        result = result.filter(el => el.raw !== undefined || !fromNums.includes(Number(el.element)));
    }

    result.sort((a, b) => {
        if (a.raw !== undefined || b.raw !== undefined) return 0;
        return Number(a.element) - Number(b.element);
    });

    fields[idx] = stringifyFieldElements(result);
    return fields.join(' ');
}

function applyPartTransfer(code, fromKey, toKey, positions, mode) {
    const fromIsCheek = PART_GROUPS[fromKey] === 'cheek';
    const toIsCheek = PART_GROUPS[toKey] === 'cheek';

    // щёку можно переносить только на щёку — другая структура кода
    if (fromIsCheek !== toIsCheek) return null;

    if (fromIsCheek) return applyCheekTransfer(code, fromKey, toKey, positions.cheek, mode);
    return applyFieldSwapTransfer(code, fromKey, toKey, positions, mode);
}

function populateColorSelects(panel) {
    const opts = BODY_COLORS.map(c => `<option value="${c.id}">${c.id} — ${c.name}</option>`).join('');
    panel.querySelector('#kns-color-from').innerHTML = opts;
    panel.querySelector('#kns-color-to').innerHTML = opts;
}

function populatePartSelects(panel) {
    const fromSelect = panel.querySelector('#kns-leg-from');
    fromSelect.innerHTML = Object.keys(PART_LABELS)
        .map(k => `<option value="${k}">${PART_LABELS[k]}</option>`)
        .join('');
    fromSelect.value = 'fl';

    const populateToOptions = () => {
        const toSelect = panel.querySelector('#kns-leg-to');
        const group = PART_GROUPS[fromSelect.value];
        const keys = Object.keys(PART_LABELS).filter(k => PART_GROUPS[k] === group && k !== fromSelect.value);
        const prevValue = toSelect.value;
        toSelect.innerHTML = keys.map(k => `<option value="${k}">${PART_LABELS[k]}</option>`).join('');
        toSelect.value = keys.includes(prevValue) ? prevValue : keys[0];
    };

    populateToOptions();
    fromSelect.addEventListener('change', populateToOptions);
}

function setupColorEditor(panel, setStatus) {
    populateColorSelects(panel);
    populatePartSelects(panel);

    const legPos = loadLegPositions();
    const earPos = loadEarPositions();
    let cheekPos = loadCheekPosition();

    const syncPositions = () => {
        saveLegPositions(legPos);
        saveEarPositions(earPos);
        saveCheekPosition(cheekPos);
    };

    const editorHeader  = panel.querySelector('#kns-editor-header');
    const editorBody    = panel.querySelector('#kns-editor-body');
    const editorChevron = panel.querySelector('#kns-editor-chevron');
    setupCollapsible(editorHeader, editorBody, editorChevron);

    panel.querySelector('#kns-color-apply').onclick = () => {
        if (!codeState.input) return;
        const from = panel.querySelector('#kns-color-from').value;
        const to = panel.querySelector('#kns-color-to').value;
        if (from === to) { setStatus('Цвета совпадают', true); return; }

        const roles = loadFieldRoles(splitCodeFields(codeState.input.value).length);
        const { code, count } = applyColorReplace(codeState.input.value, from, to, roles);
        if (count === 0) { setStatus('Совпадений не найдено', true); return; }

        setCodeValue(code);
        setStatus(`Заменено полей: ${count}`);
    };

    panel.querySelector('#kns-leg-copy').onclick = () => {
        if (!codeState.input) return;
        syncPositions();
        const fromKey = panel.querySelector('#kns-leg-from').value;
        const toKey = panel.querySelector('#kns-leg-to').value;
        if (fromKey === toKey) { setStatus('Выберите разные части', true); return; }

        const positions = Object.assign({}, legPos, earPos, { cheek: cheekPos });
        const result = applyPartTransfer(codeState.input.value, fromKey, toKey, positions, 'copy');
        if (!result) { setStatus('Ошибка позиций полей', true); return; }

        setCodeValue(result);
        setStatus('Узор скопирован');
    };

    panel.querySelector('#kns-leg-move').onclick = () => {
        if (!codeState.input) return;
        syncPositions();
        const fromKey = panel.querySelector('#kns-leg-from').value;
        const toKey = panel.querySelector('#kns-leg-to').value;
        if (fromKey === toKey) { setStatus('Выберите разные части', true); return; }

        const positions = Object.assign({}, legPos, earPos, { cheek: cheekPos });
        const result = applyPartTransfer(codeState.input.value, fromKey, toKey, positions, 'move');
        if (!result) { setStatus('Ошибка позиций полей', true); return; }

        setCodeValue(result);
        setStatus('Узор перемещён');
    };
}

// ─────────────────────────────────────────────

function createPanel() {
    document.getElementById('kns-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'kns-panel';
    panel.innerHTML = `
        <div id="kns-header">
            <h3>Скачивание моделек</h3>
            <button id="kns-toggle" title="Свернуть / развернуть"></button>
        </div>
        <div id="kns-body">
            <div id="kns-status"></div>
            <div id="kns-poses-wrap"><em>Загружаем позы...</em></div>
            <hr>
            <div class="section-title">Общий холст</div>
            <div class="radio-row">
                <span>Формат:</span>
                <input type="radio" name="cFmt" id="cFmt-png"  value="png"  checked><label for="cFmt-png">PNG</label>
                <input type="radio" name="cFmt" id="cFmt-apng" value="apng"><label for="cFmt-apng">APNG</label>
            </div>
            <div class="radio-row">
                <span>Расположение:</span>
                <input type="radio" name="cLayout" id="cL-row"  value="row"  checked><label for="cL-row">В ряд</label>
                <input type="radio" name="cLayout" id="cL-grid" value="grid"><label for="cL-grid">Сетка 2×2</label>
            </div>
            <div class="radio-row">
                <span>Фон:</span>
                <input type="radio" name="cBg" id="cBg-none" value="none" checked><label for="cBg-none">Прозрачный</label>
                <input type="radio" name="cBg" id="cBg-game" value="game"><label for="cBg-game">Из игры</label>
            </div>
            <button id="kns-dl-btn">Скачать холст</button>
            <hr>
            <div id="kns-editor-header" class="section-title kns-collapsible-header">
                <span>Редактор окраса</span><span class="kns-chevron" id="kns-editor-chevron">▸</span>
            </div>
            <div id="kns-editor-body" style="display:none;">
                <div class="section-title" style="margin-top:2px;">Замена цвета</div>
                <div class="radio-row">
                    <span>Заменить:</span>
                    <select id="kns-color-from"></select>
                </div>
                <div class="radio-row">
                    <span>На:</span>
                    <select id="kns-color-to"></select>
                </div>
                <button id="kns-color-apply">Заменить цвет</button>
                <hr>
                <div class="section-title">Перенос узоров (лапы / уши / щёки)</div>
                <div class="radio-row">
                    <span>Откуда:</span>
                    <select id="kns-leg-from">
                        <option value="fl">Перед. левая</option>
                        <option value="fr">Перед. правая</option>
                        <option value="bl">Задняя левая</option>
                        <option value="br">Задняя правая</option>
                        <option value="el">Левое ухо</option>
                        <option value="er">Правое ухо</option>
                        <option value="cl">Левая щека</option>
                        <option value="cr">Правая щека</option>
                    </select>
                </div>
                <div class="radio-row">
                    <span>Куда:</span>
                    <select id="kns-leg-to">
                        <option value="fr">Перед. правая</option>
                        <option value="bl">Задняя левая</option>
                        <option value="br">Задняя правая</option>
                        <option value="el">Левое ухо</option>
                        <option value="er">Правое ухо</option>
                        <option value="cl">Левая щека</option>
                        <option value="cr">Правая щека</option>
                    </select>
                </div>
                <div class="pose-btns" style="margin-top:2px;margin-bottom:8px;">
                    <button id="kns-leg-copy" style="flex:1;">Копировать</button>
                    <button id="kns-leg-move" style="flex:1;">Переместить</button>
                </div>
            </div>
            <hr>
            <div id="kns-history-header" class="section-title kns-collapsible-header">
                <span>История изменений</span><span class="kns-chevron" id="kns-history-chevron">▸</span>
            </div>
            <div id="kns-history-body" style="display:none;">
                <label class="kns-toggle-row" for="kns-hist-btns-cb">
                    <span>Кнопки истории (назад/вперёд)</span>
                    <span class="kns-toggle"><input type="checkbox" id="kns-hist-btns-cb"><span class="slider"></span></span>
                </label>
                <label class="kns-toggle-row" for="kns-hist-keys-cb">
                    <span>Хоткеи Ctrl+Z / Ctrl+Y</span>
                    <span class="kns-toggle"><input type="checkbox" id="kns-hist-keys-cb"><span class="slider"></span></span>
                </label>
                <label class="kns-toggle-row" for="kns-restore-cb">
                    <span>Восстанавливать окрас при загрузке</span>
                    <span class="kns-toggle"><input type="checkbox" id="kns-restore-cb"><span class="slider"></span></span>
                </label>
            </div>
            <hr>
            <div id="kns-saved-header" class="section-title kns-collapsible-header">
                <span>Сохранённые окрасы</span><span class="kns-chevron" id="kns-saved-chevron">▸</span>
            </div>
            <div id="kns-saved-list" style="display:none;"></div>
        </div>
    `;
    document.body.append(panel);

    try {
        const pos = JSON.parse(localStorage.getItem('kns-pos'));
        if (pos?.left && pos?.top) {
            panel.style.right = 'auto';
            panel.style.left  = pos.left;
            panel.style.top   = pos.top;
        }
    } catch (_) {}

    const SVG_COLLAPSE = `<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M387.887,1203.04 L381.326,1203.04 L392.014,1192.4 L390.614,1191.01 L379.938,1201.64 L379.969,1195.16 C379.969,1194.61 379.526,1194.17 378.979,1194.17 C378.433,1194.17 377.989,1194.61 377.989,1195.16 L377.989,1204.03 C377.989,1204.32 378.111,1204.56 378.302,1204.72 C378.481,1204.9 378.73,1205.01 379.008,1205.01 L387.887,1205.01 C388.434,1205.01 388.876,1204.57 388.876,1204.03 C388.876,1203.48 388.434,1203.04 387.887,1203.04 Z M372.992,1208.99 L364.113,1208.99 C363.566,1208.99 363.124,1209.43 363.124,1209.97 C363.124,1210.52 363.566,1210.96 364.113,1210.96 L370.674,1210.96 L359.986,1221.6 L361.386,1222.99 L372.063,1212.36 L372.031,1218.84 C372.031,1219.39 372.474,1219.83 373.021,1219.83 C373.567,1219.83 374.011,1219.39 374.011,1218.84 L374.011,1209.97 C374.011,1209.68 373.889,1209.44 373.697,1209.28 C373.519,1209.1 373.27,1208.99 372.992,1208.99 Z" transform="translate(-360 -1191)" fill="currentColor"/></svg>`;
    const SVG_EXPAND   = `<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M339.685,1191.3 C339.503,1191.12 339.251,1191 338.972,1191 L330,1191 C329.447,1191 329,1191.45 329,1192 C329,1192.55 329.447,1193 330,1193 L336.629,1193 L325.83,1203.8 L327.244,1205.21 L338.031,1194.42 L338,1201 C338,1201.55 338.447,1202 339,1202 C339.553,1202 340,1201.55 340,1201 L340,1192 C340,1191.7 339.878,1191.46 339.685,1191.3 Z M320.756,1208.79 L309.969,1219.58 L310,1213 C310,1212.45 309.553,1212 309,1212 C308.447,1212 308,1212.45 308,1213 L308,1222 C308,1222.3 308.122,1222.54 308.315,1222.7 C308.497,1222.88 308.749,1223 309.028,1223 L318,1223 C318.553,1223 319,1222.55 319,1222 C319,1221.45 318.553,1221 318,1221 L311.371,1221 L322.17,1210.2 L320.756,1208.79 Z" transform="translate(-308 -1191)" fill="currentColor"/></svg>`;

    const toggleBtn = panel.querySelector('#kns-toggle');

    try {
        if (localStorage.getItem('kns-collapsed') === '1') {
            panel.classList.add('collapsed');
            toggleBtn.innerHTML = SVG_EXPAND;
        } else {
            toggleBtn.innerHTML = SVG_COLLAPSE;
        }
    } catch (_) {
        toggleBtn.innerHTML = SVG_COLLAPSE;
    }

    const statusEl = panel.querySelector('#kns-status');
    const setStatus = (s, isError = false) => {
        statusEl.textContent = s;
        statusEl.className = isError ? 'error' : '';
        setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 3500);
    };

    toggleBtn.onclick = () => {
        const collapsed = panel.classList.toggle('collapsed');
        toggleBtn.innerHTML = collapsed ? SVG_EXPAND : SVG_COLLAPSE;
        try { localStorage.setItem('kns-collapsed', collapsed ? '1' : '0'); } catch (_) {}
    };

    panel.querySelector('#kns-dl-btn').onclick = () => {
        const layout = panel.querySelector('input[name="cLayout"]:checked').value;
        const format = panel.querySelector('input[name="cFmt"]:checked').value;
        const useBg  = panel.querySelector('input[name="cBg"]:checked').value === 'game';
        downloadCombined(layout, format, setStatus, { useBg });
    };

    makeDraggable(panel, panel.querySelector('#kns-header'));

    const savedSettings = (() => {
        try { return JSON.parse(localStorage.getItem('kns-settings')) || {}; } catch (_) { return {}; }
    })();
    if (savedSettings.cFmt)    { const r = panel.querySelector(`input[name="cFmt"][value="${savedSettings.cFmt}"]`);       if (r) r.checked = true; }
    if (savedSettings.cLayout) { const r = panel.querySelector(`input[name="cLayout"][value="${savedSettings.cLayout}"]`); if (r) r.checked = true; }
    if (savedSettings.cBg)     { const r = panel.querySelector(`input[name="cBg"][value="${savedSettings.cBg}"]`);         if (r) r.checked = true; }

    panel.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', () => {
            try {
                localStorage.setItem('kns-settings', JSON.stringify({
                    cFmt:    panel.querySelector('input[name="cFmt"]:checked')?.value,
                    cLayout: panel.querySelector('input[name="cLayout"]:checked')?.value,
                    cBg:     panel.querySelector('input[name="cBg"]:checked')?.value,
                }));
            } catch (_) {}
        });
    });

    const cbHistBtns = panel.querySelector('#kns-hist-btns-cb');
    const cbHistKeys = panel.querySelector('#kns-hist-keys-cb');
    const cbRestore  = panel.querySelector('#kns-restore-cb');

    cbHistBtns.checked = helperSettings.historyButtons;
    cbHistKeys.checked = helperSettings.historyHotkeys;
    cbRestore.checked  = helperSettings.restoreLastCode;

    cbHistBtns.addEventListener('change', e => {
        helperSettings.historyButtons = e.target.checked;
        saveHelperSettings({ historyButtons: helperSettings.historyButtons });
        applyHistoryButtonsVisibility();
    });
    cbHistKeys.addEventListener('change', e => {
        helperSettings.historyHotkeys = e.target.checked;
        saveHelperSettings({ historyHotkeys: helperSettings.historyHotkeys });
    });
    cbRestore.addEventListener('change', e => {
        helperSettings.restoreLastCode = e.target.checked;
        saveHelperSettings({ restoreLastCode: helperSettings.restoreLastCode });
    });

    const savedHeader  = panel.querySelector('#kns-saved-header');
    const savedList    = panel.querySelector('#kns-saved-list');
    const savedChevron = panel.querySelector('#kns-saved-chevron');
    setupCollapsible(savedHeader, savedList, savedChevron, 'flex');
    renderSavedColorsList();

    const historyHeader  = panel.querySelector('#kns-history-header');
    const historyBody    = panel.querySelector('#kns-history-body');
    const historyChevron = panel.querySelector('#kns-history-chevron');
    setupCollapsible(historyHeader, historyBody, historyChevron, 'flex');

    return { panel, setStatus };
}

    // ─────────────────────────────────────────────

async function pollUntil(getValue, isReady, fallback, timeout = 10000, interval = 200) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const value = getValue();
        if (isReady(value)) return value;
        await new Promise(r => setTimeout(r, interval));
    }
    return fallback;
}

function waitForPoses(timeout = 10000, interval = 200) {
    return pollUntil(getPoses, poses => poses.length > 0, [], timeout, interval);
}

async function init() {
    const { panel, setStatus } = createPanel();

    await new Promise(resolve =>
        document.readyState === 'complete'
            ? resolve()
            : window.addEventListener('load', resolve, { once: true })
    );

    const poses = await waitForPoses();
    if (poses.length === 0) {
        setStatus('Позы не найдены', true);
        const wrap = panel.querySelector('#kns-poses-wrap');
        wrap.innerHTML = '<em class="error">Позы не обнаружены на странице</em>';
    } else {
        renderPoseButtons(panel, poses, setStatus);
    }

    const codeInput = await waitForElement('code');
    if (codeInput) {
        setupCodeHistory(codeInput);
        setupColorEditor(panel, setStatus);
    }
}
// рома фембойчик
init();

})();
