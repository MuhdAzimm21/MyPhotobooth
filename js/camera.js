const video = document.getElementById("video");
const switchBtn = document.getElementById("switchBtn");

let stream;
let currentFacingMode = "user"; // Start with front camera

let captureSequences = []; // Array of arrays to store frames for each capture
let currentSequence = [];

async function startCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        // Check for multiple cameras to show/hide switch button
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");
        if (videoDevices.length > 1) {
            switchBtn.classList.remove("hidden");
        }

        // Apply mirror to video if front camera
        if (currentFacingMode === "user") {
            video.style.transform = "scaleX(-1)";
        } else {
            video.style.transform = "scaleX(1)";
        }

    } catch (error) {
        console.error("Error accessing camera:", error);
        alert("Could not access camera. Please check permissions.");
    }
}

async function switchCamera() {
    currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
    await startCamera();
}

async function startCapture() {
    photos = [];
    captureSequences = [];
    const count = (currentHoles && currentHoles.length > 0) ? currentHoles.length : 4;

    for (let i = 0; i < count; i++) {
        currentSequence = [];
        await countdown(true); 
        captureFrame();
        renderStrip();
        captureSequences.push(currentSequence);
    }
}

function countdown(record = false) {
    return new Promise(resolve => {
        let num = 3;
        let el = document.getElementById("countdown");
        el.innerText = num;
        
        let recordInterval;
        if (record) {
            recordInterval = setInterval(() => {
                // For the "combined" effect, we capture the raw cropped video frame for this specific hole.
                const h = currentHoles[photos.length] || {w: 640, h: 480}; 
                
                const tempVideoCanvas = document.createElement("canvas");
                tempVideoCanvas.width = 640;
                tempVideoCanvas.height = 640 * (h.h / h.w);
                const tCtx = tempVideoCanvas.getContext("2d");
                
                if (currentFacingMode === "user") {
                    tCtx.translate(tempVideoCanvas.width, 0);
                    tCtx.scale(-1, 1);
                }
                
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                const videoRatio = vw / vh;
                const targetRatio = h.w / h.h;
                let sx, sy, sw, sh;
                if (videoRatio > targetRatio) {
                    sw = vh * targetRatio; sh = vh;
                    sx = (vw - sw) / 2; sy = 0;
                } else {
                    sw = vw; sh = vw / targetRatio;
                    sx = 0; sy = (vh - sh) / 2;
                }
                
                tCtx.drawImage(video, sx, sy, sw, sh, 0, 0, tempVideoCanvas.width, tempVideoCanvas.height);
                currentSequence.push(tempVideoCanvas);

                // Also update the UI live preview
                renderLivePreviewToStrip();
            }, 100);
        }

        let interval = setInterval(() => {
            num--;
            if (num > 0) {
                el.innerText = num;
            } else {
                clearInterval(interval);
                if (recordInterval) clearInterval(recordInterval);
                el.innerText = "";
                resolve();
            }
        }, 1000);
    });
}

function renderLivePreviewToStrip() {
    const nextHoleIdx = photos.length;
    if (currentHoles[nextHoleIdx]) {
        renderStrip();
        const h = currentHoles[nextHoleIdx];
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle * Math.PI / 180);
        
        const tempVideoCanvas = document.createElement("canvas");
        tempVideoCanvas.width = 640;
        tempVideoCanvas.height = 640 * (h.h / h.w);
        const tCtx = tempVideoCanvas.getContext("2d");
        
        if (currentFacingMode === "user") {
            tCtx.translate(tempVideoCanvas.width, 0);
            tCtx.scale(-1, 1);
        }
        
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const videoRatio = vw / vh;
        const targetRatio = h.w / h.h;
        let sx, sy, sw, sh;
        if (videoRatio > targetRatio) {
            sw = vh * targetRatio; sh = vh;
            sx = (vw - sw) / 2; sy = 0;
        } else {
            sw = vw; sh = vw / targetRatio;
            sx = 0; sy = (vh - sh) / 2;
        }
        
        tCtx.drawImage(video, sx, sy, sw, sh, 0, 0, tempVideoCanvas.width, tempVideoCanvas.height);
        drawImageCover(ctx, tempVideoCanvas, -h.w / 2, -h.h / 2, h.w, h.h);
        ctx.restore();
        if (frameImg) ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    }
}

function captureFrame() {
    let temp = document.createElement("canvas");
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    const videoRatio = vw / vh;
    const containerRatio = cw / ch;
    let sx, sy, sw, sh;
    if (videoRatio > containerRatio) {
        sw = vh * containerRatio; sh = vh;
        sx = (vw - sw) / 2; sy = 0;
    } else {
        sw = vw; sh = vw / containerRatio;
        sx = 0; sy = (vh - sh) / 2;
    }
    temp.width = 1280;
    temp.height = 1280 / containerRatio;
    let tCtx = temp.getContext("2d");
    if (currentFacingMode === "user") {
        tCtx.translate(temp.width, 0);
        tCtx.scale(-1, 1);
    }
    tCtx.drawImage(video, sx, sy, sw, sh, 0, 0, temp.width, temp.height);
    photos.push(temp);
}
