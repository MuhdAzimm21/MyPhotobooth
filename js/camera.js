const video = document.getElementById("video");

let stream;

async function startCamera(){

stream = await navigator.mediaDevices.getUserMedia({
video:true
});

video.srcObject = stream;

}

async function startCapture(){

photos=[];
const count = (currentHoles && currentHoles.length > 0) ? currentHoles.length : 4;

for(let i=0;i<count;i++){

await countdown();

captureFrame();

renderStrip();

}

}

function countdown(){

return new Promise(resolve=>{

let num=3;

let el=document.getElementById("countdown");

el.innerText=num;

let interval=setInterval(()=>{

num--;

el.innerText=num;

if(num===0){

clearInterval(interval);

el.innerText="";

resolve();

}

},1000);

});

}

function captureFrame(){

let temp=document.createElement("canvas");

temp.width=video.videoWidth || 640;
temp.height=video.videoHeight || 480;

let tCtx=temp.getContext("2d");

// Mirror effect
tCtx.translate(temp.width, 0);
tCtx.scale(-1, 1);

tCtx.drawImage(video,0,0,temp.width,temp.height);

photos.push(temp);

}
