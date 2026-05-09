/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState } from '../store/gameStore';
import { WORLD_SIZE, TURN_SPEED, BOOST_SPEED, BASE_SPEED } from '../shared/types';
import * as THREE from 'three';
import { Sphere, Grid } from '@react-three/drei';

const localCollectedOrbs = new Set<string>();

function Snake({ playerId, color, isLocal }: { playerId: string, color: string, isLocal: boolean }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const spikesRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const headMainRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spikeDummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{x: number, y: number, angle: number}[]>([]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !spikesRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      spikesRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }
    
    headRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    spikesRef.current.count = Math.max(0, count - 1);
    
    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({ 
        x: player.segments[idx]?.x || 0, 
        y: player.segments[idx]?.y || 0,
        angle: player.currentAngle || 0
      });
    }

    for (let i = 0; i < count; i++) {
      const targetX = player.segments[i].x;
      const targetY = player.segments[i].y;
      
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
        // For local, we can use the player's current angle for the head, 
        // but for segments we need to calculate it based on the vector to the next/prev segment
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }

      // Calculate rotation for segments
      let angle = 0;
      if (i === 0) {
        angle = isLocal ? player.currentAngle : (player.currentAngle || 0);
        curr.angle = angle;
        headRef.current.position.set(curr.x, curr.y, 0.5);
        headRef.current.rotation.z = angle;
      } else {
        const prev = currentPositions.current[i - 1];
        angle = Math.atan2(prev.y - curr.y, prev.x - curr.x);
        curr.angle = angle;

        dummy.position.set(curr.x, curr.y, 0.5);
        dummy.rotation.z = angle;
        // Taper the body slightly
        const scale = 1 - (i / count) * 0.4;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);

        // Add spine spikes
        spikeDummy.position.set(curr.x, curr.y, 1.0);
        spikeDummy.rotation.set(Math.PI / 2, 0, angle - Math.PI / 2);
        spikeDummy.scale.set(0.4 * scale, 0.8 * scale, 0.4 * scale);
        spikeDummy.updateMatrix();
        spikesRef.current.setMatrixAt(i - 1, spikeDummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
    spikesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <group ref={headRef}>
        {/* Main Head */}
        <mesh ref={headMainRef} castShadow receiveShadow>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial
            color={color}
            roughness={0.2}
            metalness={0.8}
            toneMapped={false}
            onBeforeCompile={(shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>
                float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
                totalEmissiveRadiance += diffuseColor.rgb * (0.6 + fresnel * 4.0);
                `
              );
            }}
          />
        </mesh>
        
        {/* Snout */}
        <mesh position={[0.6, 0, -0.1]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.6, 1, 12]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Eyes */}
        <mesh ref={leftEyeRef} position={[0.4, 0.35, 0.5]} castShadow>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} toneMapped={false} />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.4, -0.35, 0.5]} castShadow>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} toneMapped={false} />
        </mesh>

        {/* Horns */}
        <mesh position={[-0.3, 0.4, 0.8]} rotation={[0.5, -0.2, 0]} castShadow>
          <coneGeometry args={[0.15, 1.2, 8]} />
          <meshStandardMaterial color="#222" roughness={0.5} />
        </mesh>
        <mesh position={[-0.3, -0.4, 0.8]} rotation={[-0.5, -0.2, 0]} castShadow>
          <coneGeometry args={[0.15, 1.2, 8]} />
          <meshStandardMaterial color="#222" roughness={0.5} />
        </mesh>
      </group>

      {/* Body Segments (Instanced) */}
      <instancedMesh ref={bodyRef} args={[null as any, null as any, 2000]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
              totalEmissiveRadiance += diffuseColor.rgb * (0.4 + fresnel * 2.0);
              `
            );
          }}
        />
      </instancedMesh>

      {/* Spikes along the back */}
      <instancedMesh ref={spikesRef} args={[null as any, null as any, 2000]} castShadow receiveShadow>
        <coneGeometry args={[0.5, 1, 4]} />
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} />
      </instancedMesh>
    </group>
  );
}

function Orbs() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    let i = 0;
    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];
      dummy.position.set(orb.x, orb.y, 0.5);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      colorObj.set(orb.color);
      meshRef.current.setColorAt(i, colorObj);
      i++;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, 1000]} castShadow receiveShadow frustumCulled={false}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        roughness={0.4}
        metalness={0.1}
        toneMapped={false}
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            totalEmissiveRadiance += diffuseColor.rgb * 2.5;
            `
          );
        }}
      />
    </instancedMesh>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb } = useGameStore();
  const { camera } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false });
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());

  const localPlayerRef = useRef<{
    active: boolean;
    segments: {x: number, y: number}[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !inputs.current.left) { inputs.current.left = true; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !inputs.current.right) { inputs.current.right = true; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !inputs.current.boost) { inputs.current.boost = true; }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) { inputs.current.left = false; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) { inputs.current.right = false; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && inputs.current.boost) { inputs.current.boost = false; }
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;
    
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      
      // Initialize from server if not active
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
      }

      if (!localPlayerRef.current.active) return;

      // Local movement logic
      if (inputs.current.left) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
      if (inputs.current.right) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      
      localPlayerRef.current.isBoosting = inputs.current.boost && localPlayerRef.current.score > 10;
      const speed = localPlayerRef.current.isBoosting ? BOOST_SPEED : BASE_SPEED;
      
      const head = { ...localPlayerRef.current.segments[0] };
      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      // Boundary check
      const boundary = WORLD_SIZE / 2;
      if (head.x < -boundary) head.x = -boundary;
      if (head.x > boundary) head.x = boundary;
      if (head.y < -boundary) head.y = -boundary;
      if (head.y > boundary) head.y = boundary;

      localPlayerRef.current.segments.unshift(head);

      if (localPlayerRef.current.isBoosting) {
        localPlayerRef.current.score -= 2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
        }
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // Check orb collisions
      for (const orbId in gs.orbs) {
        if (localCollectedOrbs.has(orbId)) continue;
        const orb = gs.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4) {
          localPlayerRef.current.score += orb.value;
          localCollectedOrbs.add(orbId);
          delete gs.orbs[orbId]; // predict locally
          sendCollectOrb(orbId);
        }
      }

      // Cleanup localCollectedOrbs occasionally
      if (Math.random() < 0.05) {
        for (const id of localCollectedOrbs) {
          if (!gs.orbs[id]) localCollectedOrbs.delete(id);
        }
      }

      // Check player collisions
      let collided = false;
      for (const otherId in gs.players) {
        if (otherId === playerId) continue;
        const other = gs.players[otherId];
        if (other.state !== 'alive') continue;
        for (const seg of other.segments) {
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 2.25) {
            collided = true;
            break;
          }
        }
        if (collided) break;
      }

      if (collided) {
        localPlayerRef.current.active = false;
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'dead'
        });
        return;
      }

      // Overwrite global state for local rendering
      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;

      // Send state to server at 20Hz
      const now = Date.now();
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive'
        });
        localPlayerRef.current.lastSendTime = now;
      }

      const targetZ = Math.min(45, Math.max(20, 20 + localPlayerRef.current.score * 0.2));
      
      // Smooth camera follow predicted head
      camera.position.x += (head.x - camera.position.x) * 10 * delta;
      camera.position.y += (head.y - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);

      // Make the directional light follow the camera to keep shadows crisp
      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 10, camera.position.y - 10, 30);
        lightTarget.position.set(camera.position.x, camera.position.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />

      {/* Ground plane to receive shadows */}
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#062006" />
      </mesh>

      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[WORLD_SIZE, WORLD_SIZE]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#052e16"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#166534"
        fadeDistance={100}
        fadeStrength={1}
      />

      <Orbs />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            isLocal={player.id === playerId}
          />
        );
      })}
    </>
  );
}
