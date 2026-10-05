import{a as d}from"./main-HbDxD-dm.js";import"./cta-block-C-BhtqFY.js";import u from"./products-BFS7QPk9.js";import{e as c,f as v,a as _,b as g}from"./format-CBHhwPyh.js";import{r as f,b as y,a as $,c as h}from"./product-card-opi5dDkN.js";import{r as k,b as S,a as q,c as w,g as r,s as C}from"./qty-DMPk7vBo.js";import{r as P,b as j}from"./accordion-hjQ2x1Nh.js";const E={"in-stock":"У наявності · відправка сьогодні",limited:"Обмежений тираж",soon:"Скоро"},L=["Нова Пошта: відділення або поштомат, по всій Україні.","Кур'єр по Києву.","Самовивіз з дегустаційної в Ясногородці.","Оплата: картка, Apple Pay, Google Pay, накладений платіж.","Вік 18+ підтверджується через Дію перед оплатою й повторно при отриманні."],p=t=>`<ul class="product__list">${t.map(e=>`<li>${c(e)}</li>`).join("")}</ul>`;function I(t){return`<dl class="spec-table">${[["Колір",t.color],["Аромат",t.aroma],["Смак",t.taste],["Післясмак",t.finish]].filter(([,a])=>a).map(([a,l])=>`<div class="spec-table__row"><dt class="spec-table__key">${c(a)}</dt><dd class="spec-table__value">${c(l)}</dd></div>`).join("")}</dl>`}function A(t){return`<dl class="product__def">${t.map(([e,a])=>`${e?`<dt>${c(e)}</dt>`:""}<dd>${c(a)}</dd>`).join("")}</dl>`}function T(t){return`<dl class="spec-table">${t.map(([e,a])=>`<div class="spec-table__row"><dt class="spec-table__key">${c(e)}</dt><dd class="spec-table__value">${c(a)}</dd></div>`).join("")}</dl>`}function B(t){const e=t.sections||{},a=e.about||(t.description?[t.description]:[]),l=e.serving||(t.serve?[[null,t.serve]]:[]),s=t.specs||[["Бренд",t.brand],["Категорія",t.category],["Тип",t.kind],["Об'єм",g(t.volumes)],["Міцність",`${t.abv}%`]];return[a.length&&{title:"Про напій",html:a.map(o=>`<p>${c(o)}</p>`).join("")},e.sensory&&{title:"Колір, аромат, смак",html:I(e.sensory)},e.features&&e.features.length&&{title:"Особливості",html:p(e.features)},l.length&&{title:"Як подавати",html:A(l)},{title:"Характеристики",html:T(s)},{title:"Доставка й оплата",html:p(L)}].filter(Boolean)}function G(t){const e=s=>u.find(o=>o.slug===s),a=(t.related||[]).map(e).filter(s=>s&&s.slug!==t.slug&&s.available!==!1),l=u.filter(s=>s.slug!==t.slug&&s.available!==!1&&!a.includes(s)).sort((s,o)=>(o.category===t.category)-(s.category===t.category));return[...a,...l].slice(0,4)}function H(t){document.title=t.seoTitle||`${t.name} — KraftSpirits`;const e=document.querySelector('meta[name="description"]');e&&e.setAttribute("content",t.seoDescription||t.description||"")}function Q(t,e){const a=t.volumes.length>1,l=t.volumes.map((o,n)=>`
    <label class="volume-picker__option">
      <input type="radio" name="product-volume" value="${o.l}" data-price="${o.price}" ${n===0?"checked":""} />
      <span class="volume-picker__tile">
        <span class="volume-picker__icon">${$(o.l)}</span>
        <span class="volume-picker__text">${c(v(o.l))}</span>
      </span>
    </label>`).join(""),s=e==="soon"?'<a class="btn btn--primary btn--block" href="/contacts.html">Повідомити про реліз</a>':`<div class="product__row">
        <p class="price price--lg product__price" data-price-out>${_(t.volumes[0].price)}</p>
        ${q({value:1,min:1,max:99})}
      </div>
      <div class="product__actions btn-pair">
        <button class="btn btn--outline btn--block" type="button" data-buy-now>Купити в 1 клік</button>
        <button class="btn btn--primary btn--block" type="button" data-add>${h()}<span>Додати в кошик</span></button>
      </div>`;return`
  <div class="product__buy">
    <fieldset class="volume-picker volume-picker--icons">
      <legend class="volume-picker__legend">${a?"Оберіть об'єм":"Об'єм"}</legend>
      <div class="volume-picker__options">${l}</div>
    </fieldset>
    ${s}
    <p class="product__stock${e==="soon"?" product__stock--soon":""}" role="status">${c(E[e])}</p>
  </div>`}function R(t){H(t);const e=t.stock||(t.available===!1?"soon":"in-stock"),a=t.images&&t.images.length?t.images:[t.image],l=G(t),s=t.sections&&t.sections.gift,o=document.getElementById("product-root");o.innerHTML=`
    <div class="product__top">
      <div class="product__gallery">${k({images:a,name:t.name,badge:t.badge,sticky:!0})}</div>
      <div class="product__info">
        <nav class="product__crumbs eyebrow" aria-label="Навігація сторінкою">
          <ol>
            <li><a class="link-underline" href="/catalog.html">Каталог</a></li>
            <li><a class="link-underline" href="/catalog.html?category=${encodeURIComponent(t.category)}">${c(t.category)}</a></li>
            <li><span aria-current="page">${c(t.name)}</span></li>
          </ol>
        </nav>
        <h1 class="product__title">${c(t.name).replace(/ · /g,"&nbsp;· ")}</h1>
        <p class="product__meta">${c(t.kind)} · ${t.abv}%</p>
        <p class="product__lead">${c(t.lead||t.notes)}</p>
        ${Q(t,e)}
        <div class="product__accordion">${P(B(t),{label:"Про товар"})}</div>
      </div>
    </div>
    ${s&&t.gift?`
    <section class="product__gift" aria-labelledby="product-gift-title">
      <div class="product__gift-head">
        <h2 class="section-title" id="product-gift-title">Подарунок</h2>
      </div>
      <div class="product__gift-body">
        <p>${c(s)}</p>
        <a class="btn" href="/gifts.html">Набір «Джин-тонік» ↗</a>
      </div>
    </section>`:""}
    <section class="product__related" aria-labelledby="product-related-title">
      <h2 class="section-title product__related-title" id="product-related-title">З цим також беруть</h2>
      <div class="grid-4" id="product-related">${l.map(n=>f(n)).join("")}</div>
    </section>`,S(o),j(o),y(o.querySelector("#product-related"),{onAdd:d}),U(o,t)}function U(t,e){const a=t.querySelector("[data-price-out]"),l=t.querySelector("[data-add]"),s=t.querySelector("[data-qty]"),o=()=>{const i=t.querySelector('input[name="product-volume"]:checked');return{volume:i.value,price:Number(i.dataset.price)}},n=()=>{const{price:i}=o();a&&(a.textContent=_(i*(s?r(s):1)))};s&&w(s,n),t.querySelector(".product__buy").addEventListener("change",i=>{i.target.matches('input[name="product-volume"]')&&n()}),l&&l.addEventListener("click",()=>{d({slug:e.slug,volume:o().volume,qty:r(s)}),C(s,1),n();const i=l.querySelector("span");i&&(i.textContent="Додано ✓",setTimeout(()=>{i.textContent="Додати в кошик"},1200))});const m=t.querySelector("[data-buy-now]");m&&m.addEventListener("click",()=>{d({slug:e.slug,volume:o().volume,qty:r(s)}),location.assign("/checkout.html?buy=1")})}const V=new URLSearchParams(location.search).get("slug"),b=u.find(t=>t.slug===V);b?R(b):location.replace("/404.html");
