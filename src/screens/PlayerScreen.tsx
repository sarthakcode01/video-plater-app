import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Modal,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import Video, { SelectedTrackType } from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
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
  const insets = useSafeAreaInsets();
  const [showSpeedModal, setShowSpeedModal] = useState<boolean>(false);
  const [showTrackModal, setShowTrackModal] = useState<boolean>(false);
  const [trackModalTab, setTrackModalTab] = useState<'audio' | 'subtitles'>('audio');

  // Resume prompt state
  const [resumePromptPosition, setResumePromptPosition] = useState<number | null>(null);
  const resumeBannerAnim = useRef(new Animated.Value(0)).current;

  // Landscape Fullscreen Orientation Controller
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useOrientation(false);

  const {
    playerRef,
    playerKey,
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
    isAudioMutedFallback,
    playWithoutAudio,
    audioNotice,
    dismissAudioNotice,
    showControls,
    toggleControls,
    togglePlayPause,
    seekTo,
    seekRelative,
    playerError,
    diagnostic,
    onError,
    retryPlayback,
    onLoad,
    onProgress,
    onBuffer,
    onEnd,
  } = useVideoPlayerController({ initialDuration: asset.duration });

  // Manage Android Navigation Bar for immersive video playback (black theme, auto-hide)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#000000');
      NavigationBar.setButtonStyleAsync('light');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
    return () => {
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync('#0B0C10');
        NavigationBar.setButtonStyleAsync('light');
        NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isFullscreen || !showControls) {
        NavigationBar.setVisibilityAsync('hidden');
      } else {
        NavigationBar.setVisibilityAsync('visible');
      }
    }
  }, [isFullscreen, showControls]);

  // Check watch history on mount
  useEffect(() => {
    (async () => {
      const history = await getPlaybackPosition(asset.id);
      if (history && history.position > 15 && history.position < (asset.duration || history.duration) * 0.95) {
        setResumePromptPosition(history.position);
        Animated.spring(resumeBannerAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          setResumePromptPosition(null);
        }, 7000);
      }
    })();
  }, [asset.id, asset.duration, resumeBannerAnim]);

  // Periodically save playback position
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
      {/* Notch-safe edge-to-edge status bar configuration */}
      <StatusBar
        hidden={isFullscreen || !showControls}
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={true}
      />

      {/* Gesture Overlay managing Single-Tap, Zone Double-Taps, and Hold-to-2x */}
      <GestureOverlay
        onSingleTap={toggleControls}
        onDoubleTapSeek={handleDoubleTapSeek}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      >
        {/* Native Video Engine with TextureView & Buffer Tuning for Decoder Reliability */}
        <Video
          key={playerKey}
          ref={playerRef}
          source={{ uri: asset.uri }}
          style={styles.videoPlayer}
          controls={false}
          paused={!isPlaying}
          rate={effectiveSpeed}
          resizeMode="contain"
          progressUpdateInterval={250}
          useTextureView={Platform.OS === 'android'} // Fixes ERROR_CODE_DECODER_INIT_FAILED surface conflicts on Android
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          preventsDisplaySleepDuringVideoPlayback={true}
          muted={isAudioMutedFallback}
          selectedAudioTrack={
            isAudioMutedFallback
              ? { type: SelectedTrackType.DISABLED }
              : selectedAudioTrackIndex !== null
              ? { type: SelectedTrackType.INDEX, value: selectedAudioTrackIndex }
              : undefined
          }
          selectedTextTrack={
            selectedTextTrackIndex !== null
              ? { type: SelectedTrackType.INDEX, value: selectedTextTrackIndex }
              : { type: SelectedTrackType.DISABLED }
          }
          onLoad={onLoad}
          onProgress={onProgress}
          onBuffer={onBuffer}
          onEnd={onEnd}
          onError={onError}
          repeat={false}
        />

        {/* YouTube Double-Tap Animated Ripple Indicator */}
        <DoubleTapRippleIndicator side={doubleTapSide} seconds={accumulatedSeek} />
      </GestureOverlay>

      {/* Resume Playback Banner - Positioned safely below notch */}
      {resumePromptPosition && (
        <Animated.View
          style={[
            styles.resumeBanner,
            {
              top: Math.max(insets.top + 50, 70),
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

      {/* Audio Decoder Fallback Notice Banner - Safely below notch */}
      {audioNotice && !playerError && (
        <View
          style={[
            styles.noticeBanner,
            { top: Math.max(insets.top + (resumePromptPosition ? 80 : 16), 24) },
          ]}
        >
          <Ionicons name="volume-mute-outline" size={18} color={COLORS.accentYellow} />
          <Text style={styles.noticeText} numberOfLines={2}>
            {audioNotice}
          </Text>
          <TouchableOpacity onPress={dismissAudioNotice} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Notch-Safe Custom Player UI Overlay with 3.5s Auto-Hide */}
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

      {/* Unsupported Codec & Stream Error Fallback */}
      {playerError && (
        <PlayerErrorFallback
          errorMessage={playerError}
          diagnostic={diagnostic}
          hasMultipleAudioTracks={audioTracks.length > 1}
          onOpenAudioSelector={() => handleOpenTracksMenu('audio')}
          onPlayWithoutAudio={playWithoutAudio}
          onRetry={retryPlayback}
          onBackToLibrary={handleExit}
        />
      )}

      {/* Audio & Subtitle Stream Selection Modal */}
      <TrackSelectorModal
        visible={showTrackModal}
        onClose={() => setShowTrackModal(false)}
        audioTracks={audioTracks}
        textTracks={textTracks}
        selectedAudioIndex={selectedAudioTrackIndex}
        selectedTextIndex={selectedTextTrackIndex}
        isAudioMuted={isAudioMutedFallback}
        onDisableAudio={playWithoutAudio}
        onSelectAudio={selectAudioTrack}
        onSelectSubtitle={selectTextTrack}
        initialTab={trackModalTab}
      />

      {/* Preset Playback Speed Selection Modal */}
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
  noticeBanner: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 28, 40, 0.96)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    zIndex: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 7,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
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
