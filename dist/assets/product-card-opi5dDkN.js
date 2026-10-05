import{a as u,m as b,e as i,f as $,b as m}from"./format-CBHhwPyh.js";const h=[.5,.7,1],f={.5:40,.7:50,1:64},g={.5:"05",.7:"07",1:"1"};function _(e){const a=Number.parseFloat(String(e).replace(",","."));return Number.isFinite(a)?h.reduce((t,r)=>Math.abs(r-a)<Math.abs(t-a)?r:t):.7}function v(e,{size:a,filled:t=!1}={}){const r=_(e),n=f[r],s=n-1.5,c=n-3.5,o=a?` width="${Math.round(a*24/n*100)/100}" height="${a}"`:"",l=`bottle-icon bottle-icon--${g[r]}${a?" bottle-icon--sized":""}${t?" bottle-icon--filled":""}`,d=`M10.25 3.5V11C10.25 14 4 13.5 4 17V${c}Q4 ${s} 6 ${s}H18Q20 ${s} 20 ${c}V17C20 13.5 13.75 14 13.75 11V3.5Z`,p=`M8 ${n-14}H16M8 ${n-11}H16`;return`<svg class="${l}" viewBox="0 0 24 ${n}"${o} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="10.25" y="1.5" width="3.5" height="2" rx="0.5"/><path d="${d}"/><path d="${p}"/><g class="bottle-icon__fill"><rect x="10.25" y="1.5" width="3.5" height="2" rx="0.5" fill="currentColor"/><path d="${d}" fill="currentColor"/><path class="bottle-icon__label" d="${p}"/></g></svg>`}function k({className:e}={}){return`<svg class="${`btn__icon${e?` ${e}`:""}`}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 9L5.5 20.5H18.5L20 9"/><path d="M2.75 9H21.25"/><path d="M7.5 9C7.5 5 9.5 3.25 12 3.25S16.5 5 16.5 9"/><path d="M9.25 12.5V17M12 12.5V17M14.75 12.5V17"/></svg>`}const y={Новинка:"badge--new",Ліміт:"badge--limit"};function C(e){if(!e)return"";const a=y[e];return`<span class="badge${a?` ${a}`:""}">${i(e)}</span>`}function M(e){return e?'<span class="marker marker--detail" aria-hidden="true"></span><span class="visually-hidden">Є детальна сторінка</span>':""}function x(e){return e.volumes.length>1?`<span class="price__from">Від</span> ${u(b(e))}`:u(e.volumes[0].price)}function V(e,{selectedVolume:a=""}={}){const t=e,r=t.volumes.length>1,n=t.volumes.find(o=>String(o.l)===a)||t.volumes[0],s=`/product.html?slug=${encodeURIComponent(t.slug)}`,c=t.volumes.map(o=>{const l=i($(o.l)),d=r?`<span class="volume-picker__bottle" aria-hidden="true">${v(o.l)}</span>`:"";return`
    <label class="volume-picker__option">
      <input type="radio" name="vol-${t.id}" value="${o.l}" data-price="${o.price}" ${o===n?"checked":""} />
      ${d}<span>${l}</span>
    </label>`}).join("");return`
  <article class="product-card" data-id="${t.id}">
    <div class="product-card__media">
      <a href="${s}" tabindex="-1" aria-hidden="true">
        <img class="product-card__img" src="${i(t.image)}" alt="" loading="lazy" />
      </a>
      ${C(t.badge)}
      <div class="product-card__panel">
        <fieldset class="volume-picker">
          <legend class="volume-picker__legend">${r?"Оберіть об'єм":"Об'єм"}</legend>
          <div class="volume-picker__options">${c}</div>
        </fieldset>
        <div class="product-card__actions btn-pair">
          <button class="btn btn--primary btn--block" type="button" data-add>${k()}<span data-btn-label>Додати в кошик</span> · <span data-btn-price>${u(n.price)}</span></button>
          <a class="btn btn--outline btn--block" href="${s}">Дізнатись більше</a>
        </div>
      </div>
    </div>
    <div class="product-card__body">
      <p class="product-card__type">${i(t.category)}</p>
      <h2 class="product-card__name"><a href="${s}">${i(t.name)}</a>${M(t.detailed)}</h2>
      <p class="product-card__notes">${i(t.notes)}</p>
      <p class="price product-card__price">${x(t)}</p>
      <p class="product-card__meta">${m(t.volumes)} · ${t.abv}%</p>
    </div>
  </article>`}function w(e,{onAdd:a}={}){e.addEventListener("change",t=>{const r=t.target.closest('input[type="radio"]');if(!r)return;const n=r.closest(".product-card");n.querySelector("[data-btn-price]").textContent=u(Number(r.dataset.price))}),e.addEventListener("click",t=>{const r=t.target.closest("[data-add]");if(!r)return;if(a){const s=r.closest(".product-card"),c=s&&s.querySelector('a[href*="slug="]'),o=c?new URL(c.getAttribute("href"),location.href).searchParams.get("slug"):"",l=s&&s.querySelector('input[type="radio"]:checked');a({slug:o,volume:l?l.value:"",qty:1})}const n=r.querySelector("[data-btn-label]");n.textContent="Додано ✓",setTimeout(()=>{n.textContent="Додати в кошик"},1200)})}export{v as a,w as b,k as c,C as d,x as e,V as r};
