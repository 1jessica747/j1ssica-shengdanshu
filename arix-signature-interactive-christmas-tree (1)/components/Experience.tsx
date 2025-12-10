import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { Tree } from './Tree';
import { THEME_COLORS } from '../constants';

interface ExperienceProps {
  isFormed: boolean;
}

export const Experience: React.FC<ExperienceProps> = ({ isFormed }) => {
  return (
    <div className="w-full h-screen absolute top-0 left-0 z-0 bg-emerald-950">
      <Canvas
        shadows
        dpr={[1, 2]} // Quality scaling
        camera={{ position: [0, 4, 22], fov: 45 }}
        gl={{ 
            antialias: false, 
            toneMappingExposure: 1.1,
            stencil: false,
            depth: true
        }}
      >
        <color attach="background" args={[THEME_COLORS.emeraldDark]} />
        
        {/* Dynamic Fog */}
        <fog attach="fog" args={[THEME_COLORS.emeraldDark, 15, 45]} />

        {/* Cinematic Lighting */}
        <ambientLight intensity={0.3} color={THEME_COLORS.emeraldMedium} />
        
        {/* Key Light - Gold Warmth */}
        <spotLight 
          position={[12, 18, 12]} 
          angle={0.4} 
          penumbra={1} 
          intensity={18} 
          castShadow 
          shadow-bias={-0.0001}
          color={THEME_COLORS.goldHighlight}
        />
        
        {/* Fill Light - Cool Emerald */}
        <pointLight position={[-12, 6, -12]} intensity={6} color="#065f46" />
        
        {/* Rim Light - Sharp accent */}
        <spotLight position={[0, 15, -15]} intensity={12} color="#10b981" angle={0.6} />

        {/* Scene Objects */}
        <Suspense fallback={null}>
            <group position={[0, -5, 0]}>
                <Tree isFormed={isFormed} />
                <ContactShadows 
                    resolution={1024} 
                    scale={40} 
                    blur={3} 
                    opacity={0.5} 
                    far={10} 
                    color="#000" 
                />
            </group>
            
            {/* High Quality Reflections */}
            <Environment preset="city" background={false} />
        </Suspense>

        {/* Controls */}
        <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 3.5} 
            maxPolarAngle={Math.PI / 1.8}
            minDistance={10}
            maxDistance={35}
            autoRotate={isFormed} 
            autoRotateSpeed={0.5}
            enableZoom={true}
        />

        {/* Post Processing for Luxury Glow */}
        <EffectComposer disableNormalPass>
            <Bloom 
                luminanceThreshold={0.7} 
                mipmapBlur 
                intensity={1.5} 
                radius={0.5}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.7} />
            <ToneMapping />
        </EffectComposer>
      </Canvas>
    </div>
  );
};