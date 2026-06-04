import React, { useEffect } from 'react';
import { UECityGround } from './CityGround';
import { Building, preloadBuildingModels } from './Building';
import { Decorations } from './Decorations';
import { GroundFog } from './GroundFog';
import { TrafficSystem } from './TrafficSystem';
import { LampGlows } from './LampGlows';
import { AmbientParticles } from './AmbientParticles';
import { WeatherSystem } from './WeatherSystem';
import { HangzhouCity } from './HangzhouCity';
import { LOCATIONS } from '../../data/locations';

interface WorldSceneProps {
  selectedLocationId?: string | null;
  onLocationSelect?: (id: string) => void;
  mapMode?: 'fantasy' | 'real';
}

export const WorldScene: React.FC<WorldSceneProps> = ({
  selectedLocationId,
  onLocationSelect,
  mapMode = 'fantasy',
}) => {
  useEffect(() => {
    preloadBuildingModels(LOCATIONS.map((l) => l.id));
  }, []);

  if (mapMode === 'real') {
    return (
      <group>
        <HangzhouCity />
        <GroundFog />
        <AmbientParticles count={80} radius={50} heightRange={[0.5, 3.5]} color="#ffdd88" size={0.05} speed={0.2} />
      </group>
    );
  }

  return (
    <group>
      <UECityGround />
      {LOCATIONS.map((loc) => (
        <Building
          key={loc.id}
          data={loc}
          isSelected={selectedLocationId === loc.id}
          onClick={onLocationSelect}
        />
      ))}
      <Decorations />
      <TrafficSystem />
      <LampGlows />
      <WeatherSystem />
      <GroundFog />
      <AmbientParticles
        count={150}
        radius={30}
        heightRange={[0.5, 3.5]}
        color="#ffdd88"
        size={0.05}
        speed={0.25}
      />
    </group>
  );
};
