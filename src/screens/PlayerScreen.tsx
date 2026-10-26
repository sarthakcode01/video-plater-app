import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Modal,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Video, { SelectedTrackType } from 'react-native-video';
import { VLCPlayer } from 'react-native-vlc-media-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeNavigationBar } from '../utils/safeNavigationBar';
import { VideoAsset, PlaybackSpeed, AspectMode } from '../types/video';
import { useVideoPlayerController, HOLD_SPEED_OPTIONS } from '../hooks/useVideoPlayerController';
import { useOrientation } from '../hooks/useOrientation';
import { PlayerOverlay } from '../components/player/PlayerOverlay';
import { DoubleTapRippleIndicator } from '../components/player/DoubleTapRippleIndicator';
import { HoldSpeedIndicator } from '../components/player/HoldSpeedIndicator';
import { GestureOverlay } from '../components/player/GestureOverlay';
import { TrackSelectorModal } from '../components/player/TrackSelectorModal';
import { PlayerErrorFallback } from '../components/player/PlayerErrorFallback';
import { COLORS, SPEED_PRESETS, SPACING } from '../constants/theme';
import { formatDuration } from '../utils/formatters';
import { savePlaybackPosition, getPlaybackPosition } from '../utils/watchHistory';
import { Ionicons } from '@expo/vector-icons';

const ASPECT_LABELS: Record<AspectMode, string> = {
  fit: 'Fit',
  fill: 'Stretch',
  zoom: 'Zoom',
  '16:9': '16:9',
  '4:3': '4:3',
};

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
  const { isFullscreen, isLocked, toggleLock, toggleFullscreen, exitFullscreen } = useOrientation(false);

  const {
    playerRef,
    vlcRef,
    engine,
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
    holdSpeed,
    setHoldSpeed,
    holdSide,
    aspectMode,
    cycleAspectMode,
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
    onVlcLoad,
    onVlcProgress,
    onVlcBuffering,
    onVlcPlaying,
    onVlcError,
  } = useVideoPlayerController({ initialDuration: asset.duration });

  // Short on-screen message for aspect ratio / orientation lock changes
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1200);
  }, []);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const isFirstAspectRender = useRef(true);
  useEffect(() => {
    if (isFirstAspectRender.current) {
      isFirstAspectRender.current = false;
      return;
    }
    showToast(`Aspect ratio: ${ASPECT_LABELS[aspectMode]}`);
  }, [aspectMode, showToast]);

  const handleToggleLock = useCallback(async () => {
    const willLock = !isLocked;
    await toggleLock();
    showToast(willLock ? 'Orientation locked' : 'Auto-rotate on');
  }, [isLocked, toggleLock, showToast]);

  // Video box: Fit/Stretch/Zoom fill the screen (resizeMode does the work); 16:9 and 4:3
  // are a centered box with that exact ratio, with the video stretched to fill it.
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const videoBoxStyle = useMemo(() => {
    const ratio = aspectMode === '16:9' ? 16 / 9 : aspectMode === '4:3' ? 4 / 3 : null;
    const { width: cw, height: ch } = containerSize;
    if (!ratio || cw === 0 || ch === 0) return styles.videoBoxFull;
    const containerRatio = cw / ch;
    return containerRatio > ratio
      ? { width: ch * ratio, height: ch }
      : { width: cw, height: cw / ratio };
  }, [aspectMode, containerSize]);

  const exoResizeMode = aspectMode === 'fit' ? 'contain' : aspectMode === 'zoom' ? 'cover' : 'stretch';
  const vlcResizeMode = aspectMode === 'fit' ? 'contain' : aspectMode === 'zoom' ? 'cover' : 'fill';

  // Immersive playback: hide the system nav bar for the whole session. It must not follow
  // showControls, or the window resizes on every tap and the video jumps. The status bar is
  // hidden the same way below. Swiping from the screen edge brings the bars back temporarily.
  useEffect(() => {
    if (Platform.OS === 'android') {
      SafeNavigationBar.setBackgroundColorAsync('#000000');
      SafeNavigationBar.setBorderColorAsync('#000000');
      SafeNavigationBar.setButtonStyleAsync('light');
      SafeNavigationBar.setBehaviorAsync('overlay-swipe');
      SafeNavigationBar.setVisibilityAsync('hidden');
    }
    return () => {
      if (Platform.OS === 'android') {
        SafeNavigationBar.setBackgroundColorAsync('#0B0C10');
        SafeNavigationBar.setBorderColorAsync('#0B0C10');
        SafeNavigationBar.setButtonStyleAsync('light');
        SafeNavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

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

  // Periodically save playback position (throttled: progress ticks several times per
  // second, and writing AsyncStorage on every tick floods the JS thread)
  const lastSavedTimeRef = useRef<number>(0);
  useEffect(() => {
    if (currentTime > 5 && duration > 0 && Math.abs(currentTime - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = currentTime;
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
        hidden={true}
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
        <View style={styles.videoStage} onLayout={handleContainerLayout} pointerEvents="none">
        <View style={videoBoxStyle}>
        {engine === 'vlc' ? (
          /* libVLC engine with software decoders (Dolby AC3/EAC3, DTS, TrueHD) used after a hardware decoder failure */
          <VLCPlayer
            key={`vlc-${playerKey}`}
            ref={vlcRef}
            source={{ uri: asset.uri }}
            style={styles.vlcPlayer}
            paused={!isPlaying}
            rate={effectiveSpeed}
            resizeMode={vlcResizeMode}
            muted={isAudioMutedFallback}
            audioTrack={
              isAudioMutedFallback ? -1 : selectedAudioTrackIndex !== null ? selectedAudioTrackIndex : undefined
            }
            textTrack={selectedTextTrackIndex !== null ? selectedTextTrackIndex : -1}
            onLoad={onVlcLoad}
            onProgress={onVlcProgress}
            onBuffering={onVlcBuffering}
            onPlaying={onVlcPlaying}
            onEnd={onEnd}
            onError={onVlcError}
          />
        ) : (
        /* Native Video Engine with TextureView & Buffer Tuning for Decoder Reliability */
        <Video
          key={playerKey}
          ref={playerRef}
          source={{ uri: asset.uri }}
          style={styles.videoPlayer}
          controls={false}
          paused={!isPlaying}
          rate={effectiveSpeed}
          resizeMode={exoResizeMode}
          progressUpdateInterval={500}
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
        )}
        </View>
        </View>

        {/* YouTube Double-Tap Animated Ripple Indicator */}
        <DoubleTapRippleIndicator side={doubleTapSide} seconds={accumulatedSeek} />
      </GestureOverlay>

      {/* Fast-forward indicator while holding the left/right side */}
      <HoldSpeedIndicator side={holdSide} speed={holdSpeed} />

      {/* Aspect ratio / orientation lock feedback */}
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

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
          isFullscreen={isFullscreen}
          isOrientationLocked={isLocked}
          aspectLabel={ASPECT_LABELS[aspectMode]}
          onCycleAspect={cycleAspectMode}
          onToggleOrientationLock={handleToggleLock}
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

            <Text style={[styles.speedModalTitle, styles.holdSpeedTitle]}>Hold speed (edge hold)</Text>
            <View style={styles.holdSpeedRow}>
              {HOLD_SPEED_OPTIONS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[styles.holdSpeedChip, holdSpeed === speed && styles.holdSpeedChipSelected]}
                  onPress={() => setHoldSpeed(speed)}
                >
                  <Text
                    style={[styles.holdSpeedChipText, holdSpeed === speed && styles.speedOptionTextSelected]}
                  >
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  videoStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBoxFull: {
    width: '100%',
    height: '100%',
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  // No backgroundColor: VLC renders into a TextureView, which crashes if given a background
  // ("TextureView doesn't support displaying a background drawable"). The container is already black.
  vlcPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 28,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  holdSpeedTitle: {
    marginTop: SPACING.md,
  },
  holdSpeedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  holdSpeedChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  holdSpeedChipSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: COLORS.primary,
  },
  holdSpeedChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
