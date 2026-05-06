import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';

type Grain = {
  key: string;
  left: DimensionValue;
  top: DimensionValue;
  size: number;
};

const grains: Grain[] = [
  { key: 'grain-1', left: '8%', top: '12%', size: 3 },
  { key: 'grain-2', left: '28%', top: '30%', size: 2 },
  { key: 'grain-3', left: '58%', top: '22%', size: 2 },
  { key: 'grain-4', left: '74%', top: '48%', size: 3 },
  { key: 'grain-5', left: '18%', top: '70%', size: 2 },
  { key: 'grain-6', left: '88%', top: '76%', size: 2 },
];

export function TextureOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {grains.map((grain) => (
        <View
          key={grain.key}
          style={[
            styles.dot,
            {
              left: grain.left,
              top: grain.top,
              width: grain.size,
              height: grain.size,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(244, 204, 80, 0.22)',
  },
});