import React from 'react';
import { CityGround } from './CityGround';
import { Building } from './Building';
import { LOCATIONS } from '../../data/locations';

interface WorldSceneProps {
  selectedLocationId?: string | null;
  onLocationSelect?: (id: string) => void;
}

/**
 * 世界场景组合组件
 * - 渲染城市地面 + 全部 18 个建筑
 * - 支持选中地标和点击回调
 */
export const WorldScene: React.FC<WorldSceneProps> = ({
  selectedLocationId,
  onLocationSelect,
}) => {
  return (
    <group>
      <CityGround />
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