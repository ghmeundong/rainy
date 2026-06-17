// Minimal GPUComputationRenderer adapted from three.js examples
// Simplified for this project: requires WebGL2
import * as THREE from 'three';

export function GPUComputationRenderer(sizeX, sizeY, renderer) {
  this.sizeX = sizeX;
  this.sizeY = sizeY;
  this.renderer = renderer;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-sizeX / 2, sizeX / 2, sizeY / 2, -sizeY / 2, 0, 1);
  const passThruShader = {
    uniforms: { texture: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position, 1.0 ); }`,
    fragmentShader: `varying vec2 vUv; uniform sampler2D texture; void main(){ gl_FragColor = texture2D( texture, vUv ); }`
  };

  const mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(sizeX, sizeY), new THREE.ShaderMaterial(passThruShader));
  scene.add(mesh);

  this.createRenderTarget = function() {
    return new THREE.WebGLRenderTarget(this.sizeX, this.sizeY, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
  };

  this.renderTexture = function(input, output) {
    mesh.material.uniforms.texture.value = input.texture || input;
    renderer.setRenderTarget(output);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  };
}
