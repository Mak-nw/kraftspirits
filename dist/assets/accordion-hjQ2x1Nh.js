import{e as v}from"./format-CBHhwPyh.js";let _=0;const p='<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M10 3v14M3 10h14"/></svg>';function f(o,t,e,a,r){return`
    <div class="accordion__item">
      <h3 class="accordion__heading">
        <button class="accordion__trigger" type="button" id="${e}-t${t}" aria-expanded="${a}" aria-controls="${e}-p${t}">
          <span>${v(o.title)}</span><span class="accordion__icon" aria-hidden="true">${r?p:""}</span>
        </button>
      </h3>
      <div class="accordion__panel" id="${e}-p${t}" role="region" aria-labelledby="${e}-t${t}">
        <div class="accordion__inner"><div class="accordion__content">${o.html}</div></div>
      </div>
    </div>`}function h(o,{label:t="",variant:e="",open:a=-1,cols:r=2,lead:n=-1}={}){const i=`acc${++_}`,d=t?` role="group" aria-label="${v(t)}"`:"";if(e==="cards"){const s=g=>`
  <div class="accordion accordion--cards" data-accordion data-single${d}>${o.map((c,u)=>u%r===g?f(c,u,i,u===a,!0):"").join("")}
  </div>`,l=Array.from({length:r},(g,c)=>c===n?`<div class="faq-grid__col" data-lead>${s(c)}</div>`:s(c)).join("");return`<div class="faq-grid" data-cols="${r}">${l}
</div>`}return`
  <div class="accordion" data-accordion${d}>${o.map((s,l)=>f(s,l,i,!1,!1)).join("")}
  </div>`}function A(o=document){o.querySelectorAll("[data-accordion]").forEach(t=>{const e=()=>[...t.querySelectorAll(".accordion__trigger")];t.addEventListener("click",a=>{const r=a.target.closest(".accordion__trigger");if(!r||!t.contains(r))return;const n=r.getAttribute("aria-expanded")!=="true";n&&t.hasAttribute("data-single")&&e().forEach(i=>i.setAttribute("aria-expanded","false")),r.setAttribute("aria-expanded",String(n))}),t.addEventListener("keydown",a=>{const r=a.target.closest(".accordion__trigger");if(!r)return;const n=e(),i=n.indexOf(r),d={ArrowDown:i+1,ArrowUp:i-1,Home:0,End:n.length-1}[a.key];d!==void 0&&(a.preventDefault(),n[(d+n.length)%n.length].focus())})})}export{A as b,h as r};
