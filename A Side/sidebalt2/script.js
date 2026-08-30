import * as THREE from "https://unpkg.com/three@0.172.0/build/three.module.js";

const slides = [
  { name: "Contour", img: "../assets/media/i1.jpeg" },
  { name: "Velum Drift", img: "../assets/media/i2.jpeg" },
  { name: "Quiet Exchange", img: "../assets/media/i3.JPEG" },
  { name: "Earth Routine", img: "../assets/media/i4.JPEG" },
  { name: "Metal Echo", img: "../assets/media/i5.jpeg" },
  { name: "Tanned Edge", img: "../assets/media/i6.jpeg" },
  { name: "Humidity", img: "../assets/media/i7.JPEG" },
  { name: "Limestone Air", img: "../assets/media/i8.jpeg" },
  { name: "Warm Surface", img: "../assets/media/i9.JPEG" },
  { name: "Dust & Craft", img: "../assets/media/i10.PNG" },
  { name: "Soft Grain", img: "../assets/media/i11.JPEG" },
  { name: "Still Form", img: "../assets/media/i12.PNG" },
  { name: "Natural Line", img: "../assets/media/i13.PNG" },
  { name: "Open Texture", img: "../assets/media/i14.jpg" },
  { name: "Faded Light", img: "../assets/media/i15.PNG" },
  //{ name: "Mon", video: "../assets/media/mon.MP4" },
];

const config = {
  gap: 0.02,
  smoothing: 0.05,
  // --- warp/distortion ---
  distortionStrength: 0.75, // overall bend amount
  distortionSmoothing: 0.09,
  momentumFriction: 0.95,
  momentumThreshold: 0.001,
  wheelSpeed: 0.01,
  wheelMax: 150,
  dragSpeed: 0.01,
  dragMomentum: 0.01,
  touchSpeed: 0.01,
  touchMomentum: 0.1,
  // --- multi-column setup ---
  numColumns: 3,
  columnFillRatio: 0.82, // each column's images take up this fraction of its slot width; rest is the gutter between columns
  edgeColumnsHorizontalOnly: true, // left & right strips only show horizontal (landscape) media
  centerColumnVerticalOnly: true, // center strip only shows vertical (portrait) media
  horizontalAspectThreshold: 1.0, // width/height above this counts as "horizontal"
  // per-column [speedMultiplier, phaseOffset (0-1 of loop length)]
  // negative speed reverses that column's scroll direction
  columnBehavior: [
    { speed: 1, phase: 0 },
    { speed: -0.8, phase: 0.33 },
    { speed: 1.2, phase: 0.66 },
  ],
  // --- always-on drift + interaction exaggeration ---
  autoScroll: {
    baseSpeed: 0.01, // slow idle drift — every image stays readable
    exaggeration: 1.3, // gentle nudge on scroll, not a launch
    boostDecay: 0.94, // settles back to baseSpeed quickly (~1s)
    maxBoost: 0.4, // caps the kick so it never overtakes the drift by much
  },
  scrollHint: {
    autoHideMs: 3000, // how long each appearance stays visible
    repeatMs: 15000, // how often it reappears while idle
  },
};

const canvas = document.querySelector("canvas");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
// scene.background left transparent — a shader-painted backdrop (see below)
// is rendered underneath it instead of a flat color.

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.z = 5;

// --- Background: a "tobacco sunburst" gradient (warm amber core fading to
// near-black edges, like a sunburst guitar finish) with a slow amp-glow
// breathing pulse and fine animated film grain. Rendered as its own
// full-screen pass behind the photo columns. ---
const backgroundUniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
};

const backgroundMaterial = new THREE.ShaderMaterial({
  uniforms: backgroundUniforms,
  depthWrite: false,
  depthTest: false,
  vertexShader: `
    void main() {
      // full-screen triangle/quad in clip space — no camera transform needed
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453123);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 centered = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      float dist = length(centered);

      // sunburst palette: warm walnut/amber core -> deep umber -> near-black rim
      vec3 core = vec3(0.40, 0.21, 0.08);
      vec3 mid  = vec3(0.15, 0.075, 0.035);
      vec3 edge = vec3(0.02, 0.015, 0.012);

      float t1 = smoothstep(0.0, 0.55, dist);
      float t2 = smoothstep(0.35, 1.05, dist);

      vec3 color = mix(core, mid, t1);
      color = mix(color, edge, t2);

      // slow breathing glow, like a tube amp warming up
      float glow = 0.035 * sin(uTime * 0.25);
      color += glow * (1.0 - dist);

      // fine, animated film grain for texture
      float grain = hash(uv * uResolution.xy * 0.5 + mod(uTime * 60.0, 1000.0));
      color += (grain - 0.5) * 0.03;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

const backgroundScene = new THREE.Scene();
const backgroundCamera = new THREE.Camera(); // unused by the shader, required by renderer.render()
const backgroundQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backgroundMaterial);
backgroundQuad.frustumCulled = false;
backgroundScene.add(backgroundQuad);

renderer.autoClear = false;

const wrap = (value, range) => ((value % range) + range) % range;

function getVisibleWidthAtZ0() {
  const vFov = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
  return visibleHeight * camera.aspect;
}

const totalSlides = slides.length;
const textureLoader = new THREE.TextureLoader();

// Keep hold of every <video> element we create so we can pause/resume them
// (e.g. on tab visibility change) without walking the scene graph.
const videoElements = [];

function loadImageTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, resolve, undefined, reject);
  });
}

function loadVideoTexture(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";

    video.addEventListener(
      "loadedmetadata",
      () => {
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        videoElements.push(video);
        video.play().catch((err) => console.warn("Video autoplay blocked:", err));
        resolve(texture);
      },
      { once: true },
    );
    video.addEventListener("error", () => reject(new Error(`Failed to load video: ${url}`)), {
      once: true,
    });
  });
}

function loadSlideTexture(slide) {
  return slide.video ? loadVideoTexture(slide.video) : loadImageTexture(slide.img);
}

// Reads intrinsic media dimensions off either an <img> (via THREE's loaded
// image) or a <video> element (backing a VideoTexture) — the two expose
// dimensions under different property names.
function getMediaSize(tex) {
  const media = tex.image;
  const isVideo = !!tex.isVideoTexture;
  return {
    width: isVideo ? media.videoWidth : media.width,
    height: isVideo ? media.videoHeight : media.height,
  };
}

function isHorizontalTexture(tex) {
  const { width, height } = getMediaSize(tex);
  return width / height > config.horizontalAspectThreshold;
}

// Lays out a stacked, looping strip for an arbitrary subset of slide indices
// (used per-column since edge columns may only contain a subset of slides).
function computeColumnLayout(indices, textures, targetWidth) {
  const heights = indices.map((i) => {
    const tex = textures[i];
    const { width, height } = getMediaSize(tex);
    const imageAspect = width / height;
    return targetWidth / imageAspect;
  });

  const offsets = [];
  let stackPosition = 0;

  indices.forEach((_, idx) => {
    if (idx === 0) {
      offsets.push(0);
      stackPosition = heights[0] / 2;
    } else {
      stackPosition += config.gap + heights[idx] / 2;
      offsets.push(stackPosition);
      stackPosition += heights[idx] / 2;
    }
  });

  const loopLength = stackPosition + config.gap + heights[0] / 2;
  const halfLoop = loopLength / 2;

  return { heights, offsets, loopLength, halfLoop };
}

// one entry per column: { meshes, loopLength, halfLoop, scrollPosition, scrollTarget, scrollMomentum, speed, x }
const columns = [];

async function init() {
  const textures = await Promise.all(slides.map(loadSlideTexture));

  const visibleWidth = getVisibleWidthAtZ0();
  const slotWidth = visibleWidth / config.numColumns;
  const targetWidth = slotWidth * config.columnFillRatio;

  const allIndices = slides.map((_, i) => i);
  const horizontalIndices = allIndices.filter((i) =>
    isHorizontalTexture(textures[i]),
  );
  const verticalIndices = allIndices.filter(
    (i) => !isHorizontalTexture(textures[i]),
  );

  // The first and last columns are treated as the "edge" (left/right) strips.
  const edgeColumnIndices = new Set(
    config.numColumns > 1 ? [0, config.numColumns - 1] : [],
  );
  // Everything not an edge column is a "center" strip.
  const isCenterColumn = (c) => !edgeColumnIndices.has(c);

  for (let c = 0; c < config.numColumns; c++) {
    const behavior = config.columnBehavior[c] || { speed: 1, phase: 0 };
    const colX = -visibleWidth / 2 + slotWidth * (c + 0.5);

    const isEdgeColumn =
      config.edgeColumnsHorizontalOnly && edgeColumnIndices.has(c);
    const isCenterOnlyVertical =
      config.centerColumnVerticalOnly && isCenterColumn(c);

    let columnIndices = allIndices;
    let fallbackReason = "";

    if (isEdgeColumn) {
      columnIndices = horizontalIndices;
      fallbackReason = "no horizontal slides found";
    } else if (isCenterOnlyVertical) {
      columnIndices = verticalIndices;
      fallbackReason = "no vertical slides found";
    }

    if (columnIndices.length === 0) {
      console.warn(
        `Column ${c}: ${fallbackReason}, falling back to the full slide set.`,
      );
      columnIndices = allIndices;
    }

    const { heights, offsets, loopLength, halfLoop } = computeColumnLayout(
      columnIndices,
      textures,
      targetWidth,
    );

    const meshes = [];

    columnIndices.forEach((slideIndex, idx) => {
      const width = targetWidth;
      const height = heights[idx];
      const sourceTexture = textures[slideIndex];

      // VideoTexture can't safely be .clone()'d in three.js (its constructor
      // expects a live <video> element), and there's no need to anyway —
      // every mesh showing this slide can share the one video's playback.
      const isVideo = !!sourceTexture.isVideoTexture;
      const texture = isVideo ? sourceTexture : sourceTexture.clone();
      texture.colorSpace = THREE.SRGBColorSpace;
      if (!isVideo) texture.needsUpdate = true;

      const geometry = new THREE.PlaneGeometry(width, height, 32, 16);
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        map: texture,
        color: 0xffffff,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = colX;

      mesh.userData = {
        originalVertices: [...geometry.attributes.position.array],
        offset: offsets[idx],
        name: slides[slideIndex].name,
        index: slideIndex,
      };

      scene.add(mesh);
      meshes.push(mesh);
    });

    columns.push({
      meshes,
      loopLength,
      halfLoop,
      x: colX,
      speed: behavior.speed,
      scrollPosition: behavior.phase * loopLength,
      scrollTarget: behavior.phase * loopLength,
      scrollMomentum: 0,
    });
  }

  animate();
}

function applyDistortion(mesh, positionY, strength) {
  const positions = mesh.geometry.attributes.position;
  const original = mesh.userData.originalVertices;

  for (let i = 0; i < positions.count; i++) {
    const x = original[i * 3];
    const y = original[i * 3 + 1];

    const distance = Math.sqrt((positionY + y) ** 2 + x * x);
    const falloff = Math.max(0, 1 - distance / 2);
    const bend = Math.pow(Math.sin((falloff * Math.PI) / 2), 1.5);
    positions.setZ(i, bend * strength);
  }

  positions.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

// shared input state - a single scroll/drag/touch gesture drives every column,
// each column just responds at its own speed and direction
let inputDelta = 0; // accumulated raw input for the current frame
let isScrolling = false;
let lastFrameTime = 0;

let distortionAmount = 0;
let distortionTarget = 0;
let velocityPeak = 0;
let scrollDirection = 0;
let directionTarget = 0;
const velocityHistory = [0, 0, 0, 0, 0];

let isDragging = false;
let dragStartY = 0;
let dragDelta = 0;
let touchStartY = 0;
let touchLastY = 0;
let sharedMomentum = 0;

// Always-on idle drift, plus a temporary "kick" left behind by real user
// input. The kick decays back down to zero every frame so a single flick
// exaggerates the auto-scroll for a moment instead of changing it forever.
let autoScrollBoost = 0;

const addDistortionBurst = (amount) => {
  distortionTarget = Math.min(1, distortionTarget + amount);
};

const addAutoScrollBoost = (signedAmount) => {
  const { maxBoost } = config.autoScroll;
  autoScrollBoost = Math.sign(signedAmount || autoScrollBoost) *
    Math.min(maxBoost, Math.abs(autoScrollBoost) + Math.abs(signedAmount));
};

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    hideScrollHint();

    const rawDelta = e.deltaY;
    const clampedDelta =
      Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), config.wheelMax);

    addDistortionBurst(Math.abs(clampedDelta) * 0.00055);
    const scaledDelta =
      clampedDelta * config.wheelSpeed * config.autoScroll.exaggeration;
    inputDelta += scaledDelta;
    addAutoScrollBoost(scaledDelta * 0.5);
    isScrolling = true;

    clearTimeout(window._scrollTimeout);
    window._scrollTimeout = setTimeout(() => (isScrolling = false), 150);
  },
  { passive: false },
);

window.addEventListener(
  "touchstart",
  (e) => {
    hideScrollHint();
    touchStartY = touchLastY = e.touches[0].clientY;
    isScrolling = false;
    sharedMomentum = 0;
  },
  { passive: false },
);

window.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();

    const deltaY = e.touches[0].clientY - touchLastY;
    touchLastY = e.touches[0].clientY;

    // burst amount tuned down (was 0.014)
    addDistortionBurst(Math.abs(deltaY) * 0.008);
    const scaledDelta =
      -deltaY * config.touchSpeed * config.autoScroll.exaggeration;
    inputDelta += scaledDelta;
    addAutoScrollBoost(scaledDelta * 0.5);
    isScrolling = true;
  },
  { passive: false },
);

window.addEventListener("touchend", () => {
  const swipeVelocity = (touchLastY - touchStartY) * 0.005;

  if (Math.abs(swipeVelocity) > 0.5) {
    sharedMomentum = -swipeVelocity * config.touchMomentum;
    // burst amount tuned down (was 0.32)
    addDistortionBurst(Math.abs(swipeVelocity) * 0.18);
    addAutoScrollBoost(sharedMomentum * 2);
    isScrolling = true;
    setTimeout(() => (isScrolling = false), 800);
  }
});

canvas.style.cursor = "grab";

window.addEventListener("mousedown", (e) => {
  hideScrollHint();
  isDragging = true;
  dragStartY = e.clientY;
  dragDelta = 0;
  sharedMomentum = 0;
  canvas.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const deltaY = e.clientY - dragStartY;
  dragStartY = e.clientY;
  dragDelta = deltaY;

  // burst amount tuned down (was 0.014)
  addDistortionBurst(Math.abs(deltaY) * 0.008);
  const scaledDelta = -deltaY * config.dragSpeed * config.autoScroll.exaggeration;
  inputDelta += scaledDelta;
  addAutoScrollBoost(scaledDelta * 0.5);
  isScrolling = true;
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;

  isDragging = false;
  canvas.style.cursor = "grab";

  if (Math.abs(dragDelta) > 2) {
    sharedMomentum = -dragDelta * config.dragMomentum;
    // burst amount tuned down (was 0.0035)
    addDistortionBurst(Math.abs(dragDelta) * 0.002);
    addAutoScrollBoost(sharedMomentum * 2);
    isScrolling = true;
    setTimeout(() => (isScrolling = false), 800);
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  backgroundUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

  // reposition (but don't rebuild) columns to fit the new width
  const visibleWidth = getVisibleWidthAtZ0();
  const slotWidth = visibleWidth / config.numColumns;

  columns.forEach((col, c) => {
    const colX = -visibleWidth / 2 + slotWidth * (c + 0.5);
    col.x = colX;
    col.meshes.forEach((mesh) => (mesh.position.x = colX));
  });
});

// Pause background videos when the tab isn't visible, resume when it is —
// avoids burning battery/CPU decoding frames nobody can see.
document.addEventListener("visibilitychange", () => {
  videoElements.forEach((video) => {
    if (document.hidden) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  });
});

// --- "scroll to explore" hint --------------------------------------------
// A small, self-contained overlay (styles + markup injected here so this
// module stays a drop-in) that nudges the visitor to scroll. It fades in,
// holds briefly, fades out — then repeats every `repeatMs` as long as the
// user is idle. Any interaction fades it out immediately, but the cycle
// keeps ticking in the background so it can return later.
let scrollHintEl = null;
let scrollHintVisible = false;
let scrollHintHideTimeoutId = null;

function createScrollHint() {
  const style = document.createElement("style");
  style.textContent = `
    #gallery-scroll-hint {
      position: fixed;
      left: 50%;
      bottom: 34px;
      transform: translateX(-50%) translateY(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: none;
      z-index: 20;
      color: var(--paper, #f4ecd8);
      font-family: "Short Stack", cursive, sans-serif;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    #gallery-scroll-hint.is-visible {
      opacity: 0.85;
      transform: translateX(-50%) translateY(0);
    }
    #gallery-scroll-hint svg {
      width: 20px;
      height: 20px;
      animation: gallery-hint-bob 1.6s ease-in-out infinite;
    }
    @keyframes gallery-hint-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(6px); }
    }
  `;
  document.head.appendChild(style);

  scrollHintEl = document.createElement("div");
  scrollHintEl.id = "gallery-scroll-hint";
  scrollHintEl.innerHTML = `
    <span>Scroll</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7"/>
    </svg>
  `;
  document.body.appendChild(scrollHintEl);

  setTimeout(showScrollHint, 400); // first appearance shortly after load

  setInterval(() => {
    if (!isScrolling && !isDragging) showScrollHint();
  }, config.scrollHint.repeatMs);
}

function showScrollHint() {
  if (!scrollHintEl || scrollHintVisible) return;
  scrollHintVisible = true;
  scrollHintEl.classList.add("is-visible");
  clearTimeout(scrollHintHideTimeoutId);
  scrollHintHideTimeoutId = setTimeout(hideScrollHint, config.scrollHint.autoHideMs);
}

function hideScrollHint() {
  if (!scrollHintEl || !scrollHintVisible) return;
  scrollHintVisible = false;
  clearTimeout(scrollHintHideTimeoutId);
  scrollHintEl.classList.remove("is-visible");
}

function animate() {
  function frame(time) {
    requestAnimationFrame(frame);

    const deltaTime = lastFrameTime ? (time - lastFrameTime) / 1000 : 0.016;
    lastFrameTime = time;

    backgroundUniforms.uTime.value = time * 0.001;

    // advance shared momentum once per frame, then dispatch to each column
    if (isScrolling) {
      inputDelta += sharedMomentum;
      sharedMomentum *= config.momentumFriction;
      if (Math.abs(sharedMomentum) < config.momentumThreshold) sharedMomentum = 0;
    }

    // constant idle drift (auto-scroll) plus whatever "kick" a recent
    // interaction left behind — the kick decays back to zero on its own so
    // the drift returns to baseSpeed after the exaggeration settles.
    inputDelta += config.autoScroll.baseSpeed + autoScrollBoost;
    autoScrollBoost *= config.autoScroll.boostDecay;
    if (Math.abs(autoScrollBoost) < 0.001) autoScrollBoost = 0;

    let maxFrameDelta = 0;

    columns.forEach((col) => {
      col.scrollTarget += inputDelta * col.speed;
      const previous = col.scrollPosition;
      col.scrollPosition += (col.scrollTarget - col.scrollPosition) * config.smoothing;
      const frameDelta = col.scrollPosition - previous;
      if (Math.abs(frameDelta) > Math.abs(maxFrameDelta)) maxFrameDelta = frameDelta;
    });

    inputDelta = 0; // consumed this frame

    if (Math.abs(maxFrameDelta) > 0.00001) {
      directionTarget = maxFrameDelta > 0 ? 1 : -1;
    }

    scrollDirection += (directionTarget - scrollDirection) * 0.08;

    const velocity = Math.abs(maxFrameDelta) / deltaTime;

    velocityHistory.push(velocity);
    velocityHistory.shift();
    const averageVelocity =
      velocityHistory.reduce((a, b) => a + b) / velocityHistory.length;

    if (averageVelocity > velocityPeak) velocityPeak = averageVelocity;

    const isDecelerating =
      averageVelocity / (velocityPeak + 0.001) < 0.7 && velocityPeak > 0.5;
    velocityPeak *= 0.99;

    // velocity-driven distortion response
    if (velocity > 0.05)
      distortionTarget = Math.max(distortionTarget, Math.min(1, velocity * 0.055));
    if (isDecelerating || averageVelocity < 0.2)
      distortionTarget *= isDecelerating ? 0.95 : 0.855;

    distortionAmount +=
      (distortionTarget - distortionAmount) * config.distortionSmoothing;

    const signedDistortion = distortionAmount * scrollDirection;

    columns.forEach((col) => {
      col.meshes.forEach((mesh) => {
        const { offset } = mesh.userData;

        let y = offset - wrap(col.scrollPosition, col.loopLength);
        y = wrap(y + col.halfLoop, col.loopLength) - col.halfLoop;

        mesh.position.y = y;

        const meshHalfHeight = mesh.geometry.parameters.height / 2;
        if (Math.abs(y) < col.halfLoop + meshHalfHeight) {
          applyDistortion(mesh, y, config.distortionStrength * signedDistortion);
        }
      });
    });

    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(frame);
}

createScrollHint();
init();