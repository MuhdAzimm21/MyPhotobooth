async function createGIF(){

const GIF = await import(
"https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.js"
);

let gif = new GIF.default({
workers:2,
quality:10
});

photos.forEach(p=>{

gif.addFrame(p,{delay:800});

});

gif.on("finished",function(blob){

let url=URL.createObjectURL(blob);

let a=document.createElement("a");

a.href=url;
a.download="photobooth.gif";

a.click();

});

gif.render();

}
