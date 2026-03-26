let stickers=[];

function loadStickers(){
    const list=[
        "assets/stickers/sticker1.png"
    ];
    const container=document.getElementById("stickers");
    list.forEach(src=>{
        let img=document.createElement("img");
        img.src=src;
        img.className="sticker-thumb";
        img.onclick=()=>{
            stickers.push({
                img:img,
                x:200,
                y:300,
                size:100,
                rotation: 0
            });
            renderStrip();
        };
        container.appendChild(img);
    });
}

function drawStickers(){
    stickers.forEach(s=>{
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation * Math.PI / 180);
        ctx.drawImage(s.img, -s.size/2, -s.size/2, s.size, s.size);
        
        // Selection highlight
        if (selectedElement === s) {
            ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
            ctx.lineWidth = 2;
            ctx.strokeRect(-s.size/2 - 5, -s.size/2 - 5, s.size + 10, s.size + 10);
            
            // Add a small delete handle or just handle via keyboard? 
            // For mobile, maybe just a long press or double tap to remove.
        }
        ctx.restore();
    });
}

loadStickers();

