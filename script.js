'use strict';

/* =========================================================================
   CONFIGURATION
   Tweak colors, particle count, timing and heart size here — nothing below
   this block should need to change for common customizations.
========================================================================= */
const CONFIG = {
  // --- Particles -----------------------------------------------------
  particleCount: 500,        // how many hearts assemble the big heart (increased for complete coverage)
  particleDelayMs: 12,       // stagger between each heart launch (slightly faster)
  flightDurationMs: 900,     // how long a single heart takes to fly to its spot (matches CSS)

  // --- Heart shape (classic parametric heart equation) ---------------
  heartWidthPx: 420,         // target width of the assembled heart, in SVG viewBox units
  heartHeightPx: 360,        // target height of the assembled heart, in SVG viewBox units
  heartCenter: { x: 520, y: 300 }, // where the heart assembles, in the 900x600 viewBox

  // --- Particle look ---------------------------------------------------
  particleMinSizePx: 16,
  particleMaxSizePx: 26,
  particleMaxRotateDeg: 12,

  // --- Decoration ------------------------------------------------------
  sparkleChance: 0.35,       // probability a given launch also spawns a fading sparkle
  glowChance: 0.5,           // probability a given launch also spawns a soft glow puff
  bgFloaterCount: 24,        // ambient background hearts drifting upward forever

  // --- Character intro ---------------------------------------------------
  charDrawStaggerMs: 90,     // delay added between each body-part path drawing
  charDrawDurationMs: 650,   // how long each path takes to draw itself

  // --- Colors ------------------------------------------------------------
  colors: {
    heart: '#ff4d6d',
    character: '#f8fafc',
  },
};

/* =========================================================================
   HEART MATH
   Classic parametric heart curve:
     x(t) = 16 sin³(t)
     y(t) = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
   We sample the boundary once to know its natural bounding box, then place
   every particle at a random point *inside* that boundary (not just on it)
   so the hearts assemble into a dense, filled heart rather than an outline.
========================================================================= */
function heartCurve(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t);
  return { x, y };
}

function getHeartBoundingBox() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const samples = 2000;
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const { x, y } = heartCurve(t);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

// Generate `count` pixel-space (viewBox-space) points that together fill a
// dense heart of the configured width/height, centered on config.heartCenter.
function generateHeartPoints(count) {
  const box = getHeartBoundingBox();
  const midX = (box.maxX + box.minX) / 2;
  const midY = (box.maxY + box.minY) / 2;
  const scaleX = CONFIG.heartWidthPx / (box.maxX - box.minX);
  const scaleY = CONFIG.heartHeightPx / (box.maxY - box.minY);

  const points = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    // sqrt() keeps the interior distribution visually uniform instead of
    // clumping points near the center.
    const r = Math.sqrt(Math.random());
    const raw = heartCurve(t);
    const rawX = raw.x * r;
    const rawY = raw.y * r;

    const px = CONFIG.heartCenter.x + (rawX - midX) * scaleX;
    // Flip vertically: the equation's y grows upward (math convention),
    // screen/SVG y grows downward.
    const py = CONFIG.heartCenter.y - (rawY - midY) * scaleY;

    points.push({ x: px, y: py });
  }
  return points;
}

/* =========================================================================
   DOM REFERENCES
========================================================================= */
const characterSvg = document.getElementById('character');
const characterWrap = document.querySelector('.character-wrap');
const handEl = document.getElementById('char-hand');
const heartsContainer = document.getElementById('hearts-container');
const loveText = document.getElementById('love-text');
const bgFloaters = document.getElementById('bg-floaters');
const musicToggle = document.getElementById('music-toggle');
const musicIcon = document.getElementById('music-icon');
const musicLabel = document.getElementById('music-label');
const bgMusic = document.getElementById('bg-music');

const SVG_NS = 'http://www.w3.org/2000/svg';

/* =========================================================================
   UTILITIES
========================================================================= */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Converts a point in page pixel coordinates into the local coordinate
// system (viewBox units) of the given SVG element. Used so the flying
// hearts always start exactly at the character's fingertip regardless of
// responsive scaling.
function pageToSvgPoint(svg, pageX, pageY) {
  const pt = svg.createSVGPoint();
  pt.x = pageX;
  pt.y = pageY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

function getFingertipPoint() {
  const rect = handEl.getBoundingClientRect();
  const centerPageX = rect.left + rect.width / 2;
  const centerPageY = rect.top + rect.height / 2;
  return pageToSvgPoint(heartsContainer, centerPageX, centerPageY);
}

/* =========================================================================
   1. CHARACTER INTRO ANIMATION (simplified for image)
========================================================================= */
function showCharacter() {
  return new Promise((resolve) => {
    const characterImg = document.getElementById('character');
    characterImg.style.opacity = '0';
    characterImg.style.transition = 'opacity 0.8s ease';
    
    setTimeout(() => {
      characterImg.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
      handEl.style.opacity = '1';
      resolve();
    }, 900);
  });
}

// Little bounce + settle so the character feels alive before pointing.
function bounceIntro() {
  return new Promise((resolve) => {
    characterWrap.classList.add('character-bounce');
    setTimeout(() => {
      characterWrap.classList.remove('character-bounce');
      resolve();
    }, 1300);
  });
}

/* =========================================================================
   2. HEART PARTICLES
========================================================================= */
function createHeartParticle(target, index, startPoint) {
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '#heart-symbol');
  use.setAttribute('class', 'heart-particle');

  const size = rand(CONFIG.particleMinSizePx, CONFIG.particleMaxSizePx);
  // Symbol's own viewBox is 32x29, so scale down to the desired pixel size.
  const baseScale = size / 32;

  use.setAttribute('width', 32);
  use.setAttribute('height', 29);
  use.setAttribute('x', -16);
  use.setAttribute('y', -14.5);

  const rotateStart = rand(-CONFIG.particleMaxRotateDeg, CONFIG.particleMaxRotateDeg);
  const rotateEnd = rand(-CONFIG.particleMaxRotateDeg, CONFIG.particleMaxRotateDeg);

  // Starting transform: at the fingertip, tiny, slightly rotated.
  use.setAttribute(
    'transform',
    `translate(${startPoint.x} ${startPoint.y}) rotate(${rotateStart}) scale(${baseScale * 0.2})`
  );

  heartsContainer.appendChild(use);

  // Force layout so the browser registers the start state before we
  // transition to the end state (otherwise the transition is skipped).
  // eslint-disable-next-line no-unused-expressions
  use.getBoundingClientRect();

  requestAnimationFrame(() => {
    use.classList.add('flying');
    use.setAttribute(
      'transform',
      `translate(${target.x} ${target.y}) rotate(${rotateEnd}) scale(${baseScale})`
    );
  });

  setTimeout(() => {
    use.classList.add('landed');
  }, CONFIG.flightDurationMs + 40);

  // Occasional sparkle + glow flair while this heart is in flight.
  if (Math.random() < CONFIG.sparkleChance) {
    spawnSparkle(startPoint, target);
  }
  if (Math.random() < CONFIG.glowChance) {
    spawnGlow(startPoint);
  }
}

function spawnSparkle(startPoint, target) {
  const t = document.createElementNS(SVG_NS, 'use');
  t.setAttribute('href', '#heart-symbol');
  t.setAttribute('class', 'sparkle-heart');
  const midX = (startPoint.x + target.x) / 2 + rand(-30, 30);
  const midY = (startPoint.y + target.y) / 2 + rand(-30, 30);
  const size = rand(6, 11);
  t.setAttribute('width', 32);
  t.setAttribute('height', 29);
  t.setAttribute('x', -16);
  t.setAttribute('y', -14.5);
  t.setAttribute('transform', `translate(${midX} ${midY}) scale(${size / 32})`);
  heartsContainer.appendChild(t);
  setTimeout(() => t.remove(), 1200);
}

function spawnGlow(startPoint) {
  const g = document.createElementNS(SVG_NS, 'circle');
  g.setAttribute('class', 'glow-particle');
  g.setAttribute('cx', startPoint.x);
  g.setAttribute('cy', startPoint.y);
  g.setAttribute('r', rand(6, 11));
  heartsContainer.appendChild(g);
  setTimeout(() => g.remove(), 750);
}

function launchHearts() {
  return new Promise((resolve) => {
    const targets = generateHeartPoints(CONFIG.particleCount);

    targets.forEach((target, i) => {
      setTimeout(() => {
        const startPoint = getFingertipPoint();
        createHeartParticle(target, i, startPoint);
      }, i * CONFIG.particleDelayMs);
    });

    const totalTime =
      (CONFIG.particleCount - 1) * CONFIG.particleDelayMs + CONFIG.flightDurationMs + 150;
    setTimeout(resolve, totalTime);
  });
}

/* =========================================================================
   3. FINAL TEXT REVEAL
========================================================================= */
function revealText() {
  loveText.classList.add('visible');
  setTimeout(() => loveText.classList.add('sparkle-once'), 500);
}

/* =========================================================================
   4. AMBIENT BACKGROUND FLOATING HEARTS (forever)
========================================================================= */
function startBackgroundFloaters() {
  for (let i = 0; i < CONFIG.bgFloaterCount; i++) {
    spawnFloater(rand(0, 8000)); // stagger initial appearance
  }
}

function spawnFloater(initialDelayMs) {
  setTimeout(() => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'bg-floater');
    svg.setAttribute('viewBox', '0 0 32 29');

    const size = rand(8, 20);
    svg.style.width = `${size}px`;
    svg.style.height = `${size * (29 / 32)}px`;
    svg.style.left = `${rand(2, 98)}%`;
    svg.style.setProperty('--drift', `${rand(-60, 60)}px`);

    const duration = rand(9, 18);
    svg.style.animationDuration = `${duration}s`;
    svg.style.animationDelay = `${rand(0, 4)}s`;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M16 28 C 16 28, 1 18.5, 1 9.2 C 1 3.5, 5.4 0, 10 0 C 13 0, 15 1.6, 16 4 C 17 1.6, 19 0, 22 0 C 26.6 0, 31 3.5, 31 9.2 C 31 18.5, 16 28, 16 28 Z'
    );
    svg.appendChild(path);

    bgFloaters.appendChild(svg);

    // Recycle this floater indefinitely with fresh randomized values,
    // instead of letting the DOM grow forever.
    svg.addEventListener('animationiteration', () => {
      svg.style.left = `${rand(2, 98)}%`;
      svg.style.setProperty('--drift', `${rand(-60, 60)}px`);
    });
  }, initialDelayMs);
}

/* =========================================================================
   5. MUSIC TOGGLE (autoplay only after user gesture, per browser policy)
========================================================================= */
let musicPlaying = false;
musicToggle.addEventListener('click', () => {
  if (!musicPlaying) {
    bgMusic.play().catch(() => {
      // No audio file present or playback blocked — fail silently,
      // the visual experience still works without music.
    });
    musicIcon.textContent = '❚❚';
    musicLabel.textContent = 'Pause Music';
  } else {
    bgMusic.pause();
    musicIcon.textContent = '▶';
    musicLabel.textContent = 'Play Music';
  }
  musicPlaying = !musicPlaying;
});

/* =========================================================================
   MASTER SEQUENCE
   1. Character draws itself
   2. Blink + blush
   3. Little bounce
   4. Hearts launch from fingertip and assemble
   5. Text fades in
   6. Character settles into a gentle idle wave, hearts pulse forever
========================================================================= */
async function playSequence() {
  startBackgroundFloaters();

  await showCharacter();
  await bounceIntro();
  await launchHearts();

  revealText();
  characterWrap.classList.add('character-wave');
}

window.addEventListener('DOMContentLoaded', () => {
  // Small delay so fonts/layout settle before we start measuring path lengths.
  setTimeout(playSequence, 150);
});
