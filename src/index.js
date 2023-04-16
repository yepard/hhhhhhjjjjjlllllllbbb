/**
 * Fork this demoscene and create your own animation.
 *
 * Video tutorial: https://youtu.be/QoS4gMxwq_4
 *
 * Credits:
 * - WebGL Scene: Toshiya Marukubo https://toshiya-marukubo.github.io
 * - Music: Kai Engel https://twitter.com/KaiEngelMusic
 *
 * Find more free music at https://freemusicarchive.org
 */
import "./styles.css";
import { getProject, types as t } from "@theatre/core";
import studio from "@theatre/studio";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// @ts-ignore
import audio from "./music/kai-engel-snowmen.mp3";
import state from "./state.json";

const proj = getProject("Demo - Flower - 1", { state });

studio.initialize();

const sheet = proj.sheet("Scene");

sheet.sequence.attachAudio({ source: audio }).then(() => {
  console.log("Music ready!");
});

const vector3D = {
  x: t.number(0, { nudgeMultiplier: 0.01 }),
  y: t.number(0, { nudgeMultiplier: 0.01 }),
  z: t.number(0, { nudgeMultiplier: 0.01 })
};

const flowerObj = sheet.object("Flower", {
  uniforms: {
    uProgression: t.number(0.3, { nudgeMultiplier: 0.01 }),
    uDegreeA: t.number(0.3, { nudgeMultiplier: 0.01 }),
    uDegreeB: t.number(0.1, { nudgeMultiplier: 0.01 }),
    uDegreeC: t.number(12, { nudgeMultiplier: 0.1 }),
    uDegreeE: t.number(16, { nudgeMultiplier: 0.1 }),
    uDegreeD: t.number(0.1, { nudgeMultiplier: 0.01 })
  },
  size: t.number(1, { nudgeMultiplier: 0.01 }),
  transforms: {
    position: vector3D,
    rotation: vector3D
  }
});

const vertexShader = /*glsl*/ `
uniform float uProgression;
uniform float uDegreeA;
uniform float uDegreeB;
uniform float uDegreeC;
uniform float uDegreeE;
uniform float uDegreeD;
float PI = 3.14159265359;
varying vec3 vPosition;

void main(){

  vec3 pos = position;
  pos.x = position.x * cos(uProgression * uDegreeA) - position.y * sin(uProgression * uDegreeA);
  pos.y = position.x * sin(uProgression * uDegreeA) + position.y * cos(uProgression * uDegreeA);
  
  float q = sin(cos(position.z * sin(uProgression * uDegreeB) * uDegreeC) - uProgression);
  
  pos.x = pos.x * q;
  pos.y = pos.y * q;
  pos.z = tan(uProgression * uDegreeA * q) * uDegreeD;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  vPosition = pos;
  
  gl_PointSize = 2.0 * (uDegreeE / - mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}

`;

const fragmentShader = /*glsl*/ `
uniform float uProgression;
varying vec3 vPosition;

/**
 * change colors
 * Referred to
 * https://iquilezles.org/www/articles/palettes/palettes.htm
 * Thank you so much.
 */
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
  return a + b*cos( 6.28318*(c*t+d) );
}


void main () {
  /**
   * Square to Circle.
   * Referred to
   * https://qiita.com/uma6661/items/20accc9b5fb9845fc73a
   * Thank you so much.
   */
  float f = length(gl_PointCoord - vec2(0.5, 0.5));
  if ( f > 0.1 ) discard;
  
  vec3 color =
    palette(
      length(vPosition) - uProgression * 0.5, 
      vec3(0.5,0.5,0.5),
      vec3(0.5,0.5,0.5),
      vec3(1.0,1.0,1.0),
      vec3(0.0,0.33,0.67)
    );
  
  gl_FragColor = vec4(color, 1.0);
}

`;

class Sketch {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    document.body.appendChild(this.renderer.domElement);

    this.init();
  }

  init() {
    this.time = new THREE.Clock(true);

    this.amp = 10.0;
    this.mouse = new THREE.Vector2();
    this.touchStart = new THREE.Vector2();
    this.touchMove = new THREE.Vector2();
    this.touchEnd = new THREE.Vector2();

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = new THREE.Scene();

    this.setupCanvas();
    this.setupCamera();
    this.setupShape();
    this.setupEvents();
    this.render();
  }

  setupCanvas() {
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 1.0);

    this.renderer.domElement.style.position = "fixed";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.left = "0";
    this.renderer.domElement.style.zIndex = "0";
    this.renderer.domElement.style.outline = "none";
  }

  setupCamera() {
    const fov = 70;
    const fovRadian = (fov / 2) * (Math.PI / 180);

    this.dist = this.height / 2 / Math.tan(fovRadian);
    this.camera = new THREE.PerspectiveCamera(
      fov,
      this.width / this.height,
      0.01,
      1000
    );
    this.camera.position.set(0.0, 0.0, 2.0);
    this.camera.lookAt(new THREE.Vector3());
    this.scene.add(this.camera);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }

  setupLight() {
    this.directionalLight = new THREE.DirectionalLight(0xffffff);
    this.scene.add(this.directionalLight);

    this.spotLight = new THREE.SpotLight(0xffffff);
    this.spotLight.position.set(0, 300, 0);
    this.scene.add(this.spotLight);
  }

  setupShape() {
    this.shapes = new Array();
    const s = new Flower(this);
    this.shapes.push(s);
  }

  render() {
    this.renderer.render(this.scene, this.camera);

    this.animationId = requestAnimationFrame(this.render.bind(this));
  }

  setupEvents() {
    window.addEventListener("resize", this.onResize.bind(this), false);
    window.addEventListener("mousemove", this.onMousemove.bind(this), false);
    this.renderer.domElement.addEventListener(
      "wheel",
      this.onWheel.bind(this),
      false
    );
    this.renderer.domElement.addEventListener(
      "touchstart",
      this.onTouchstart.bind(this),
      false
    );
    this.renderer.domElement.addEventListener(
      "touchmove",
      this.onTouchmove.bind(this),
      false
    );
    this.renderer.domElement.addEventListener(
      "touchend",
      this.onTouchend.bind(this),
      false
    );
  }

  onResize() {}

  onMousemove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onWheel(event) {
    this.amp += event.deltaY * 0.06;
  }

  onTouchstart(event) {
    const touch = event.targetTouches[0];

    this.touchStart.x = touch.pageX;
    this.touchStart.y = touch.pageY;
  }

  onTouchmove(event) {
    const touch = event.targetTouches[0];

    this.touchMove.x = touch.pageX;
    this.touchMove.y = touch.pageY;
    this.touchEnd.x = this.touchStart.x - this.touchMove.x;
    this.touchEnd.y = this.touchStart.y - this.touchMove.y;

    this.amp += this.touchEnd.y * 0.05;

    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  }

  onTouchend(event) {
    this.touchStart.x = null;
    this.touchStart.y = null;
    this.touchMove.x = null;
    this.touchMove.y = null;
    this.touchEnd.x = null;
    this.touchEnd.y = null;

    this.mouse.x = null;
    this.mouse.y = null;
  }
}

class Flower {
  constructor(sketch) {
    this.sketch = sketch;
    this.init();
  }

  init() {
    this.count = this.sketch.width < 500 ? 5000 : 20000;
    this.geometry = new THREE.BufferGeometry();
    this.vertices = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count * 3; i++) {
      const rad = ((Math.PI * 2) / this.count) * (i * 3);
      const x = Math.cos(rad);
      const y = Math.sin(rad);
      this.vertices[i * 3 + 0] = x;
      this.vertices[i * 3 + 1] = y;
      this.vertices[i * 3 + 2] = Math.atan2(y, x);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.vertices, 3)
    );

    const uniforms = {};
    for (const [uniformName, uniformValue] of Object.entries(
      flowerObj.value.uniforms
    )) {
      uniforms[uniformName] = { value: uniformValue };
    }

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms,
      blending: THREE.AdditiveBlending,
      transparent: true,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    this.mesh = new THREE.Points(this.geometry, this.material);

    this.sketch.scene.add(this.mesh);

    flowerObj.onValuesChange((v) => {
      for (const [transform, value] of Object.entries(v.transforms)) {
        this.mesh[transform].set(value.x, value.y, value.z);
      }
      this.mesh.scale.set(v.size, v.size, v.size);

      for (const [uniformName, uniformValue] of Object.entries(v.uniforms)) {
        uniforms[uniformName].value = uniformValue;
      }
    });
  }
}

new Sketch();

console.log(
  "%c Original artwork by Toshiya Marukubo → https://toshiya-marukubo.github.io",
  "background: black; color: white; padding: 1ch 2ch; border-radius: 2rem;"
);
console.log(
  "%c Music by Kai Engel → https://twitter.com/KaiEngelMusic | https://freemusicarchive.org/music/Kai_Engel/Irsens_Tale/Kai_Engel_-_Irsens_Tale_-_04_Moonlight_Reprise",
  "background: black; color: white; padding: 1ch 2ch; border-radius: 2rem;"
);
