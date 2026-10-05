import puppeteer from 'puppeteer-core'; import os from 'os'; import fs from 'fs';
const b = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:fs.mkdtempSync(os.tmpdir()+'/p-')});
const p = await b.newPage(); const q = await b.newPage();
const scan = async (buf, ) => q.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img,0,0);
  const d = x.getImageData(0,0,c.width,c.height).data; let l=1e9,r=-1,t=1e9,bt=-1;
  for (let y=0;y<c.height;y++) for (let xx=0;xx<c.width;xx++){ const i=(y*c.width+xx)*4; if (d[i]>200&&d[i+1]<60&&d[i+2]>200){ if(xx<l)l=xx; if(xx>r)r=xx; if(y<t)t=y; if(y>bt)bt=y; } }
  return {l,r:r+1,t,b:bt+1};
}, buf.toString('base64'));
const out=[];
for (const [w,h] of [[1200,700],[1200,900],[1440,900],[1920,1080],[2000,1145]]) {
  await p.setViewport({width:w,height:h});
  await p.goto('http://localhost:5173/about.html',{waitUntil:'networkidle0'});
  await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,600));
  const g = await p.evaluate(()=>{
    const R=e=>{const b=document.querySelector(e).getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom}};
    const cw=document.documentElement.clientWidth, cs=getComputedStyle(document.documentElement);
    const pad=30,gap=8,col=(cw-2*pad-3*gap)/4;
    const txt=document.querySelector('.hero__text'); const rg=document.createRange(); rg.selectNodeContents(txt);
    const lines=[...rg.getClientRects()].map(r=>({l:r.left,r:r.right,t:r.top,b:r.bottom}));
    return {iw:innerWidth,ih:innerHeight,cw,col,pad,gap,hero:R('.hero'),y:R('.hero__logo--yasnocraft img'),z:R('.hero__logo--bazylsprings img'),txt:R('.hero__text'),lines,h1s:document.querySelectorAll('h1').length,hsc:document.documentElement.scrollWidth-cw,
      wmfs:getComputedStyle(document.querySelector('.hero__wordmark')).fontSize, fit:cs.getPropertyValue('--wordmark-fit'),
      yc:getComputedStyle(document.querySelector('.hero__logo img')).color, hdr:getComputedStyle(document.querySelector('.header')).backgroundColor, hdrc:getComputedStyle(document.querySelector('.header')).color, hint:getComputedStyle(document.querySelector('.header__contact--hint')).backgroundColor};
  });
  // wordmark ink: magenta, hide others
  await p.addStyleTag({content:'.hero__wordmark span{color:#f0f !important} .hero__logo,.hero__text,.header{visibility:hidden !important} .hero__media{display:none}'});
  const buf = await p.screenshot(); const ink = await scan(buf);
  const c2l=g.pad+g.col+g.gap, c3r=g.pad+3*g.col+2*g.gap;  // cols2-3: left of col2 .. right of col3
  const colL=g.pad+(g.col+g.gap), colR=g.pad+g.col+g.gap+2*g.col+g.gap;
  const wmC=(ink.t+ink.b)/2, yC=(g.y.t+g.y.b)/2, zC=(g.z.t+g.z.b)/2;
  const lineC=g.lines.map(r=>((r.l+r.r)/2));
  out.push({vp:`${w}x${h}`,iw:g.iw,ih:g.ih,cw:g.cw,heroH:g.hero.b-g.hero.t,
   yX:((g.y.l+g.y.r)/2-(g.pad+g.col/2)).toFixed(2), zX:((g.z.l+g.z.r)/2-(g.pad+3*(g.col+g.gap)+g.col/2)).toFixed(2),
   inkL:(ink.l-colL).toFixed(2), inkR:(ink.r-colR).toFixed(2), inkW:ink.r-ink.l, colsW:(colR-colL).toFixed(1),
   cY:(yC-wmC).toFixed(1), cZ:(zC-wmC).toFixed(1), wmC:wmC.toFixed(0), wmCpct:(wmC/g.hero.b*100).toFixed(1),
   desc:g.lines.length, descCx:(lineC.map(c=>(c-(colL+colR)/2).toFixed(1))).join('/'), descGap:(g.txt.t-ink.b).toFixed(1), descW:(g.txt.r-g.txt.l).toFixed(0),
   logoW:`${(g.y.r-g.y.l).toFixed(0)}/${(g.z.r-g.z.l).toFixed(0)}`, h1:g.h1s, hsc:g.hsc, fs:g.wmfs, hdr:g.hdr, hdrc:g.hdrc, hint:g.hint});
}
console.table(out); console.log(JSON.stringify(out.map(o=>[o.vp,o.inkW,o.colsW,o.inkL,o.inkR])));
await b.close();
