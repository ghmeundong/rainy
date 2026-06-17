# Development Guide

## Local Development Setup

### Prerequisites
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: For version control
- **Cloudflare Account** (optional, for backend testing)

### Installation

```bash
# Clone repository
git clone https://github.com/ghmeundong/rainy.git
cd rainy

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Environment Configuration

Create `.env` file in project root:

```env
# Frontend API URL for local development
VITE_API_URL=http://localhost:8787
```

This points to the local backend running on port 8787.

## Running Locally

### Terminal 1: Frontend Development Server

```bash
npm run dev
```

Vite dev server starts on **http://localhost:5173/rainy/**

Features:
- Hot Module Replacement (HMR) enabled
- CORS requests to http://localhost:8787
- JavaScript source maps for debugging

### Terminal 2: Backend Development Server

```bash
cd backend
npm run dev
```

Cloudflare Workers dev server starts on **http://localhost:8787**

Features:
- Simulates Cloudflare Workers environment locally
- Auto-reload on file changes
- No authentication required

### Terminal 3 (Optional): Node REPL

For testing Web Worker code in isolation:

```bash
node
> const worker = require('./src/workers/physicsWorker.js');
```

## Development Workflow

### Making Changes to Rain Animation

**File**: `src/main.js`

Key parameters you can adjust:

```javascript
// In initThreeScene()
const rainCount = 420;           // Number of particles
const rainFloor = -35;           // Where particles die (y-axis)
const rainCeil = 170;            // Where particles spawn (y-axis)
const trailLength = 3;           // History positions per particle
const splashCount = 60;          // Splash particles on impact

// Physics parameters
const gravity = 0.005;           // Gravity acceleration (in physicsWorker.js)
const velocityX = 0.06;          // Horizontal spread
const velocityY = 0.45;          // Vertical fall speed (negative)
```

After changing parameters:
1. Save file
2. Browser automatically reloads (HMR)
3. Observe changes in real-time

### Making Changes to Shaders

**Files**: 
- Rain shader: `src/main.js` (lines ~150-200)
- Trail shader: `src/main.js` (lines ~210-260)

Shader changes hot-reload. Check browser console for compilation errors:

```javascript
// If shader fails to compile, you'll see:
// "Failed to compile vertex shader" error message
```

### Making Changes to Physics

**File**: `src/workers/physicsWorker.js`

This runs in a Web Worker, so changes require:
1. Save file
2. Refresh browser (HMR doesn't fully reload workers yet)

Key physics functions:
```javascript
// Gravity application
velocity[i * 2 + 1] -= gravity;  // Reduce y velocity

// Position update
position[i * 2] += velocity[i * 2];      // x += vx
position[i * 2 + 1] += velocity[i * 2 + 1]; // y += vy

// Respawn logic (when y < floor)
position[i * 2] = (Math.random() - 0.5) * 100;
position[i * 2 + 1] = rainCeil;
```

### Making Changes to API

**File**: `backend/src/index.js`

Changes are auto-reloaded by wrangler dev. Test endpoints:

```bash
# Health check
curl http://localhost:8787/api/health

# JSON response
curl http://localhost:8787/api/animation/init

# Binary response
curl http://localhost:8787/api/animation/init?binary=1 --output response.bin
```

## Debugging

### Browser DevTools

1. Open http://localhost:5173/rainy/
2. Press **F12** or **Ctrl+Shift+I**
3. Check **Console** tab for errors

Common debug info:

```javascript
// Add to src/main.js to see rain updates
window.addEventListener('message', (e) => {
  if (e.data.type === 'update') {
    console.log('Positions:', e.data.rainPositions);
  }
});
```

### Network Monitoring

1. Open DevTools → **Network** tab
2. Look for requests to `http://localhost:8787/api/animation/init`
3. Check:
   - **Status**: Should be 200
   - **Size**: ~3-5KB for JSON, ~1KB for binary
   - **Time**: Should be <100ms

### Web Worker Debugging

Web Workers don't appear directly in DevTools, but you can:

```javascript
// In physicsWorker.js, add logging
self.onmessage = (event) => {
  if (event.data.type === 'step') {
    console.log('Physics step executed');
    // Posts back automatically
  }
};
```

Check **Console** for any logged messages.

### Performance Profiling

1. DevTools → **Performance** tab
2. Click **Record**
3. Scroll on page for 5 seconds
4. Click **Stop**
5. Check:
   - **Frame rate**: Should be 60 FPS
   - **Main thread**: Should be free (physics in Worker)
   - **Rendering**: Look for shader compilation costs

### Shader Compilation

First frame renders slowly due to shader compilation. Subsequent frames are fast.

To debug shader errors:

```javascript
// In src/main.js, after material creation
material.onBeforeCompile = (shader) => {
  console.log('Vertex Shader:', shader.vertexShader);
  console.log('Fragment Shader:', shader.fragmentShader);
};
```

## Testing

### Unit Tests (if added later)

```bash
npm run test
```

### Manual Testing Checklist

- [ ] Rain renders on page load
- [ ] Particles fall continuously
- [ ] Trails follow particles
- [ ] Scroll fade works (fade increases as you scroll)
- [ ] Page renders at 60 FPS
- [ ] No console errors
- [ ] Mobile responsive (resize window)
- [ ] API fallback works (disconnect backend, should use default config)

## Builds

### Development Build

```bash
npm run build
```

Output: `dist/` directory

Characteristics:
- Source maps included
- Not minified
- Useful for debugging production build

### Production Build (with optimization)

Same command as development build, but optimized:

```bash
npm run build
```

Vite automatically optimizes based on `vite.config.js`:
- Code splitting (Three.js in separate chunk)
- Minification
- Asset hashing (cache busting)

### Backend Build

```bash
cd backend
npm run build
```

This compiles Worker code for deployment. Output is internal to wrangler.

## Common Issues

### "VITE_API_URL is undefined"

**Cause**: Environment variable not set during dev

**Solution**:
```bash
# Set before npm run dev
$env:VITE_API_URL='http://localhost:8787'
npm run dev
```

### "Failed to connect to API"

**Cause**: Backend not running

**Solution**:
```bash
# In second terminal
cd backend
npm run dev

# Verify it's running
curl http://localhost:8787/api/health
```

### "Rain not animating"

**Cause**: Web Worker not loaded or physics not running

**Solution**:
1. Check **Network** tab → `physicsWorker.js` loaded (200 status)
2. Check **Console** → no errors
3. Refresh page
4. If still broken, check Worker compatibility

### "Shader compilation error"

**Cause**: Invalid GLSL code in shader

**Solution**:
1. Check **Console** for error message
2. Read error carefully (line number, error type)
3. Review shader code in `src/main.js`
4. Test with simpler shader first

### High CPU usage / Low FPS

**Cause**: Too many particles or inefficient shader

**Solution**:
```javascript
// Reduce particle count
const rainCount = 200; // from 420

// Or optimize shader (reduce trail length)
const trailLength = 1; // from 3
```

## Code Style

This project follows:
- **JavaScript**: ES6+ with no strict linting (flexible)
- **Indentation**: 2 spaces
- **Comments**: Explain "why", not "what"

Example:

```javascript
// Good: explains reasoning
// Use exponential fade for more natural visual effect
const fadeFactor = Math.pow(scrollFraction, 3.5);

// Bad: obvious from code
// Calculate fade factor
const fadeFactor = Math.pow(scrollFraction, 3.5);
```

## Project Dependencies

### Frontend (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^5.0.0 | Build tool & dev server |
| three | ^0.184.0 | 3D graphics library |
| jquery | ^4.0.0 | DOM manipulation |
| gh-pages | ^5.0.0 | GitHub Pages deployment |
| jquery.ripples | ^0.6.3 | Water ripple effect |

### Backend (backend/package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| wrangler | latest | Cloudflare Workers CLI |
| itty-router | latest | Lightweight HTTP router |

## Next Steps

- Add unit tests (Vitest + chai)
- Add E2E tests (Playwright)
- Performance monitoring (Sentry integration)
- Analytics (Cloudflare Analytics)

See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup.
