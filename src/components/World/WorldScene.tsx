import React from 'react';
import { UECityGround } from './CityGround';
import { Building } from './Building';
import { LOCATIONS } from '../../data/locations';

interface WorldSceneProps {
  selectedLocationId?: string | null;
  onLocationSelect?: (id: string) => void;
}

export const WorldScene: React.FC<WorldSceneProps> = ({
  selectedLocationId,
  onLocationSelect,
}) => {
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
    </group>
  );
};
