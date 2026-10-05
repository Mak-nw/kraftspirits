import puppeteer from 'puppeteer-core';
import {mkdtempSync,mkdirSync} from 'node:fs';
const OUT='/private/tmp/claude-501/-Users-admin-Documents-kraftspirits/0650c99e-f666-4f21-9bd2-e0123e0f10ce/scratchpad/';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:mkdtempSync(OUT+'prof-')});
setTimeout(()=>{b.close();process.exit(2)},240000);
try{
const p=await b.newPage();
for(const w of [1200,1440,1920,2000]){
 await p.setViewport({width:w,height:900});
 await p.goto('http://localhost:5173/',{waitUntil:'networkidle2'});await p.evaluate(()=>document.fonts.ready);
 const r=await p.evaluate(()=>{const bar=document.querySelector('.popular-choice .section__bar');const h=bar.querySelector('.section__head').getBoundingClientRect(),bt=bar.querySelector('.btn').getBoundingClientRect(),eb=bar.querySelector('.eyebrow').getBoundingClientRect(),t=bar.querySelector('h2').getBoundingClientRect(),n=document.querySelector('.popular-choice__slider').getBoundingClientRect();
 return {dc:((h.top+h.bottom)/2-(bt.top+bt.bottom)/2).toFixed(2),e2t:(t.top-eb.bottom).toFixed(1),t2c:(n.top-bar.getBoundingClientRect().bottom).toFixed(1),hs:document.documentElement.scrollWidth-document.documentElement.clientWidth}});
 console.log(w,JSON.stringify(r));
}
const shots=[['index',1440,[['#categories-title','categories'],['.popular-choice','popular'],['.faq-section','faq']]],['about',1440,[['.about-manifest','manifest'],['.process','process'],['.principles','principles']]],['catalog',1440,[]],['faq',1440,[]],['index',1440,[['.cta-block','prefooter']]]];
await p.setViewport({width:1440,height:900});
for(const [pg,w,sels] of shots){
 await p.goto('http://localhost:5173/'+(pg=='index'?'':pg+'.html'),{waitUntil:'networkidle2'});await new Promise(r=>setTimeout(r,500));
 if(!sels.length){await p.screenshot({path:OUT+pg+'.png'});continue}
 for(const [s,n] of sels){const el=await p.$(s);await el.evaluate(e=>e.scrollIntoView({block:'start'}));await new Promise(r=>setTimeout(r,500));await p.screenshot({path:OUT+pg+'-'+n+'.png'});}
}
await p.goto('http://localhost:5173/product.html?slug=gin-yasnyi',{waitUntil:'networkidle2'});await new Promise(r=>setTimeout(r,500));
await p.evaluate(()=>document.querySelector('.product__related')?.scrollIntoView());await new Promise(r=>setTimeout(r,500));await p.screenshot({path:OUT+'product.png'});
}finally{await b.close()}
