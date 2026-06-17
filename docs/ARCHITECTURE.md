# Architecture

## System Overview

```
┌─────────────────────────────────────────┐
│         User Browser                    │
│  ┌──────────────────────────────────┐  │
│  │     Frontend (Vite + Three.js)   │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  main.js (Rain Animation)  │  │  │
│  │  │  - Three.js scene setup    │  │  │
│  │  │  - Shader rendering        │  │  │
│  │  │  - Scroll handling         │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  physicsWorker.js          │  │  │
│  │  │  - Particle position update│  │  │
│  │  │  - Velocity computation    │  │  │
│  │  │  - Respawn logic           │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
        HTTP/HTTPS API
               │
┌──────────────▼──────────────────────────┐
│   Cloudflare Workers (Backend)          │
│  ┌────────────────────────────────┐    │
│  │  index.js (API Server)         │    │
│  │  - /api/animation/init         │    │
│  │  - /api/animation/init?binary=1│    │
│  │  - Response caching (Cache API)│    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Component Architecture

### Frontend (src/main.js)

**Responsibility**: Render rain particles and manage user interactions

```
main.js
├── initThreeScene()
│   ├── Create scene, camera, renderer
│   ├── Setup WebGL shaders
│   ├── Initialize particle geometries (rain, trails, splash)
│   └── Fetch animation config from API
│
├── Physics Loop (via Web Worker)
│   ├── postMessage('step') to physicsWorker
│   ├── Receive position updates
│   └── Update particle geometry
│
├── Render Loop
│   ├── Update scroll state
│   ├── Apply fade effects
│   ├── Render frame
│   └── Stop when scrolled to bottom
│
└── Scroll Handling
    ├── Calculate scroll fraction
    ├── Apply exponential fade
    ├── Reduce active particle count
    └── Clear rendering at bottom
```

**Key Functions**:
- `initThreeScene()` - Scene initialization with particle system
- `updateRainIntensityByScroll()` - Scroll-based visual fade
- `clearRainRender()` - Clear particles and stop loop

### Web Worker (src/workers/physicsWorker.js)

**Responsibility**: Compute particle physics on background thread (non-blocking)

```
physicsWorker.js
├── Message: 'init'
│   ├── Receive rain configuration
│   ├── Initialize position/velocity arrays
│   └── Store bounds (floor, ceiling)
│
├── Message: 'step' (every frame)
│   ├── Apply gravity to velocities
│   ├── Update positions
│   ├── Check floor collision
│   ├── Respawn particles below floor
│   └── postMessage updated positions
│
└── Respawn Logic
    ├── New random x position (±50 range)
    ├── Reset y to ceiling
    └── New random velocity
```

**Performance**: ~5-10ms per frame for 420 particles (offloaded from main thread)

### API Service (src/services/api.js)

**Responsibility**: Wrap backend API calls with JSON/binary support

```
api.js
├── api.animation.init()
│   └── Fetch /api/animation/init (JSON)
│
└── api.animation.initBinary()
    ├── Fetch /api/animation/init?binary=1 (ArrayBuffer)
    └── Parse binary layout:
        ├── Header: rainCount, rainFloor, rainCeil, trailLength
        └── Arrays: positions, velocities, splashCount, rainIntensity
```

### Backend (backend/src/index.js)

**Responsibility**: Generate animation configuration and cache responses

```
backend/index.js
├── Route: GET /api/health
│   └── Return { status: 'ok' }
│
├── Route: GET /api/animation/init
│   ├── buildAnimationConfig()
│   ├── Generate random particle positions/velocities
│   └── Return JSON response
│
├── Route: GET /api/animation/init?binary=1
│   ├── Build configuration
│   ├── Serialize to ArrayBuffer
│   ├── Cache via Cache API
│   └── Return binary response
│
└── Utility: buildAnimationConfig()
    ├── 420 rain particles with random positions
    ├── Initial velocities (gravity-based)
    └── Visual parameters (trail, splash)
```

## Data Flow

### Initialization Sequence

```
1. User loads page
   └─> main.js
       └─> initThreeScene()
           ├─> Create Three.js scene
           ├─> Fetch /api/animation/init or /api/animation/init?binary=1
           │   └─> Backend generates config
           ├─> Initialize Web Worker with config
           │   └─> physicsWorker: message 'init'
           └─> Start render loop

2. Render Loop (each frame)
   ├─> physicsWorker: postMessage('step')
   │   └─> Compute physics → postMessage positions back
   ├─> Update particle geometry from positions
   ├─> Check scroll state
   ├─> Apply fade effects if scrolling
   └─> Render frame
```

### Environment Variable Flow

```
.env
  └─> vite.config.js (define config)
      └─> VITE_API_URL embedded in bundle
          └─> src/services/api.js
              └─> Fetch requests to configured API URL
```

**For production**: Environment variable set at deploy time
```bash
$env:VITE_API_URL='https://your-api.workers.dev'
npm run deploy
```

## Rendering Pipeline

### Shader System

**Rain Points** (Custom PointsMaterial)
```glsl
// Vertex Shader
- Stretch points perpendicular to velocity
- Creates realistic rain streak effect
- Velocity-based elongation

// Fragment Shader
- Additive blending (glow effect)
- Velocity-based color intensity
- Soft particle falloff
```

**Trails** (Line segments)
- Per-raindrop historical positions
- Color fade from head (bright) to tail (dim)
- Updated each frame

**Splash Particles** (Optional secondary effect)
- Collision response when rain hits "ground"
- Radial spread particles

## Performance Characteristics

| Component | Cost | Notes |
|-----------|------|-------|
| Physics (Worker) | ~5-10ms | 420 particles, non-blocking |
| Rendering | ~3-5ms | Shader-based points + trails |
| API Call | ~100-200ms | Initial load only, cached |
| Memory | ~2-3MB | Particle data + Three.js |

### Optimization Strategies

1. **Web Worker Physics** - Prevent main thread jank
2. **Binary API Responses** - Reduce parsing overhead
3. **Shader Point Sprites** - More efficient than geometry-based rendering
4. **Scroll-based Fade** - Reduce particle count as visibility decreases
5. **Response Caching** - Cache API responses to reduce backend calls

## Error Handling

- **Missing API**: Defaults to `http://localhost:8787`
- **Worker Initialization**: Falls back to main-thread physics (graceful degradation)
- **Shader Compilation**: Logs error, still renders (might be pixelated)
- **Network Errors**: Retries once, then uses default config

## Deployment Architecture

### Frontend (GitHub Pages)
- Static hosting at `https://ghmeundong.github.io/rainy/`
- Vite build output (`dist/`)
- Base path: `/rainy/`

### Backend (Cloudflare Workers)
- Serverless compute at `https://rainy-api-production.ghmeundong.workers.dev/`
- Zero cold start (Workers are always on)
- Automatic scaling

### Communication
- CORS enabled on Worker (all origins)
- JSON or binary response format
- Cache TTL: 1 hour (configurable)
