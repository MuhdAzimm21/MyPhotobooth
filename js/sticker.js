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
size:70
});

renderStrip();

};

container.appendChild(img);

});

}

function drawStickers(){

stickers.forEach(s=>{

ctx.drawImage(s.img,s.x,s.y,s.size,s.size);

});

}

loadStickers();
