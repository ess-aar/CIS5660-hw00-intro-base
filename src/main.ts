import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

enum Object {
  sphere,
  square,
  cube
}

enum vertShaders {
   lambert = "./shaders/lambert-vert.glsl",
   custom1 = "./shaders/custom-vert.glsl",
}

enum fragShaders {
  lambert = "./shaders/lambert-frag.glsl",
  custom1 = "./shaders/custom-frag.glsl",
  custom2 = "./shaders/custom2-frag.glsl",
}

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  // color: [255, 194, 0, 1],
  color: [72,160,255,1],
  shape: Object.cube,
  fragmentshader: fragShaders.custom2,
  vertexshader: vertShaders.lambert,
  'Load Scene': loadScene, // A function pointer, essentially
};

let icosphere: Icosphere;
let square: Square;
let cube: Cube;
let prevTesselations: number = 5;
// let time = 0;
const startTime = (window.performance || Date).now();
let updateShader = false;

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  cube = new Cube(vec3.fromValues(0, 0, 0));
  cube.create();
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 8).step(1);
  // gui.add(controls, 'Load Scene');
  gui.add(controls, "shape", {Sphere: Object.sphere, Square: Object.square, Cube: Object.cube});
  gui.add(controls, "fragmentshader", {Lambert: fragShaders.lambert, "Perlin with static": fragShaders.custom1, "Inner pulsing glow": fragShaders.custom2}).onChange(() => updateShader = true);
  gui.add(controls, "vertexshader", {None: vertShaders.lambert, Wave: vertShaders.custom1}).onChange(() => updateShader = true);
  gui.addColor(controls,'color');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  let shader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('' + controls.vertexshader + '')),
    new Shader(gl.FRAGMENT_SHADER, require('' + controls.fragmentshader + '')),
  ]);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }

    if (updateShader) {
      shader = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('' + controls.vertexshader + '')),
        new Shader(gl.FRAGMENT_SHADER, require('' + controls.fragmentshader + '')),
      ]);
      updateShader = false;
    }

    const newColor = vec4.fromValues(controls.color[0]/255, controls.color[1]/255, controls.color[2]/255, controls.color[3]);
    let obj = (controls.shape == 0) ? icosphere : (controls.shape == 1) ? square : cube;

    renderer.render(camera, shader, [obj], newColor, ((window.performance || Date).now() - startTime) / 1000);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
