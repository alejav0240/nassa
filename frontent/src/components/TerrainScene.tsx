import { useEffect, useRef, type KeyboardEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cropWindFlexibility, getWindMotion } from './terrainWind';

export interface TerrainSceneProps {
  crop: 'papa' | 'quinua' | 'haba' | 'cebada';
  weather: 'sun' | 'rain' | 'wind' | 'cloud';
  growth: number;
  wind: number;
  hour: number;
  layers: { rain: boolean; clouds: boolean; soil: boolean; sway: boolean };
  zoom: number;
}

const hash = (x: number, z: number) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
const rng = (seed: number) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
const wave = (x: number, z: number) => Math.sin(x * .18 + z * .075) * .64 + Math.cos(z * .27 - x * .095) * .41 + Math.sin(z * .52 + x * .22) * .13;
const terrainHeight = (x: number, z: number) => {
  const broad = wave(x, z) + .065 * x - .043 * z + .22 * Math.sin((x + z) * .30);
  const distant = Math.max(0, Math.abs(x) - 17, Math.abs(z) - 15);
  return .37 + broad + (Math.sin(x * .105 + z * .17) + Math.cos(z * .13 - x * .065)) * Math.min(2.3, distant * .14);
};
const crest = (x: number, z: number) => terrainHeight(x, z) + .29 + .38 * Math.pow(Math.max(0, Math.cos((x + 10.6) * Math.PI / 2.65)), 7);

function sculptedMesh(width: number, depth: number, nx: number, nz: number, height: (x: number, z: number) => number, color: (x: number, z: number, h: number, noise: number) => number) {
  // Build the grid directly in X/Y/Z. Rotating PlaneGeometry and then
  // reading its transformed coordinates mirrored the Z axis and made soil
  // layers appear turned when the terrain was tilted.
  const vertices: number[] = []; const colors: number[] = []; const indices: number[] = []; const current = new THREE.Color();
  for (let iz = 0; iz <= nz; iz += 1) for (let ix = 0; ix <= nx; ix += 1) {
    const x = -width / 2 + ix / nx * width; const z = -depth / 2 + iz / nz * depth; const h = height(x, z);
    vertices.push(x, h, z); current.setHex(color(x, z, h, hash(Math.floor(x * 2.4), Math.floor(z * 2.4)))); colors.push(current.r, current.g, current.b);
    if (ix < nx && iz < nz) { const a = iz * (nx + 1) + ix; indices.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}

function thickSoilMesh(width: number, depth: number, nx: number, nz: number, topHeight: (x: number, z: number) => number, thickness: number) {
  const vertices: number[] = []; const indices: number[] = []; const colors: number[] = [];
  const topColor = new THREE.Color(0x78553b); const sideColor = new THREE.Color(0x60432f);
  const index = (layer: number, iz: number, ix: number) => layer * (nz + 1) * (nx + 1) + iz * (nx + 1) + ix;
  for (let layer = 0; layer < 2; layer += 1) for (let iz = 0; iz <= nz; iz += 1) for (let ix = 0; ix <= nx; ix += 1) {
    const x = -width / 2 + ix / nx * width; const z = -depth / 2 + iz / nz * depth; const top = topHeight(x, z);
    vertices.push(x, top - layer * thickness, z); const color = layer === 0 ? topColor : sideColor; colors.push(color.r, color.g, color.b);
  }
  for (let iz = 0; iz < nz; iz += 1) for (let ix = 0; ix < nx; ix += 1) {
    const topLeft = index(0, iz, ix); const topRight = index(0, iz, ix + 1); const topNext = index(0, iz + 1, ix); const topNextRight = index(0, iz + 1, ix + 1);
    const bottomLeft = index(1, iz, ix); const bottomRight = index(1, iz, ix + 1); const bottomNext = index(1, iz + 1, ix); const bottomNextRight = index(1, iz + 1, ix + 1);
    indices.push(topLeft, topNext, topRight, topRight, topNext, topNextRight, bottomLeft, bottomRight, bottomNext, bottomRight, bottomNextRight, bottomNext);
    if (iz === 0) indices.push(topLeft, topRight, bottomLeft, topRight, bottomRight, bottomLeft);
    if (iz === nz - 1) indices.push(topNext, bottomNext, topNextRight, topNextRight, bottomNext, bottomNextRight);
    if (ix === 0) indices.push(topLeft, bottomLeft, topNext, topNext, bottomLeft, bottomNext);
    if (ix === nx - 1) indices.push(topRight, topNextRight, bottomRight, topNextRight, bottomNextRight, bottomRight);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function stick(parent: THREE.Group, from: number[], to: number[], radius: number, material: THREE.Material) {
  const start = new THREE.Vector3(from[0], from[1], from[2]); const end = new THREE.Vector3(to[0], to[1], to[2]); const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .65, radius, direction.length(), 5), material);
  mesh.position.copy(start).add(end).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); mesh.castShadow = true; parent.add(mesh); return mesh;
}

function leafGeometry() {
  const points: number[] = []; const indices: number[] = [];
  for (let i = 0; i <= 8; i += 1) { const t = i / 8; const width = Math.sin(t * Math.PI) * .23; const y = t * .22 + Math.sin(t * Math.PI) * .1; points.push(t * 1.05, y, -width, t * 1.05, y, width); }
  for (let i = 0; i < 8; i += 1) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}

function addCrops(world: THREE.Group, props: TerrainSceneProps) {
  const stem = new THREE.MeshStandardMaterial({ color: 0x477a38, roughness: .9 });
  const leaves = [0x4b8b42, 0x579744, 0x6da54f, 0x3c7e42].map((color) => new THREE.MeshStandardMaterial({ color, roughness: .92, side: THREE.DoubleSide }));
  const flowers = new THREE.MeshStandardMaterial({ color: 0xe8def4, roughness: .85 });
  const flowerCore = new THREE.MeshStandardMaterial({ color: 0xe8b65e, roughness: .9 });
  const quinoa = [0x9e583b, 0xb86a46, 0xcb9b62, 0x8c7847, 0xac5367].map((color) => new THREE.MeshStandardMaterial({ color, roughness: .87 }));
  const haba = new THREE.MeshStandardMaterial({ color: 0x4b8040, roughness: .88 });
  const barley = [0xd5ba66, 0xdfc67b, 0xbba15d].map((color) => new THREE.MeshStandardMaterial({ color, roughness: .85, side: THREE.DoubleSide }));
  const leafGeo = leafGeometry(); const stemGeo = new THREE.CylinderGeometry(.035, .065, 1.2, 5); const growth = props.growth / 100; const group = new THREE.Group();
  const papa = (core: THREE.Group, seed: number, row: number) => { const stemMesh = new THREE.Mesh(stemGeo, stem); stemMesh.position.y = .58; stemMesh.castShadow = true; core.add(stemMesh); for (let k = 0; k < 3; k += 1) for (let a = 0; a < 5; a += 1) { const leaf = new THREE.Mesh(leafGeo, leaves[(k + a + row) % leaves.length]); const angle = a / 5 * Math.PI * 2 + k * 1.4 + rng(seed) * .5; leaf.rotation.order = 'YXZ'; leaf.rotation.y = angle; leaf.rotation.z = -.27 + k * .14; leaf.position.set(Math.cos(angle) * .045, .27 + k * .285, Math.sin(angle) * .045); leaf.scale.set(.85 + k * .17, .85 + k * .13, .9 + k * .12); leaf.castShadow = true; core.add(leaf); } if (rng(seed + 23) > .46) { const flower = new THREE.Group(); flower.position.y = 1.22; flower.add(new THREE.Mesh(new THREE.SphereGeometry(.065, 6, 5), flowerCore)); for (let q = 0; q < 5; q += 1) { const petal = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), flowers); petal.position.set(Math.cos(q * Math.PI * 2 / 5) * .09, .005, Math.sin(q * Math.PI * 2 / 5) * .09); petal.scale.set(.8, .28, .7); flower.add(petal); } core.add(flower); } };
  const quinua = (core: THREE.Group, seed: number, row: number) => { const height = 1.8 + rng(seed) * .55; stick(core, [0, 0, 0], [0, height * .83, 0], .045, stem); for (let tier = 0; tier < 6; tier += 1) for (let side = 0; side < 3; side += 1) { const angle = side * Math.PI * 2 / 3 + tier * 1.05; const reach = .43 + .12 * rng(seed + tier * 9 + side); const end = [Math.cos(angle) * reach, .28 + tier * .215 + .16, Math.sin(angle) * reach]; stick(core, [0, .28 + tier * .215, 0], end, .015, stem); const leaf = new THREE.Mesh(leafGeo, leaves[(tier + side) % 4]); leaf.position.set(end[0], end[1], end[2]); leaf.rotation.y = angle; leaf.rotation.z = .18; leaf.scale.set(.57, .8, .7); core.add(leaf); } const panicle = quinoa[row % quinoa.length]; for (let k = 0; k < 26; k += 1) { const t = k / 26; const angle = k * 2.4 + seed; const spread = .11 + Math.sin(t * Math.PI) * .20; const grain = new THREE.Mesh(new THREE.SphereGeometry(.073 + (1 - t) * .024, 5, 5), panicle); grain.position.set(Math.cos(angle) * spread * (.4 + rng(seed + k)), height * .63 + t * .93, Math.sin(angle) * spread * (.4 + rng(seed + k))); grain.scale.set(.86, 1.35, .86); core.add(grain); } };
  const habaBuilder = (core: THREE.Group, seed: number, row: number) => { const height = 1.6 + rng(seed) * .3; for (let stalk = 0; stalk < 3; stalk += 1) { const angle = stalk * 2.094 + seed; const x = Math.cos(angle) * .13; const z = Math.sin(angle) * .13; stick(core, [x * .3, 0, z * .3], [x, height - stalk * .11, z], .033, stem); for (let level = 0; level < 5; level += 1) for (const side of [-1, 1]) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), leaves[(level + stalk) % 4]); const a = level * 2.3 + stalk + side * .75; leaf.position.set(x + Math.cos(a) * .26, .28 + level * .25, z + Math.sin(a) * .26); leaf.scale.set(.27, .065, .135); leaf.rotation.y = -a; core.add(leaf); } for (let pod = 0; pod < 3; pod += 1) { const a = pod * 2.5 + stalk; const podMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.078, .32, 4, 6), haba); podMesh.position.set(x + Math.cos(a) * .17, .5 + pod * .32, z + Math.sin(a) * .17); podMesh.rotation.z = .55; core.add(podMesh); } } };
  const cebada = (core: THREE.Group, seed: number, row: number) => { for (let stalk = 0; stalk < 5; stalk += 1) { const angle = stalk * 2.4 + seed; const spread = .11 + .13 * rng(seed + stalk); const x = Math.cos(angle) * spread; const z = Math.sin(angle) * spread; const height = 1.25 + rng(seed + stalk + 8) * .32; stick(core, [x * .3, 0, z * .3], [x, height, z], .018, stem); for (let j = 0; j < 3; j += 1) { const blade = new THREE.Mesh(leafGeo, leaves[(j + stalk) % 4]); blade.position.set(x, .18 + j * .23, z); blade.rotation.y = angle + j * 2; blade.rotation.z = .5; blade.scale.set(.68, .48, .24); core.add(blade); } const grainMat = barley[(stalk + row) % 3]; for (let j = 0; j < 10; j += 1) for (const side of [-1, 1]) { const y = height + j * .064; const kernel = new THREE.Mesh(new THREE.SphereGeometry(.055, 5, 4), grainMat); kernel.position.set(x + side * .062, y, z); kernel.scale.set(.7, 1.25, .65); core.add(kernel); stick(core, [x + side * .06, y, z], [x + side * (.26 + j * .009), y + .39, z], .006, grainMat); } } };
  const builders = { papa, quinua, haba: habaBuilder, cebada };
  for (let row = 0; row < 9; row += 1) for (let index = 0; index < 13; index += 1) { const seed = row * 31 + index * 19 + 3; const plant = new THREE.Group(); const x = -10.6 + row * 2.65 + (rng(seed) - .5) * .25; const z = -8.55 + index * 1.43 + (rng(seed + 10) - .5) * .22; plant.position.set(x, crest(x, z) + .03, z); const core = new THREE.Group(); plant.add(core); builders[props.crop](core, seed, row); core.scale.set(.95 * (.18 + growth * 1.14), .18 + growth * 1.14, .95 * (.18 + growth * 1.14)); plant.userData.seed = seed; plant.userData.flexibility = cropWindFlexibility[props.crop] * (.9 + rng(seed + 41) * .2); group.add(plant); }
  return group;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.filter(Boolean).forEach((material) => { const textureMaterial = material as THREE.MeshStandardMaterial; if (textureMaterial.map) textureMaterial.map.dispose(); material.dispose(); });
  });
}

function addParcelDetails(world: THREE.Group, plot: (x: number, z: number) => number, crop: string) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x987a55, roughness: 1 });
  const points: [number, number][] = [[-12.3, -9.6], [12.3, -9.6], [-12.3, 9.6], [12.3, 9.6]];
  points.forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, 1.65, 8), wood);
    post.position.set(x, plot(x, z) + .87, z); post.castShadow = true; world.add(post);
  });
  const ropeMaterial = new THREE.LineBasicMaterial({ color: 0xd4c7a0 });
  [[0, 1], [2, 3], [0, 2], [1, 3]].forEach(([start, end]) => {
    const [x1, z1] = points[start]; const [x2, z2] = points[end]; const ropePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 26; i += 1) { const t = i / 26; const x = x1 + (x2 - x1) * t; const z = z1 + (z2 - z1) * t; ropePoints.push(new THREE.Vector3(x, plot(x, z) + 1.18 - .13 * Math.sin(Math.PI * t), z)); }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ropePoints), ropeMaterial));
  });
  const sign = new THREE.Group();
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.7, .16), wood); signPost.position.y = .9; sign.add(signPost);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, .85, .17), new THREE.MeshStandardMaterial({ color: 0xf4eedb, roughness: .8 })); board.position.y = 1.7; board.castShadow = true; sign.add(board);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160; const context = canvas.getContext('2d');
  if (context) { context.fillStyle = '#f4eedb'; context.fillRect(0, 0, 512, 160); context.fillStyle = '#2e6543'; context.font = 'bold 46px Arial'; context.textAlign = 'center'; context.fillText(crop.toUpperCase(), 256, 69); context.font = '28px Arial'; context.fillStyle = '#6a866c'; context.fillText('PARCELA PILOTO', 256, 119); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.68, .78), new THREE.MeshBasicMaterial({ map: texture })); face.position.set(0, 1.71, .1); sign.add(face);
  sign.position.set(-10.2, plot(-10.2, 10) + .15, 11.1); world.add(sign);
}

export function TerrainScene(props: TerrainSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const worldRef = useRef<THREE.Group | null>(null);
  const plantsRef = useRef<THREE.Group | null>(null);
  const furrowsRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const reduceMotionRef = useRef(false);
  propsRef.current = props;
  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'); reduceMotionRef.current = motionQuery.matches;
    const updateMotion = () => { reduceMotionRef.current = motionQuery.matches; }; motionQuery.addEventListener?.('change', updateMotion);
    const scene = new THREE.Scene(); sceneRef.current = scene; const camera = new THREE.PerspectiveCamera(42, 1, .1, 350); cameraRef.current = camera; camera.position.set(27 / props.zoom, 21 / props.zoom, 31 / props.zoom);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35; host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controlsRef.current = controls; controls.enableDamping = true; controls.dampingFactor = .065; controls.target.set(0, .9, 0); controls.minDistance = 15; controls.maxDistance = 89; controls.maxPolarAngle = Math.PI / 2 - .055; controls.minPolarAngle = .20;
    const hemi = new THREE.HemisphereLight(0xd7edff, 0x655a42, 2); const sun = new THREE.DirectionalLight(0xffecc5, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30; const ambient = new THREE.AmbientLight(0xffffff, .35); scene.add(hemi, sun, sun.target, ambient); sun.target.position.set(0, 0, 0);
    const world = new THREE.Group(); worldRef.current = world; scene.add(world);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true }); const ground = new THREE.Mesh(sculptedMesh(180, 180, 148, 148, (x, z) => terrainHeight(x, z) - .95, (x, z, h, n) => Math.hypot(x, z) < 19 ? (n > .63 ? 0x80946a : 0x769162) : h > 1.3 ? 0x9aa185 : n > .55 ? 0x718c66 : 0x78936f), groundMaterial); ground.receiveShadow = true; scene.add(ground);
    const soilMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true, side: THREE.DoubleSide }); const plot = (x: number, z: number) => terrainHeight(x, z) + .28; const soil = new THREE.Mesh(sculptedMesh(25.8, 20.8, 94, 84, plot, (x, z, h, n) => n > .63 ? 0x927254 : n > .28 ? 0x866347 : 0x78553b), soilMaterial); soil.castShadow = true; soil.receiveShadow = true; world.add(soil);
    const walls = new THREE.Mesh(thickSoilMesh(25.8, 20.8, 24, 20, plot, 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, side: THREE.DoubleSide })); walls.receiveShadow = true; world.add(walls); addParcelDetails(world, plot, props.crop);
    const furrows = new THREE.Group(); furrowsRef.current = furrows; const ridgesMaterial = new THREE.MeshStandardMaterial({ color: 0x866044, roughness: 1, side: THREE.DoubleSide });
    for (let row = 0; row < 9; row += 1) { const vertices: number[] = []; const indices: number[] = []; const segments = 96; const across = 12; const cx = -10.6 + row * 2.65; for (let iz = 0; iz <= segments; iz += 1) for (let ix = 0; ix <= across; ix += 1) { const z = -9.55 + iz / segments * 19.1; const u = ix / across * 2 - 1; const x = cx + u * .9; const rise = .58 * Math.pow(Math.max(0, 1 - u * u), 1.45); vertices.push(x, plot(x, z) + rise + .012, z); if (ix < across && iz < segments) { const a = iz * (across + 1) + ix; indices.push(a, a + across + 1, a + 1, a + 1, a + across + 1, a + across + 2); } } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals(); const ridge = new THREE.Mesh(geo, ridgesMaterial); ridge.castShadow = true; ridge.receiveShadow = true; furrows.add(ridge); }
    furrows.visible = props.layers.soil; world.add(furrows);
    const puddles = new THREE.Group(); const puddleMaterial = new THREE.MeshPhysicalMaterial({ color: 0x638a8c, metalness: .1, roughness: .26, transparent: true, opacity: .7, depthWrite: false }); for (let i = 0; i < 17; i += 1) { const row = i % 8; const x = -9.27 + row * 2.65 + (hash(i, 3) - .5) * .2; const z = -8.1 + hash(i, 5) * 16; const water = new THREE.Mesh(new THREE.CircleGeometry(.28 + hash(i, 9) * .55, 20), puddleMaterial); water.rotation.x = -Math.PI / 2; water.scale.y = .45 + hash(i, 15) * .5; water.position.set(x, plot(x, z) + .022, z); puddles.add(water); } puddles.visible = props.weather === 'rain'; world.add(puddles);
    const pebbles = new THREE.Group(); const pebbleMaterials = [0x9a8971, 0x746d5c, 0xada28b].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 })); const pebbleGeometry = new THREE.IcosahedronGeometry(1, 0); for (let i = 0; i < 235; i += 1) { const x = (hash(i, 15) - .5) * 25.1; const z = (hash(i, 16) - .5) * 20; if (Math.abs(Math.cos((x + 10.6) * Math.PI / 2.65)) > .67) continue; const stone = new THREE.Mesh(pebbleGeometry, pebbleMaterials[i % 3]); const size = .045 + hash(i, 19) * .125; stone.scale.set(size * 1.4, size * .57, size); stone.position.set(x, plot(x, z) + size * .23 + .02, z); stone.castShadow = true; pebbles.add(stone); } world.add(pebbles);
    const plants = addCrops(world, props); plantsRef.current = plants; world.add(plants);
    const hills = new THREE.Group(); const hillMaterials = [0x789477, 0x87a08a, 0x9dac8d].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 })); for (let i = 0; i < 27; i += 1) { const angle = i / 27 * Math.PI * 2; const radius = 43 + rng(i + 27) * 36; const height = 7 + rng(i + 12) * 7; const hill = new THREE.Mesh(new THREE.ConeGeometry(8 + rng(i + 41) * 11, height, 6), hillMaterials[i % 3]); hill.position.set(Math.cos(angle) * radius, height / 2 - 1.2, Math.sin(angle) * radius); hill.receiveShadow = true; hills.add(hill); } scene.add(hills);
    const clouds = new THREE.Group(); const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f9f7, roughness: 1, transparent: true, opacity: .84, depthWrite: false }); for (let i = 0; i < 6; i += 1) { const cloud = new THREE.Group(); const pieces = 4 + Math.floor(rng(i + 3) * 4); for (let j = 0; j < pieces; j += 1) { const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), cloudMaterial); puff.position.set(j * 1.2 - pieces * .6, Math.sin(j * 1.7) * .34, (rng(i * 17 + j) - .5) * 1.3); puff.scale.set(1.7 + rng(i + j + 6), .6 + rng(i * 3 + j) * .45, 1.08); cloud.add(puff); } cloud.position.set(-17 + i * 6, 12 + rng(i * 4) * 5, -11 + rng(i + 12) * 18); clouds.add(cloud); } scene.add(clouds);
    const drops = 1700; const rainPositions = new Float32Array(drops * 3); const rainVelocity = new Float32Array(drops); for (let i = 0; i < drops; i += 1) { rainPositions[i * 3] = (Math.random() - .5) * 32; rainPositions[i * 3 + 1] = Math.random() * 20; rainPositions[i * 3 + 2] = (Math.random() - .5) * 28; rainVelocity[i] = .18 + Math.random() * .24; } const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3)); const rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0xc9e1ee, size: .09, transparent: true, opacity: .82, depthWrite: false, sizeAttenuation: true })); scene.add(rain);
    const windTrails = new THREE.Group(); const trails: THREE.Line[] = []; for (let i = 0; i < 22; i += 1) { const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, (_, k) => new THREE.Vector3(k * .32, Math.sin(k * .33) * .11, 0))); const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe5f4e6, transparent: true, opacity: .37 })); line.position.set(-18 + rng(i + 90) * 32, 1.7 + rng(i + 59) * 5, -12 + rng(i + 104) * 24); windTrails.add(line); trails.push(line); } scene.add(windTrails);
     const resize = () => { const width = host.clientWidth; const height = host.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }; const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize(); const clock = new THREE.Clock(); let frame = 0; let animation = 0; let isVisible = true;
     const animate = () => { if (!isVisible) { animation = 0; return; } animation = requestAnimationFrame(animate); const current = propsRef.current; const time = clock.getElapsedTime(); const sunAngle = (((current.hour - 6) / 13) * .85 + .075) * Math.PI; sun.position.set(Math.cos(sunAngle) * 32, Math.max(3, Math.sin(sunAngle) * 37), -21 + Math.sin(sunAngle) * 9); sun.intensity = (.6 + Math.sin(sunAngle) * 2.2) * (current.weather === 'rain' ? .52 : current.weather === 'cloud' ? .75 : 1); hemi.intensity = (.8 + Math.sin(sunAngle) * 1.3) * (current.weather === 'rain' ? .8 : 1); scene.background = new THREE.Color(.62 + (1 - Math.sin(sunAngle)) * .08, .76 + (1 - Math.sin(sunAngle)) * .01, .78 - (1 - Math.sin(sunAngle)) * .04); clouds.visible = current.layers.clouds && current.weather !== 'sun'; rain.visible = current.layers.rain && current.weather === 'rain'; furrows.visible = current.layers.soil; windTrails.visible = current.weather === 'wind' && current.wind > 3; const activePlants = plantsRef.current ?? plants; activePlants.children.forEach((plant) => { const seed = Number(plant.userData.seed); const core = plant.children[0]; if (!core) return; const motion = getWindMotion(time, current.wind, current.layers.sway, reduceMotionRef.current, seed, Number(plant.userData.flexibility) || 1); core.rotation.z = motion.z; core.rotation.x = motion.x; }); if (rain.visible) { const drift = current.wind / 80 * .11; for (let i = 0; i < drops; i += 1) { const k = i * 3; rainPositions[k + 1] -= rainVelocity[i] * 1.4; rainPositions[k] += drift; if (rainPositions[k + 1] < 2) { rainPositions[k + 1] = 13 + Math.random() * 7; rainPositions[k] = (Math.random() - .5) * 28; } } rainGeometry.attributes.position.needsUpdate = true; } if (windTrails.visible) trails.forEach((trail, index) => { trail.position.x += .035 + current.wind * .002; if (trail.position.x > 21) trail.position.x = -19; (trail.material as THREE.LineBasicMaterial).opacity = .15 + Math.sin(time * 1.5 + index) * .07; }); controls.update(); frame += 1; if (frame % 2 === 0) renderer.render(scene, camera); };
     const visibilityObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { isVisible = entry?.isIntersecting ?? true; if (isVisible && !animation) animation = requestAnimationFrame(animate); }, { threshold: .01 }); visibilityObserver?.observe(host); animate(); return () => { cancelAnimationFrame(animation); motionQuery.removeEventListener?.('change', updateMotion); resizeObserver.disconnect(); visibilityObserver?.disconnect(); controls.dispose(); disposeObject(scene); renderer.dispose(); if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement); sceneRef.current = null; worldRef.current = null; plantsRef.current = null; furrowsRef.current = null; cameraRef.current = null; controlsRef.current = null; };
  }, []);
  useEffect(() => {
    const world = worldRef.current;
    if (!world || !plantsRef.current) return;
    const nextPlants = addCrops(world, props);
    const previousPlants = plantsRef.current;
    world.remove(previousPlants);
    disposeObject(previousPlants);
    plantsRef.current = nextPlants;
    world.add(nextPlants);
  }, [props.crop]);
  useEffect(() => {
    const plants = plantsRef.current;
    if (!plants) return;
    const scale = 0.18 + props.growth / 100 * 1.14;
    plants.children.forEach((plant) => {
      const core = plant.children[0];
      if (core) core.scale.set(scale * 0.95, scale, scale * 0.95);
    });
  }, [props.growth]);
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const direction = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).add(direction.multiplyScalar(29 / props.zoom));
    controls.update();
  }, [props.zoom]);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const step = 0.12;
    if (event.key === 'ArrowLeft') controls.rotateLeft(step);
    else if (event.key === 'ArrowRight') controls.rotateLeft(-step);
    else if (event.key === 'ArrowUp') controls.rotateUp(step);
    else if (event.key === 'ArrowDown') controls.rotateUp(-step);
    else return;
    event.preventDefault();
    controls.update();
  };
  return <div ref={hostRef} tabIndex={0} onKeyDown={handleKeyDown} className="h-[330px] sm:h-[515px] w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--agro-lime)]" aria-label="Escena 3D interactiva del terreno. Usa las flechas para rotar la cámara." />;
}
