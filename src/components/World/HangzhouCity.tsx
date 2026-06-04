/**
 * 杭州 OSM 真实建筑 — 多边形拉伸
 */
import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

interface BuildingData {
  polygon: [number, number][];
  height: number;
  name: string;
  type: string;
  levels: string;
}

interface CityData { center: [number, number]; buildings: BuildingData[]; count: number; }

const TYPE_COLORS: Record<string, string> = {
  office: '#3b5998', commercial: '#d4a017', hotel: '#c06030',
  apartments: '#7b68ae', residential: '#8b7355', house: '#c4a882',
  school: '#e8734a', hospital: '#e85d5d', industrial: '#6b7b8b',
  retail: '#d4902a', supermarket: '#d4902a', skyscraper: '#4a6fa5',
  government: '#8b4513', yes: '#8899aa', department_store: '#c09040',
};

const SCALE = 0.22;
const MAX_BUILDINGS = 400;

export const HangzhouCity: React.FC = () => {
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/data/hangzhou_buildings.json')
      .then(r => r.json())
      .then(d => { setCityData(d); setLoaded(true); })
      .catch(e => console.warn('Hangzhou load failed:', e));
  }, []);

  const geometries = useMemo(() => {
    if (!cityData) return [];
    const geos: { geo: THREE.BufferGeometry; y: number; color: string }[] = [];
    
    const sorted = [...cityData.buildings].sort((a, b) => b.height - a.height);
    const selected = sorted.slice(0, Math.min(MAX_BUILDINGS, sorted.length));
    
    for (const b of selected) {
      if (b.polygon.length < 3 || b.polygon.length > 20) continue;
      
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of b.polygon) {
        const sx = x * SCALE, sz = z * SCALE;
        if (sx < minX) minX = sx; if (sz < minZ) minZ = sz;
        if (sx > maxX) maxX = sx; if (sz > maxZ) maxZ = sz;
      }
      
      const w = Math.max(0.3, maxX - minX);
      const d = Math.max(0.3, maxZ - minZ);
      const h = Math.max(0.5, b.height * SCALE * 2.5);
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(cx, h / 2, cz);
      
      const color = TYPE_COLORS[b.type] || (b.height > 25 ? '#4a6fa5' : '#778899');
      geos.push({ geo, y: 0, color });
    }
    
    if (geos.length > 0) {
      console.log('[Hangzhou] Generated', geos.length, 'buildings');
      // log a few examples
      for (let i = 0; i < Math.min(3, geos.length); i++) {
        const g = geos[i];
        const pos = new THREE.Vector3();
        g.geo.boundingBox?.getCenter(pos);
        console.log(`  Building ${i}: pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) size=(...) color=${g.color}`);
      }
    }
    return geos;
  }, [cityData]);

  if (!loaded) return null;

  return (
    <group>
      {/* Dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#111818" roughness={0.95} />
      </mesh>

      {/* Buildings */}
      {geometries.map((g, i) => (
        <mesh
          key={i}
          geometry={g.geo}
          position={[0, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={g.color}
            roughness={0.45}
            metalness={0.25}
            emissive={g.color}
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}

      {/* Info text at center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[10, 3]} />
        <meshBasicMaterial color="#000" transparent opacity={0} />
      </mesh>
    </group>
  );
};
