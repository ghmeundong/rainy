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
    // subtle rainbow radial gradient centered at pointer
    const colors = [
      'rgba(255,0,128,0.06) 0%',
      'rgba(255,160,0,0.04) 22%',
      'rgba(255,255,0,0.035) 40%',
      'rgba(0,240,200,0.03) 60%',
      'rgba(0,128,255,0.02) 80%',
      'transparent 100%'
    ].join(', ');
    rainbowEl.style.background = `radial-gradient(circle at ${x}px ${y}px, ${colors})`;
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
});
