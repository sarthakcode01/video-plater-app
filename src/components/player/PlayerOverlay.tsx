import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CenterPlaybackControls } from './CenterPlaybackControls';
import { TimelineScrubber } from './TimelineScrubber';
import { COLORS, SPACING } from '../../constants/theme';
import { PlaybackSpeed } from '../../types/video';

interface PlayerOverlayProps {
  title: string;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  isScrubbing: boolean;
  playbackSpeed: PlaybackSpeed;
  isFullscreen?: boolean;
  isOrientationLocked?: boolean;
  aspectLabel?: string;
  audioTracksCount?: number;
  textTracksCount?: number;
  onTogglePlayPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSlidingStart: () => void;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  onBack: () => void;
  onToggleSpeedMenu?: () => void;
  onToggleFullscreen?: () => void;
  onToggleOrientationLock?: () => void;
  onCycleAspect?: () => void;
  onOpenTracksMenu?: (tab: 'audio' | 'subtitles') => void;
}

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  title,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  isScrubbing,
  playbackSpeed,
  isFullscreen = false,
  isOrientationLocked = false,
  aspectLabel,
  audioTracksCount = 0,
  textTracksCount = 0,
  onTogglePlayPause,
  onSeekBackward,
  onSeekForward,
  onSlidingStart,
  onValueChange,
  onSlidingComplete,
  onBack,
  onToggleSpeedMenu,
  onToggleFullscreen,
  onToggleOrientationLock,
  onCycleAspect,
  onOpenTracksMenu,
}) => {
  const insets = useSafeAreaInsets();

  // Dynamic notch-safe padding for top and bottom bars
  const topBarPaddingStyle = {
    paddingTop: Math.max(insets.top, 14),
    paddingLeft: Math.max(insets.left, SPACING.md),
    paddingRight: Math.max(insets.right, SPACING.md),
  };

  const bottomBarPaddingStyle = {
    paddingBottom: Math.max(insets.bottom, 12),
    paddingLeft: Math.max(insets.left, SPACING.md),
    paddingRight: Math.max(insets.right, SPACING.md),
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Top Controls Bar - Notch Safe */}
      <View style={[styles.topBar, topBarPaddingStyle]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Audio stream selector trigger */}
        {onOpenTracksMenu && audioTracksCount > 0 && (
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => onOpenTracksMenu('audio')}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-high" size={14} color="#FFFFFF" />
            <Text style={styles.pillButtonText}>Audio</Text>
          </TouchableOpacity>
        )}

        {/* Subtitle track selector trigger */}
        {onOpenTracksMenu && (
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => onOpenTracksMenu('subtitles')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbox-ellipses" size={14} color="#FFFFFF" />
            <Text style={styles.pillButtonText}>CC</Text>
          </TouchableOpacity>
        )}

        {/* Speed indicator button */}
        {onToggleSpeedMenu && (
          <TouchableOpacity
            style={styles.pillButton}
            onPress={onToggleSpeedMenu}
            activeOpacity={0.7}
          >
            <Text style={styles.pillButtonText}>{playbackSpeed}x</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Center Controls */}
      <View style={styles.centerContainer} pointerEvents="box-none">
        <CenterPlaybackControls
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          onTogglePlayPause={onTogglePlayPause}
          onSeekBackward={onSeekBackward}
          onSeekForward={onSeekForward}
        />
      </View>

      {/* Bottom Controls Bar - Notch & Gesture Bar Safe */}
      <View style={[styles.bottomBar, bottomBarPaddingStyle]}>
        {/* Timeline Scrubber */}
        <TimelineScrubber
          currentTime={currentTime}
          duration={duration}
          isScrubbing={isScrubbing}
          onSlidingStart={onSlidingStart}
          onValueChange={onValueChange}
          onSlidingComplete={onSlidingComplete}
        />

        {/* Bottom actions row */}
        <View style={styles.bottomActionsRow}>
          <View style={styles.bottomLeftActions}>
            {onToggleSpeedMenu && (
              <TouchableOpacity
                style={styles.speedSelectorButton}
                onPress={onToggleSpeedMenu}
                activeOpacity={0.7}
              >
                <Ionicons name="speedometer-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.speedSelectorText}>Speed: {playbackSpeed}x</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomRightActions}>
            {onCycleAspect && (
              <TouchableOpacity
                style={styles.aspectButton}
                onPress={onCycleAspect}
                activeOpacity={0.7}
              >
                <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                {aspectLabel ? <Text style={styles.aspectButtonText}>{aspectLabel}</Text> : null}
              </TouchableOpacity>
            )}

            {onToggleOrientationLock && (
              <TouchableOpacity
                style={[styles.fullscreenButton, isOrientationLocked && styles.lockButtonActive]}
                onPress={onToggleOrientationLock}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isOrientationLocked ? 'lock-closed' : 'lock-open-outline'}
                  size={18}
                  color={isOrientationLocked ? COLORS.accentYellow : '#FFFFFF'}
                />
              </TouchableOpacity>
            )}

            {onToggleFullscreen && (
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={onToggleFullscreen}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFullscreen ? 'contract-outline' : 'expand-outline'}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    gap: 8,
    paddingBottom: SPACING.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  titleWrapper: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  pillButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingTop: SPACING.xs,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingTop: 2,
  },
  bottomLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  speedSelectorText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
  },
  aspectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lockButtonActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  fullscreenButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
