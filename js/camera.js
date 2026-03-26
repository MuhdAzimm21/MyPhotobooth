const video = document.getElementById("video");
const switchBtn = document.getElementById("switchBtn");

let stream;
let currentFacingMode = "user"; // Start with front camera

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
    const count = (currentHoles && currentHoles.length > 0) ? currentHoles.length : 4;

    for (let i = 0; i < count; i++) {
        await countdown();
        captureFrame();
        renderStrip();
    }
}

function countdown() {
    return new Promise(resolve => {
        let num = 3;
        let el = document.getElementById("countdown");
        el.innerText = num;
        let interval = setInterval(() => {
            num--;
            el.innerText = num;
            if (num === 0) {
                clearInterval(interval);
                el.innerText = "";
                resolve();
            }
        }, 1000);
    });
}

function captureFrame() {
    let temp = document.createElement("canvas");
    
    // We want to capture exactly what is shown in the video container
    // If we use object-cover, we should crop the canvas accordingly
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;

    const videoRatio = vw / vh;
    const containerRatio = cw / ch;

    let sx, sy, sw, sh;

    if (videoRatio > containerRatio) {
        // Video is wider than container, crop sides
        sw = vh * containerRatio;
        sh = vh;
        sx = (vw - sw) / 2;
        sy = 0;
    } else {
        // Video is taller than container, crop top/bottom
        sw = vw;
        sh = vw / containerRatio;
        sx = 0;
        sy = (vh - sh) / 2;
    }

    // Set temp canvas to a fixed high resolution for the photostrip
    // But maintain the same aspect ratio as what the user sees
    temp.width = 1280;
    temp.height = 1280 / containerRatio;

    let tCtx = temp.getContext("2d");

    // Mirror effect ONLY if using front camera
    if (currentFacingMode === "user") {
        tCtx.translate(temp.width, 0);
        tCtx.scale(-1, 1);
    }

    tCtx.drawImage(video, sx, sy, sw, sh, 0, 0, temp.width, temp.height);

    photos.push(temp);
}
