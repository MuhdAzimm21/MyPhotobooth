let texts=[];

function addText(){

let text=document.getElementById("textInput").value;
let font=document.getElementById("fontSelect").value;

texts.push({
text:text,
font:font,
x:200,
y:760
});

renderStrip();

}

function drawTexts(){

texts.forEach(t=>{

ctx.font="22px "+t.font;

ctx.fillStyle="black";

ctx.textAlign="center";

ctx.fillText(t.text,t.x,t.y);

});

}

function downloadPhoto(){

let link=document.createElement("a");

link.download="photostrip.png";

link.href=canvas.toDataURL();

link.click();

}

function shareWhatsApp(){

let url=canvas.toDataURL();

window.open(
"https://wa.me/?text="+encodeURIComponent(url)
);

}
