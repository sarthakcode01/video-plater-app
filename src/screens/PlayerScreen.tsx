import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Modal,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import { VideoAsset, PlaybackSpeed } from '../types/video';
import { useVideoPlayerController } from '../hooks/useVideoPlayerController';
import { useOrientation } from '../hooks/useOrientation';
import { PlayerOverlay } from '../components/player/PlayerOverlay';
import { DoubleTapRippleIndicator } from '../components/player/DoubleTapRippleIndicator';
import { GestureOverlay } from '../components/player/GestureOverlay';
import { TrackSelectorModal } from '../components/player/TrackSelectorModal';
import { PlayerErrorFallback } from '../components/player/PlayerErrorFallback';
import { COLORS, SPEED_PRESETS, SPACING } from '../constants/theme';
import { formatDuration } from '../utils/formatters';
import { savePlaybackPosition, getPlaybackPosition } from '../utils/watchHistory';
import { Ionicons } from '@expo/vector-icons';

interface PlayerScreenProps {
  asset: VideoAsset;
  onClose: () => void;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = ({ asset, onClose }) => {
  const [showSpeedModal, setShowSpeedModal] = useState<boolean>(false);
  const [showTrackModal, setShowTrackModal] = useState<boolean>(false);
  const [trackModalTab, setTrackModalTab] = useState<'audio' | 'subtitles'>('audio');

  // Phase 7: Resume prompt state
  const [resumePromptPosition, setResumePromptPosition] = useState<number | null>(null);
  const resumeBannerAnim = useRef(new Animated.Value(0)).current;

  // Step 6.1: Landscape Fullscreen Orientation Controller
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useOrientation(false);

  const {
    playerRef,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    isScrubbing,
    onSlidingStart,
    onValueChange,
    onSlidingComplete,
    baseSpeed,
    setBaseSpeed,
    effectiveSpeed,
    isSpeedBoosted,
    doubleTapSide,
    accumulatedSeek,
    handleDoubleTapSeek,
    onHoldStart,
    onHoldEnd,
    audioTracks,
    textTracks,
    selectedAudioTrackIndex,
    selectedTextTrackIndex,
    selectAudioTrack,
    selectTextTrack,
    showControls,
    toggleControls,
    togglePlayPause,
    seekTo,
    seekRelative,
    // Step 6.4: Codec error handling
    playerError,
    onError,
    retryPlayback,
    onLoad,
    onProgress,
    onBuffer,
    onEnd,
  } = useVideoPlayerController({ initialDuration: asset.duration });

  // Phase 7: Check watch history on mount
  useEffect(() => {
    (async () => {
      const history = await getPlaybackPosition(asset.id);
      if (history && history.position > 15 && history.position < (asset.duration || history.duration) * 0.95) {
        setResumePromptPosition(history.position);
        Animated.spring(resumeBannerAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // Auto-dismiss resume banner after 7 seconds if not acted upon
        setTimeout(() => {
          setResumePromptPosition(null);
        }, 7000);
      }
    })();
  }, [asset.id, asset.duration, resumeBannerAnim]);

  // Phase 7: Periodically save playback position
  useEffect(() => {
    if (currentTime > 5 && duration > 0) {
      savePlaybackPosition(asset.id, currentTime, duration);
    }
  }, [asset.id, currentTime, duration]);

  // Safe exit handling restoring portrait mode and saving progress
  const handleExit = async () => {
    if (currentTime > 5 && duration > 0) {
      await savePlaybackPosition(asset.id, currentTime, duration);
    }
    await exitFullscreen();
    onClose();
  };

  const handleOpenTracksMenu = (tab: 'audio' | 'subtitles') => {
    setTrackModalTab(tab);
    setShowTrackModal(true);
  };

  const handleAcceptResume = () => {
    if (resumePromptPosition) {
      seekTo(resumePromptPosition);
      setResumePromptPosition(null);
    }
  };

  const handleDismissResume = () => {
    setResumePromptPosition(null);
  };

  return (
    <View style={styles.container}>
      {/* Step 6.1: Edge-to-edge viewing with status bar suppression in fullscreen */}
      <StatusBar
        hidden={isFullscreen || !showControls}
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={true}
      />

      {/* Phase 4: Gesture Overlay managing Single-Tap, Zone Double-Taps, and Hold-to-2x */}
      <GestureOverlay
        onSingleTap={toggleControls}
        onDoubleTapSeek={handleDoubleTapSeek}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      >
        {/* Native Video Engine */}
        <Video
          ref={playerRef}
          source={{ uri: asset.uri }}
          style={styles.videoPlayer}
          controls={false}
          paused={!isPlaying}
          rate={effectiveSpeed}
          resizeMode="contain"
          progressUpdateInterval={250}
          selectedAudioTrack={
            selectedAudioTrackIndex !== null
              ? { type: 'index', value: selectedAudioTrackIndex }
              : undefined
          }
          selectedTextTrack={
            selectedTextTrackIndex !== null
              ? { type: 'index', value: selectedTextTrackIndex }
              : { type: 'disabled' }
          }
          onLoad={onLoad}
          onProgress={onProgress}
          onBuffer={onBuffer}
          onEnd={onEnd}
          onError={onError}
          repeat={false}
        />

        {/* Phase 4: YouTube Double-Tap Animated Ripple Indicator */}
        <DoubleTapRippleIndicator side={doubleTapSide} seconds={accumulatedSeek} />
      </GestureOverlay>

      {/* Phase 7: Resume Playback Banner */}
      {resumePromptPosition && (
        <Animated.View
          style={[
            styles.resumeBanner,
            {
              opacity: resumeBannerAnim,
              transform: [{ translateY: resumeBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            },
          ]}
        >
          <View style={styles.resumeInfo}>
            <Ionicons name="time-outline" size={18} color={COLORS.accentYellow} />
            <Text style={styles.resumeText}>
              Resume from {formatDuration(resumePromptPosition)}?
            </Text>
          </View>
          <View style={styles.resumeActions}>
            <TouchableOpacity style={styles.resumeButton} onPress={handleAcceptResume}>
              <Text style={styles.resumeButtonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismissResume}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Custom Player UI Overlay with Step 6.2 3.5s Auto-Hide */}
      {showControls && !playerError && (
        <PlayerOverlay
          title={asset.filename}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          currentTime={currentTime}
          duration={duration}
          isScrubbing={isScrubbing}
          playbackSpeed={baseSpeed}
          isSpeedBoosted={isSpeedBoosted}
          isFullscreen={isFullscreen}
          audioTracksCount={audioTracks.length}
          textTracksCount={textTracks.length}
          onTogglePlayPause={togglePlayPause}
          onSeekBackward={() => seekRelative(-10)}
          onSeekForward={() => seekRelative(10)}
          onSlidingStart={onSlidingStart}
          onValueChange={onValueChange}
          onSlidingComplete={onSlidingComplete}
          onBack={handleExit}
          onToggleSpeedMenu={() => setShowSpeedModal(true)}
          onToggleFullscreen={toggleFullscreen}
          onOpenTracksMenu={handleOpenTracksMenu}
        />
      )}

      {/* Step 6.4: Unsupported Codec & Stream Error Fallback */}
      {playerError && (
        <PlayerErrorFallback
          errorMessage={playerError}
          hasMultipleAudioTracks={audioTracks.length > 1}
          onOpenAudioSelector={() => handleOpenTracksMenu('audio')}
          onRetry={retryPlayback}
          onBackToLibrary={handleExit}
        />
      )}

      {/* Phase 5: Audio & Subtitle Stream Selection Modal */}
      <TrackSelectorModal
        visible={showTrackModal}
        onClose={() => setShowTrackModal(false)}
        audioTracks={audioTracks}
        textTracks={textTracks}
        selectedAudioIndex={selectedAudioTrackIndex}
        selectedTextIndex={selectedTextTrackIndex}
        onSelectAudio={selectAudioTrack}
        onSelectSubtitle={selectTextTrack}
        initialTab={trackModalTab}
      />

      {/* Step 4.4: Preset Playback Speed Selection Modal */}
      <Modal
        visible={showSpeedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSpeedModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSpeedModal(false)}
        >
          <View style={styles.speedModalContent}>
            <Text style={styles.speedModalTitle}>Playback Speed</Text>
            {SPEED_PRESETS.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedOption,
                  baseSpeed === speed && styles.speedOptionSelected,
                ]}
                onPress={() => {
                  setBaseSpeed(speed as PlaybackSpeed);
                  setShowSpeedModal(false);
                }}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    baseSpeed === speed && styles.speedOptionTextSelected,
                  ]}
                >
                  {speed.toFixed(2).replace(/\.?0+$/, '')}x
                </Text>
                {baseSpeed === speed && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  resumeBanner: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 28, 40, 0.95)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resumeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedModalContent: {
    width: 240,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  speedModalTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  speedOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  speedOptionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  speedOptionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  speedOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
