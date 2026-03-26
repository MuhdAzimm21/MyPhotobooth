let cachedWorkerUrl = null;

async function createGIF() {
    if (typeof captureSequences === 'undefined' || captureSequences.length === 0) {
        alert("Take some photos first!");
        return;
    }

    const btn = document.querySelector('button[onclick="createGIF()"]');
    const originalText = btn.innerText;
    btn.innerText = "Generating...";
    btn.disabled = true;

    try {
        if (!cachedWorkerUrl) {
            const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js");
            const blob = await response.blob();
            cachedWorkerUrl = URL.createObjectURL(blob);
        }

        const gif = new GIF({
            workers: 2,
            quality: 10,
            workerScript: cachedWorkerUrl,
            width: canvas.width,
            height: canvas.height
        });

        // Determine the number of frames in the longest sequence
        let maxFrames = 0;
        captureSequences.forEach(seq => {
            if (seq.length > maxFrames) maxFrames = seq.length;
        });

        // Create a temporary canvas for compositing each GIF frame
        const compCanvas = document.createElement("canvas");
        compCanvas.width = canvas.width;
        compCanvas.height = canvas.height;
        const cCtx = compCanvas.getContext("2d");

        // Loop through the frames and composite all 4 holes at once
        for (let j = 0; j < maxFrames; j++) {
            cCtx.clearRect(0, 0, compCanvas.width, compCanvas.height);
            
            // 1. Draw all "live" frames for each hole at this point in time
            captureSequences.forEach((seq, i) => {
                if (currentHoles[i]) {
                    const h = currentHoles[i];
                    const frame = seq[j] || seq[seq.length - 1]; // Use last frame if sequence ended
                    cCtx.save();
                    cCtx.translate(h.x, h.y);
                    cCtx.rotate(h.angle * Math.PI / 180);
                    drawImageCover(cCtx, frame, -h.w / 2, -h.h / 2, h.w, h.h);
                    cCtx.restore();
                }
            });

            // 2. Draw the frame on top
            if (frameImg) cCtx.drawImage(frameImg, 0, 0, compCanvas.width, compCanvas.height);
            
            // 3. Draw stickers and text (static for now)
            // Note: We need to manually draw them here since renderStrip uses the main canvas
            if (typeof stickers !== 'undefined') {
                stickers.forEach(s => {
                    cCtx.save();
                    cCtx.translate(s.x, s.y);
                    cCtx.rotate((s.rotation || 0) * Math.PI / 180);
                    cCtx.drawImage(s.img, -s.size/2, -s.size/2, s.size, s.size);
                    cCtx.restore();
                });
            }
            if (typeof texts !== 'undefined') {
                texts.forEach(t => {
                    cCtx.save();
                    cCtx.translate(t.x, t.y);
                    cCtx.rotate((t.rotation || 0) * Math.PI / 180);
                    cCtx.font = `${t.size}px ${t.font}`;
                    cCtx.fillStyle = t.color;
                    cCtx.textAlign = "center";
                    cCtx.fillText(t.text, 0, 0);
                    cCtx.restore();
                });
            }

            gif.addFrame(cCtx, { delay: 100, copy: true });
        }

        // Add one final long-duration frame of the finished strip
        // Use the main canvas which has the high-res captured photos
        const tempSelection = typeof selectedElement !== 'undefined' ? selectedElement : null;
        if (typeof selectedElement !== 'undefined') selectedElement = null;
        
        renderStrip();
        gif.addFrame(canvas, { delay: 2500, copy: true });
        
        // Restore selection
        if (typeof selectedElement !== 'undefined') selectedElement = tempSelection;
        renderStrip();

        gif.on("finished", function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "photobooth_combined.gif";
            a.click();
            
            btn.innerText = originalText;
            btn.disabled = false;
        });

        gif.render();
    } catch (e) {
        console.error("GIF Error:", e);
        alert("Failed to create GIF.");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
