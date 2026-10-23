import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING } from '../../constants/theme';
import { formatDuration } from '../../utils/formatters';

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  isScrubbing: boolean;
  onSlidingStart: () => void;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentTime,
  duration,
  isScrubbing,
  onSlidingStart,
  onValueChange,
  onSlidingComplete,
}) => {
  const safeDuration = duration > 0 ? duration : 1;
  const clampedTime = Math.max(0, Math.min(currentTime, safeDuration));

  return (
    <View style={styles.container}>
      {/* Slider Bar */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={safeDuration}
          value={clampedTime}
          minimumTrackTintColor={isScrubbing ? COLORS.accentYellow : COLORS.primary}
          maximumTrackTintColor="rgba(255, 255, 255, 0.25)"
          thumbTintColor={isScrubbing ? COLORS.accentYellow : COLORS.primary}
          tapToSeek={true}
          onSlidingStart={onSlidingStart}
          onValueChange={onValueChange}
          onSlidingComplete={onSlidingComplete}
        />
      </View>

      {/* Time Badges */}
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, isScrubbing && styles.timeTextScrubbing]}>
          {formatDuration(clampedTime)}
        </Text>
        <Text style={styles.timeTextMuted}>
          {formatDuration(safeDuration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  sliderContainer: {
    width: '100%',
    height: 36,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    marginTop: -4,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeTextScrubbing: {
    color: COLORS.accentYellow,
    fontWeight: '700',
  },
  timeTextMuted: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
