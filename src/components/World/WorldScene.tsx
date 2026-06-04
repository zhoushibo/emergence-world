import React, { useEffect } from 'react';
import { UECityGround } from './CityGround';
import { Building, preloadBuildingModels } from './Building';
import { Decorations } from './Decorations';
import { GroundFog } from './GroundFog';
import { AmbientParticles } from './AmbientParticles';
import { LampGlows } from './LampGlows';
import { WeatherSystem } from './WeatherSystem';
import { LOCATIONS } from '../../data/locations';

interface WorldSceneProps {
  selectedLocationId?: string | null;
  onLocationSelect?: (id: string) => void;
}

export const WorldScene: React.FC<WorldSceneProps> = ({
  selectedLocationId,
  onLocationSelect,
}) => {
  useEffect(() => {
    preloadBuildingModels(LOCATIONS.map((l) => l.id));
  }, []);

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
