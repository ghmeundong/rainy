/**
 * Garbage Collection Manager for Three.js and DOM Resources
 * Handles cleanup of WebGL resources, event listeners, and workers
 */

class GCManager {
  constructor() {
    this.resources = {
      geometries: [],
      materials: [],
      textures: [],
      renderers: [],
      workers: [],
      observers: [],
      listeners: [],
    };
    this.isDestroyed = false;
  }

  /**
   * Track a Three.js geometry for cleanup
   */
  trackGeometry(geometry) {
    if (geometry && this.resources.geometries.indexOf(geometry) === -1) {
      this.resources.geometries.push(geometry);
    }
    return geometry;
  }

  /**
   * Track a Three.js material for cleanup
   */
  trackMaterial(material) {
    if (material && this.resources.materials.indexOf(material) === -1) {
      this.resources.materials.push(material);
    }
    return material;
  }

  /**
   * Track a Three.js texture for cleanup
   */
  trackTexture(texture) {
    if (texture && this.resources.textures.indexOf(texture) === -1) {
      this.resources.textures.push(texture);
    }
    return texture;
  }

  /**
   * Track a WebGLRenderer for cleanup
   */
  trackRenderer(renderer) {
    if (renderer && this.resources.renderers.indexOf(renderer) === -1) {
      this.resources.renderers.push(renderer);
    }
    return renderer;
  }

  /**
   * Track a Web Worker for cleanup
   */
  trackWorker(worker) {
    if (worker && this.resources.workers.indexOf(worker) === -1) {
      this.resources.workers.push(worker);
    }
    return worker;
  }

  /**
   * Track an IntersectionObserver or ResizeObserver for cleanup
   */
  trackObserver(observer) {
    if (observer && this.resources.observers.indexOf(observer) === -1) {
      this.resources.observers.push(observer);
    }
    return observer;
  }

  /**
   * Track event listener for cleanup
   * Usage: trackListener(element, event, handler, options)
   */
  trackListener(element, event, handler, options) {
    if (element && event && handler) {
      this.resources.listeners.push({ element, event, handler, options });
      element.addEventListener(event, handler, options);
    }
    return handler;
  }

  /**
   * Dispose of all tracked Three.js geometries
   */
  disposeGeometries() {
    this.resources.geometries.forEach((geometry) => {
      try {
        geometry.dispose();
      } catch (e) {
        console.warn('Failed to dispose geometry:', e);
      }
    });
    this.resources.geometries = [];
  }

  /**
   * Dispose of all tracked Three.js materials
   */
  disposeMaterials() {
    this.resources.materials.forEach((material) => {
      try {
        material.dispose();
      } catch (e) {
        console.warn('Failed to dispose material:', e);
      }
    });
    this.resources.materials = [];
  }

  /**
   * Dispose of all tracked Three.js textures
   */
  disposeTextures() {
    this.resources.textures.forEach((texture) => {
      try {
        texture.dispose();
      } catch (e) {
        console.warn('Failed to dispose texture:', e);
      }
    });
    this.resources.textures = [];
  }

  /**
   * Dispose of all tracked WebGLRenderers
   */
  disposeRenderers() {
    this.resources.renderers.forEach((renderer) => {
      try {
        // Dispose renderer and release WebGL context
        renderer.dispose();
        // Force context loss if available
        const canvas = renderer.domElement;
        if (canvas && canvas.getContext) {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
          }
        }
      } catch (e) {
        console.warn('Failed to dispose renderer:', e);
      }
    });
    this.resources.renderers = [];
  }

  /**
   * Terminate all tracked Web Workers
   */
  terminateWorkers() {
    this.resources.workers.forEach((worker) => {
      try {
        worker.terminate();
      } catch (e) {
        console.warn('Failed to terminate worker:', e);
      }
    });
    this.resources.workers = [];
  }

  /**
   * Disconnect all tracked Observers
   */
  disconnectObservers() {
    this.resources.observers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (e) {
        console.warn('Failed to disconnect observer:', e);
      }
    });
    this.resources.observers = [];
  }

  /**
   * Remove all tracked event listeners
   */
  removeListeners() {
    this.resources.listeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (e) {
        console.warn('Failed to remove event listener:', e);
      }
    });
    this.resources.listeners = [];
  }

  /**
   * Complete cleanup - dispose all resources
   * Call this when the scene is no longer needed
   */
  dispose() {
    if (this.isDestroyed) return;

    console.log('[GC] Starting garbage collection cleanup...');

    try {
      this.removeListeners();
      this.disconnectObservers();
      this.terminateWorkers();
      this.disposeRenderers();
      this.disposeTextures();
      this.disposeMaterials();
      this.disposeGeometries();

      // Clear all references
      Object.keys(this.resources).forEach((key) => {
        this.resources[key] = [];
      });

      this.isDestroyed = true;
      console.log('[GC] Cleanup complete');
    } catch (e) {
      console.error('[GC] Error during cleanup:', e);
    }
  }

  /**
   * Get current resource counts
   */
  getStats() {
    return {
      geometries: this.resources.geometries.length,
      materials: this.resources.materials.length,
      textures: this.resources.textures.length,
      renderers: this.resources.renderers.length,
      workers: this.resources.workers.length,
      observers: this.resources.observers.length,
      listeners: this.resources.listeners.length,
    };
  }
}

export { GCManager };
