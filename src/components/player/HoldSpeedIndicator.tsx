import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { HoldSide } from '../../types/video';

interface HoldSpeedIndicatorProps {
  side: HoldSide | null;
  speed: number;
}

// Always-visible pill shown while the user holds the left/right side to fast-forward.
// Lives outside PlayerOverlay because holding hides the controls.
export const HoldSpeedIndicator: React.FC<HoldSpeedIndicatorProps> = ({ side, speed }) => {
  const insets = useSafeAreaInsets();

  if (!side) return null;

  return (
    <View style={[styles.container, { top: Math.max(insets.top + 12, 24) }]} pointerEvents="none">
      <View style={styles.pill}>
        <Ionicons name="play-forward" size={18} color={COLORS.accentYellow} />
        <Text style={styles.text}>Fast forward {speed}x</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accentYellow,
  },
  text: {
    color: COLORS.accentYellow,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
