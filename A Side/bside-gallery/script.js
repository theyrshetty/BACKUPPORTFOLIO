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
];

const config = {
  gap: 0.02,
  smoothing: 0.05,
  distortionStrength: 0.75,
  distortionSmoothing: 0.09,
  momentumFriction: 0.95,
  momentumThreshold: 0.001,
  wheelSpeed: 0.01,
  wheelMax: 150,
  dragSpeed: 0.01,
  dragMomentum: 0.01,
  touchSpeed: 0.01,
  touchMomentum: 0.1,
  numColumns: 3,
  columnFillRatio: 0.82,
  edgeColumnsHorizontalOnly: true,
  centerColumnVerticalOnly: true,
  horizontalAspectThreshold: 1.0,
  columnBehavior: [
    { speed: 1, phase: 0 },
    { speed: -0.8, phase: 0.33 },
    { speed: 1.2, phase: 0.66 },
  ],
  autoScroll: {
    baseSpeed: 0.01,
    exaggeration: 1.3,
    boostDecay: 0.94,
    maxBoost: 0.4,
  },
};

const canvas = document.querySelector("canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

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

      vec3 core = vec3(0.11, 0.11, 0.13);
      vec3 mid  = vec3(0.08, 0.08, 0.09);
      vec3 edge = vec3(0.02, 0.02, 0.03);

      float t1 = smoothstep(0.0, 0.55, dist);
      float t2 = smoothstep(0.35, 1.05, dist);

      vec3 color = mix(core, mid, t1);
      color = mix(color, edge, t2);

      float glow = 0.018 * sin(uTime * 0.25);
      color += glow * (1.0 - dist);

      float grain = hash(uv * uResolution.xy * 0.5 + mod(uTime * 60.0, 1000.0));
      color += (grain - 0.5) * 0.025;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

const backgroundScene = new THREE.Scene();
const backgroundCamera = new THREE.Camera();
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

const textureLoader = new THREE.TextureLoader();
const videoElements = [];

function loadImageTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, resolve, undefined, reject);
  });
}

function loadSlideTexture(slide) {
  return loadImageTexture(slide.img);
}

function getMediaSize(tex) {
  const media = tex.image;
  return { width: media.width, height: media.height };
}

function isHorizontalTexture(tex) {
  const { width, height } = getMediaSize(tex);
  return width / height > config.horizontalAspectThreshold;
}

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

const columns = [];

async function init() {
  const textures = await Promise.all(slides.map(loadSlideTexture));

  const visibleWidth = getVisibleWidthAtZ0();
  const slotWidth = visibleWidth / config.numColumns;
  const targetWidth = slotWidth * config.columnFillRatio;

  const allIndices = slides.map((_, i) => i);
  const horizontalIndices = allIndices.filter((i) => isHorizontalTexture(textures[i]));
  const verticalIndices = allIndices.filter((i) => !isHorizontalTexture(textures[i]));

  const edgeColumnIndices = new Set(config.numColumns > 1 ? [0, config.numColumns - 1] : []);
  const isCenterColumn = (c) => !edgeColumnIndices.has(c);

  for (let c = 0; c < config.numColumns; c++) {
    const behavior = config.columnBehavior[c] || { speed: 1, phase: 0 };
    const colX = -visibleWidth / 2 + slotWidth * (c + 0.5);

    const isEdgeColumn = config.edgeColumnsHorizontalOnly && edgeColumnIndices.has(c);
    const isCenterOnlyVertical = config.centerColumnVerticalOnly && isCenterColumn(c);

    let columnIndices = allIndices;

    if (isEdgeColumn) {
      columnIndices = horizontalIndices;
    } else if (isCenterOnlyVertical) {
      columnIndices = verticalIndices;
    }

    if (columnIndices.length === 0) {
      columnIndices = allIndices;
    }

    const { heights, offsets, loopLength, halfLoop } = computeColumnLayout(columnIndices, textures, targetWidth);
    const meshes = [];

    columnIndices.forEach((slideIndex, idx) => {
      const width = targetWidth;
      const height = heights[idx];
      const sourceTexture = textures[slideIndex];
      const texture = sourceTexture.clone();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const geometry = new THREE.PlaneGeometry(width, height, 32, 16);
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: texture, color: 0xffffff });
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

let inputDelta = 0;
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
let autoScrollBoost = 0;

const addDistortionBurst = (amount) => {
  distortionTarget = Math.min(1, distortionTarget + amount);
};

const addAutoScrollBoost = (signedAmount) => {
  const { maxBoost } = config.autoScroll;
  autoScrollBoost = Math.sign(signedAmount || autoScrollBoost) * Math.min(maxBoost, Math.abs(autoScrollBoost) + Math.abs(signedAmount));
};

window.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rawDelta = e.deltaY;
  const clampedDelta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), config.wheelMax);

  addDistortionBurst(Math.abs(clampedDelta) * 0.00055);
  const scaledDelta = clampedDelta * config.wheelSpeed * config.autoScroll.exaggeration;
  inputDelta += scaledDelta;
  addAutoScrollBoost(scaledDelta * 0.5);
  isScrolling = true;
}, { passive: false });

window.addEventListener("touchstart", (e) => {
  touchStartY = touchLastY = e.touches[0].clientY;
  isScrolling = false;
  sharedMomentum = 0;
}, { passive: false });

window.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const deltaY = e.touches[0].clientY - touchLastY;
  touchLastY = e.touches[0].clientY;

  addDistortionBurst(Math.abs(deltaY) * 0.008);
  const scaledDelta = -deltaY * config.touchSpeed * config.autoScroll.exaggeration;
  inputDelta += scaledDelta;
  addAutoScrollBoost(scaledDelta * 0.5);
  isScrolling = true;
}, { passive: false });

window.addEventListener("touchend", () => {
  const swipeVelocity = (touchLastY - touchStartY) * 0.005;

  if (Math.abs(swipeVelocity) > 0.5) {
    sharedMomentum = -swipeVelocity * config.touchMomentum;
    addDistortionBurst(Math.abs(swipeVelocity) * 0.18);
    addAutoScrollBoost(sharedMomentum * 2);
    isScrolling = true;
  }
});

canvas.style.cursor = "grab";

window.addEventListener("mousedown", (e) => {
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
    addDistortionBurst(Math.abs(dragDelta) * 0.002);
    addAutoScrollBoost(sharedMomentum * 2);
    isScrolling = true;
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  backgroundUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

  const visibleWidth = getVisibleWidthAtZ0();
  const slotWidth = visibleWidth / config.numColumns;

  columns.forEach((col, c) => {
    const colX = -visibleWidth / 2 + slotWidth * (c + 0.5);
    col.x = colX;
    col.meshes.forEach((mesh) => (mesh.position.x = colX));
  });
});

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

  setTimeout(showScrollHint, 400);

  setInterval(() => {
    if (!isScrolling && !isDragging) showScrollHint();
  }, 10000);
}

function showScrollHint() {
  if (!scrollHintEl || scrollHintVisible) return;
  scrollHintVisible = true;
  scrollHintEl.classList.add("is-visible");
  clearTimeout(scrollHintHideTimeoutId);
  scrollHintHideTimeoutId = setTimeout(hideScrollHint, 3000);
}

function hideScrollHint() {
  if (!scrollHintEl || !scrollHintVisible) return;
  scrollHintVisible = false;
  clearTimeout(scrollHintHideTimeoutId);
  scrollHintEl.classList.remove("is-visible");
}

createScrollHint();

function animate() {
  function frame(time) {
    requestAnimationFrame(frame);

    const deltaTime = lastFrameTime ? (time - lastFrameTime) / 1000 : 0.016;
    lastFrameTime = time;

    backgroundUniforms.uTime.value = time * 0.001;

    if (isScrolling) {
      inputDelta += sharedMomentum;
      sharedMomentum *= config.momentumFriction;
      if (Math.abs(sharedMomentum) < config.momentumThreshold) sharedMomentum = 0;
    }

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

    inputDelta = 0;

    if (Math.abs(maxFrameDelta) > 0.00001) {
      directionTarget = maxFrameDelta > 0 ? 1 : -1;
    }

    scrollDirection += (directionTarget - scrollDirection) * 0.08;

    const velocity = Math.abs(maxFrameDelta) / deltaTime;
    velocityHistory.push(velocity);
    velocityHistory.shift();
    const averageVelocity = velocityHistory.reduce((a, b) => a + b) / velocityHistory.length;

    if (averageVelocity > velocityPeak) velocityPeak = averageVelocity;

    const isDecelerating = averageVelocity / (velocityPeak + 0.001) < 0.7 && velocityPeak > 0.5;
    velocityPeak *= 0.99;

    if (velocity > 0.05) distortionTarget = Math.max(distortionTarget, Math.min(1, velocity * 0.055));
    if (isDecelerating || averageVelocity < 0.2) distortionTarget *= isDecelerating ? 0.95 : 0.855;

    distortionAmount += (distortionTarget - distortionAmount) * config.distortionSmoothing;
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

init();
