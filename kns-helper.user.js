// ==UserScript==
// @name         KNS Helper
// @version      1.0
// @description  Удобный инструмент для скачивания моделек из конструктора окрасов
// @author       Psiii
// @copyright    Amina Kotenkova ( https://vk.ru/psiiiiiii / https://github.com/Psiiiiiii )
// @updateURL    https://raw.githubusercontent.com/Psiiiiiii/userscripts/main/kns-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/Psiiiiiii/userscripts/main/kns-helper.user.js
// @match        https://catwar.su/cw3/kns*
// @match        https://catwar.net/cw3/kns*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @icon         https://i.ibb.co/DfRWc8hs/image.png
// @require      https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js
// @require      https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js
// @require      https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.js
// ==/UserScript==

(function () {
'use strict';

const CAT_W = 100;
const CAT_H = 150;
const WATERMARK = true;

const POSE_TYPE  = { '0': 'static', '1': 'apng', '-1': 'static', '5': 'gif_over' };
const POSE_ORDER = { '0': 0, '1': 1, '-1': 2, '5': 3 };
const POSE_NAMES = { '0': 'Сидит', '1': 'Спит', '-1': 'Маленькая', '5': 'Пьёт' };

const ANIMATED_TYPES = new Set(['apng', 'gif_over']);

GM_addStyle(`

:root {
    --bg-panel:   #261d13;
    --bg-surface: #35291d;
    --bg-btn:     #4d3a25;
    --bg-btn-hov: #72573b;
    --bg-btn-dis: #1e170f;
    --bg-accent:  #7c5e3d;

    --br:         #9e632444;
    --br-dis:     #9e632420;
    --br-div:     #9e632430;

    --tx-main:    #ecdcbe;
    --tx-muted:   #b89c7e;
    --tx-dis:     #4a3320;
    --tx-green:   #6dbb84;
    --tx-error:   #d97070;
    --tx-em:      #7a6248;
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

#kns-toggle {
    position: absolute;
    right: 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    color: var(--tx-muted);
    line-height: 1;
    transition: color 0.15s;
}
#kns-toggle:hover { color: var(--tx-main); }

#kns-body { }
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
#kns-panel button:hover:not(:disabled) { background: var(--bg-btn-hov); }
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
    color: var(--tx-muted);
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
    border-color: var(--bg-accent);
    background: var(--bg-accent);
    box-shadow: inset 0 0 0 3px var(--bg-panel);
}

#kns-panel #kns-dl-btn {
    width: 100%;
    margin-top: 8px;
    padding: 7px 0;
    background: var(--bg-accent);
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--tx-main);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: filter 0.15s;
}
#kns-panel #kns-dl-btn:hover { filter: brightness(1.2); }
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

function getRGBA(canvas) {
    const tmp = document.createElement('canvas');
    tmp.width = CAT_W;
    tmp.height = CAT_H;
    const ctx = tmp.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, CAT_W, CAT_H);
    return new Uint8Array(ctx.getImageData(0, 0, CAT_W, CAT_H).data.buffer.slice(0));
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
            console.log(`[KNS] захвачено ${frames.length} кадров, задержки: [${frames.map(f => f.delay).join(', ')}]`);
            resolve(frames.length > 0 ? frames : [{ rgba: getRGBA(canvas), delay: 100 }]);
        }

        function tick(now) {
            const rgba = getRGBA(canvas);
            const h = hashRGBA(rgba);

            if (h !== lastHash) {
                if (frames.length > 0)
                    frames[frames.length - 1].delay = Math.round(now - lastTime);

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

        const allFrames = [];
        for (let i = 0; i < poses.length; i++) {
            setStatus(`Поза ${i + 1}/${poses.length}...`);
            allFrames.push(await getPoseFrames(poses[i], setStatus));
        }

        const drawBg = async (ctx) => {
            if (bgUrl) await drawBgOnCanvas(ctx, TW, TH, bgUrl);
        };

        if (format === 'png') {
            const c = Object.assign(document.createElement('canvas'), { width: TW, height: TH });
            const ctx = c.getContext('2d');
            await drawBg(ctx);
            poses.forEach((_, pi) => {
                const [x, y] = xy(pi);
                ctx.drawImage(rgbaToCanvas(allFrames[pi][0].rgba, CAT_W, CAT_H), x, y);
            });
            if (WATERMARK) drawWatermark(ctx, TW, TH, wmX, wmY);
            saveBlob(await new Promise(r => c.toBlob(r, 'image/png')), 'cat_combined.png');
            setStatus('Готово!');
            return;
        }

        setStatus('Собираю кадры...');

        const GCD = (a, b) => b === 0 ? a : GCD(b, a % b);
        const LCM = (a, b) => a / GCD(a, b) * b;

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
                    t += f.delay;
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
            await drawBg(ctx);
            poses.forEach((_, pi) => {
                const [x, y] = xy(pi);
                ctx.drawImage(rgbaToCanvas(allFrames[pi][frameAt(pi, t)].rgba, CAT_W, CAT_H), x, y);
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
            <span class="pose-name">${pose.name}</span>
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

    return { panel, setStatus };
}

    // ─────────────────────────────────────────────

async function waitForPoses(timeout = 10000, interval = 200) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const poses = getPoses();
        if (poses.length > 0) return poses;
        await new Promise(r => setTimeout(r, interval));
    }
    return [];
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
}

init();

})();