const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");

canvas.width=400;
canvas.height=800;

let photos=[];
let frameImg=null;
let currentHoles=[];

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
                    
                    // This finds the angle of the "Longest" part of the hole
                    let angleRad = 0.5 * Math.atan2(2 * m11, m20 - m02);
                    
                    // Correct for portrait vs landscape holes
                    // Most photobooth holes are taller than they are wide
                    const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
                    let uDist = 0, vDist = 0;
                    for (const p of points) {
                        const dx = p.x - centerX, dy = p.y - centerY;
                        uDist += Math.abs(dx * cosA + dy * sinA);
                        vDist += Math.abs(-dx * sinA + dy * cosA);
                    }
                    
                    // If the hole is "wider" than it is "tall" in this rotation, 
                    // we might need to flip it 90 degrees to align with standard portraits
                    if (uDist > vDist) {
                        angleRad += Math.PI / 2;
                    }

                    const angleDeg = angleRad * 180 / Math.PI;
                    console.log(`Hole detected at (${Math.round(centerX)}, ${Math.round(centerY)}) with angle: ${Math.round(angleDeg)}deg`);

                    // Recalculate size based on final angle
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

// Manual angle overrides for specific frames (in degrees)
// You can use a single number for all holes, or an array for individual holes
const manualAngles = {
    "assets/frames/frame1.png": [16, -30], // Hole 1 (top): -5deg, Hole 2 (bottom): 5deg
    "assets/frames/frame2.png": 0 ,
    "assets/frames/frame3.png": [-5, 5, -5],       // All holes in this frame: 0deg
};

function selectFrame(src){
    frameImg=new Image();
    frameImg.src=src;
    frameImg.onload=()=>{
        try {
            currentHoles = detectHoles(frameImg);

            // Apply manual angle overrides
            const override = manualAngles[src];
            if (override !== undefined) {
                if (Array.isArray(override)) {
                    // Apply different angles to each hole in order
                    currentHoles.forEach((h, i) => {
                        if (override[i] !== undefined) h.angle = override[i];
                    });
                } else {
                    // Apply one single angle to all holes
                    currentHoles.forEach(h => h.angle = override);
                }
            }
        } catch (e) {
            console.warn("Hole detection blocked (CORS). Use a local server.");
            currentHoles=[];
        }
        renderStrip();
    };
    frameImg.onerror=()=>console.error("Failed to load frame image at: "+src);
}

function loadFrames(){

const framesList=[
"assets/frames/frame1.png",
"assets/frames/frame2.png",
"assets/frames/frame3.png"
];

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
