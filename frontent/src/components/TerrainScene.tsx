import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cropWindFlexibility, getWindMotion } from './terrainWind';

export interface TerrainSceneProps {
  crop: 'papa' | 'quinua' | 'haba' | 'cebada';
  weather: 'sun' | 'rain' | 'wind' | 'cloud' | 'snow';
  growth: number;
  wind: number;
  hour: number;
  layers: { rain: boolean; clouds: boolean; soil: boolean; sway: boolean; snow: boolean };
  zoom: number;
  cameraResetKey?: number;
}

type SceneRuntime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  soilMaterial: THREE.MeshStandardMaterial;
  snowCover: THREE.Group;
  snowflakes: THREE.Points;
  snowGeometry: THREE.BufferGeometry;
  snowPositions: Float32Array;
  snowSpeeds: Float32Array;
  snowPhases: Float32Array;
  clouds: THREE.Group;
  rain: THREE.LineSegments;
  rainGeometry: THREE.BufferGeometry;
  rainPositions: Float32Array;
  rainVelocity: Float32Array;
  windTrails: THREE.Group;
  trails: THREE.Line[];
  puddles: THREE.Group;
  furrows: THREE.Group;
  cropInstances: THREE.InstancedMesh;
  cropKey: TerrainSceneProps['crop'];
  plantData: Array<{ x: number; z: number; seed: number; flexibility: number }>;
  props: TerrainSceneProps;
  frame: number;
  animation: number;
  visible: boolean;
  reducedMotion: boolean;
  lastRender: number;
};

const hash = (x: number, z: number) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
const rng = (seed: number) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
const wave = (x: number, z: number) => Math.sin(x * .18 + z * .075) * .64 + Math.cos(z * .27 - x * .095) * .41 + Math.sin(z * .52 + x * .22) * .13;
const terrainHeight = (x: number, z: number) => {
  const broad = wave(x, z) + .065 * x - .043 * z + .22 * Math.sin((x + z) * .30);
  const distant = Math.max(0, Math.abs(x) - 17, Math.abs(z) - 15);
  return .37 + broad + (Math.sin(x * .105 + z * .17) + Math.cos(z * .13 - x * .065)) * Math.min(2.3, distant * .14);
};
const plotHeight = (x: number, z: number) => terrainHeight(x, z) + .025;

function terrainGeometry(width: number, depth: number, nx: number, nz: number, colorAt: (x: number, z: number, noise: number) => number, heightAt = terrainHeight) {
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();
  for (let iz = 0; iz <= nz; iz += 1) for (let ix = 0; ix <= nx; ix += 1) {
    const x = -width / 2 + ix / nx * width;
    const z = -depth / 2 + iz / nz * depth;
    vertices.push(x, heightAt(x, z), z);
    color.setHex(colorAt(x, z, hash(Math.floor(x * 2.4), Math.floor(z * 2.4))));
    colors.push(color.r, color.g, color.b);
    if (ix < nx && iz < nz) {
      const a = iz * (nx + 1) + ix;
      indices.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addPart(parts: THREE.BufferGeometry[], source: THREE.BufferGeometry, colorHex: number, transform: THREE.Matrix4) {
  const geometry = source.clone();
  geometry.applyMatrix4(transform);
  const color = new THREE.Color(colorHex);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < geometry.attributes.position.count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  parts.push(geometry);
}

function partMatrix(position: THREE.Vector3, rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1)) {
  return new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
}

function segmentMatrix(start: THREE.Vector3, end: THREE.Vector3, radius: number) {
  const direction = end.clone().sub(start);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return new THREE.Matrix4().compose(start.clone().add(end).multiplyScalar(.5), quaternion, new THREE.Vector3(radius, direction.length(), radius));
}

function cropGeometry(crop: TerrainSceneProps['crop']) {
  const parts: THREE.BufferGeometry[] = [];
  const stemGeo = new THREE.CylinderGeometry(.72, 1, 1, 7, 1);
  const leafGeo = new THREE.SphereGeometry(1, 8, 6);
  const grainGeo = new THREE.SphereGeometry(1, 6, 5);
  const podGeo = new THREE.CapsuleGeometry(.55, 1, 4, 7);
  const green = [0x467b3f, 0x548d45, 0x639c50, 0x3b7040, 0x78a658];
  const stalk = 0x567746;
  const addStem = (from: THREE.Vector3, to: THREE.Vector3, radius: number, color = stalk) => addPart(parts, stemGeo, color, segmentMatrix(from, to, radius));
  const addLeaf = (position: THREE.Vector3, angle: number, scale: THREE.Vector3, color: number, pitch = 0) => {
    const rotation = new THREE.Euler(pitch, angle, Math.sin(angle) * .12, 'YXZ');
    addPart(parts, leafGeo, color, partMatrix(position, rotation, scale));
  };
  const addGrain = (position: THREE.Vector3, scale: THREE.Vector3, color: number, rotation = new THREE.Euler()) => addPart(parts, grainGeo, color, partMatrix(position, rotation, scale));

  if (crop === 'papa') {
    addStem(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.0, 0), .055);
    for (let tier = 0; tier < 3; tier += 1) for (let i = 0; i < 5; i += 1) {
      const angle = i / 5 * Math.PI * 2 + tier * 1.17;
      const length = .43 + tier * .07;
      addStem(new THREE.Vector3(0, .28 + tier * .23, 0), new THREE.Vector3(Math.cos(angle) * length * .72, .45 + tier * .25, Math.sin(angle) * length * .72), .018, 0x4d8042);
      addLeaf(new THREE.Vector3(Math.cos(angle) * length * .72, .45 + tier * .25, Math.sin(angle) * length * .72), angle, new THREE.Vector3(.14, .045, length * .58), green[(i + tier) % green.length], -.18);
    }
  } else if (crop === 'quinua') {
    const height = 1.72;
    addStem(new THREE.Vector3(0, 0, 0), new THREE.Vector3(.05, height, 0), .035, 0x6b7745);
    for (let tier = 0; tier < 4; tier += 1) for (let side = 0; side < 2; side += 1) {
      const angle = side * Math.PI + tier * 1.37;
      const y = .27 + tier * .27;
      const x = Math.cos(angle) * .37;
      const z = Math.sin(angle) * .37;
      addStem(new THREE.Vector3(0, y, 0), new THREE.Vector3(x, y + .16, z), .012, 0x687a46);
      addLeaf(new THREE.Vector3(x, y + .16, z), angle, new THREE.Vector3(.105, .035, .27), green[(tier + side + 1) % green.length], -.2);
    }
    for (let i = 0; i < 25; i += 1) {
      const t = i / 24;
      const angle = i * 2.399;
      const spread = .09 + Math.sin(t * Math.PI) * .21;
      addGrain(new THREE.Vector3(Math.cos(angle) * spread, 1.0 + t * .84, Math.sin(angle) * spread), new THREE.Vector3(.055, .085, .052), [0x9c5840, 0xba7647, 0xc79a5b, 0x8d7044][i % 4], new THREE.Euler(0, angle, .18));
    }
  } else if (crop === 'haba') {
    for (let stemIndex = 0; stemIndex < 3; stemIndex += 1) {
      const angle = stemIndex * Math.PI * 2 / 3;
      const baseX = Math.cos(angle) * .09;
      const baseZ = Math.sin(angle) * .09;
      const top = 1.22 + rng(stemIndex + 8) * .2;
      addStem(new THREE.Vector3(baseX, 0, baseZ), new THREE.Vector3(baseX * 1.5, top, baseZ * 1.5), .032, 0x4f7742);
      for (let tier = 0; tier < 4; tier += 1) for (const side of [-1, 1]) {
        const leafAngle = angle + side * .82 + tier * .36;
        const y = .3 + tier * .23;
        addLeaf(new THREE.Vector3(baseX + Math.cos(leafAngle) * .25, y, baseZ + Math.sin(leafAngle) * .25), leafAngle, new THREE.Vector3(.16, .052, .23), green[(tier + stemIndex + 1) % green.length], -.08);
      }
      for (let pod = 0; pod < 2; pod += 1) {
        const podPosition = new THREE.Vector3(baseX + Math.cos(angle + 1.2) * .18, .52 + pod * .31, baseZ + Math.sin(angle + 1.2) * .18);
        addPart(parts, podGeo, 0x578344, partMatrix(podPosition, new THREE.Euler(.2, angle, .62), new THREE.Vector3(.09, .22, .09)));
      }
    }
  } else {
    const gold = [0xc2a65e, 0xd2b970, 0xe0c984];
    for (let stalkIndex = 0; stalkIndex < 3; stalkIndex += 1) {
      const angle = stalkIndex * 2.27 + .35;
      const baseX = Math.cos(angle) * .11;
      const baseZ = Math.sin(angle) * .11;
      const height = 1.38 + rng(stalkIndex + 13) * .2;
      addStem(new THREE.Vector3(baseX * .2, 0, baseZ * .2), new THREE.Vector3(baseX, height, baseZ), .018, 0x71834c);
      for (let blade = 0; blade < 2; blade += 1) {
        const bladeAngle = angle + Math.PI * blade;
        const y = .25 + blade * .31;
        addLeaf(new THREE.Vector3(baseX + Math.cos(bladeAngle) * .18, y, baseZ + Math.sin(bladeAngle) * .18), bladeAngle, new THREE.Vector3(.045, .025, .38), green[(blade + stalkIndex) % green.length], -.28);
      }
      for (let grain = 0; grain < 7; grain += 1) {
        const y = height - .25 + grain * .055;
        for (const side of [-1, 1]) {
          const p = new THREE.Vector3(baseX + side * .045, y, baseZ);
          addGrain(p, new THREE.Vector3(.034, .065, .035), gold[(grain + stalkIndex) % gold.length]);
          const awnEnd = new THREE.Vector3(baseX + side * (.18 + grain * .008), y + .33, baseZ);
          addStem(p, awnEnd, .0042, 0xc2ab6b);
        }
      }
    }
  }

  stemGeo.dispose(); leafGeo.dispose(); grainGeo.dispose(); podGeo.dispose();
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error(`No se pudo construir la geometría del cultivo ${crop}`);
  merged.computeVertexNormals();
  return merged;
}

function createPlants(scene: THREE.Scene, crop: TerrainSceneProps['crop'], growth: number, data: SceneRuntime['plantData']) {
  data.forEach((plant) => { plant.flexibility = cropWindFlexibility[crop] * (.9 + rng(plant.seed + 41) * .2); });
  const geometry = cropGeometry(crop);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, data.length);
  mesh.name = `illustrative-crop-${crop}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.Color();
  data.forEach((plant, index) => {
    const variation = .86 + rng(plant.seed + 5) * .26;
    color.setRGB(variation, variation * (.96 + rng(plant.seed + 4) * .06), variation * (.9 + rng(plant.seed + 7) * .1));
    mesh.setColorAt(index, color);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  updatePlantMatrices(mesh, data, growth, crop, 0, 0, false, true);
  return mesh;
}

function updatePlantMatrices(mesh: THREE.InstancedMesh, data: SceneRuntime['plantData'], growth: number, crop: TerrainSceneProps['crop'], time: number, windAmount: number, reducedMotion: boolean, refreshBounds = false) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  data.forEach((plant, index) => {
    const motion = getWindMotion(time, windAmount, windAmount > 0, reducedMotion, plant.seed, plant.flexibility || cropWindFlexibility[crop]);
    position.set(plant.x, plotHeight(plant.x, plant.z), plant.z);
    rotation.setFromEuler(new THREE.Euler(motion.x, 0, motion.z));
    const size = .18 + growth / 100 * 1.14;
    scale.set(.95 * size, size, .95 * size);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (refreshBounds) mesh.computeBoundingSphere();
}

function createFurrows() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x816044, roughness: .96, side: THREE.DoubleSide });
  for (let row = 0; row < 9; row += 1) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const segments = 72;
    const across = 10;
    const center = -10.6 + row * 2.65;
    for (let iz = 0; iz <= segments; iz += 1) for (let ix = 0; ix <= across; ix += 1) {
      const z = -9.55 + iz / segments * 19.1;
      const u = ix / across * 2 - 1;
      const x = center + u * .9;
      const ridge = .38 * Math.pow(Math.max(0, 1 - u * u), 1.45);
      vertices.push(x, plotHeight(x, z) + ridge, z);
      if (ix < across && iz < segments) {
        const a = iz * (across + 1) + ix;
        indices.push(a, a + across + 1, a + 1, a + 1, a + across + 1, a + across + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ridge = new THREE.Mesh(geometry, material);
    ridge.receiveShadow = true;
    group.add(ridge);
  }
  return group;
}

function addClouds(scene: THREE.Scene) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xf6faf8, roughness: 1, transparent: true, opacity: .82, depthWrite: false });
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Group();
    const pieces = 3 + Math.floor(rng(i + 3) * 3);
    for (let j = 0; j < pieces; j += 1) {
      const puff = new THREE.Mesh(geometry, material);
      puff.position.set(j * 1.15 - pieces * .55, Math.sin(j * 1.7) * .3, (rng(i * 17 + j) - .5) * 1.15);
      puff.scale.set(1.6 + rng(i + j + 6), .56 + rng(i * 3 + j) * .36, .95);
      cloud.add(puff);
    }
    cloud.position.set(-17 + i * 6, 12 + rng(i * 4) * 5, -11 + rng(i + 12) * 18);
    group.add(cloud);
  }
  scene.add(group);
  return group;
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Line) {
      if (object.geometry) geometries.add(object.geometry);
      if (object instanceof THREE.InstancedMesh) object.dispose();
      const material = object.material;
      (Array.isArray(material) ? material : [material]).forEach((item) => materials.add(item));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function updateAtmosphere(runtime: SceneRuntime, time: number) {
  const { props, sun, hemi, soilMaterial, snowCover, snowflakes, snowGeometry, snowPositions, snowSpeeds, snowPhases, scene, clouds, rain, rainGeometry, rainPositions, rainVelocity, windTrails, trails, puddles, furrows, cropInstances, plantData } = runtime;
  const sunAngle = (((props.hour - 6) / 13) * .85 + .075) * Math.PI;
  const sunlight = Math.sin(sunAngle);
  sun.position.set(Math.cos(sunAngle) * 32, Math.max(3, sunlight * 37), -21 + sunlight * 9);
  const weatherFactor = props.weather === 'rain' ? .48 : props.weather === 'cloud' ? .72 : props.weather === 'snow' ? .68 : 1;
  sun.intensity = (.65 + Math.max(0, sunlight) * 2.05) * weatherFactor;
  hemi.intensity = (.78 + Math.max(0, sunlight) * 1.05) * (props.weather === 'rain' ? .82 : props.weather === 'snow' ? 1.12 : 1);
  sun.color.set(props.weather === 'snow' ? 0xd9eaf6 : props.weather === 'sun' ? 0xffe3b3 : props.weather === 'rain' ? 0xd3e0ed : 0xffedcf);
  soilMaterial.roughness = props.weather === 'rain' ? .76 : .98;
  soilMaterial.color.set(props.weather === 'rain' ? 0xe3e5e2 : 0xffffff);
  const sky = new THREE.Color(props.weather === 'snow' ? 0xb8c9d5 : props.weather === 'rain' ? 0x849da6 : props.weather === 'cloud' ? 0xaec0c1 : 0xb8d6dd);
  scene.background = sky;
  clouds.visible = props.layers.clouds && props.weather !== 'sun';
  clouds.children.forEach((cloud, index) => { cloud.position.x += runtime.reducedMotion ? 0 : .0018; if (cloud.position.x > 24) cloud.position.x = -25; if (!runtime.reducedMotion) cloud.position.y += Math.sin(time * .22 + index) * .0008; });
  rain.visible = props.layers.rain && props.weather === 'rain';
  puddles.visible = props.layers.rain && props.weather === 'rain';
  furrows.visible = props.layers.soil;
  windTrails.visible = props.weather === 'wind' && props.wind > 3;
  const snowActive = props.weather === 'snow' && props.layers.snow;
  snowCover.visible = snowActive;
  snowflakes.visible = snowActive && !runtime.reducedMotion;
  updatePlantMatrices(cropInstances, plantData, props.growth, props.crop, time, props.layers.sway ? props.wind : 0, runtime.reducedMotion);
  if (rain.visible && !runtime.reducedMotion) {
    const drift = props.wind / 80 * .07;
    for (let i = 0; i < rainVelocity.length; i += 1) {
      const k = i * 6;
      rainPositions[k + 1] -= rainVelocity[i] * 1.5;
      rainPositions[k + 4] -= rainVelocity[i] * 1.5;
      rainPositions[k] += drift;
      rainPositions[k + 3] += drift;
      if (rainPositions[k + 1] < 1.8) {
        const x = (Math.random() - .5) * 30;
        const z = (Math.random() - .5) * 25;
        rainPositions[k] = x; rainPositions[k + 3] = x + .05;
        rainPositions[k + 1] = 14 + Math.random() * 5; rainPositions[k + 4] = rainPositions[k + 1] - .42;
        rainPositions[k + 2] = z; rainPositions[k + 5] = z;
      }
    }
    rainGeometry.attributes.position.needsUpdate = true;
  }
  if (snowflakes.visible) {
    const drift = props.wind / 80 * .075;
    for (let i = 0; i < snowSpeeds.length; i += 1) {
      const k = i * 3;
      snowPositions[k + 1] -= snowSpeeds[i];
      snowPositions[k] += drift + Math.sin(time * .8 + snowPhases[i]) * .006;
      snowPositions[k + 2] += Math.cos(time * .65 + snowPhases[i]) * .004;
      if (snowPositions[k + 1] < 1.3) {
        snowPositions[k] = (Math.random() - .5) * 32;
        snowPositions[k + 1] = 14 + Math.random() * 5;
        snowPositions[k + 2] = (Math.random() - .5) * 28;
      }
    }
    snowGeometry.attributes.position.needsUpdate = true;
  }
  if (windTrails.visible && !runtime.reducedMotion) trails.forEach((trail, index) => {
    trail.position.x += .018 + props.wind * .001;
    if (trail.position.x > 21) trail.position.x = -19;
    (trail.material as THREE.LineBasicMaterial).opacity = .14 + Math.sin(time * 1.1 + index) * .055;
  });
}

export function TerrainScene(props: TerrainSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8d6dd);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 350);
    camera.position.set(27, 21, 31);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(max-width: 640px)').matches ? 1.15 : 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .075;
    controls.target.set(0, .8, 0);
    controls.minDistance = 14;
    controls.maxDistance = 78;
    controls.maxPolarAngle = Math.PI / 2 - .06;
    controls.minPolarAngle = .2;

    const hemi = new THREE.HemisphereLight(0xd8edff, 0x655744, 1.65);
    const sun = new THREE.DirectionalLight(0xffedcf, 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -29; sun.shadow.camera.right = 29; sun.shadow.camera.top = 29; sun.shadow.camera.bottom = -29;
    sun.shadow.bias = -.00012;
    sun.shadow.normalBias = .035;
    const ambient = new THREE.AmbientLight(0xffffff, .3);
    scene.add(hemi, sun, sun.target, ambient);
    sun.target.position.set(0, 0, 0);

    const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: 0 });
    const ground = new THREE.Mesh(terrainGeometry(180, 180, 142, 142, (x, z, noise) => {
      const inField = Math.abs(x) < 13 && Math.abs(z) < 10.5;
      if (inField) return noise > .65 ? 0x896746 : noise > .35 ? 0x7d5d40 : 0x73543b;
      return terrainHeight(x, z) > 2.8 ? (noise > .55 ? 0x87957b : 0x758b70) : (noise > .58 ? 0x82986e : 0x779069);
    }), groundMaterial);
    ground.receiveShadow = true;
    scene.add(ground);

    const hillGeometry = new THREE.SphereGeometry(1, 20, 12);
    const hillMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true });
    const distantHills = new THREE.InstancedMesh(hillGeometry, hillMaterial, 14);
    const hillColors = [0x7c957b, 0x879d83, 0x91a48b, 0x81977d];
    const hillMatrix = new THREE.Matrix4();
    const hillPosition = new THREE.Vector3();
    const hillScale = new THREE.Vector3();
    const hillQuaternion = new THREE.Quaternion();
    const hillColor = new THREE.Color();
    for (let i = 0; i < distantHills.count; i += 1) {
      const angle = i / distantHills.count * Math.PI * 2;
      const distance = 75 + rng(i + 31) * 14;
      hillPosition.set(Math.cos(angle) * distance, -2 + rng(i + 42) * 2.4, Math.sin(angle) * distance);
      hillScale.set(16 + rng(i + 8) * 14, 5 + rng(i + 12) * 5, 13 + rng(i + 18) * 9);
      hillQuaternion.setFromEuler(new THREE.Euler(0, angle, 0));
      hillMatrix.compose(hillPosition, hillQuaternion, hillScale);
      distantHills.setMatrixAt(i, hillMatrix);
      hillColor.setHex(hillColors[i % hillColors.length]);
      distantHills.setColorAt(i, hillColor);
    }
    if (distantHills.instanceColor) distantHills.instanceColor.needsUpdate = true;
    scene.add(distantHills);

    const fieldSurfaceGeometry = terrainGeometry(25.8, 20.8, 94, 84, (x, z, noise) => {
      const furrow = Math.pow(Math.max(0, Math.cos((x + 10.6) * Math.PI / 2.65)), 8);
      return furrow > .55 ? 0x987552 : noise > .66 ? 0x896949 : noise > .3 ? 0x806044 : 0x75563e;
    }, plotHeight);
    const soilMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 });
    const fieldSurface = new THREE.Mesh(fieldSurfaceGeometry, soilMaterial);
    fieldSurface.receiveShadow = true;
    scene.add(fieldSurface);

    const snowCover = new THREE.Group();
    const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f7fa, roughness: .94, transparent: true, opacity: .74, depthWrite: false, side: THREE.DoubleSide });
    const snowGroundGeometry = terrainGeometry(180, 180, 96, 96, () => 0xffffff, (x, z) => terrainHeight(x, z) + .04);
    const snowGround = new THREE.Mesh(snowGroundGeometry, snowMaterial);
    snowGround.receiveShadow = true;
    const snowFieldGeometry = terrainGeometry(25.8, 20.8, 48, 42, () => 0xffffff, (x, z) => plotHeight(x, z) + .045);
    const snowField = new THREE.Mesh(snowFieldGeometry, snowMaterial);
    snowField.receiveShadow = true;
    snowCover.add(snowGround, snowField);
    snowCover.visible = false;
    scene.add(snowCover);

    const furrows = createFurrows();
    scene.add(furrows);

    const puddles = new THREE.Group();
    const puddleMaterial = new THREE.MeshPhysicalMaterial({ color: 0x638a8c, metalness: .06, roughness: .32, transparent: true, opacity: .52, depthWrite: false, clearcoat: .16 });
    const puddleGeometry = new THREE.CircleGeometry(1, 18);
    for (let i = 0; i < 12; i += 1) {
      const x = -9.2 + (i % 6) * 3.25 + (hash(i, 3) - .5) * .2;
      const z = -8.1 + hash(i, 5) * 16;
      const water = new THREE.Mesh(puddleGeometry, puddleMaterial);
      water.rotation.x = -Math.PI / 2;
      water.scale.set(.22 + hash(i, 9) * .34, .12 + hash(i, 15) * .2, 1);
      water.position.set(x, plotHeight(x, z) + .018, z);
      puddles.add(water);
    }
    scene.add(puddles);

    const pebbleGeometry = new THREE.IcosahedronGeometry(1, 0);
    const pebbleMaterial = new THREE.MeshStandardMaterial({ color: 0x93826b, roughness: .94 });
    const pebbles = new THREE.InstancedMesh(pebbleGeometry, pebbleMaterial, 190);
    const dummy = new THREE.Object3D();
    let pebbleIndex = 0;
    for (let i = 0; i < 240; i += 1) {
      const x = (hash(i, 15) - .5) * 25.1; const z = (hash(i, 16) - .5) * 20;
      if (Math.abs(Math.cos((x + 10.6) * Math.PI / 2.65)) > .72 || pebbleIndex >= pebbles.count) continue;
      const size = .025 + hash(i, 19) * .07;
      dummy.position.set(x, terrainHeight(x, z) + .025 + size * .2, z);
      dummy.rotation.set(hash(i, 20), hash(i, 21) * Math.PI, hash(i, 22));
      dummy.scale.set(size * 1.35, size * .48, size);
      dummy.updateMatrix(); pebbles.setMatrixAt(pebbleIndex++, dummy.matrix);
    }
    pebbles.count = pebbleIndex;
    pebbles.castShadow = true;
    scene.add(pebbles);

    const plantData: SceneRuntime['plantData'] = [];
    for (let row = 0; row < 9; row += 1) for (let index = 0; index < 13; index += 1) {
      const seed = row * 31 + index * 19 + 3;
      const x = -10.6 + row * 2.65 + (rng(seed) - .5) * .25;
      const z = -8.55 + index * 1.43 + (rng(seed + 10) - .5) * .22;
      plantData.push({ x, z, seed, flexibility: cropWindFlexibility[propsRef.current.crop] * (.9 + rng(seed + 41) * .2) });
    }
    const initialProps = propsRef.current;
    const cropInstances = createPlants(scene, initialProps.crop, initialProps.growth, plantData);
    const clouds = addClouds(scene);

    const rainCount = 330;
    const rainPositions = new Float32Array(rainCount * 6);
    const rainVelocity = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i += 1) {
      const k = i * 6; const x = (Math.random() - .5) * 30; const y = Math.random() * 20; const z = (Math.random() - .5) * 25;
      rainPositions[k] = x; rainPositions[k + 1] = y; rainPositions[k + 2] = z;
      rainPositions[k + 3] = x + .05; rainPositions[k + 4] = y - .42; rainPositions[k + 5] = z;
      rainVelocity[i] = .12 + Math.random() * .16;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0xc8e3f0, transparent: true, opacity: .55, depthWrite: false }));
    scene.add(rain);

    const snowCount = 420;
    const snowPositions = new Float32Array(snowCount * 3);
    const snowSpeeds = new Float32Array(snowCount);
    const snowPhases = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i += 1) {
      snowPositions[i * 3] = (Math.random() - .5) * 32;
      snowPositions[i * 3 + 1] = Math.random() * 18;
      snowPositions[i * 3 + 2] = (Math.random() - .5) * 28;
      snowSpeeds[i] = .035 + Math.random() * .045;
      snowPhases[i] = Math.random() * Math.PI * 2;
    }
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowflakes = new THREE.Points(snowGeometry, new THREE.PointsMaterial({ color: 0xf7fbff, size: .1, transparent: true, opacity: .86, depthWrite: false, sizeAttenuation: true }));
    snowflakes.renderOrder = 3;
    snowflakes.visible = false;
    scene.add(snowflakes);

    const windTrails = new THREE.Group();
    const trails: THREE.Line[] = [];
    for (let i = 0; i < 16; i += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 9 }, (_, k) => new THREE.Vector3(k * .42, Math.sin(k * .38) * .075, 0)));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xf4faef, transparent: true, opacity: .2 }));
      line.position.set(-18 + rng(i + 90) * 32, 1.6 + rng(i + 59) * 5, -12 + rng(i + 104) * 24);
      windTrails.add(line); trails.push(line);
    }
    scene.add(windTrails);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const runtime: SceneRuntime = {
      scene, camera, renderer, controls, sun, hemi, soilMaterial, snowCover, snowflakes, snowGeometry, snowPositions, snowSpeeds, snowPhases, clouds, rain, rainGeometry, rainPositions, rainVelocity,
      windTrails, trails, puddles, furrows, cropInstances, cropKey: initialProps.crop, plantData,
      props: initialProps, frame: 0, animation: 0, visible: true, reducedMotion: mediaQuery.matches, lastRender: 0,
    };
    runtimeRef.current = runtime;

    const resize = () => {
      const width = host.clientWidth; const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      runtime.visible = entry.isIntersecting;
      if (runtime.visible && !runtime.animation) runtime.animation = requestAnimationFrame(animate);
      if (!runtime.visible && runtime.animation) { cancelAnimationFrame(runtime.animation); runtime.animation = 0; }
    }, { threshold: .01 });
    intersectionObserver?.observe(host);

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      runtime.reducedMotion = event.matches;
      controls.enableDamping = !event.matches;
      if (event.matches && runtime.animation) { cancelAnimationFrame(runtime.animation); runtime.animation = 0; }
      if (!event.matches && runtime.visible && !runtime.animation) runtime.animation = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    mediaQuery.addEventListener('change', onReducedMotionChange);
    if (runtime.reducedMotion) controls.enableDamping = false;
    const onControlChange = () => { if (runtime.reducedMotion) renderer.render(scene, camera); };
    controls.addEventListener('change', onControlChange);
    const clock = new THREE.Clock();
    function animate() {
      if (!runtime.visible) { runtime.animation = 0; return; }
      runtime.animation = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      updateAtmosphere(runtime, time);
      controls.update();
      runtime.frame += 1;
      const now = performance.now();
      if (now - runtime.lastRender > 1000 / 30) {
        renderer.render(scene, camera);
        runtime.lastRender = now;
      }
      if (runtime.reducedMotion) {
        cancelAnimationFrame(runtime.animation);
        runtime.animation = 0;
      }
    }
    runtime.animation = requestAnimationFrame(animate);

    return () => {
      if (runtime.animation) cancelAnimationFrame(runtime.animation);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      mediaQuery.removeEventListener('change', onReducedMotionChange);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const previous = runtime.props;
    runtime.props = props;
    if (props.crop !== runtime.cropKey) {
      runtime.scene.remove(runtime.cropInstances);
      disposeObject(runtime.cropInstances);
      runtime.cropInstances = createPlants(runtime.scene, props.crop, props.growth, runtime.plantData);
      runtime.cropKey = props.crop;
    } else if (props.growth !== previous.growth) {
      updatePlantMatrices(runtime.cropInstances, runtime.plantData, props.growth, props.crop, 0, 0, runtime.reducedMotion, true);
    }
    if (props.zoom !== previous.zoom) {
      const factor = previous.zoom / props.zoom;
      runtime.camera.position.sub(runtime.controls.target).multiplyScalar(factor).add(runtime.controls.target);
      runtime.camera.updateProjectionMatrix();
      runtime.controls.update();
    }
    updateAtmosphere(runtime, 0);
    if (!runtime.animation && runtime.visible) runtime.animation = requestAnimationFrame(() => {
      runtime.animation = 0;
      updateAtmosphere(runtime, 0);
      runtime.renderer.render(runtime.scene, runtime.camera);
    });
    runtime.renderer.render(runtime.scene, runtime.camera);
  }, [props.crop, props.weather, props.growth, props.wind, props.hour, props.layers, props.zoom]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !props.cameraResetKey) return;
    runtime.controls.reset();
    runtime.renderer.render(runtime.scene, runtime.camera);
  }, [props.cameraResetKey]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const controls = runtimeRef.current?.controls;
    if (!controls) return;
    const step = .12;
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
