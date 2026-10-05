import{e as i}from"./format-CBHhwPyh.js";import{e as m}from"./product-card-opi5dDkN.js";const f=(a,o)=>`
      <button class="gallery__nav-btn occasion-picker__nav-btn occasion-picker__nav-btn--${a}" type="button" data-occ-step="${a==="prev"?-1:1}" aria-label="${o}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${a==="prev"?"M15 6l-6 6 6 6":"M9 6l6 6-6 6"}" /></svg>
      </button>`;function y(a){const o=`/product.html?slug=${encodeURIComponent(a.slug)}`;return`
    <div class="occasion-picker__tile"><img class="occasion-picker__photo" src="${i(a.image)}" alt="${i(a.name)}" /></div>
    <div class="occasion-picker__info">
      <h3 class="occasion-picker__name">${i(a.name)}</h3>
      <p class="price occasion-picker__price">${m(a)}</p>
      <a class="btn btn--primary btn--block" href="${o}">Дивитись</a>
    </div>`}function E(a,{showHeading:o=!0}={}){const b=a.map((n,r)=>`
      <button class="occasion-picker__tab" type="button" role="tab" id="occ-tab-${i(n.id)}" data-occ="${i(n.id)}" aria-selected="${r===0}" aria-controls="occ-panel" tabindex="${r===0?0:-1}">
        <span class="occasion-picker__title">${i(n.title)}</span>
        <span class="occasion-picker__hint">${i(n.hint)}</span>
      </button>`).join(""),t=a.map((n,r)=>`<img class="occasion-picker__bg parallax__img${r===0?" is-active":""}" data-occ-bg="${i(n.id)}" src="${i(n.image)}" alt="" role="presentation" aria-hidden="true"${r===0?"":' loading="lazy"'} />`).join("");return`
    ${o?'<h2 class="occasion-picker__lead caps-lead" id="occasions-title">Не знаєте, з чого почати? Спробуйте пошук від події</h2>':""}
    <div class="occasion-picker__tabs" role="tablist" aria-orientation="horizontal" aria-label="${o?"Подія":"Вибір напою за подією"}">${b}
    </div>
    <div class="occasion-picker__stage" id="occ-panel" role="tabpanel" aria-roledescription="карусель" aria-labelledby="occ-tab-${i(a[0].id)}" tabindex="0">
      <div class="occasion-picker__media" data-parallax>${t}</div>
      <div class="occasion-picker__front">
        <div class="occasion-picker__card" data-occ-card></div>
        ${f("prev","Попередній товар")}${f("next","Наступний товар")}
        <span class="visually-hidden" aria-live="polite" data-occ-counter></span>
      </div>
    </div>`}function L(a,{occasions:o,bySlug:b}){const t=[...a.querySelectorAll("[data-occ]")],n=[...a.querySelectorAll("[data-occ-bg]")],r=a.querySelector(".occasion-picker__stage"),_=a.querySelector("[data-occ-card]"),g=a.querySelector("[data-occ-counter]"),k=o.map(e=>e.slugs.map(b).filter(Boolean));let d=0,l=0;const $=e=>{e.classList.remove("is-swap"),e.offsetWidth,e.classList.add("is-swap")},v=e=>{const c=k[d];l=(e%c.length+c.length)%c.length,_.innerHTML=y(c[l]),$(_),g.textContent=`${l+1} з ${c.length}`},h=(e,{focus:c=!1}={})=>{const p=e!==d;d=e,t.forEach((s,u)=>{s.setAttribute("aria-selected",String(u===e)),s.tabIndex=u===e?0:-1}),n.forEach((s,u)=>s.classList.toggle("is-active",u===e)),r.setAttribute("aria-labelledby",t[e].id),c&&t[e].focus(),(p||!_.firstElementChild)&&v(0)};t.forEach((e,c)=>e.addEventListener("click",()=>h(c))),a.querySelector('[role="tablist"]').addEventListener("keydown",e=>{const c=t.indexOf(document.activeElement),p=c<0?d:c;let s;if(e.key==="ArrowLeft")s=(p-1+t.length)%t.length;else if(e.key==="ArrowRight")s=(p+1)%t.length;else if(e.key==="Home")s=0;else if(e.key==="End")s=t.length-1;else return;e.preventDefault(),h(s,{focus:!0})}),a.querySelectorAll("[data-occ-step]").forEach(e=>e.addEventListener("click",()=>v(l+Number(e.dataset.occStep)))),r.addEventListener("keydown",e=>{const c={ArrowLeft:-1,ArrowRight:1}[e.key];c&&(e.preventDefault(),v(l+c))}),h(0)}export{L as bindOccasionPicker,E as renderOccasionPicker};
