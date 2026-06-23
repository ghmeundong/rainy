// TODO: physicsWorker.js에서 데이터를 메인 스레드로 postMessage할 때, ArrayBuffer를 복사하지 않고 소유권을 완전히 이전하도록 코드를 변경
// TODO: isMobile  모바일쪽 size 활용, 대신 count 갯수를 줄이기
// TODO: 해상도가 높아도 랜더링 비율 2로 고정


import './style.css';
import $ from 'jquery';
import { api } from './services/api.js';
import { buildAnimationConfig } from './services/animationConfig.js';

window.$ = window.jQuery = $;

// API 서비스 전역 노출 (콘솔에서 테스트 가능)
window.api = api;

const isMobile = window.matchMedia('(max-width: 900px)').matches;
const devicePixelRatio = window.devicePixelRatio || 1;
let animationBackendConfig = null;

async function getAnimationConfig(width, height) {
  if (animationBackendConfig) return animationBackendConfig;

  try {
    // Prefer local generation of the animation config for lower latency.
    try {
      animationBackendConfig = buildAnimationConfig({
        width,
        height,
        devicePixelRatio,
        isMobile,
      });
    } catch (localErr) {
      // Fallback to backend API if local generation fails for any reason
      try {
        animationBackendConfig = await api.animation.initBinary({
          width,
          height,
          devicePixelRatio,
          isMobile: isMobile ? 'true' : 'false',
        });
      } catch (e) {
        animationBackendConfig = await api.animation.init({
          width,
          height,
          devicePixelRatio,
          isMobile: isMobile ? 'true' : 'false',
        });
      }
    }
  } catch (error) {
    console.warn('Animation backend initialization failed:', error);
    animationBackendConfig = null;
  }

  return animationBackendConfig;
}

// 콘솔에서 사용 예시
// api.health()
// api.animation.init({ width: 1200, height: 600 })

const renderHooks = [];
let masterFrameId = null;
let gallerySceneInitialized = false;
let portraitSceneInitialized = false;
let bannerVisible = false;
let ripplesPluginLoaded = false;
let ripplesAvailable = false;

async function loadRipplesPlugin() {
  if (ripplesPluginLoaded) return ripplesAvailable;
  ripplesPluginLoaded = true;

  try {
    await import('jquery.ripples');
    ripplesAvailable = !!($.fn && $.fn.ripples);
  } catch (err) {
    console.warn('Failed to load jquery.ripples:', err && err.message);
    ripplesAvailable = false;
  }

  return ripplesAvailable;
}

function startMasterLoop() {
  if (masterFrameId !== null || document.hidden) return;
  masterFrameId = requestAnimationFrame(masterLoop);
}

function stopMasterLoop() {
  if (masterFrameId !== null) {
    cancelAnimationFrame(masterFrameId);
    masterFrameId = null;
  }
}

function masterLoop(timestamp) {
  renderHooks.forEach((hook) => hook(timestamp));
  masterFrameId = requestAnimationFrame(masterLoop);
}

function addRenderHook(fn) {
  if (!renderHooks.includes(fn)) {
    renderHooks.push(fn);
  }
  if (renderHooks.length > 0) startMasterLoop();
}

function removeRenderHook(fn) {
  const index = renderHooks.indexOf(fn);
  if (index !== -1) renderHooks.splice(index, 1);
  if (renderHooks.length === 0) stopMasterLoop();
}

function onVisibilityChange() {
  if (document.hidden) {
    stopMasterLoop();
  } else if (renderHooks.length > 0) {
    startMasterLoop();
  }
}

document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

// ==================== Three.js 3D Rain for Gallery Section ====================

async function initThreeScene() {
  const THREE = await import('three');
  const gallery3D = document.querySelector('.gallery');
  const galleryCanvas = gallery3D?.querySelector('.gallery-rain-canvas');

  if (!(gallery3D && galleryCanvas)) return;

  let rainFloor = -35;
  let rainCeil = 170;
  let rainCount = 420;
  let trailLength = 3;
  let splashCount = 60 ;
  let rainIntensity = 0.45;

  let animationBackendConfig = null;
  try {
    animationBackendConfig = await getAnimationConfig(gallery3D.clientWidth, gallery3D.clientHeight);

    rainFloor = animationBackendConfig.rainFloor ?? rainFloor;
    rainCeil = animationBackendConfig.rainCeil ?? rainCeil;
    rainCount = animationBackendConfig.rainCount ?? rainCount;
    trailLength = animationBackendConfig.trailLength ?? trailLength;
    splashCount = animationBackendConfig.splashCount ?? splashCount;
    rainIntensity = animationBackendConfig.rainIntensity ?? rainIntensity;
  } catch (error) {
    console.warn('Animation backend initialization failed:', error);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    gallery3D.clientWidth / gallery3D.clientHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ canvas: galleryCanvas, alpha: true });
  
  renderer.setSize(gallery3D.clientWidth, gallery3D.clientHeight);
  renderer.setClearColor(0x000000, 0);
  camera.position.z = 15;

  // Rain as line trails with history tracking
  const rainPositions = new Float32Array(rainCount * 3);
  const rainVelocities = new Float32Array(rainCount * 3);

  if (animationBackendConfig?.rainPositions && animationBackendConfig?.rainVelocities) {
    rainPositions.set(animationBackendConfig.rainPositions);
    rainVelocities.set(animationBackendConfig.rainVelocities);
  } else {
    for (let i = 0; i < rainCount; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = rainCeil - Math.random() * (rainCeil - rainFloor);
      const z = (Math.random() - 0.5) * 50;
      
      rainPositions[i * 3] = x;
      rainPositions[i * 3 + 1] = y;
      rainPositions[i * 3 + 2] = z;

      // Light drizzle fall speed with gentle drift
      rainVelocities[i * 3] = (Math.random() - 0.5) * 0.06; // weaker x drift
      rainVelocities[i * 3 + 1] = -0.45 - Math.random() * 0.25; // slower fall
      rainVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.015; // slight z
    }
  }

  // Start physics worker and initialize with copies of buffers
  let latestWorkerPositions = null;
  let physicsWorker = null;
  try {
    physicsWorker = new Worker(new URL('./workers/physicsWorker.js', import.meta.url), { type: 'module' });
    physicsWorker.postMessage({
      type: 'init',
      rainCount,
      rainPositions: rainPositions.slice(),
      rainVelocities: rainVelocities.slice(),
      rainFloor,
      rainCeil,
      gravity: 0.08,
    });

    physicsWorker.onmessage = (ev) => {
      const msg = ev.data;
      if (msg && msg.type === 'update' && msg.rainPositions) {
        // Structured-cloned Float32Array
        latestWorkerPositions = msg.rainPositions;
        const posAttr = rainGeometry.getAttribute('position');
        posAttr.array.set(latestWorkerPositions);
        posAttr.needsUpdate = true;
      }
    };
  } catch (err) {
    console.warn('Failed to start physics worker, falling back to main-thread physics', err);
    physicsWorker = null;
  }

  const rainTrails = Array.from({ length: rainCount }, (_, i) => {
    const x = rainPositions[i * 3];
    const y = rainPositions[i * 3 + 1];
    const z = rainPositions[i * 3 + 2];
    return Array.from({ length: trailLength }, () => ({ x, y, z }));
  });

  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(rainVelocities, 3));
  rainGeometry.setDrawRange(0, rainCount);

  // Shader-based points that stretch into streaks based on velocity (screen-space)
  const rainVertexShader = `
    attribute vec3 velocity;
    uniform float size;
    varying vec2 vVel;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      // velocity in view space
      vec3 velView = (modelViewMatrix * vec4(velocity, 0.0)).xyz;
      vVel = normalize(velView.xy);
      float len = length(velView);
      float pointSize = size * (300.0 / -mvPosition.z) * (0.6 + clamp(len * 0.6, 0.0, 2.0));
      gl_PointSize = pointSize;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const rainFragmentShader = `
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vVel;
    void main() {
      vec2 coord = gl_PointCoord * 2.0 - 1.0;
      vec2 dir = normalize(vVel);
      float perp = abs(dot(coord, vec2(-dir.y, dir.x)));
      float along = dot(coord, dir);
      float streak = smoothstep(0.04, 0.01, perp);
      float fade = smoothstep(1.0, 0.0, length(coord));
      float head = 1.0 - smoothstep(0.05, 0.5, along);
      float alpha = streak * fade * head;
      alpha *= opacity;
      gl_FragColor = vec4(color * vec3(1.0, 1.05, 1.2), alpha);
    }
  `;

  const rainMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0xddeeff) },
      size: { value: isMobile ? 6.5 : 14.0 },
      opacity: { value: 0.65 }
    },
    vertexShader: rainVertexShader,
    fragmentShader: rainFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const rainMesh = new THREE.Points(rainGeometry, rainMaterial);
  scene.add(rainMesh);

  // Create line segments for trails behind each raindrop
  const trailGeometry = new THREE.BufferGeometry();
  const maxTrailPositions = rainCount * trailLength * 3;
  const trailPositions = new Float32Array(maxTrailPositions);
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailColors = new Float32Array(maxTrailPositions);
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  
  const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    linewidth: 1,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    fog: false
  });

  const trailMesh = new THREE.LineSegments(trailGeometry, trailMaterial);
  scene.add(trailMesh);

  function updateRain() {
    const posAttr = rainGeometry.getAttribute('position');
    const posArray = posAttr.array;
    const trailAttr = trailGeometry.getAttribute('position');
    const trailArray = trailAttr.array;
    let trailIndex = 0;

    // Ask worker to advance physics (non-blocking)
    if (physicsWorker) {
      physicsWorker.postMessage({ type: 'step', dt: 1.0, intensity: rainIntensity });
    } else {
      // If no worker, fall back to main-thread physics update
      for (let i = 0; i < rainCount; i++) {
        posArray[i * 3 + 1] += rainVelocities[i * 3 + 1] * rainIntensity;
        posArray[i * 3] += rainVelocities[i * 3] * rainIntensity;
      }
    }

    const activeCount = Math.round(rainCount * Math.max(0.02, Math.pow(rainIntensity, 2.5)));
    rainGeometry.setDrawRange(0, activeCount);

    for (let i = 0; i < activeCount; i++) {
      const posX = posArray[i * 3];
      const posY = posArray[i * 3 + 1];
      const posZ = posArray[i * 3 + 2];

      rainTrails[i].unshift({ x: posX, y: posY, z: posZ });
      if (rainTrails[i].length > trailLength) rainTrails[i].pop();

      if (rainTrails[i].length > 1) {
        for (let t = 0; t < rainTrails[i].length - 1; t++) {
          const a = rainTrails[i][t];
          const b = rainTrails[i][t + 1];
          trailArray[trailIndex++] = a.x;
          trailArray[trailIndex++] = a.y;
          trailArray[trailIndex++] = a.z;
          trailArray[trailIndex++] = b.x;
          trailArray[trailIndex++] = b.y;
          trailArray[trailIndex++] = b.z;
          // color fade: head brighter, tail dimmer
          const fadeA = 1 - t / Math.max(1, rainTrails[i].length - 1);
          const fadeB = 1 - (t + 1) / Math.max(1, rainTrails[i].length - 1);
          const colorHead = 0.9 * fadeA + 0.1; // luminance
          const colorTail = 0.9 * fadeB + 0.1;
          const colorIndexA = (trailIndex / 3 - 2) * 3; // back-calc index for color array
          const colorIndexB = (trailIndex / 3 - 1) * 3;
          trailGeometry.getAttribute('color').array[colorIndexA] = 0.8 * colorHead;
          trailGeometry.getAttribute('color').array[colorIndexA + 1] = 0.9 * colorHead;
          trailGeometry.getAttribute('color').array[colorIndexA + 2] = 1.0 * colorHead;
          trailGeometry.getAttribute('color').array[colorIndexB] = 0.8 * colorTail;
          trailGeometry.getAttribute('color').array[colorIndexB + 1] = 0.9 * colorTail;
          trailGeometry.getAttribute('color').array[colorIndexB + 2] = 1.0 * colorTail;
        }
      }

      if (posY < rainFloor) {
        createSplash(posX, rainIntensity);
        posArray[i * 3 + 1] = rainCeil;
        posArray[i * 3] = (Math.random() - 0.5) * 100;
        rainTrails[i] = Array.from({ length: trailLength }, () => ({ x: posArray[i * 3], y: rainCeil, z: posArray[i * 3 + 2] }));
      }
    }

    posAttr.needsUpdate = true;
    trailAttr.needsUpdate = true;
    const trailColorAttr = trailGeometry.getAttribute('color');
    if (trailColorAttr) trailColorAttr.needsUpdate = true;
    trailGeometry.setDrawRange(0, trailIndex / 3);
  }

  // Splash particles for ground impact effect
  const splashPositions = new Float32Array(splashCount * 3);
  const splashVelocities = new Float32Array(splashCount * 3);
  const splashLifes = new Float32Array(splashCount);
  
  for (let i = 0; i < splashCount; i++) {
    splashPositions[i * 3] = 0;
    splashPositions[i * 3 + 1] = rainFloor + 2;
    splashPositions[i * 3 + 2] = 0;
    splashVelocities[i * 3] = 0;
    splashVelocities[i * 3 + 1] = 0;
    splashVelocities[i * 3 + 2] = 0;
    splashLifes[i] = 0;
  }

  const splashGeometry = new THREE.BufferGeometry();
  splashGeometry.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
  splashGeometry.setAttribute('velocity', new THREE.BufferAttribute(splashVelocities, 3));
  splashGeometry.setAttribute('life', new THREE.BufferAttribute(splashLifes, 1));

  const splashMaterial = new THREE.PointsMaterial({
    color: 0xddddff,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    fog: false
  });

  const splashParticles = new THREE.Points(splashGeometry, splashMaterial);
  scene.add(splashParticles);

  const splashPosAttribute = splashGeometry.getAttribute('position');
  const splashVelAttribute = splashGeometry.getAttribute('velocity');
  const splashLifeAttribute = splashGeometry.getAttribute('life');

  let nextSplashIndex = 0;

  function createSplash(x, intensity) {
    const splashNum = Math.floor(3 * intensity);
    for (let i = 0; i < splashNum; i++) {
      splashPosAttribute.array[nextSplashIndex * 3] = x + (Math.random() - 0.5) * 3;
      splashPosAttribute.array[nextSplashIndex * 3 + 1] = rainFloor + 2;
      splashPosAttribute.array[nextSplashIndex * 3 + 2] = (Math.random() - 0.5) * 5;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      splashVelAttribute.array[nextSplashIndex * 3] = Math.cos(angle) * speed;
      splashVelAttribute.array[nextSplashIndex * 3 + 1] = 1 + Math.random() * 1.5;
      splashVelAttribute.array[nextSplashIndex * 3 + 2] = Math.sin(angle) * speed;
      
      splashLifeAttribute.array[nextSplashIndex] = 1.0;
      nextSplashIndex = (nextSplashIndex + 1) % splashCount;
    }
    splashPosAttribute.needsUpdate = true;
    splashVelAttribute.needsUpdate = true;
    splashLifeAttribute.needsUpdate = true;
  }

  function animateFrame() {
    updateRain();

    const splashPos = splashPosAttribute.array;
    const splashVel = splashVelAttribute.array;
    const splashLife = splashLifeAttribute.array;

    for (let i = 0; i < splashCount; i++) {
      if (splashLife[i] > 0) {
        splashPos[i * 3] += splashVel[i * 3] * 0.05;
        splashPos[i * 3 + 1] += splashVel[i * 3 + 1] * 0.05;
        splashPos[i * 3 + 2] += splashVel[i * 3 + 2] * 0.05;
        splashVel[i * 3 + 1] -= 0.08; // gravity
        splashLife[i] -= 0.02;
      }
    }
    splashPosAttribute.needsUpdate = true;

    renderer.render(scene, camera);
  }

  let galleryRenderHook = null;
  let galleryVisible = false;
  let rainPausedByScroll = false;
  const galleryPauseThreshold = 0.98;

  const startGalleryLoop = () => {
    if (!galleryVisible || rainPausedByScroll || galleryRenderHook) return;
    galleryRenderHook = () => {
      if (document.hidden) return;
      animateFrame();
    };
    addRenderHook(galleryRenderHook);
  };

  const clearRainRender = () => {
    rainGeometry.setDrawRange(0, 0);
    trailGeometry.setDrawRange(0, 0);
    renderer.render(scene, camera);
  };

  const stopGalleryLoop = () => {
    if (!galleryRenderHook) return;
    removeRenderHook(galleryRenderHook);
    galleryRenderHook = null;
  };

  const updateRainIntensityByScroll = () => {
    const bannerEl = document.querySelector('.banner');
    const scrollY = window.scrollY || window.pageYOffset;
    const bannerBottom = bannerEl?.offsetTop + bannerEl?.offsetHeight || 0;
    const galleryStart = bannerBottom;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const maxScroll = documentHeight - windowHeight;
    const scrollFromGallery = Math.max(0, scrollY - galleryStart);
    const rainMaxScroll = Math.max(100, maxScroll - galleryStart);
    const scrollFraction = Math.min(1, Math.max(0, scrollFromGallery / rainMaxScroll));
    const rainFade = Math.max(0, 1 - Math.pow(scrollFraction, 3.5));

    rainIntensity = rainFade;
    rainMaterial.opacity = 0.65 * rainFade;
    trailMaterial.opacity = 0.35 * rainFade;
    splashMaterial.opacity = 0.45 * rainFade;

    const pauseRain = scrollFraction >= galleryPauseThreshold;
    if (pauseRain !== rainPausedByScroll) {
      rainPausedByScroll = pauseRain;
      if (rainPausedByScroll) {
        clearRainRender();
        stopGalleryLoop();
      } else {
        startGalleryLoop();
      }
    }
  };

  const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      galleryVisible = entry.intersectionRatio > 0;
      if (galleryVisible) {
        startGalleryLoop();
      } else {
        stopGalleryLoop();
      }
    });
  }, { threshold: 0.1 });
  galleryObserver.observe(gallery3D);

  // Sync canvas resize with gallery
  const galleryResizeObserver = new ResizeObserver(() => {
    const width = gallery3D.clientWidth;
    const height = gallery3D.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  galleryResizeObserver.observe(gallery3D);

  // Scroll-driven rain intensity
  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateRainIntensityByScroll);
  }, { passive: true });

  updateRainIntensityByScroll();
}

const gallerySection = document.querySelector('.gallery');
if (gallerySection) {
  const galleryInitObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0 && !gallerySceneInitialized) {
        gallerySceneInitialized = true;
        initThreeScene();
      }
    });
  }, { threshold: 0.01 });
  galleryInitObserver.observe(gallerySection);
}

// ==================== jQuery.ripples 효과 설정 ====================

const rippleBackgroundImage = `${import.meta.env.BASE_URL}img/egor-litvinov-rF1goYJuxbY-unsplash.jpg`;
const rainydayScriptUrl = `${import.meta.env.BASE_URL}js/rainyday.js`;

// 물결 효과 설정 매개변수 (WebGL 기반)
// `isMobile` 및 `devicePixelRatio`는 파일 상단에서 이미 선언되어 있습니다.
const rippleConfig = {
  resolution: isMobile ? 256 : 512,    // 텍스처 해상도 (크수록 정교함, 성능 ↓)
  dropRadius: isMobile ? 20 : 18,       // 물결 반경
  perturbance: 0.08,                    // 물결의 강도 (크수록 파동이 더 빠르게 보입니다)
  interactive: true,                    // 마우스/터치 인터랙션 활성화
  crossOrigin: ''                       // CORS 설정
};

// ==================== 초기화 ====================

$(document).ready(async function() {
  // 배너에 jQuery.ripples 효과 적용 (안전하게 초기화)
  ripplesAvailable = !!($.fn && $.fn.ripples);
  if (!ripplesAvailable) {
    ripplesAvailable = await loadRipplesPlugin();
  }

  if (ripplesAvailable) {
    try {
      $('.banner').ripples({
        imageUrl: rippleBackgroundImage,
        resolution: rippleConfig.resolution,
        dropRadius: rippleConfig.dropRadius,
        perturbance: rippleConfig.perturbance,
        interactive: rippleConfig.interactive,
        crossOrigin: rippleConfig.crossOrigin
      });
    } catch (err) {
      console.warn('jQuery.ripples init failed:', err && err.message);
      ripplesAvailable = false;
    }
  } else {
    console.warn('jQuery.ripples plugin not available; skipping ripples init.');
  }

  // ==================== 무중력 상태의 글자 물리 ====================
  const letters = document.querySelectorAll('.letter');
  const banner = $('.banner')[0];
  const bannerRect = banner.getBoundingClientRect();
  // Ensure webfonts and layout are ready before measuring letters to avoid offsetWidth === 0
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    // ignore
  }

  // Force a layout read to trigger browser measurement
  letters.forEach((l) => l.getBoundingClientRect());

  // Wait until letters have non-zero measurements (retry briefly if necessary)
  async function waitForLetterMeasurements(nodes, maxRetries = 8, delayMs = 50) {
    for (let i = 0; i < maxRetries; i++) {
      const ok = Array.from(nodes).every((n) => n.offsetWidth || n.getClientRects().length);
      if (ok) return true;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  }

  await waitForLetterMeasurements(letters);

  // 글자에서 ripple 효과 트리거
  letters.forEach((letter) => {
    letter.addEventListener('mouseenter', (e) => {
      const rect = banner.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (ripplesAvailable) $('.banner').ripples('drop', x, y, 25, 0.08);
    });

    letter.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const rect = banner.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      if (ripplesAvailable) $('.banner').ripples('drop', x, y, 25, 0.08);
    }, { passive: true });
  });

  // 마우스 위치
  let mouseX = 0;
  let mouseY = 0;
  let isOnBanner = false;
  let isTouchActive = false;
  let touchX = 0;
  let touchY = 0;
  
  banner.addEventListener('mouseenter', () => {
    isOnBanner = true;
  });
  
  banner.addEventListener('mouseleave', () => {
    isOnBanner = false;
  });
  
  banner.addEventListener('mousemove', (e) => {
    const rect = banner.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  // 터치 시작
  banner.addEventListener('touchstart', (e) => {
    isTouchActive = true;
    if (e.touches.length > 0) {
      const rect = banner.getBoundingClientRect();
      touchX = e.touches[0].clientX - rect.left;
      touchY = e.touches[0].clientY - rect.top;
    }
  }, { passive: true });

  // 터치 중 움직임 - 부드럽게 밀려나가기
  banner.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = banner.getBoundingClientRect();
      touchX = e.touches[0].clientX - rect.left;
      touchY = e.touches[0].clientY - rect.top;
    }
  }, { passive: true });
  
  // 각 글자의 물리 상태
  const letterVelocities = animationBackendConfig?.letterVelocities || [];
  const letterStates = Array.from(letters).map((_, index) => ({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    vx: letterVelocities[index]?.vx ?? (Math.random() - 0.5) * 0.8,
    vy: letterVelocities[index]?.vy ?? (Math.random() - 0.5) * 0.8,
  }));
  
  // 글자를 escampar 단어 형태로 정렬
  const totalWidth = Array.from(letters).reduce((sum, letter) => sum + letter.offsetWidth, 0) + (letters.length - 1) * 10;
  const baseX = (bannerRect.width - totalWidth) / 2;
  const baseY = bannerRect.height / 2;
  let offsetX = baseX;
  
  letters.forEach((letter, index) => {
    const width = letter.offsetWidth;
    const state = letterStates[index];
    state.x = offsetX + width / 2;
    state.y = baseY;
    offsetX += width + 10;
    letter.style.position = 'absolute';
    letter.style.left = `${state.x}px`;
    letter.style.top = `${state.y}px`;
  });
  
  // 물리 시뮬레이션 루프
  function animateLetters() {
    if (!bannerVisible || document.hidden) return;
    const rect = banner.getBoundingClientRect();
    
    letters.forEach((letter, index) => {
      const state = letterStates[index];
      
      const letterRadius = Math.max(letter.offsetWidth, letter.offsetHeight) * 0.55;
      const repulseRadius = letterRadius + 18;
      const currentX = isTouchActive ? touchX : mouseX;
      const currentY = isTouchActive ? touchY : mouseY;
      const shouldRepulse = isTouchActive || isOnBanner;

      if (shouldRepulse) {
        const dx = state.x - currentX;
        const dy = state.y - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < repulseRadius && distance > 1) {
          const forceStrength = isTouchActive ? 0.1 : 0.2;
          const force = (1 - distance / repulseRadius) * forceStrength;
          const angle = Math.atan2(dy, dx);
          
          state.vx += Math.cos(angle) * force;
          state.vy += Math.sin(angle) * force;
        }
      }
      
      letters.forEach((otherLetter, j) => {
        if (index === j) return;
        const other = letterStates[j];
        const dx = state.x - other.x;
        const dy = state.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (letter.offsetWidth + otherLetter.offsetWidth) * 0.55;
        
        if (distance < minDistance && distance > 0) {
          const overlap = minDistance - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          
          state.x += nx * overlap * 0.3;
          state.y += ny * overlap * 0.3;
          other.x -= nx * overlap * 0.3;
          other.y -= ny * overlap * 0.3;
          
          const relVx = state.vx - other.vx;
          const relVy = state.vy - other.vy;
          const bounce = relVx * nx + relVy * ny;
          if (bounce < 0) {
            const impulse = -bounce * 0.2;
            state.vx += nx * impulse;
            state.vy += ny * impulse;
            other.vx -= nx * impulse;
            other.vy -= ny * impulse;
          }
        }
      });
      
      // Add viscous drag for sticky movement.
      const dragFactor = 0.92;
      const stiffness = 0.03;
      const targetX = state.tx || state.x;
      const targetY = state.ty || state.y;
      state.vx += (targetX - state.x) * stiffness;
      state.vy += (targetY - state.y) * stiffness;
      state.vx += (Math.random() - 0.5) * 0.015;
      state.vy += (Math.random() - 0.5) * 0.015;
      state.vx *= dragFactor;
      state.vy *= dragFactor;
      state.x += state.vx;
      state.y += state.vy;
      state.x = Math.max(25, Math.min(rect.width - 25, state.x));
      state.y = Math.max(25, Math.min(rect.height - 25, state.y));
      letter.style.left = `${state.x}px`;
      letter.style.top = `${state.y}px`;
    });
  }

  const bannerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      bannerVisible = entry.isIntersecting;
    });
  }, { threshold: 0 });
  bannerObserver.observe(banner);

  // Initialize banner visibility immediately so letter physics can start without waiting.
  const bannerRectInit = banner.getBoundingClientRect();
  bannerVisible = !document.hidden && bannerRectInit.width > 0 && bannerRectInit.height > 0;

  addRenderHook(() => animateLetters());

  // 모바일에서 히어로 화면을 처음 고정하고 더블 탭으로 해제
  const mobileLockMedia = window.matchMedia('(max-width: 900px)');
  let heroLocked = mobileLockMedia.matches;
  let lastTap = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  const doubleTapDelay = 300;
  const doubleTapDistance = 50;

  function updateHeroLockState() {
    if (heroLocked) {
      document.documentElement.classList.add('hero-locked');
      document.body.classList.add('hero-locked');
      banner.classList.add('hero-fixed');
    } else {
      document.documentElement.classList.remove('hero-locked');
      document.body.classList.remove('hero-locked');
      banner.classList.remove('hero-fixed');
    }
  }

  updateHeroLockState();

  mobileLockMedia.addEventListener?.('change', (event) => {
    if (!event.matches) {
      heroLocked = false;
      updateHeroLockState();
    }
  });

  banner.addEventListener('touchend', (event) => {
    isTouchActive = false;
    
    if (!heroLocked) return;
    
    const now = Date.now();
    const touch = event.changedTouches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const timeDiff = now - lastTap;
    const distX = Math.abs(currentX - lastTapX);
    const distY = Math.abs(currentY - lastTapY);

    if (timeDiff < doubleTapDelay && distX < doubleTapDistance && distY < doubleTapDistance) {
      // 더블 탭 감지
      heroLocked = false;
      updateHeroLockState();
      lastTap = 0;
    } else {
      lastTap = now;
      lastTapX = currentX;
      lastTapY = currentY;
    }
  }, { passive: false });

  // ------------------- Mouse rainbow overlay -------------------
  const rainbowEl = document.createElement('div');
  rainbowEl.className = 'mouse-rainbow';
  document.body.appendChild(rainbowEl);

  let rrX = window.innerWidth / 2;
  let rrY = window.innerHeight / 2;
  let rafId = null;

  function updateRainbowBackground(x, y) {
    // vivid rainbow radial gradient centered at pointer
    const colors = [
      'rgba(255,0,0,0.20) 0%',
      'rgba(255,127,0,0.18) 12%',
      'rgba(255,255,0,0.16) 24%',
      'rgba(0,255,0,0.14) 36%',
      'rgba(0,128,255,0.12) 52%',
      'rgba(75,0,130,0.10) 68%',
      'rgba(148,0,211,0.08) 84%',
      'transparent 100%'
    ].join(', ');

    // If pointer is over the hero banner, hide the rainbow overlay
    if (bannerEl) {
      const bRect = bannerEl.getBoundingClientRect();
      if (y <= bRect.bottom) {
        rainbowEl.style.opacity = '0';
        return;
      }
    }

    rainbowEl.style.background = `radial-gradient(circle at ${x}px ${y}px, ${colors})`;
    // ensure opacity matches device (stronger when visible)
    rainbowEl.style.opacity = isMobile ? '0.28' : '0.45';
  }

  function scheduleRainbow(x, y) {
    rrX = x; rrY = y;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      updateRainbowBackground(rrX, rrY);
      rafId = null;
    });
  }

  document.addEventListener('mousemove', (e) => {
    scheduleRainbow(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    scheduleRainbow(t.clientX, t.clientY);
  }, { passive: true });

  // ------------------- Scroll-driven background transition -------------------
  const root = document.documentElement;
  const getCssVar = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;

  function hexToRgb(hex) {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const num = parseInt(hex,16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function rgbToHex(r,g,b){
    const toHex = (v) => ('0'+Math.round(v).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function lerp(a,b,t){ return a + (b-a)*t; }

  function lerpColor(hexA, hexB, t){
    const a = hexToRgb(hexA.replace(/\s/g,''));
    const b = hexToRgb(hexB.replace(/\s/g,''));
    const r = lerp(a[0], b[0], t);
    const g = lerp(a[1], b[1], t);
    const bl = lerp(a[2], b[2], t);
    return rgbToHex(r,g,bl);
  }

  const dawn = getCssVar('--bg-dawn', '#a6c8ff');
  const sunrise = getCssVar('--bg-sunrise', '#ffd9a8');
  const bannerEl = document.querySelector('.banner');

  function updateBackgroundByScroll(){
    if (!bannerEl) return;
    const scrollY = window.scrollY || window.pageYOffset;
    const start = bannerEl.offsetTop + bannerEl.offsetHeight; // begin after hero
    const end = Math.max(start + 1, document.body.scrollHeight - window.innerHeight); // page end range
    const t = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
    const color = lerpColor(dawn, sunrise, t);
    root.style.setProperty('--bg-color', color);
  }

  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateBackgroundByScroll);
  }, { passive: true });

  // init
  updateBackgroundByScroll();
  
  // ------------------- RainyDay.js for left portrait (with fallback) -------------------
  const leftPortrait = document.getElementById('left-portrait');
  if (leftPortrait) {
    const leftImg = leftPortrait.querySelector('img');
    const leftCanvas = leftPortrait.querySelector('.rainy-canvas');
    let rainEngine = null;
    let fallbackRaf = null;
    let fallbackActive = true;
    let portraitVisible = true;
    let portraitLoaded = leftImg?.complete || false;
    let fallbackLoopFn = null;
    let resizeSyncTimeout = null;

    function syncRainCanvasSize() {
      if (!leftImg || !leftCanvas) return;
      const DPR = window.devicePixelRatio || 1;
      const imgW = Math.max(1, leftImg.clientWidth);
      const imgH = Math.max(1, leftImg.clientHeight);
      leftCanvas.style.width = imgW + 'px';
      leftCanvas.style.height = imgH + 'px';
      leftCanvas.width = Math.round(imgW * DPR);
      leftCanvas.height = Math.round(imgH * DPR);
      const ctx = leftCanvas.getContext('2d');
      if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (rainEngine && typeof rainEngine.checkSize === 'function') {
        rainEngine.checkSize();
      }
    }

    function debouncedSyncRainCanvasSize() {
      clearTimeout(resizeSyncTimeout);
      resizeSyncTimeout = setTimeout(syncRainCanvasSize, 120);
    }

    const leftImgResizeObserver = new ResizeObserver(() => debouncedSyncRainCanvasSize());
    if (leftImg) leftImgResizeObserver.observe(leftImg);

    window.addEventListener('resize', debouncedSyncRainCanvasSize, { passive: true });

    function setRainyActive(active) {
      fallbackActive = active;
      if (rainEngine) {
        if (active) {
          rainEngine.resume?.();
        } else {
          rainEngine.pause?.();
        }
      }
      if (fallbackLoopFn) {
        if (active) {
          addRenderHook(fallbackLoopFn);
        } else {
          removeRenderHook(fallbackLoopFn);
        }
      }
    }

    const portraitObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        portraitVisible = entry.intersectionRatio > 0;
        setRainyActive(portraitVisible && document.visibilityState === 'visible');
      });
    }, { threshold: 0.01 });
    portraitObserver.observe(leftPortrait);

    document.addEventListener('visibilitychange', () => {
      setRainyActive(portraitVisible && document.visibilityState === 'visible');
    });

    function loadScript(url) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = () => resolve(url);
        s.onerror = () => reject(new Error('Failed to load ' + url));
        document.head.appendChild(s);
      });
    }

    async function initRainy() {
      // ensure canvas element exists and is sized to image before library init
      try {
        const DPR = window.devicePixelRatio || 1;
        const imgW = Math.max(1, leftImg.clientWidth);
        const imgH = Math.max(1, leftImg.clientHeight);
        // set CSS size
        leftCanvas.style.width = imgW + 'px';
        leftCanvas.style.height = imgH + 'px';
        // set backing store size for clarity
        leftCanvas.width = Math.round(imgW * DPR);
        leftCanvas.height = Math.round(imgH * DPR);
        leftCanvas.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
        leftCanvas.style.display = 'block';
      } catch (e) {
        console.warn('[rainy] canvas sizing failed', e && e.message);
      }
      // If the local rainyday.js is not already loaded, load the local fallback from public/js.
      if (!window.RainyDay && !window.rainyday && !window.Rainyday) {
        const cdns = [
          rainydayScriptUrl,
          'https://cdnjs.cloudflare.com/ajax/libs/rainyday/0.1.0/rainyday.min.js',
          'https://cdn.jsdelivr.net/npm/rainydayjs@0.0.1/rainyday.min.js',
          'https://unpkg.com/rainydayjs@latest/dist/rainyday.min.js'
        ];

        for (const url of cdns) {
          try {
            // try loading candidate script; ignore failures
            // eslint-disable-next-line no-await-in-loop
            await loadScript(url);
            break;
          } catch (e) {
            console.warn(e && e.message);
          }
        }
      }

      // If a RainyDay constructor exists, try to initialize it.
      const Rainy = window.RainyDay || window.rainyday || window.Rainyday;
      if (Rainy) {
        try {
          let engine = null;
          // Try common constructor patterns
          try {
            // Provide high-resolution canvas sizes to RainyDay to reduce pixelation
            const DPR = window.devicePixelRatio || 1;
            const imgW = Math.max(1, leftImg.clientWidth);
            const imgH = Math.max(1, leftImg.clientHeight);
            const hardwareConcurrency = navigator.hardwareConcurrency || 4;
            const lowPerf = hardwareConcurrency < 4 || DPR > 2.5 || (isMobile && hardwareConcurrency <= 2);
            const targetRDFps = isMobile ? (lowPerf ? 12 : 18) : (lowPerf ? 14 : 20);
            syncRainCanvasSize();
            const rdOptions = {
              image: leftImg,
              canvas: leftCanvas,
              opacity: 0.9,
              blur: 6,
              enableSizeChange: true,
              fps: targetRDFps,
              // give the library physical pixel dimensions so it creates high-res buffers
              width: Math.round(imgW * DPR),
              height: Math.round(imgH * DPR),
              position: 'absolute',
              top: (leftPortrait.getBoundingClientRect().top + window.pageYOffset) + 'px',
              left: (leftPortrait.getBoundingClientRect().left + window.pageXOffset) + 'px'
            };
            // ensure canvas is passed as DOM element when available
            rdOptions.canvas = leftCanvas;
            engine = new Rainy(rdOptions);
          } catch (err) {
            try { engine = new Rainy(leftImg, leftCanvas); } catch (err2) { engine = null; }
          }

          if (engine) {
            rainEngine = engine;
            try {
              // Tweak options so drops are smaller and will flow (lower gravity threshold)
              try { engine.options = engine.options || {}; } catch (e) { engine.options = {}; }
              engine.options.gravityThreshold = 1; // small drops will be treated as flowing
              engine.options.opacity = 0.75;
              engine.options.blur = 6;
              engine.options.enableCollisions = false; // smooth flowing
              // prefer the DROPS trail behaviour
              try { engine.trail = engine.TRAIL_DROPS; } catch (e) {}

              if (typeof engine.rain === 'function') {
                // presets: [baseRadius, variance, probability]
                // use small base radius and small variance for fine drops
                // increase interval to reduce CPU load (longer for lowPerf)
                const rainInterval = false ? 120 : 60;
                engine.rain([[1, 2, 0.9]], rainInterval);
              } else if (typeof engine.makeRain === 'function') {
                engine.makeRain();
              }
            } catch (e) {
              console.warn('RainyDay engine ran into an error', e);
            }
          }
        } catch (e) {
          console.warn('RainyDay init failed', e && e.message);
        }
      } else {
        // Fallback: simple canvas raindrops effect
        (function simpleRain(canvas, img) {
          if (!canvas || !img) return;
          const ctx = canvas.getContext('2d');
          const DPR = window.devicePixelRatio || 1;
          const hardwareConcurrency = navigator.hardwareConcurrency || 4;
          const lowPerf = hardwareConcurrency < 4 || DPR > 2.5 || (isMobile && hardwareConcurrency <= 2);

          const drops = [];
          const maxDrops = lowPerf ? 40 : 100;
          const spawnInterval = lowPerf ? 240 : 120; // ms
          let previousWidth = Math.max(1, img.clientWidth);
          let previousHeight = Math.max(1, img.clientHeight);
          let resizeTimeout = null;

          function resize() {
            const newWidth = Math.max(1, img.clientWidth);
            const newHeight = Math.max(1, img.clientHeight);
            const widthScale = newWidth / previousWidth;
            const heightScale = newHeight / previousHeight;
            if (drops.length && (widthScale !== 1 || heightScale !== 1)) {
              drops.forEach((d) => {
                d.x = d.x * widthScale;
                d.y = d.y * heightScale;
                d.vx = d.vx * widthScale;
                d.vy = d.vy * heightScale;
                d.r = d.r * Math.sqrt(widthScale * heightScale);
                d.x = Math.min(Math.max(d.x, 0), newWidth);
                d.y = Math.min(Math.max(d.y, 0), newHeight);
              });
            }
            previousWidth = newWidth;
            previousHeight = newHeight;
            canvas.width = Math.round(newWidth * DPR);
            canvas.height = Math.round(newHeight * DPR);
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          }

          function debouncedResize() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resize, 150);
          }

          window.addEventListener('resize', debouncedResize, { passive: true });
          const fallbackImgObserver = new ResizeObserver(debouncedResize);
          if (img) fallbackImgObserver.observe(img);
          resize();

          function addDrop() {
            const cssW = Math.max(1, canvas.clientWidth || img.clientWidth);
            drops.push({
              x: Math.random() * cssW,
              y: -6 - Math.random() * 10,
              vx: (Math.random() - 0.5) * 0.3,
              vy: 1.5 + Math.random() * 1.6,
              r: 0.8 + Math.random() * 1.6
            });
          }

          let lastAdd = 0;
          let lastFrameTime = 0;
          const frameInterval = 1000 / (lowPerf ? 20 : 30); // target fps for fallback
          let cleanupInterval = null;

          function loop(t) {
            if ((!lastAdd || t - lastAdd > spawnInterval) && drops.length < maxDrops) {
              addDrop();
              lastAdd = t;
            }
            const lw = canvas.width / DPR;
            const lh = canvas.height / DPR;
            ctx.clearRect(0, 0, lw, lh);
            for (let i = drops.length - 1; i >= 0; i--) {
              const d = drops[i];
              d.x += d.vx;
              d.y += d.vy;
              d.vy += 0.045; // gravity
              ctx.beginPath();
              const alpha = Math.max(0, 0.22 - (d.y / lh) * 0.14);
              ctx.fillStyle = `rgba(255,255,255,${alpha})`;
              ctx.ellipse(d.x, d.y, d.r, d.r * 1.3, 0, 0, Math.PI * 2);
              ctx.fill();
              const streakLen = Math.min(12, 3 + d.vy * 4);
              ctx.beginPath();
              ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.06})`;
              ctx.lineWidth = Math.max(0.5, d.r * 0.5);
              ctx.moveTo(d.x, d.y - d.vy * 0.5);
              ctx.lineTo(d.x + d.vx * streakLen, d.y + streakLen);
              ctx.stroke();
              if (d.y > lh + 30 || d.x < -30 || d.x > lw + 30) drops.splice(i, 1);
            }
          }

          function renderLoop(t) {
            if (!fallbackActive) return;
            if (!lastFrameTime) lastFrameTime = t;
            const elapsed = t - lastFrameTime;
            if (elapsed >= frameInterval) {
              loop(t);
              lastFrameTime = t - (elapsed % frameInterval);
            }
          }

          fallbackLoopFn = renderLoop;
          if (fallbackActive) {
            addRenderHook(fallbackLoopFn);
          }
        }(leftCanvas, leftImg));
      }
    }

    if (!portraitLoaded && leftImg) {
      leftImg.addEventListener('load', () => {
        portraitLoaded = true;
      }, { once: true });
    }

    const portraitInitObserver = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.intersectionRatio > 0 && !portraitSceneInitialized) {
          portraitSceneInitialized = true;
          if (portraitLoaded) {
            await initRainy();
          } else if (leftImg) {
            leftImg.addEventListener('load', initRainy, { once: true });
          }
        }
      });
    }, { threshold: 0.01 });
    portraitInitObserver.observe(leftPortrait);
  }
});

// Scroll-down button behavior: tap to scroll down a bit (mobile)
document.addEventListener('DOMContentLoaded', () => {
  const scrollBtn = document.querySelector('.double-tap-hint .scroll-down');
  if (!scrollBtn) return;
  scrollBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // small smooth scroll down (60% of viewport)
    const amount = Math.round(window.innerHeight * 0.6);
    window.scrollBy({ top: amount, left: 0, behavior: 'smooth' });
  }, { passive: true });
});
