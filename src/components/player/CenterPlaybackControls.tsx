import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

interface CenterPlaybackControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  onTogglePlayPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  seekStepSeconds?: number;
}

export const CenterPlaybackControls: React.FC<CenterPlaybackControlsProps> = ({
  isPlaying,
  isBuffering,
  onTogglePlayPause,
  onSeekBackward,
  onSeekForward,
  seekStepSeconds = 10,
}) => {
  return (
    <View style={styles.container}>
      {/* Rewind Button (-10s) */}
      <TouchableOpacity
        style={styles.seekButton}
        onPress={onSeekBackward}
        activeOpacity={0.7}
      >
        <Ionicons name="play-back" size={26} color="#FFFFFF" />
        <Text style={styles.seekText}>-{seekStepSeconds}s</Text>
      </TouchableOpacity>

      {/* Main Center Play / Pause / Buffering Button */}
      <View style={styles.centerButtonWrapper}>
        {isBuffering ? (
          <View style={styles.centerPlayButton}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.centerPlayButton}
            onPress={onTogglePlayPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color="#FFFFFF"
              style={!isPlaying ? { marginLeft: 4 } : undefined}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Fast Forward Button (+10s) */}
      <TouchableOpacity
        style={styles.seekButton}
        onPress={onSeekForward}
        activeOpacity={0.7}
      >
        <Ionicons name="play-forward" size={26} color="#FFFFFF" />
        <Text style={styles.seekText}>+{seekStepSeconds}s</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  seekButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  seekText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  centerButtonWrapper: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
