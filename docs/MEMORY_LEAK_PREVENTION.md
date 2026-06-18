# Three.js Memory Leak Prevention Checklist

This document outlines common memory leak patterns in Three.js applications and how to prevent them.

## ✅ Geometry Cleanup

### Problem
Geometries store vertex data in GPU memory. If not disposed, they accumulate.

### Solution
```javascript
// Track all geometries
gcManager.trackGeometry(geometry);

// Dispose on cleanup
geometry.dispose(); // Frees GPU memory
```

**Check in console:**
```javascript
// Get scene object count
scene.traverse(obj => {
  if (obj.geometry) console.log('Geometry:', obj.geometry);
});
```

---

## ✅ Material Cleanup

### Problem
Materials hold GPU shader programs and uniform values.

### Solution
```javascript
// Track materials
gcManager.trackMaterial(material);

// Cleanup
material.dispose(); // Unload shaders
```

**Best Practice:**
- Reuse materials when possible
- Dispose immediately when swapping materials
- Avoid creating new materials per frame

---

## ✅ Texture Cleanup

### Problem
Textures are large GPU allocations (width × height × 4 bytes minimum).

### Solution
```javascript
// Track textures
gcManager.trackTexture(texture);

// Cleanup
texture.dispose();
```

**Monitor:**
```javascript
// Check texture memory
renderer.info.memory.textures; // WebGLTexture count
renderer.info.memory.geometries; // WebGLGeometry count
```

---

## ✅ Renderer Cleanup

### Problem
WebGLRenderer holds GPU context and all GPU state.

### Solution
```javascript
// Track renderer
gcManager.trackRenderer(renderer);

// Cleanup
renderer.dispose();
// Force context loss
const gl = canvas.getContext('webgl2');
const ext = gl.getExtension('WEBGL_lose_context');
if (ext) ext.loseContext();
```

**Critical:** Only one renderer per canvas.

---

## ✅ Worker Cleanup

### Problem
Web Workers continue running after scene cleanup.

### Solution
```javascript
// Track worker
let worker = new Worker('physics.js');
gcManager.trackWorker(worker);

// Cleanup
worker.terminate(); // Stop execution
worker = null; // Clear reference
```

**Message Cleanup:**
```javascript
// In worker.onmessage handler, avoid closures
worker.onmessage = (event) => {
  // Process message
  // Don't capture large objects in closure
};

// Instead of:
const largeBuffer = new Float32Array(1000000);
worker.onmessage = () => largeBuffer; // ❌ Memory leak

// Do this:
const largeBuffer = new Float32Array(1000000);
worker.onmessage = (event) => {
  // Use event.data instead
};
```

---

## ✅ Event Listener Cleanup

### Problem
Event listeners accumulate and old handlers still execute.

### Solution
```javascript
// Track listener
gcManager.trackListener(element, 'scroll', handler, { passive: true });

// Cleanup (via GCManager.dispose())
element.removeEventListener('scroll', handler, { passive: true });
```

**Check in DevTools:**
```javascript
// Find listeners on an element
getEventListeners(element); // Chrome DevTools
```

---

## ✅ Observer Cleanup

### Problem
IntersectionObserver and ResizeObserver stay active forever.

### Solution
```javascript
// Track observers
const observer = new IntersectionObserver(callback);
gcManager.trackObserver(observer);

// Cleanup
observer.disconnect(); // Stop observing
```

**Pattern:**
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.intersectionRatio > 0 && !initialized) {
      initialized = true;
      init();
      // Don't disconnect - might need re-entry
    }
  });
});

// On page unload:
observer.disconnect();
```

---

## ✅ Float32Array Cleanup

### Problem
Large typed arrays (rainPositions, rainVelocities) hold megabytes.

### Solution
```javascript
// Reference tracking
const rainPositions = new Float32Array(rainCount * 3);

// On cleanup, clear references
rainPositions = null;
geometry.dispose(); // Clears attribute array
```

**Memory calc:**
```javascript
// rainCount = 420, 3 floats per drop = 1260 floats
// Float32 = 4 bytes each = 5040 bytes ≈ 5 KB
// But multiply by trails, splash particles, etc.
// Total can be 1-2 MB easily
```

---

## ✅ Scene Graph Cleanup

### Problem
Objects in scene still hold references.

### Solution
```javascript
// Before cleanup
scene.traverse((object) => {
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(m => m.dispose());
    } else {
      object.material.dispose();
    }
  }
});

// Remove from scene
scene.clear();
```

---

## ✅ DOM Canvas Cleanup

### Problem
Canvas elements hold WebGL context.

### Solution
```javascript
// Clear canvas
const ctx = canvas.getContext('2d');
if (ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Remove from DOM
canvas.parentElement?.removeChild(canvas);
```

---

## ✅ RequestAnimationFrame Cleanup

### Problem
Animation loops continue requesting frames.

### Solution
```javascript
// Proper cleanup
let animationFrameId = null;

function startLoop() {
  animationFrameId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// On page unload
stopLoop();
```

---

## ✅ Closure Memory Leaks

### Problem
Functions capture large objects in closure.

### Solution

**❌ Bad:**
```javascript
const largeBuffer = new Float32Array(1000000);

element.addEventListener('click', () => {
  console.log(largeBuffer); // Captures buffer in closure
});
```

**✅ Good:**
```javascript
const largeBuffer = new Float32Array(1000000);

const handleClick = () => {
  // Don't capture largeBuffer unless needed
};

element.addEventListener('click', handleClick);

// On cleanup
element.removeEventListener('click', handleClick);
largeBuffer = null;
```

---

## 🔍 Debugging Memory Leaks

### Chrome DevTools - Memory Profiler

1. **Record memory allocation:**
   - DevTools → Memory tab
   - Record allocation timeline
   - Interact with page
   - Take heap snapshot

2. **Compare snapshots:**
   - Take snapshot before action
   - Perform action
   - Take snapshot after
   - Compare in "Comparison" mode

3. **Find detached nodes:**
   - DevTools → Memory
   - Filter: "detached HTMLElement"
   - These indicate unreferenced DOM

### Performance Profiler

1. **Identify leaks:**
   - DevTools → Performance
   - Record interaction
   - Look for sawtooth pattern (leak)
   - Should see GC spikes

2. **Expected pattern:**
   ```
   Memory should rise then plateau with periodic GC dips
   ✓ Good: 50MB → 60MB → (GC) → 50MB → 60MB
   ❌ Bad: 50MB → 100MB → 150MB → 200MB (no GC recovery)
   ```

---

## 📊 Monitoring Template

```javascript
import { GCManager } from './utils/gc-manager.js';
import { MemoryMonitor } from './utils/memory-monitor.js';

// Initialize managers
const gcManager = new GCManager();
const monitor = new MemoryMonitor();

// Start monitoring
monitor.startMonitoring(1000, () => gcManager.getStats());

// In console, view report:
// console.log(monitor.formatReport());

// On cleanup
window.addEventListener('beforeunload', () => {
  gcManager.dispose();
  monitor.stopMonitoring();
});
```

---

## 📋 Pre-Deployment Checklist

Before shipping to production:

- [ ] All geometries tracked and disposed
- [ ] All materials tracked and disposed
- [ ] All textures tracked and disposed
- [ ] Renderer disposed on cleanup
- [ ] All workers terminated
- [ ] All observers disconnected
- [ ] All event listeners removed
- [ ] No console warnings about memory
- [ ] Memory stabilizes after GC cycles
- [ ] No detached DOM nodes in DevTools
- [ ] No sawtooth memory patterns
- [ ] Performance profile shows stable memory

---

## References

- [Three.js Memory Management](https://threejs.org/manual/#en/memory-leaks)
- [Chrome DevTools Memory](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Web Workers Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Observer Disconnection](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/disconnect)
