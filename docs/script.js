// ==================== jQuery.ripples 효과 설정 ====================

// 물결 효과 설정 매개변수 (WebGL 기반)
const isMobile = window.matchMedia('(max-width: 900px)').matches;
const devicePixelRatio = window.devicePixelRatio || 1;
const rippleConfig = {
  resolution: isMobile ? 256 : 512,    // 텍스처 해상도 (크수록 정교함, 성능 ↓)
  dropRadius: isMobile ? 20 : 18,       // 물결 반경
  perturbance: 0.08,                    // 물결의 강도 (크수록 파동이 더 빠르게 보입니다)
  interactive: true,                    // 마우스/터치 인터랙션 활성화
  crossOrigin: ''                       // CORS 설정
};

// ==================== 초기화 ====================

$(document).ready(function() {
  // 배너에 jQuery.ripples 효과 적용 (안전하게 초기화)
  let ripplesAvailable = !!($.fn && $.fn.ripples);
  if (ripplesAvailable) {
    try {
      $('.banner').ripples({
        imageUrl: 'assets/img/egor-litvinov-rF1goYJuxbY-unsplash.jpg',
        resolution: rippleConfig.resolution,
        dropRadius: rippleConfig.dropRadius,
        perturbance: rippleConfig.perturbance,
        interactive: rippleConfig.interactive,
        crossOrigin: rippleConfig.crossOrigin
      });
    } catch (err) {
      // ripples failed (e.g., WebGL not available) — disable gracefully
      console.warn('jQuery.ripples init failed:', err && err.message);
      ripplesAvailable = false;
    }
  } else {
    console.warn('jQuery.ripples plugin not found — skipping ripples init.');
  }

  // ==================== 무중력 상태의 글자 물리 ====================
  const letters = document.querySelectorAll('.letter');
  const banner = $('.banner')[0];
  const bannerRect = banner.getBoundingClientRect();
  
  // 글자에서 ripple 효과 트리거
  letters.forEach((letter) => {
    letter.addEventListener('mouseenter', (e) => {
      const rect = banner.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (ripplesAvailable) $('.banner').ripples('showDrop', x, y, 25, 0.08);
    });

    letter.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const rect = banner.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      if (ripplesAvailable) $('.banner').ripples('showDrop', x, y, 25, 0.08);
    }, { passive: true });
  });

  // 마우스 위치
  let mouseX = 0;
  let mouseY = 0;
  let isOnBanner = false;
  
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
  
  // 각 글자의 물리 상태
  const letterStates = Array.from(letters).map(() => ({
    x: 0,
    y: 0,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8
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
    const rect = banner.getBoundingClientRect();
    
    letters.forEach((letter, index) => {
      const state = letterStates[index];
      
      // 글자 크기 기반 히트박스 반경 계산
      const letterRadius = Math.max(letter.offsetWidth, letter.offsetHeight) * 0.55;
      const repulseRadius = letterRadius + 18;

      // 마우스 피하기
      if (isOnBanner) {
        const dx = state.x - mouseX;
        const dy = state.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < repulseRadius && distance > 1) {
          const force = (1 - distance / repulseRadius) * 0.4; // 물이 밀어내는 느낌
          const angle = Math.atan2(dy, dx);
          
          state.vx += Math.cos(angle) * force;
          state.vy += Math.sin(angle) * force;
        }
      }
      
      // 글자 간 딱딱한 충돌 처리
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
          
          state.x += nx * overlap * 0.5;
          state.y += ny * overlap * 0.5;
          other.x -= nx * overlap * 0.5;
          other.y -= ny * overlap * 0.5;
          
          const relVx = state.vx - other.vx;
          const relVy = state.vy - other.vy;
          const bounce = relVx * nx + relVy * ny;
          if (bounce < 0) {
            const impulse = -bounce * 0.4;
            state.vx += nx * impulse;
            state.vy += ny * impulse;
            other.vx -= nx * impulse;
            other.vy -= ny * impulse;
          }
        }
      });
      
      // 무작위 부유 움직임 추가
      state.vx += (Math.random() - 0.5) * 0.015;
      state.vy += (Math.random() - 0.5) * 0.015;
      
      // 마찰
      state.vx *= 0.98;
      state.vy *= 0.98;
      
      // 속도 적용
      state.x += state.vx;
      state.y += state.vy;
      
      // 배너 전체 범위 내로 제한
      state.x = Math.max(25, Math.min(rect.width - 25, state.x));
      state.y = Math.max(25, Math.min(rect.height - 25, state.y));
      
      // 위치 적용
      letter.style.left = `${state.x}px`;
      letter.style.top = `${state.y}px`;
    });
    
    requestAnimationFrame(animateLetters);
  }
  
  animateLetters();

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
    let fallbackLoopFn = null;

    function setRainyActive(active) {
      fallbackActive = active;
      if (rainEngine) {
        if (active) {
          rainEngine.resume?.();
        } else {
          rainEngine.pause?.();
        }
      }
      if (!fallbackActive && fallbackRaf) {
        cancelAnimationFrame(fallbackRaf);
        fallbackRaf = null;
      } else if (fallbackActive && fallbackLoopFn && !fallbackRaf) {
        fallbackRaf = requestAnimationFrame(fallbackLoopFn);
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
      // If the local rainyday.js is already loaded (we add a script tag in index.html), prefer it
      if (!window.RainyDay && !window.rainyday && !window.Rainyday) {
        const cdns = [
          'rainyday.js',
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
                const rainInterval = lowPerf ? 120 : 60;
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
          function resize() {
            // Set canvas physical pixels and keep CSS size to image size
            const w = Math.max(1, img.clientWidth);
            const h = Math.max(1, img.clientHeight);
            canvas.width = Math.round(w * DPR);
            canvas.height = Math.round(h * DPR);
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            // scale drawing so 1 unit = 1 CSS pixel
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          }
          let resizeTimeout = null;
          function debouncedResize() { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(resize, 150); }
          window.addEventListener('resize', debouncedResize); resize();

          const drops = [];
          const maxDrops = lowPerf ? 40 : 100;
          const spawnInterval = lowPerf ? 240 : 120; // ms
          function addDrop() {
            const cssW = Math.max(1, canvas.clientWidth || img.clientWidth);
            // smaller drops with a little horizontal drift (coords in CSS pixels)
            drops.push({ x: Math.random() * cssW, y: -6 - Math.random() * 10, vx: (Math.random() - 0.5) * 0.3, vy: 1.5 + Math.random() * 1.6, r: 0.8 + Math.random() * 1.6 });
          }

          let lastAdd = 0;
          let lastFrameTime = 0;
          const frameInterval = 1000 / (lowPerf ? 20 : 30); // target fps for fallback
          let cleanupInterval = null;
          function loop(t) {
            // add drops at a lower rate and cap total drops
            if ((!lastAdd || t - lastAdd > spawnInterval) && drops.length < maxDrops) { addDrop(); lastAdd = t; }
            // clear using CSS pixel dimensions
            const DPR = window.devicePixelRatio || 1;
            const lw = canvas.width / DPR;
            const lh = canvas.height / DPR;
            ctx.clearRect(0, 0, lw, lh);
            for (let i = drops.length - 1; i >= 0; i--) {
              const d = drops[i];
              d.x += d.vx;
              d.y += d.vy;
              d.vy += 0.045; // gravity
              // draw small droplet
              ctx.beginPath();
              const alpha = Math.max(0, 0.22 - (d.y / lh) * 0.14);
              ctx.fillStyle = `rgba(255,255,255,${alpha})`;
              ctx.ellipse(d.x, d.y, d.r, d.r * 1.3, 0, 0, Math.PI * 2);
              ctx.fill();
              // streak trailing effect proportional to fall speed (kept light)
              const streakLen = Math.min(12, 3 + d.vy * 4);
              ctx.beginPath();
              ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.06})`;
              ctx.lineWidth = Math.max(0.5, d.r * 0.5);
              ctx.moveTo(d.x, d.y - d.vy * 0.5);
              ctx.lineTo(d.x + d.vx * streakLen, d.y + streakLen);
              ctx.stroke();

              // remove off-canvas drops
              if (d.y > lh + 30 || d.x < -30 || d.x > lw + 30) drops.splice(i, 1);
            }
          }
          function renderLoop(t) {
            if (!fallbackActive) {
              // stop cleanup when inactive
              if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null; }
              fallbackRaf = null;
              return;
            }
            if (!lastFrameTime) lastFrameTime = t;
            const elapsed = t - lastFrameTime;
            if (elapsed >= frameInterval) {
              loop(t);
              lastFrameTime = t - (elapsed % frameInterval);
            }
            // ensure cleanup interval running
            if (!cleanupInterval) {
              cleanupInterval = setInterval(() => {
                try { if (drops.length > maxDrops) drops.splice(0, drops.length - maxDrops); } catch (e) {}
              }, 10000);
            }
            fallbackRaf = requestAnimationFrame(renderLoop);
          }

          fallbackLoopFn = renderLoop;
          fallbackRaf = requestAnimationFrame(renderLoop);
        }(leftCanvas, leftImg));
      }
    }

    if (leftImg.complete) {
      initRainy();
    } else {
      leftImg.addEventListener('load', initRainy, { once: true });
    }
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
