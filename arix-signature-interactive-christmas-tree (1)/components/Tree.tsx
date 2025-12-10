import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { THEME_COLORS } from '../constants';

interface TreeProps {
  isFormed: boolean;
}

// --- SHADERS FOR FOLIAGE ---

const foliageVertexShader = `
  uniform float uTime;
  uniform float uProgress; // 0 = Scatter, 1 = Tree
  
  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aRandom;
  attribute float aSize;

  varying vec2 vUv;
  varying float vAlpha;
  varying float vRandom;

  void main() {
    vUv = uv;
    vRandom = aRandom;

    // Dual Position Interpolation
    // We add a delay based on height (aTreePos.y) for a cinematic "zipper" formation from bottom to top
    float heightNorm = (aTreePos.y + 7.0) / 14.0; // Normalize height approx 0 to 1
    float delay = heightNorm * 0.5;
    
    // smoothstep for non-linear ease
    float activation = (uProgress * 1.5) - delay;
    float localProgress = smoothstep(0.0, 1.0, activation);
    localProgress = clamp(localProgress, 0.0, 1.0);

    vec3 pos = mix(aScatterPos, aTreePos, localProgress);

    // Breathing / Floating Drift
    // Significant drift when scattered, very tight vibration when formed (shimmering tree)
    float driftIntensity = mix(2.0, 0.05, localProgress);
    
    // Complex organic movement
    pos.x += sin(uTime * 0.3 + aRandom * 15.0) * 0.15 * driftIntensity;
    pos.y += cos(uTime * 0.2 + aRandom * 25.0) * 0.15 * driftIntensity;
    pos.z += sin(uTime * 0.4 + aRandom * 35.0) * 0.15 * driftIntensity;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size attenuation
    float sizeMultiplier = mix(0.8, 1.2, aRandom); 
    // Particles larger in tree form to create volume
    float formScale = mix(0.8, 1.2, localProgress);
    
    gl_PointSize = (aSize * sizeMultiplier * formScale * 70.0) * (1.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Alpha logic: fainter when scattered, bright and solid when formed
    vAlpha = mix(0.4, 1.0, localProgress); 
  }
`;

const foliageFragmentShader = `
  uniform vec3 uColorEmerald;
  uniform vec3 uColorGold;
  uniform float uTime;

  varying float vAlpha;
  varying float vRandom;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Gradient: Emerald Core -> Gold Rim
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 2.0); // Sharper falloff

    // Twinkle effect
    float speed = 2.0 + (vRandom * 3.0);
    float sparkle = sin(uTime * speed + vRandom * 100.0) * 0.5 + 0.5;
    
    // When vAlpha is high (tree formed), we want more gold sparkles
    vec3 baseColor = uColorEmerald;
    vec3 highlightColor = uColorGold;
    
    // Mix based on distance and sparkle
    vec3 finalColor = mix(baseColor, highlightColor, (dist * 1.0) + (sparkle * 0.6));
    
    gl_FragColor = vec4(finalColor, vAlpha * glow);
  }
`;

// --- DATA GENERATORS ---

const FOLIAGE_COUNT = 6000; // Increased density for distinct shape
const TREE_HEIGHT = 14;
const TREE_RADIUS = 5.5;

interface OrnamentData {
  id: number;
  scatterPos: THREE.Vector3;
  treePos: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  scale: number;
  type: 'SPHERE' | 'CUBE' | 'DIAMOND';
  phase: number;
}

const generateFoliageAttributes = () => {
  const scatterPos = new Float32Array(FOLIAGE_COUNT * 3);
  const treePos = new Float32Array(FOLIAGE_COUNT * 3);
  const randoms = new Float32Array(FOLIAGE_COUNT);
  const sizes = new Float32Array(FOLIAGE_COUNT);

  for (let i = 0; i < FOLIAGE_COUNT; i++) {
    const t = i / FOLIAGE_COUNT;
    
    // --- Tree Shape (Cone) ---
    // y goes from -height/2 to height/2
    const y = (t * TREE_HEIGHT) - (TREE_HEIGHT / 2);
    
    // Cone Radius calculation
    const heightFactor = (TREE_HEIGHT / 2 - y) / TREE_HEIGHT; // 1.0 at bottom, 0.0 at top
    const idealRadius = heightFactor * TREE_RADIUS;
    
    // Spiral distribution
    const angle = t * Math.PI * 120; // High frequency spiral for density
    
    // Tight distribution mostly on surface to define shape
    // Bias random towards 1.0 (surface) rather than 0.0 (center)
    const radiusJitter = (Math.random() * 0.3) - 0.15; // Small variation
    let r = idealRadius + radiusJitter;
    if (r < 0) r = 0;

    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;

    treePos[i * 3] = tx;
    treePos[i * 3 + 1] = y;
    treePos[i * 3 + 2] = tz;

    // --- Scatter Shape (Galaxy/Explosion) ---
    // Much wider scatter for contrast
    const sr = 25 + Math.random() * 20; 
    const sTheta = Math.random() * Math.PI * 2;
    const sPhi = Math.acos(2 * Math.random() - 1);
    
    scatterPos[i * 3] = sr * Math.sin(sPhi) * Math.cos(sTheta);
    scatterPos[i * 3 + 1] = sr * Math.sin(sPhi) * Math.sin(sTheta);
    scatterPos[i * 3 + 2] = sr * Math.cos(sPhi);

    // --- Attributes ---
    randoms[i] = Math.random();
    sizes[i] = Math.random() * 0.6 + 0.4;
  }

  return { scatterPos, treePos, randoms, sizes };
};

const generateOrnaments = (count: number): OrnamentData[] => {
  const ornaments: OrnamentData[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    
    // Use similar logic to foliage to ensure they sit ON the tree
    const y = (t * TREE_HEIGHT) - (TREE_HEIGHT / 2);
    const heightFactor = (TREE_HEIGHT / 2 - y) / TREE_HEIGHT;
    const idealRadius = heightFactor * (TREE_RADIUS + 0.2); // Slightly outside foliage
    
    const angle = t * Math.PI * 25 + (Math.random() * 0.5);

    const tx = Math.cos(angle) * idealRadius;
    const tz = Math.sin(angle) * idealRadius;
    
    // Type distribution
    let type: 'SPHERE' | 'CUBE' | 'DIAMOND' = 'SPHERE';
    if (i % 6 === 0) type = 'CUBE';      
    else if (i % 4 === 0) type = 'DIAMOND'; 
    
    // Scatter physics
    const spread = 30;
    const sx = (Math.random() - 0.5) * spread;
    const sy = (Math.random() - 0.5) * spread;
    const sz = (Math.random() - 0.5) * spread;

    ornaments.push({
      id: i,
      treePos: new THREE.Vector3(tx, y, tz),
      scatterPos: new THREE.Vector3(sx, sy, sz),
      rotationSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.05),
      scale: type === 'CUBE' ? 0.7 : (type === 'SPHERE' ? 0.5 : 0.4),
      type,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return ornaments;
};

// --- COMPONENTS ---

const FoliageLayer = ({ progress }: { progress: number }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const { scatterPos, treePos, randoms, sizes } = useMemo(() => generateFoliageAttributes(), []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shaderRef.current.uniforms.uProgress.value = progress;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={scatterPos.length / 3} array={scatterPos} itemSize={3} />
        <bufferAttribute attach="attributes-aScatterPos" count={scatterPos.length / 3} array={scatterPos} itemSize={3} />
        <bufferAttribute attach="attributes-aTreePos" count={treePos.length / 3} array={treePos} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={randoms.length} array={randoms} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uColorEmerald: { value: new THREE.Color(THEME_COLORS.emeraldMedium) },
          uColorGold: { value: new THREE.Color(THEME_COLORS.gold) },
        }}
      />
    </points>
  );
};

const OrnamentLayer = ({ progress, data, geometry, material }: { progress: number, data: OrnamentData[], geometry: THREE.BufferGeometry, material: THREE.Material }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    data.forEach((item, i) => {
      // Dual Position Logic
      const currentPos = new THREE.Vector3().lerpVectors(item.scatterPos, item.treePos, progress);

      // Add float
      const floatAmp = (1 - progress) * 1.0 + 0.05; // High float when scattered, minimal when tree
      currentPos.y += Math.sin(time + item.phase) * floatAmp;
      currentPos.x += Math.cos(time * 0.5 + item.phase) * floatAmp * 0.5;

      dummy.position.copy(currentPos);
      
      // Grow scale slightly when forming
      dummy.scale.setScalar(item.scale * (progress * 0.3 + 0.7)); 
      
      // Continuous Rotation
      dummy.rotation.x = time * item.rotationSpeed.x;
      dummy.rotation.y = time * item.rotationSpeed.y;
      dummy.rotation.z = time * item.rotationSpeed.z;

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, data.length]} castShadow receiveShadow />
  );
};

export const Tree: React.FC<TreeProps> = ({ isFormed }) => {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  
  // Resources
  const ornaments = useMemo(() => generateOrnaments(180), []);
  const cubes = useMemo(() => ornaments.filter(o => o.type === 'CUBE'), [ornaments]);
  const spheres = useMemo(() => ornaments.filter(o => o.type === 'SPHERE'), [ornaments]);
  const diamonds = useMemo(() => ornaments.filter(o => o.type === 'DIAMOND'), [ornaments]);

  // Materials
  const materials = useMemo(() => ({
    gold: new THREE.MeshStandardMaterial({
      color: THEME_COLORS.gold,
      metalness: 1.0,
      roughness: 0.1,
      envMapIntensity: 1.5,
    }),
    redVelvet: new THREE.MeshStandardMaterial({
      color: '#9f1239', 
      roughness: 0.7,
      metalness: 0.2,
    }),
    diamond: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 0.1,
      roughness: 0,
      transmission: 0.95,
      thickness: 1.5,
      ior: 2.4,
      clearcoat: 1,
      attenuationColor: new THREE.Color('#ffffff'),
      attenuationDistance: 0.5
    })
  }), []);

  // Geometries
  const geometries = useMemo(() => ({
    sphere: new THREE.SphereGeometry(1, 32, 32),
    box: new THREE.BoxGeometry(1, 1, 1),
    octahedron: new THREE.OctahedronGeometry(1)
  }), []);

  useFrame((state, delta) => {
    // Smoothly interpolate the global progress state
    // Use a slightly faster lerp for responsive feel
    const target = isFormed ? 1 : 0;
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, target, delta * 1.2);

    // Slowly rotate the whole tree group when formed
    if (groupRef.current) {
        // Very slow majestic rotation when formed
        const rotSpeed = isFormed ? 0.05 : 0.01;
        groupRef.current.rotation.y += delta * rotSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Foliage Particle System */}
      <FoliageLayer progress={progressRef.current} />

      {/* 2. Ornaments - Cubes (Gifts) */}
      <OrnamentLayer 
        progress={progressRef.current} 
        data={cubes} 
        geometry={geometries.box} 
        material={materials.redVelvet} 
      />

      {/* 3. Ornaments - Spheres (Gold Baubles) */}
      <OrnamentLayer 
        progress={progressRef.current} 
        data={spheres} 
        geometry={geometries.sphere} 
        material={materials.gold} 
      />

      {/* 4. Ornaments - Diamonds (Lights) */}
      <OrnamentLayer 
        progress={progressRef.current} 
        data={diamonds} 
        geometry={geometries.octahedron} 
        material={materials.diamond} 
      />

      {/* 5. The Topper Star */}
      <group position={[0, TREE_HEIGHT/2 + 0.8, 0]} scale={isFormed ? 1 : 0}>
         <Float speed={2} rotationIntensity={1} floatIntensity={1}>
             <mesh>
                 <dodecahedronGeometry args={[1.2, 0]} />
                 <meshStandardMaterial 
                    color={THEME_COLORS.gold} 
                    emissive={THEME_COLORS.gold} 
                    emissiveIntensity={3}
                    toneMapped={false}
                 />
             </mesh>
             <pointLight distance={10} intensity={8} color={THEME_COLORS.gold} />
         </Float>
      </group>
    </group>
  );
};