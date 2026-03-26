let texts=[];

function addText(){
    let text=document.getElementById("textInput").value;
    if(!text) return;
    let font=document.getElementById("fontSelect").value;
    let color=document.getElementById("textColor").value;
    let size=document.getElementById("textSize").value;

    texts.push({
        text:text,
        font:font,
        color:color,
        size:parseInt(size),
        x:200,
        y:760,
        rotation: 0
    });

    renderStrip();
    document.getElementById("textInput").value = "";
}

function clearCanvas() {
    stickers = [];
    texts = [];
    renderStrip();
}

function drawTexts(){
    texts.forEach(t=>{
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation * Math.PI / 180);
        ctx.font=`${t.size}px ${t.font}`;
        ctx.fillStyle=t.color;
        ctx.textAlign="center";
        ctx.fillText(t.text, 0, 0);
        
        // Selection highlight if selected
        if (selectedElement === t) {
            ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
            ctx.lineWidth = 2;
            const metrics = ctx.measureText(t.text);
            const w = metrics.width + 10;
            const h = t.size + 10;
            ctx.strokeRect(-w/2, -t.size + 5, w, h);
        }
        ctx.restore();
    });
}

function downloadPhoto(){
    // Save current selection to restore it later
    const tempSelection = selectedElement;
    selectedElement = null;
    renderStrip(); // Render without the selection box

    const link = document.createElement("a");
    link.download = "photostrip.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    // Restore selection and re-render
    selectedElement = tempSelection;
    renderStrip();
}

function shareWhatsApp(){
    renderStrip();
    let url=canvas.toDataURL("image/png");
    // WhatsApp API doesn't support direct image base64, usually needs a hosted URL
    // but we can provide the text for now or instruction
    alert("On mobile, you can long press the image to save or share. WhatsApp direct sharing works best with hosted URLs.");
    window.open(
        "https://wa.me/?text=" + encodeURIComponent("Check out my photostrip!")
    );
}

// Sidebar Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
});
