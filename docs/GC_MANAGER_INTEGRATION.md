/**
 * GC Manager Integration Guide for src/main.js
 * 
 * Copy and paste these sections into main.js to enable proper garbage collection
 */

// ==================== AT THE TOP OF main.js ====================

import { GCManager } from './utils/gc-manager.js';

// Global GC managers - one per major scene
let galleryGCManager = null;
let portraitGCManager = null;
let globalGCManager = null;

// ==================== GALLERY SCENE CLEANUP ====================

// Inside initThreeScene() function, after creating renderer:

function initThreeScene() {
  const THREE = await import('three');
  
  // Create GC manager for gallery scene
  galleryGCManager = new GCManager();
  
  const gallery3D = document.querySelector('.gallery');
  const galleryCanvas = gallery3D?.querySelector('.gallery-rain-canvas');
  
  // ... existing code ...
  
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(...);
  const renderer = new THREE.WebGLRenderer({ canvas: galleryCanvas, alpha: true });
  
  // Track renderer
  galleryGCManager.trackRenderer(renderer);
  
  // Track geometries and materials
  const rainGeometry = new THREE.BufferGeometry();
  galleryGCManager.trackGeometry(rainGeometry);
  
  const rainMaterial = new THREE.ShaderMaterial({...});
  galleryGCManager.trackMaterial(rainMaterial);
  
  const trailGeometry = new THREE.BufferGeometry();
  galleryGCManager.trackGeometry(trailGeometry);
  
  const trailMaterial = new THREE.LineBasicMaterial({...});
  galleryGCManager.trackMaterial(trailMaterial);
  
  const splashGeometry = new THREE.BufferGeometry();
  galleryGCManager.trackGeometry(splashGeometry);
  
  const splashMaterial = new THREE.PointsMaterial({...});
  galleryGCManager.trackMaterial(splashMaterial);
  
  // Track physics worker
  let physicsWorker = null;
  try {
    physicsWorker = new Worker(new URL('./workers/physicsWorker.js', import.meta.url), { type: 'module' });
    galleryGCManager.trackWorker(physicsWorker);
    // ... existing worker code ...
  } catch (err) {
    console.warn('Failed to start physics worker', err);
  }
  
  // Track observers
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
  galleryGCManager.trackObserver(galleryObserver);
  galleryObserver.observe(gallery3D);
  
  const galleryResizeObserver = new ResizeObserver(() => {
    // ... existing resize code ...
  });
  galleryGCManager.trackObserver(galleryResizeObserver);
  galleryResizeObserver.observe(gallery3D);
  
  // Track scroll event listener
  galleryGCManager.trackListener(
    window,
    'scroll',
    () => {
      requestAnimationFrame(updateRainIntensityByScroll);
    },
    { passive: true }
  );
  
  // ... rest of existing code ...
  
  // IMPORTANT: Add cleanup when gallery scene is destroyed
  return {
    cleanup: () => {
      if (galleryGCManager) {
        galleryGCManager.dispose();
        galleryGCManager = null;
      }
    }
  };
}

// ==================== PORTRAIT SCENE CLEANUP ====================

// In the portrait initialization section:

if (leftPortrait) {
  portraitGCManager = new GCManager();
  
  // ... existing portrait code ...
  
  const portraitObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      portraitVisible = entry.intersectionRatio > 0;
      setRainyActive(portraitVisible && document.visibilityState === 'visible');
    });
  }, { threshold: 0.01 });
  portraitGCManager.trackObserver(portraitObserver);
  portraitObserver.observe(leftPortrait);
  
  const leftImgResizeObserver = new ResizeObserver(() => debouncedSyncRainCanvasSize());
  portraitGCManager.trackObserver(leftImgResizeObserver);
  if (leftImg) leftImgResizeObserver.observe(leftImg);
  
  // Track listeners
  portraitGCManager.trackListener(window, 'resize', debouncedSyncRainCanvasSize, { passive: true });
  
  portraitGCManager.trackListener(document, 'visibilitychange', () => {
    setRainyActive(portraitVisible && document.visibilityState === 'visible');
  });
  
  // Store reference to RainyDay engine for cleanup
  let rainEngine = null;
  
  function cleanupRainyEngine() {
    if (rainEngine) {
      try {
        if (typeof rainEngine.stop === 'function') rainEngine.stop();
        if (typeof rainEngine.pause === 'function') rainEngine.pause();
        rainEngine = null;
      } catch (e) {
        console.warn('Error cleaning up rainy engine:', e);
      }
    }
    
    // Clear canvas
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, leftCanvas.width, leftCanvas.height);
      }
    }
  }
}

// ==================== PAGE UNLOAD CLEANUP ====================

// Add at the end of document.ready or as a global cleanup handler:

window.addEventListener('beforeunload', () => {
  console.log('[GC] Page unloading - cleaning up resources');
  
  // Stop all render hooks
  stopMasterLoop();
  
  // Clean up gallery scene
  if (galleryGCManager) {
    galleryGCManager.dispose();
    galleryGCManager = null;
  }
  
  // Clean up portrait scene
  if (portraitGCManager) {
    portraitGCManager.dispose();
    portraitGCManager = null;
  }
  
  // Clean up global resources
  if (globalGCManager) {
    globalGCManager.dispose();
    globalGCManager = null;
  }
  
  console.log('[GC] Resource cleanup complete');
});

// ==================== OPTIONAL: Monitor GC Stats ====================

// Add this to debug memory usage (console):
// window.getGCStats = () => ({
//   gallery: galleryGCManager?.getStats() || null,
//   portrait: portraitGCManager?.getStats() || null,
//   global: globalGCManager?.getStats() || null
// });

// Usage in console:
// console.table(window.getGCStats());
