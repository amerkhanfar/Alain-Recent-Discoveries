import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SFX } from './sfx.js';

/* =========================================================================
   1. TRANSLATIONS  (full English / Arabic)
   ========================================================================= */
const T = {
  en: {
    dragHint: '↔ Drag to rotate',
    objName: 'The Stone Door of an Ancient Tomb',
    kDate: 'Age',        vDate: 'More than 4,300 years ago',
    kMaterial: 'Material', vMaterial: 'Limestone, Jebel Haqlah',
    storyBtn: 'DISCOVER THE STORY',
    brandStory: 'The Story',
    tl0: 'Quarried', tl1: 'Carved', tl2: 'Placed', tl3: 'Lives on',
    backHome: 'START EXPLORING'
  },
  ar: {
    dragHint: '↔ اسحب للتدوير',
    objName: 'باب حجري لمدفن أثري',
    kDate: 'العمر',     vDate: 'منذ أكثر من 4,300 عام',
    kMaterial: 'المادة',  vMaterial: 'الحجر الجيري، جبل حقلة',
    storyBtn: 'اكتشف القصة',
    brandStory: 'القصة',
    tl0: 'الاستخراج', tl1: 'النحت', tl2: 'التركيب', tl3: 'الإرث',
    backHome: 'ابدأ الاستكشاف'
  }
};

const STORIES = {
  en: [
    { title: 'Born from the Mountain',
      text: 'More than 4,300 years ago, this stone door was carefully carved from a huge limestone block quarried from the nearby Jebel Haqlah known for its high-quality stone.',
      cap: 'Jebel Haqlah limestone' },
    { title: 'Guardian of the Ancestors',
      text: 'For nearly a thousand years, this stone door functioned as the passage into the afterlife in a perfectly circular Umm an-Nar tomb, with hundreds of burials passing through its opening.',
      cap: 'Precision carving' },
    { title: 'A Tomb Reborn',
      text: 'After several hundred years, c. 1500 BC) the stone door, together with other carefully carved ashlar blocks, were placed in a newly built subterranean Wadi Suq tomb that came to house hundreds of individuals over time.',
      cap: '10+ people to lift' },
    { title: 'Rediscovered',
      text: 'Only this year, the Wadi Suq tomb was rediscovered, and although disturbed in the past, the stone door was found inside the tomb and carefully lifted to be further studied and share its rich history.',
      cap: 'Hundreds of burials over centuries' }
  ],
  ar: [
    { title: 'نُحت من جبل حقلة',
      text: 'منذ أكثر من 4,300 عام، نُحت هذا الباب الحجري بعناية من كتلة كبيرة من الحجر الجيري استُخرجت من جبل حقلة القريب، المعروف بجودة أحجاره.',
      cap: 'حجر جيري من جبل حقلة' },
    { title: 'حارس الأسلاف',
      text: 'على مدى ما يقرب من ألف عام، كان هذا الباب الحجري يُستخدم ممرًا إلى الحياة الآخرة في مدفن دائري من فترة أم النار، حيث مرّت من خلال هذا الباب مئات الجنائز.',
      cap: 'نحتٌ دقيق' },
    { title: 'مدفن أعيد إحياؤه',
      text: 'بعد مئات السنين (نحو 1500 قبل الميلاد) وُضع هذا الباب الحجري إلى جانب كتل حجرية أخرى منحوتة بعناية في مقبرة تحت الأرض تعود إلى فترة وادي سوق. وأصبحت هذه المقبرة تضم رفات المئات من الأفراد مع مرور الوقت.',
      cap: 'أكثر من 10 أشخاص للرفع' },
    { title: 'إعادة الاكتشاف',
      text: 'أُعيد اكتشاف مقبرة وادي سوق هذه خلال أعمال أثرية حديثة. وعلى الرغم من تعرضها لبعض الأضرار في الماضي، إلا أنه قد عُثر بداخلها على هذا الباب الحجري، ثم رُفع بعناية لإجراء المزيد من الدراسة عليه تمهيدًا لعرضه على الجمهور.',
      cap: 'مئات الدفنات عبر القرون' }
  ]
};

let lang = 'en';
let storyIdx = 0;
let currentPage = 'home';
let videoFailed = false;

/* =========================================================================
   2. LANGUAGE
   ========================================================================= */
function applyLang(l) {
  lang = l;
  const t = T[l];
  const app = document.getElementById('app');
  app.classList.toggle('lang-ar', l === 'ar');
  document.documentElement.lang = l;

  // data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] === undefined) return;
    if (key === 'brandDiscoveries') el.innerHTML = t[key];
    else el.textContent = t[key];
  });

  // specific value fields
  setText('objName', t.objName);
  setText('vDate', t.vDate);
  setText('vMaterial', t.vMaterial);

  // back arrows follow reading direction
  const backArrow = l === 'ar' ? '→' : '←';
  document.querySelector('#object-page .back-btn').textContent = backArrow;

  // story prev/next arrows mirror in RTL (prev points the way you came, next points forward)
  document.getElementById('storyPrev').textContent = l === 'ar' ? '→' : '←';
  document.getElementById('storyNext').textContent = l === 'ar' ? '←' : '→';

  setStory(storyIdx);
  fitToScreen();
}

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

/* =========================================================================
   3. STORY (timeline + localized SVG illustrations)
   ========================================================================= */
function svgCaption(x, y, text, delay = 0.8) {
  // Arabic must NOT get letter-spacing: on iOS/WebKit it forces a non-complex
  // text path that renders RTL text reversed (and it breaks cursive joining
  // everywhere). Use Cairo + an explicit RTL base direction for Arabic instead.
  const ar = lang === 'ar';
  const font = ar ? "'Cairo','Segoe UI',Tahoma,sans-serif" : 'Arial,sans-serif';
  const extra = ar ? ' direction="rtl" xml:lang="ar"' : ' letter-spacing=".06em"';
  return `<text class="anim-fade" style="animation-delay:${delay}s" x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="#5C4A32" font-family="${font}"${extra}>${text}</text>`;
}
/* Each shape that carries its own transform attribute (rotated rects) is wrapped
   in a <g> so the CSS keyframe transform animates the group while the inner
   element keeps its rotate(). Staggered animation-delays build each scene up. */
const DRAW = [
  // 0 — Quarried: the bedrock rises, then loose blocks drop & stack
  (cap) => `
    <g class="anim-rise"  style="animation-delay:0s"><rect x="20" y="100" width="160" height="50" rx="4" fill="#C4AD8A" opacity=".5"/></g>
    <g class="anim-drop"  style="animation-delay:.15s"><rect x="10" y="80" width="70" height="40" rx="3" fill="#A8926E" opacity=".8"/></g>
    <g class="anim-drop"  style="animation-delay:.3s"><rect x="90" y="60" width="55" height="55" rx="3" fill="#C4AD8A" opacity=".9"/></g>
    <g class="anim-drop"  style="animation-delay:.45s"><rect x="50" y="50" width="40" height="30" rx="2" fill="#8B7355" opacity=".7" transform="rotate(-12,70,65)"/></g>
    <g class="anim-drop"  style="animation-delay:.58s"><rect x="130" y="45" width="35" height="25" rx="2" fill="#A8926E" opacity=".6" transform="rotate(8,147,57)"/></g>
    ${svgCaption(100, 167, cap, .8)}`,
  // 1 — Carved (SVG fallback if the video can't load): stone rises & breathes, chisel marks draw in
  (cap) => `
    <g class="anim-rise-float" style="animation-delay:0s"><rect x="70" y="10" width="60" height="90" rx="6" fill="#C4AD8A"/></g>
    <g class="anim-pop" style="animation-delay:.32s"><ellipse cx="100" cy="65" rx="18" ry="22" fill="#EAE3D2"/></g>
    <g class="anim-pop" style="animation-delay:.46s"><rect x="82" y="87" width="36" height="25" rx="3" fill="#EAE3D2"/></g>
    <line class="anim-draw" style="animation-delay:.55s" pathLength="1" x1="45" y1="40" x2="68" y2="55" stroke="#8B7355" stroke-width="2"/>
    <line class="anim-draw" style="animation-delay:.68s" pathLength="1" x1="155" y1="38" x2="132" y2="53" stroke="#8B7355" stroke-width="2"/>
    <g class="anim-pop" style="animation-delay:.82s"><circle cx="45" cy="38" r="5" fill="#8B7355" opacity=".6"/></g>
    <g class="anim-pop" style="animation-delay:.92s"><circle cx="155" cy="36" r="5" fill="#8B7355" opacity=".6"/></g>
    ${svgCaption(100, 130, cap, 1)}`,
  // 2 — Placed: ground shadow fades in, doorstone settles, ropes & people pop into place
  (cap) => `
    <g class="anim-fade" style="animation-delay:0s"><ellipse cx="100" cy="150" rx="80" ry="12" fill="#C4AD8A" opacity=".4"/></g>
    <g class="anim-rise-float" style="animation-delay:.1s"><rect x="72" y="30" width="56" height="100" rx="5" fill="#C4AD8A"/></g>
    <g class="anim-pop" style="animation-delay:.42s"><ellipse cx="100" cy="85" rx="17" ry="21" fill="#EAE3D2"/></g>
    <g class="anim-pop" style="animation-delay:.52s"><rect x="83" y="106" width="34" height="22" rx="3" fill="#EAE3D2"/></g>
    <line class="anim-fade" style="animation-delay:.3s" x1="20" y1="70" x2="68" y2="80" stroke="#8B7355" stroke-width="1.5" stroke-dasharray="4,3"/>
    <line class="anim-fade" style="animation-delay:.4s" x1="180" y1="70" x2="132" y2="80" stroke="#8B7355" stroke-width="1.5" stroke-dasharray="4,3"/>
    <g class="anim-pop" style="animation-delay:.55s"><circle cx="20" cy="70" r="4" fill="#8B7355" opacity=".5"/></g>
    <g class="anim-pop" style="animation-delay:.64s"><circle cx="180" cy="70" r="4" fill="#8B7355" opacity=".5"/></g>
    <g class="anim-pop" style="animation-delay:.73s"><circle cx="55" cy="130" r="4" fill="#8B7355" opacity=".5"/></g>
    <g class="anim-pop" style="animation-delay:.82s"><circle cx="145" cy="130" r="4" fill="#8B7355" opacity=".5"/></g>
    ${svgCaption(100, 168, cap, .95)}`,
  // 3 — Lives on: tomb fades in, generations (people) gently pulse / breathe
  (cap) => `
    <g class="anim-fade" style="animation-delay:0s"><rect x="72" y="20" width="56" height="100" rx="5" fill="#C4AD8A" opacity=".6"/></g>
    <g class="anim-fade" style="animation-delay:.2s"><ellipse cx="100" cy="75" rx="17" ry="21" fill="#EAE3D2"/></g>
    <g class="anim-fade" style="animation-delay:.3s"><rect x="83" y="96" width="34" height="22" rx="3" fill="#EAE3D2"/></g>
    <g class="anim-pulse" style="animation-delay:.4s"><circle cx="55" cy="145" r="7" fill="#A8926E"/></g>
    <g class="anim-pulse" style="animation-delay:.55s"><circle cx="75" cy="152" r="5" fill="#8B7355"/></g>
    <g class="anim-pulse" style="animation-delay:.68s"><circle cx="125" cy="152" r="5" fill="#8B7355"/></g>
    <g class="anim-pulse" style="animation-delay:.8s"><circle cx="145" cy="145" r="7" fill="#A8926E"/></g>
    <g class="anim-pulse" style="animation-delay:.92s"><circle cx="100" cy="155" r="6" fill="#8B7355"/></g>
    ${svgCaption(100, 170, cap, 1)}`
];

/* steps that play a video — source depends on the chosen language */
const STEP_VIDEO = {
  1: { en: 'assets/media/interview_Michel_De_Vreeze.mp4', ar: 'assets/media/interview_ar.mp4' },
  2: { en: 'assets/media/3danimation_door_placement_eng.mp4', ar: 'assets/media/3danimation_door_placement_arabic.mp4' }
};

function setStory(i) {
  storyIdx = i;
  const s = STORIES[lang][i];
  document.getElementById('storyTitle').textContent = s.title;
  document.getElementById('storyText').textContent = s.text;
  for (let j = 0; j < 4; j++) {
    document.getElementById('sd' + j).className = 'dot' + (j === i ? ' on' : '');
    const td = j === 0 ? document.querySelector('.t-dot[data-story="0"]') : document.getElementById('td' + j);
    if (td) td.className = 't-dot' + (j === i ? ' on' : '');
  }

  // no looping: hide prev on the first step, next on the last step
  document.getElementById('storyPrev').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('storyNext').style.visibility = i === 3 ? 'hidden' : 'visible';

  // Step 1 (index 0) shows a full-width photo; step 2 (index 1) plays the
  // interview video; every other step shows its animated SVG.
  const svg = document.getElementById('storyVis');
  const vbox = document.getElementById('storyVideo');
  const img = document.getElementById('storyImg');
  const vis = document.querySelector('.story-vis');
  const vid = document.getElementById('vid');

  if (vid) vid.pause();
  vbox.style.display = 'none';
  svg.style.display = 'none';
  img.style.display = 'none';
  vis.classList.remove('image-mode', 'video-mode');

  const imgSrc = i === 0 ? 'assets/media/tomb.jpeg' : i === 3 ? 'assets/media/door.jpg' : null;
  const vidConf = STEP_VIDEO[i];
  if (imgSrc) {
    img.src = imgSrc;
    img.style.display = 'block';
    vis.classList.add('image-mode');
  } else if (vidConf && !videoFailed) {
    const src = vidConf[lang] || vidConf.en;
    if (vid && !vid.src.endsWith(src.split('/').pop())) { vid.src = src; vid.load(); }
    vbox.style.display = 'flex';
    vis.classList.add('video-mode');
    if (vid) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); }
  } else {
    svg.style.display = 'block';
    svg.innerHTML = DRAW[i](s.cap);   // re-inject markup to replay entrance animations
  }
}
const nextStory = () => { if (storyIdx < 3) { setStory(storyIdx + 1); SFX.step(storyIdx); } };
const prevStory = () => { if (storyIdx > 0) { setStory(storyIdx - 1); SFX.step(storyIdx); } };

/* =========================================================================
   4. PAGE NAVIGATION
   ========================================================================= */
function goTo(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentPage = id;
  // leaving the story → stop the interview video and drop out of fullscreen
  if (id !== 'story-page') {
    const v = document.getElementById('vid');
    if (v) v.pause();
    if (isFs()) exitFs();
  }
  if (id === 'story-page') setStory(0);
  fitToScreen();
}

/* =========================================================================
   5. HOME REVEAL  (tap anywhere → fade out the logo/cue, scale the artifact in)
   ========================================================================= */
let revealed = false;

function triggerReveal() {
  if (revealed) return;
  revealed = true;
  SFX.reveal();
  // slide the logo up to the top and fade out the click cue
  document.getElementById('home').classList.add('revealed');
  // bring the artifact in and start its idle spin
  homeViewer.active = true;
  (modelFailed ? document.getElementById('homeFallback') : document.getElementById('homeGl'))
    .classList.add('show');
  // reveal the two start buttons once the artifact has settled
  setTimeout(() => {
    const btns = document.getElementById('homeBtns');
    btns.style.opacity = '1';
    btns.style.pointerEvents = 'auto';
  }, 900);
}

/* =========================================================================
   6. THREE.JS VIEWERS  (home reveal + draggable object)
   ========================================================================= */
function makeViewer(canvasEl, camZ) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, camZ);

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b5a40, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2, 3, 2.5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-2.5, 1, 1.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe8c8, 0.5); rim.position.set(0, 1, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const pivot = new THREE.Group();
  scene.add(pivot);

  return { renderer, scene, camera, pivot, model: null, active: false };
}

const homeViewer = makeViewer(document.getElementById('homeGl'), 3.4);
const objViewer  = makeViewer(document.getElementById('objGl'), 3.5);
const viewers = [homeViewer, objViewer];
let modelFailed = false;
let pixelScale = 1;

function sizeViewer(v) {
  const el = v.renderer.domElement;
  const w = el.clientWidth || 270, h = el.clientHeight || 270;
  const pr = Math.min(Math.max(window.devicePixelRatio, 1) * pixelScale, 4);
  v.renderer.setPixelRatio(pr);
  v.renderer.setSize(w, h, false);
  v.camera.aspect = w / h;
  v.camera.updateProjectionMatrix();
}
function sizeAllViewers() { viewers.forEach(sizeViewer); }

/* normalize loaded model: center at origin, scale largest dim to ~2 units */
function normalize(srcScene) {
  const box = new THREE.Box3().setFromObject(srcScene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  srcScene.position.sub(center);
  const inner = new THREE.Group();
  inner.add(srcScene);
  inner.scale.setScalar(2 / maxDim);
  const wrap = new THREE.Group();
  wrap.add(inner);
  return wrap;
}

function showFallback() {
  modelFailed = true;
  const fb = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 240'%3E%3Cpath d='M28 22 Q42 14 80 17 Q118 14 132 22 L130 62 Q142 84 138 115 L140 162 Q132 184 122 194 L112 218 Q92 224 80 224 Q68 224 48 218 L38 194 Q28 184 20 162 L22 115 Q18 84 30 62 Z' fill='%23C9AF88' stroke='%23A8926E' stroke-width='1.5'/%3E%3Cpath d='M50 118 Q52 80 80 78 Q108 80 110 118 Q108 148 96 158 L80 162 L64 158 Q52 148 50 118Z' fill='%23EAE3D2' stroke='%23A8926E' stroke-width='1'/%3E%3Crect x='54' y='158' width='52' height='34' rx='2' fill='%23EAE3D2' stroke='%23A8926E' stroke-width='1'/%3E%3C/svg%3E`;
  const hf = document.getElementById('homeFallback'), of = document.getElementById('objFallback');
  hf.src = fb; of.src = fb;
  document.getElementById('homeGl').style.display = 'none';
  document.getElementById('objGl').style.display = 'none';
  of.style.display = 'block';
  if (revealed) hf.classList.add('show');
}

new GLTFLoader().load(
  'assets/models/QAT0040_SF1064_LP.glb',
  (gltf) => {
    homeViewer.model = normalize(gltf.scene);
    objViewer.model  = normalize(gltf.scene.clone(true));
    homeViewer.pivot.add(homeViewer.model);
    objViewer.pivot.add(objViewer.model);
    homeViewer.pivot.rotation.y = -0.5;
    objViewer.pivot.rotation.y = -0.4;
    sizeAllViewers();
  },
  undefined,
  (err) => { console.error('GLB load failed', err); showFallback(); }
);

/* drag-to-rotate + scroll/pinch-to-zoom on the object viewer */
const objCanvas = document.getElementById('objGl');
let dragging = false, lastX = 0, lastY = 0, vel = 0;
let objDist = 3.5;                // camera distance (zoom)
const MIN_Z = 1.6, MAX_Z = 7;
const pointersDown = new Map();   // active pointers for multi-touch
let lastPinch = 0;

function pinchDist() {
  const p = [...pointersDown.values()];
  return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
}
function zoomBy(delta) {
  objDist = Math.max(MIN_Z, Math.min(MAX_Z, objDist + delta));
  objViewer.camera.position.z = objDist;
}

objCanvas.addEventListener('pointerdown', (e) => {
  pointersDown.set(e.pointerId, { x: e.clientX, y: e.clientY });
  objCanvas.setPointerCapture(e.pointerId);
  if (pointersDown.size === 1) { dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0; }
  else { dragging = false; lastPinch = pinchDist(); }
});
objCanvas.addEventListener('pointermove', (e) => {
  if (!pointersDown.has(e.pointerId)) return;
  pointersDown.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointersDown.size >= 2) {               // two fingers → pinch zoom
    const d = pinchDist();
    if (lastPinch) zoomBy((lastPinch - d) * 0.01);
    lastPinch = d;
    return;
  }
  if (!dragging || !objViewer.model) return;  // one finger → rotate
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  objViewer.pivot.rotation.y += dx * 0.01;
  objViewer.pivot.rotation.x = Math.max(-0.6, Math.min(0.6, objViewer.pivot.rotation.x + dy * 0.005));
  vel = dx * 0.01;
});
function endPointer(e) {
  pointersDown.delete(e.pointerId);
  if (pointersDown.size === 1) {              // resume drag with remaining finger (no jump)
    const p = [...pointersDown.values()][0];
    lastX = p.x; lastY = p.y; dragging = true; lastPinch = 0;
  } else if (pointersDown.size === 0) {
    dragging = false; lastPinch = 0;
  }
}
objCanvas.addEventListener('pointerup', endPointer);
objCanvas.addEventListener('pointercancel', endPointer);
objCanvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY * 0.0025); }, { passive: false });

/* single render loop — renders only the active page's viewer */
function loop() {
  if (currentPage === 'home' && homeViewer.active && homeViewer.model) {
    homeViewer.pivot.rotation.y += 0.005;
    homeViewer.renderer.render(homeViewer.scene, homeViewer.camera);
  } else if (currentPage === 'object-page' && objViewer.model) {
    if (!dragging) {
      objViewer.pivot.rotation.y += vel + 0.0015; // inertia + gentle idle
      vel *= 0.94;
    }
    objViewer.renderer.render(objViewer.scene, objViewer.camera);
  }
  requestAnimationFrame(loop);
}

/* =========================================================================
   7. KIOSK FIT-TO-SCREEN (portrait, 55")
   ========================================================================= */
const APP_W = 390;
let appH = 820;

function measureMaxHeight() {
  const pages = [...document.querySelectorAll('.page')];
  let max = 780;
  pages.forEach(p => {
    const prev = { d: p.style.display, pos: p.style.position, vis: p.style.visibility, h: p.style.height };
    p.style.display = 'flex';
    p.style.position = 'absolute';
    p.style.visibility = 'hidden';
    p.style.height = 'auto';
    max = Math.max(max, p.scrollHeight);
    p.style.display = prev.d; p.style.position = prev.pos;
    p.style.visibility = prev.vis; p.style.height = prev.h;
  });
  return Math.ceil(max);
}

function fitToScreen() {
  appH = measureMaxHeight();
  const app = document.getElementById('app');
  app.style.setProperty('--app-h', appH + 'px');
  const scale = Math.min(window.innerWidth / APP_W, window.innerHeight / appH);
  app.style.setProperty('--app-scale', scale);
  pixelScale = scale;
  sizeAllViewers();
}

/* =========================================================================
   8. WIRE-UP
   ========================================================================= */
/* tap anywhere on the home screen → reveal the discovery */
document.getElementById('home').addEventListener('click', triggerReveal);
document.getElementById('startEn').addEventListener('click', () => { SFX.chime(); applyLang('en'); goTo('object-page'); });
document.getElementById('startAr').addEventListener('click', () => { SFX.chime(); applyLang('ar'); goTo('object-page'); });
document.getElementById('toStory').addEventListener('click', () => { SFX.transition(); goTo('story-page'); });
document.getElementById('storyPrev').addEventListener('click', prevStory);
document.getElementById('storyNext').addEventListener('click', nextStory);
document.querySelector('#object-page .back-btn').addEventListener('click', () => { SFX.back(); goTo('home'); });
document.querySelector('.story-start').addEventListener('click', () => { SFX.back(); goTo('home'); });
document.querySelectorAll('.t-dot[data-story]').forEach(d =>
  d.addEventListener('click', () => { setStory(+d.getAttribute('data-story')); SFX.step(storyIdx); }));

/* ── Step-2 interview video controls ── */
const ICONS = {
  vol:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/><path d="M14 3.2v2.1a6.5 6.5 0 0 1 0 13.4v2.1a8.5 8.5 0 0 0 0-17.6z"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M22 9.4 20.6 8 18 10.6 15.4 8 14 9.4 16.6 12 14 14.6 15.4 16 18 13.4 20.6 16 22 14.6 19.4 12 22 9.4z"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 0h2v5h-5v-2h3v-3z"/></svg>',
  exit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7V4h2v5H4V7h3zm10 0h3v2h-5V4h2v3zM7 17H4v-2h5v5H7v-3zm10 0v3h-2v-5h5v2h-3z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
};
const vidEl   = document.getElementById('vid');
const vidWrap = document.getElementById('vidWrap');
const muteBtn = document.getElementById('vidMute');
const fullBtn = document.getElementById('vidFull');

function syncMuteIcon() { if (muteBtn) muteBtn.innerHTML = vidEl.muted ? ICONS.mute : ICONS.vol; }

/* ---- cross-browser / iOS-safe fullscreen ----
   iOS Safari has no Element.requestFullscreen — only the <video> element can go
   fullscreen via the non-standard webkitEnterFullscreen() (native player). */
function isFs() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement) ||
         !!(vidEl && vidEl.webkitDisplayingFullscreen);
}
function enterFs() {
  if (vidWrap.requestFullscreen)       return vidWrap.requestFullscreen().catch(() => {});
  if (vidWrap.webkitRequestFullscreen) return vidWrap.webkitRequestFullscreen();
  if (vidEl && vidEl.webkitEnterFullscreen) { try { vidEl.webkitEnterFullscreen(); } catch (e) {} }
}
function exitFs() {
  if (document.exitFullscreen)             return document.exitFullscreen().catch(() => {});
  if (document.webkitExitFullscreen)       return document.webkitExitFullscreen();
  if (vidEl && vidEl.webkitExitFullscreen) { try { vidEl.webkitExitFullscreen(); } catch (e) {} }
}
function syncFullIcon() { if (fullBtn) fullBtn.innerHTML = isFs() ? ICONS.exit : ICONS.full; }

syncMuteIcon();
syncFullIcon();

if (muteBtn) muteBtn.addEventListener('click', () => {
  SFX.click();
  vidEl.muted = !vidEl.muted;
  if (!vidEl.muted) { const p = vidEl.play(); if (p && p.catch) p.catch(() => {}); }
  syncMuteIcon();
});
if (fullBtn) fullBtn.addEventListener('click', () => { SFX.click(); if (isFs()) exitFs(); else enterFs(); });
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, syncFullIcon));
if (vidEl) {
  vidEl.addEventListener('webkitbeginfullscreen', syncFullIcon);
  vidEl.addEventListener('webkitendfullscreen', syncFullIcon);
}

/* ---- center play / pause button: auto-hides after 3s of playback ---- */
const playBtn = document.getElementById('vidPlay');
let hideTimer = null;
function syncPlayIcon() { if (playBtn) playBtn.innerHTML = vidEl.paused ? ICONS.play : ICONS.pause; }
function showControls() {
  vidWrap.classList.remove('controls-hidden');
  clearTimeout(hideTimer);
  // only fade away while the video is actually running; when paused the
  // "continue" button stays put so the viewer can find it
  if (vidEl && !vidEl.paused) hideTimer = setTimeout(() => vidWrap.classList.add('controls-hidden'), 3000);
}
syncPlayIcon();
if (playBtn) playBtn.addEventListener('click', () => {
  SFX.click();
  if (vidEl.paused) { const p = vidEl.play(); if (p && p.catch) p.catch(() => {}); }
  else vidEl.pause();
});
if (vidEl) {
  vidEl.addEventListener('play',  () => { syncPlayIcon(); showControls(); });
  vidEl.addEventListener('pause', () => { syncPlayIcon(); showControls(); });
}
// bring controls back on hover / touch / movement, then restart the 3s countdown
['pointerdown', 'pointermove', 'mouseenter', 'touchstart'].forEach(ev =>
  vidWrap.addEventListener(ev, showControls, { passive: true }));

// If the video file is missing/unsupported, fall back to the animated SVG for step 2.
if (vidEl) vidEl.addEventListener('error', () => {
  videoFailed = true;
  if (STEP_VIDEO[storyIdx]) setStory(storyIdx);
});

window.addEventListener('resize', fitToScreen);

/* kiosk: suppress the right-click / long-press context menu */
window.addEventListener('contextmenu', (e) => e.preventDefault());

/* unlock the audio context on the very first user interaction (autoplay policy) */
function unlockAudioOnce() {
  SFX.unlock();
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.removeEventListener(ev, unlockAudioOnce, true));
}
['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
  window.addEventListener(ev, unlockAudioOnce, { capture: true, passive: true }));

/* boot */
applyLang('en');
setStory(0);
loop();
fitToScreen();
