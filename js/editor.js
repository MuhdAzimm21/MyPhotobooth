const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");

canvas.width=400;
canvas.height=800;

let photos=[];
let frameImg=null;
let currentHoles=[];
let selectedElement = null;
let isDragging = false;
let startX, startY;

function drawImageCover(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
    let sx, sy, sw, sh;
    if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio; sh = img.height;
        sx = (img.width - sw) / 2; sy = 0;
    } else {
        sw = img.width; sh = img.width / canvasRatio;
        sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Interactivity logic
function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', startInteraction);
canvas.addEventListener('touchstart', startInteraction, {passive: false});

function startInteraction(e) {
    if (e.type === 'touchstart') e.preventDefault();
    const pos = getCanvasPoint(e);
    startX = pos.x;
    startY = pos.y;
    
    // Check hit detection for stickers (top-down)
    let hit = false;
    for (let i = stickers.length - 1; i >= 0; i--) {
        const s = stickers[i];
        if (Math.abs(pos.x - s.x) < s.size/2 && Math.abs(pos.y - s.y) < s.size/2) {
            selectedElement = s;
            isDragging = true;
            hit = true;
            break;
        }
    }
    
    if (!hit) {
        for (let i = texts.length - 1; i >= 0; i--) {
            const t = texts[i];
            const metrics = ctx.measureText(t.text);
            if (Math.abs(pos.x - t.x) < metrics.width/2 + 20 && Math.abs(pos.y - t.y) < t.size) {
                selectedElement = t;
                isDragging = true;
                hit = true;
                break;
            }
        }
    }
    
    if (!hit) selectedElement = null;
    renderStrip();
}

window.addEventListener('mousemove', moveInteraction);
window.addEventListener('touchmove', moveInteraction, {passive: false});

function moveInteraction(e) {
    if (!isDragging || !selectedElement) return;
    if (e.type === 'touchmove') e.preventDefault();
    
    const pos = getCanvasPoint(e);
    const dx = pos.x - startX;
    const dy = pos.y - startY;
    
    selectedElement.x += dx;
    selectedElement.y += dy;
    
    startX = pos.x;
    startY = pos.y;
    renderStrip();
}

window.addEventListener('mouseup', endInteraction);
window.addEventListener('touchend', endInteraction);

function endInteraction() {
    isDragging = false;
}

// Extra: Keyboard shortcuts for rotate and resize
window.addEventListener('keydown', (e) => {
    if (!selectedElement) return;
    if (e.key === '+') selectedElement.size = (selectedElement.size || 30) + 5;
    if (e.key === '-') selectedElement.size = Math.max(10, (selectedElement.size || 30) - 5);
    if (e.key === 'r') selectedElement.rotation = (selectedElement.rotation || 0) + 5;
    if (e.key === 'Delete' || e.key === 'Backspace') {
        stickers = stickers.filter(s => s !== selectedElement);
        texts = texts.filter(t => t !== selectedElement);
        selectedElement = null;
    }
    renderStrip();
});

function detectHoles(img) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 400;
    tempCanvas.height = 800;
    const tCtx = tempCanvas.getContext("2d");
    tCtx.drawImage(img, 0, 0, 400, 800);
    const imageData = tCtx.getImageData(0, 0, 400, 800);
    const data = imageData.data;
    const width = 400;
    const height = 800;

    const visited = new Uint8Array(width * height);
    const holes = [];
    const step = 4; 

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const idx = y * width + x;
            if (data[idx * 4 + 3] < 128 && !visited[idx]) {
                const points = [];
                const queue = [[x, y]];
                visited[idx] = 1;

                let sumX = 0, sumY = 0;
                let minX = x, maxX = x, minY = y, maxY = y;

                while (queue.length > 0) {
                    const [cx, cy] = queue.shift();
                    points.push({x: cx, y: cy});
                    sumX += cx; sumY += cy;

                    const neighbors = [[cx+step, cy], [cx-step, cy], [cx, cy+step], [cx, cy-step]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            if (data[nIdx * 4 + 3] < 128 && !visited[nIdx]) {
                                visited[nIdx] = 1;
                                queue.push([nx, ny]);
                                if (nx < minX) minX = nx; if (nx > maxX) maxX = nx;
                                if (ny < minY) minY = ny; if (ny > maxY) maxY = ny;
                            }
                        }
                    }
                }

                if (points.length > 100) { 
                    const centerX = sumX / points.length;
                    const centerY = sumY / points.length;
                    
                    // PCA for rotation
                    let m11 = 0, m20 = 0, m02 = 0;
                    for (const p of points) {
                        const dx = p.x - centerX;
                        const dy = p.y - centerY;
                        m11 += dx * dy;
                        m20 += dx * dx;
                        m02 += dy * dy;
                    }
                    
                    let angleRad = 0.5 * Math.atan2(2 * m11, m20 - m02);
                    const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
                    let uDist = 0, vDist = 0;
                    for (const p of points) {
                        const dx = p.x - centerX, dy = p.y - centerY;
                        uDist += Math.abs(dx * cosA + dy * sinA);
                        vDist += Math.abs(-dx * sinA + dy * cosA);
                    }
                    
                    if (uDist > vDist) {
                        angleRad += Math.PI / 2;
                    }

                    const angleDeg = angleRad * 180 / Math.PI;
                    const finalCos = Math.cos(angleRad), finalSin = Math.sin(angleRad);
                    let maxU = -Infinity, minU = Infinity, maxV = -Infinity, minV = Infinity;
                    for (const p of points) {
                        const dx = p.x - centerX, dy = p.y - centerY;
                        const u = dx * finalCos + dy * finalSin;
                        const v = -dx * finalSin + dy * finalCos;
                        if (u > maxU) maxU = u; if (u < minU) minU = u;
                        if (v > maxV) maxV = v; if (v < minV) minV = v;
                    }

                    holes.push({ 
                        x: centerX, y: centerY, 
                        w: maxU - minU + 2, h: maxV - minV + 2, 
                        angle: angleDeg 
                    });
                }
            }
        }
    }
    return holes.sort((a, b) => a.y - b.y);
}

function renderStrip() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentHoles.length > 0) {
        photos.forEach((photo, i) => {
            if (currentHoles[i]) {
                const h = currentHoles[i];
                ctx.save();
                ctx.translate(h.x, h.y);
                ctx.rotate(h.angle * Math.PI / 180);
                drawImageCover(ctx, photo, -h.w / 2, -h.h / 2, h.w, h.h);
                ctx.restore();
            }
        });
    } else {
        photos.forEach((photo, i) => {
            ctx.drawImage(photo, 50, 40 + (i * 180), 300, 160);
        });
    }

    if (frameImg) {
        ctx.drawImage(frameImg, 0, 0, 400, 800);
    }

    if (typeof drawStickers === "function") drawStickers();
    if (typeof drawTexts === "function") drawTexts();
}

// Manual angle overrides
const manualAngles = {
    "assets/frames/frame1.png": [16, -30],
    "assets/frames/frame2.png": 0 ,
    "assets/frames/frame3.png": [-5, 5, -5],
};

function selectFrame(src){
    frameImg=new Image();
    frameImg.src=src;
    frameImg.onload=()=>{
        try {
            currentHoles = detectHoles(frameImg);
            const override = manualAngles[src];
            if (override !== undefined) {
                if (Array.isArray(override)) {
                    currentHoles.forEach((h, i) => {
                        if (override[i] !== undefined) h.angle = override[i];
                    });
                } else {
                    currentHoles.forEach(h => h.angle = override);
                }
            }
        } catch (e) {
            console.warn("Hole detection blocked (CORS).");
            currentHoles=[];
        }
        renderStrip();
    };
}

function loadFrames(){
    const framesList=["assets/frames/frame1.png","assets/frames/frame2.png","assets/frames/frame3.png"];
    const container=document.getElementById("frames");
    framesList.forEach(src=>{
        let img=document.createElement("img");
        img.src=src;
        img.className="frame-thumb";
        img.onclick=()=>selectFrame(src);
        container.appendChild(img);
    });
}

loadFrames();

