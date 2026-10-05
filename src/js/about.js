// «Про дім»: паралакс фото hero (reduced-motion вимикає сам компонент), пауза кілець маніфесту поза екраном, sticky-split «Два бренди», слайдер етапів «Від зерна до пляшки»
import { initParallax } from './components/parallax.js';
import { initRings } from './components/rings.js';
import { initBrandSplit } from './components/brand-split.js';
import { initProcessTrack } from './components/process-track.js';
import products from '../data/products.json';
import { addToCart } from './cart.js';
import { mountPopularChoice } from './components/popular-choice.js';

initParallax();
initRings();
initBrandSplit();
initProcessTrack();

// «Популярний вибір»: той самий компонент, що на головній (хіти + остання картка «Переглянути весь асортимент»)
mountPopularChoice(document.querySelector('[data-popular-choice]'), { products, onAdd: addToCart, headButton: true });
