import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";

/* ============================================================
   Praktikum 6 — Three.js Mini 3D Scene
   Urutan: Scene → Camera → Renderer → Geometry → Material → Mesh
           → Transform → Light → Shadow → Animation Loop → Responsive
   ============================================================ */

// ---------- Default parameter ----------
const DEFAULTS = {
  cameraMode: "perspective",
  fov: 50,
  lightIntensity: 1.2,
  shadowQuality: 1024,
  segments: 24,
  ocEnabled: true,
  ocPan: true,
  ocDamping: true,
  dampFactor: 0.05,
  rotSpeed: 1,
  zoomSpeed: 1,
  helpers: false
};

const params = { ...DEFAULTS };
const state = {
  paused: false,
  lightOrbit: false,
  gallery: false
};

const CAMERA_START = new THREE.Vector3(4, 3, 6);
const TARGET_START = new THREE.Vector3(0, 0.5, 0);
const LIGHT_START = new THREE.Vector3(4, 6, 3);
const CUBE_START = new THREE.Vector3(-1.2, 0.6, 0);

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const app = $("app");
const info = $("info");

// ---------- 1. Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a16);
scene.fog = new THREE.Fog(0x1a0a16, 18, 40);

// ---------- 2. Camera ----------
const sizes = { width: app.clientWidth, height: app.clientHeight };
const aspect = () => sizes.width / sizes.height;

const perspCamera = new THREE.PerspectiveCamera(params.fov, aspect(), 0.1, 100);
const ORTHO_SIZE = 4.5;
const orthoCamera = new THREE.OrthographicCamera(
  -ORTHO_SIZE * aspect(), ORTHO_SIZE * aspect(), ORTHO_SIZE, -ORTHO_SIZE, 0.1, 100
);

perspCamera.position.copy(CAMERA_START);
orthoCamera.position.copy(CAMERA_START);
perspCamera.lookAt(TARGET_START);
orthoCamera.lookAt(TARGET_START);

let camera = perspCamera;
scene.add(perspCamera);
scene.add(orthoCamera);

// ---------- 3. Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

// ---------- OrbitControls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TARGET_START);
controls.minDistance = 2;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.495;

function applyControlParams() {
  controls.enabled = params.ocEnabled;
  controls.enablePan = params.ocPan;
  controls.enableDamping = params.ocDamping;
  controls.dampingFactor = params.dampFactor;
  controls.rotateSpeed = params.rotSpeed;
  controls.zoomSpeed = params.zoomSpeed;
}
applyControlParams();
controls.update();

// ---------- 4–6. Geometry, Material, Mesh ----------
const meshes = [];       // semua mesh yang dihitung sebagai "Objects"
const galleryMeshes = []; // mesh tambahan (tombol Gallery)
const segmentGeometries = []; // geometry yang mengikuti slider segments

function addMesh(mesh, { gallery = false, cast = true, receive = false } = {}) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  (gallery ? galleryMeshes : meshes).push(mesh);
  return mesh;
}

// Cube utama — MeshStandardMaterial (butuh light)
const cube = addMesh(
  new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff5fa2, roughness: 0.45, metalness: 0.1 })
  ),
  { receive: true }
);
cube.position.copy(CUBE_START);
cube.rotation.y = Math.PI / 4;
cube.scale.set(1.2, 1.2, 1.2);

// Sphere — MeshPhongMaterial (specular highlight)
const sphereSeg = () => Math.max(4, params.segments);
const sphere = addMesh(
  new THREE.Mesh(
    new THREE.SphereGeometry(0.7, sphereSeg(), Math.max(3, Math.round(sphereSeg() / 2))),
    new THREE.MeshPhongMaterial({ color: 0xffb3d9, shininess: 90, specular: 0xffffff })
  ),
  { receive: true }
);
sphere.position.set(1.6, 0.7, 0.4);

// Cube kecil — MeshBasicMaterial (TIDAK dipengaruhi light)
const basicCube = addMesh(
  new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  )
);
basicCube.position.set(0.2, 0.35, -2);

// Ground — PlaneGeometry
const ground = addMesh(
  new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a1530, roughness: 0.9 })
  ),
  { cast: false, receive: true }
);
ground.rotation.x = -Math.PI / 2;

const grid = new THREE.GridHelper(16, 16, 0xff5fa2, 0x7a2f5c);
grid.position.y = 0.002;
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

// Gallery (tombol H) — beberapa geometry & material lain
function makeGallery() {
  const defs = [
    {
      geo: () => new THREE.ConeGeometry(0.6, 1.4, sphereSeg()),
      mat: new THREE.MeshLambertMaterial({ color: 0xff7eb6 }),
      pos: [3.4, 0.7, -1.6], seg: "cone"
    },
    {
      geo: () => new THREE.TorusGeometry(0.55, 0.2, Math.max(6, Math.round(sphereSeg() / 2)), sphereSeg()),
      mat: new THREE.MeshStandardMaterial({ color: 0xffd1e8, roughness: 0.2, metalness: 0.6 }),
      pos: [-3.2, 0.9, 2], seg: "torus"
    },
    {
      geo: () => new THREE.CylinderGeometry(0.5, 0.5, 1.2, sphereSeg()),
      mat: new THREE.MeshToonMaterial({ color: 0xff4d94 }),
      pos: [-3.4, 0.6, -2.2], seg: "cylinder"
    },
    {
      geo: () => new THREE.TorusKnotGeometry(0.45, 0.14, sphereSeg() * 3, 12),
      mat: new THREE.MeshNormalMaterial(),
      pos: [3.2, 1, 2.6], seg: "knot"
    },
    {
      geo: () => new THREE.IcosahedronGeometry(0.6, 0),
      mat: new THREE.MeshStandardMaterial({ color: 0xc04fff, roughness: 0.35, flatShading: true }),
      pos: [-0.6, 0.8, 3.2], seg: null
    }
  ];

  defs.forEach((d) => {
    const mesh = new THREE.Mesh(d.geo(), d.mat);
    mesh.position.set(...d.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    mesh.userData.rebuild = d.seg ? d.geo : null;
    scene.add(mesh);
    galleryMeshes.push(mesh);
  });
}
makeGallery();

// ---------- 8. Light ----------
const ambient = new THREE.AmbientLight(0xffd6ea, 0.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, params.lightIntensity);
sun.position.copy(LIGHT_START);

// ---------- 9. Shadow ----------
sun.castShadow = true;
sun.shadow.mapSize.set(params.shadowQuality, params.shadowQuality);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 20;
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(sun.target);

const lightMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 8),
  new THREE.MeshBasicMaterial({ color: 0xfff2a8 })
);
lightMarker.position.copy(sun.position);
scene.add(lightMarker);

const lightHelper = new THREE.DirectionalLightHelper(sun, 1, 0xffd1e8);
const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
lightHelper.visible = false;
shadowHelper.visible = false;
scene.add(lightHelper);
scene.add(shadowHelper);

// ---------- UI helpers ----------
const fmt2 = (n) => Number(n).toFixed(2);

function visibleObjectCount() {
  return meshes.length + (state.gallery ? galleryMeshes.length : 0);
}

function updateStats() {
  $("statCamera").textContent = params.cameraMode === "perspective" ? "Perspective" : "Orthographic";
  $("statObjects").textContent = String(visibleObjectCount());
  $("statRenderer").textContent = "WebGL";
  $("statLight").textContent = fmt2(params.lightIntensity);
  $("statAnim").textContent = state.paused ? "Paused" : "Playing";

  const badge = $("badge");
  badge.textContent = state.paused ? "PAUSED · THREE.JS" : "RUNNING · THREE.JS";
  badge.classList.toggle("paused", state.paused);

  $("btnCamera").classList.toggle("active", params.cameraMode === "orthographic");
  $("btnOrbit").classList.toggle("active", state.lightOrbit);
  $("btnGallery").classList.toggle("active", state.gallery);
  $("btnPause").classList.toggle("active", state.paused);
}

function updateHelpers() {
  lightHelper.visible = params.helpers;
  shadowHelper.visible = params.helpers;
}

// ---------- Aksi ----------
function setCameraMode(mode) {
  if (mode === params.cameraMode && camera === (mode === "perspective" ? perspCamera : orthoCamera)) return;
  params.cameraMode = mode;
  const next = mode === "perspective" ? perspCamera : orthoCamera;
  next.position.copy(camera.position);
  next.quaternion.copy(camera.quaternion);
  camera = next;
  controls.object = camera;
  controls.update();
  $("cameraMode").value = mode;
  $("fov").disabled = mode !== "perspective";
  updateStats();
}

function setLightIntensity(v) {
  params.lightIntensity = v;
  sun.intensity = v;
  $("lightIntensity").value = v;
  $("lightVal").textContent = fmt2(v);
  updateStats();
}

function setShadowQuality(size) {
  params.shadowQuality = size;
  sun.shadow.mapSize.set(size, size);
  if (sun.shadow.map) {
    sun.shadow.map.dispose();
    sun.shadow.map = null;
  }
  $("shadowQuality").value = String(size);
}

function setSegments(n) {
  params.segments = n;
  $("segments").value = n;
  $("segVal").textContent = String(n);

  sphere.geometry.dispose();
  sphere.geometry = new THREE.SphereGeometry(0.7, sphereSeg(), Math.max(3, Math.round(sphereSeg() / 2)));

  galleryMeshes.forEach((m) => {
    if (m.userData.rebuild) {
      m.geometry.dispose();
      m.geometry = m.userData.rebuild();
    }
  });
}

function setFov(v) {
  params.fov = v;
  perspCamera.fov = v;
  perspCamera.updateProjectionMatrix();
  $("fov").value = v;
  $("fovVal").textContent = `${v}°`;
}

function setGallery(on) {
  state.gallery = on;
  galleryMeshes.forEach((m) => (m.visible = on));
  updateStats();
}

function setPaused(on) {
  state.paused = on;
  updateStats();
}

function setLightOrbit(on) {
  state.lightOrbit = on;
  if (!on) {
    sun.position.copy(LIGHT_START);
    lightMarker.position.copy(sun.position);
  }
  updateStats();
}

function resetScene() {
  // parameter + UI
  Object.assign(params, DEFAULTS);
  state.paused = false;
  state.lightOrbit = false;
  state.gallery = false;

  setCameraMode("perspective");
  setFov(DEFAULTS.fov);
  setLightIntensity(DEFAULTS.lightIntensity);
  setShadowQuality(DEFAULTS.shadowQuality);
  setSegments(DEFAULTS.segments);
  setGallery(false);
  setLightOrbit(false);

  $("ocEnabled").checked = DEFAULTS.ocEnabled;
  $("ocPan").checked = DEFAULTS.ocPan;
  $("ocDamping").checked = DEFAULTS.ocDamping;
  $("dampFactor").value = DEFAULTS.dampFactor;
  $("dampVal").textContent = fmt2(DEFAULTS.dampFactor);
  $("rotSpeed").value = DEFAULTS.rotSpeed;
  $("rotVal").textContent = fmt2(DEFAULTS.rotSpeed);
  $("zoomSpeed").value = DEFAULTS.zoomSpeed;
  $("zoomVal").textContent = fmt2(DEFAULTS.zoomSpeed);
  $("helpers").checked = DEFAULTS.helpers;
  applyControlParams();
  updateHelpers();

  // kamera
  camera.position.copy(CAMERA_START);
  controls.target.copy(TARGET_START);
  if (camera.isOrthographicCamera) camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.update();

  // cube utama
  cube.position.copy(CUBE_START);
  cube.rotation.set(0, Math.PI / 4, 0);
  updateStats();
}

// ---------- Event UI ----------
const blurAfter = (el) => el.addEventListener("change", () => el.blur());

$("cameraMode").addEventListener("change", (e) => { setCameraMode(e.target.value); e.target.blur(); });
$("fov").addEventListener("input", (e) => setFov(Number(e.target.value)));
$("lightIntensity").addEventListener("input", (e) => setLightIntensity(Number(e.target.value)));
$("shadowQuality").addEventListener("change", (e) => { setShadowQuality(Number(e.target.value)); e.target.blur(); });
$("segments").addEventListener("input", (e) => setSegments(Number(e.target.value)));

$("ocEnabled").addEventListener("change", (e) => { params.ocEnabled = e.target.checked; applyControlParams(); });
$("ocPan").addEventListener("change", (e) => { params.ocPan = e.target.checked; applyControlParams(); });
$("ocDamping").addEventListener("change", (e) => { params.ocDamping = e.target.checked; applyControlParams(); });
$("dampFactor").addEventListener("input", (e) => {
  params.dampFactor = Number(e.target.value);
  $("dampVal").textContent = fmt2(params.dampFactor);
  applyControlParams();
});
$("rotSpeed").addEventListener("input", (e) => {
  params.rotSpeed = Number(e.target.value);
  $("rotVal").textContent = fmt2(params.rotSpeed);
  applyControlParams();
});
$("zoomSpeed").addEventListener("input", (e) => {
  params.zoomSpeed = Number(e.target.value);
  $("zoomVal").textContent = fmt2(params.zoomSpeed);
  applyControlParams();
});
$("helpers").addEventListener("change", (e) => { params.helpers = e.target.checked; updateHelpers(); });

["fov", "lightIntensity", "segments", "dampFactor", "rotSpeed", "zoomSpeed"].forEach((id) => blurAfter($(id)));

const toggleCamera = () => setCameraMode(params.cameraMode === "perspective" ? "orthographic" : "perspective");

$("btnCamera").addEventListener("click", toggleCamera);
$("btnOrbit").addEventListener("click", () => setLightOrbit(!state.lightOrbit));
$("btnGallery").addEventListener("click", () => setGallery(!state.gallery));
$("btnPause").addEventListener("click", () => setPaused(!state.paused));
$("btnReset").addEventListener("click", resetScene);

// ---------- Keyboard ----------
const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLSelectElement) return;
  const k = e.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();

  if (!e.repeat) {
    if (k === "c") toggleCamera();
    else if (k === "l") setLightOrbit(!state.lightOrbit);
    else if (k === "h") setGallery(!state.gallery);
    else if (k === "g") setPaused(!state.paused);
    else if (k === "r") resetScene();
  }
  keys.add(k);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

// ---------- 11. Responsive rendering ----------
function onResize() {
  sizes.width = app.clientWidth;
  sizes.height = app.clientHeight;
  const a = aspect();

  perspCamera.aspect = a;
  perspCamera.updateProjectionMatrix();

  orthoCamera.left = -ORTHO_SIZE * a;
  orthoCamera.right = ORTHO_SIZE * a;
  orthoCamera.top = ORTHO_SIZE;
  orthoCamera.bottom = -ORTHO_SIZE;
  orthoCamera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener("resize", onResize);
new ResizeObserver(onResize).observe(app);

// ---------- 10. Animation loop (delta time) ----------
const clock = new THREE.Clock();
let elapsed = 0;
let frames = 0;
let fpsTimer = 0;
const MOVE_SPEED = 3;
const TURN_SPEED = 2.2;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);

  if (!state.paused) {
    elapsed += dt;

    // Cube utama: rotasi pelan + input keyboard
    cube.rotation.y += dt * 0.4;
    const dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    const dz = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
    cube.position.x = THREE.MathUtils.clamp(cube.position.x + dx * MOVE_SPEED * dt, -7, 7);
    cube.position.z = THREE.MathUtils.clamp(cube.position.z + dz * MOVE_SPEED * dt, -7, 7);
    if (keys.has("q")) cube.rotation.y += TURN_SPEED * dt;
    if (keys.has("e")) cube.rotation.y -= TURN_SPEED * dt;

    // Sphere memantul, cube kecil berputar
    sphere.position.y = 0.7 + Math.abs(Math.sin(elapsed * 1.8)) * 0.6;
    basicCube.rotation.x += dt * 0.9;
    basicCube.rotation.y += dt * 0.7;

    // Gallery
    if (state.gallery) {
      galleryMeshes.forEach((m, i) => {
        m.rotation.y += dt * (0.4 + i * 0.12);
        if (m.geometry.type === "TorusGeometry") m.rotation.x += dt * 0.5;
      });
    }

    // Light orbit
    if (state.lightOrbit) {
      const a = elapsed * 0.7;
      sun.position.set(Math.cos(a) * 6, 6, Math.sin(a) * 6);
      lightMarker.position.copy(sun.position);
    }
  }

  controls.update();

  if (params.helpers) {
    lightHelper.update();
    shadowHelper.update();
  }

  renderer.render(scene, camera);

  // FPS + HUD
  frames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    $("statFps").textContent = String(Math.round(frames / fpsTimer));
    frames = 0;
    fpsTimer = 0;
    info.textContent =
      `cube (${cube.position.x.toFixed(1)}, ${cube.position.z.toFixed(1)}) · ` +
      `cam ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
  }

  requestAnimationFrame(tick);
}

updateStats();
onResize();
tick();
