import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VideoRef, OnProgressData, OnLoadData, OnBufferData } from 'react-native-video';
import { PlaybackSpeed, AudioTrack, TextTrack } from '../types/video';

const AUTO_HIDE_DELAY_MS = 3500; // Step 6.2: 3.5s inactivity countdown

export interface UseVideoPlayerControllerProps {
  initialDuration?: number;
}

export function useVideoPlayerController({ initialDuration = 0 }: UseVideoPlayerControllerProps = {}) {
  const playerRef = useRef<VideoRef>(null);

  // Core playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(initialDuration);

  // Anti-jitter scrubber states
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(0);

  // Speed state
  const [baseSpeed, setBaseSpeed] = useState<PlaybackSpeed>(1.0);
  const [isSpeedBoosted, setIsSpeedBoosted] = useState<boolean>(false);

  // Effective speed (2.0x during hold; reverts to baseSpeed on release)
  const effectiveSpeed = isSpeedBoosted ? 2.0 : baseSpeed;

  // UI overlay visibility & Step 6.2 Auto-hide Timer
  const [showControls, setShowControls] = useState<boolean>(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 4: YouTube Double-Tap Seek Accumulation
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [accumulatedSeek, setAccumulatedSeek] = useState<number>(0);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 5: Audio & Subtitle Tracks
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState<number | null>(null);
  const [selectedTextTrackIndex, setSelectedTextTrackIndex] = useState<number | null>(null);

  // Phase 6: Step 6.4 Error Fallback State
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Step 6.2: Reset & run 3.5-second inactivity countdown
  const resetInactivityTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }

    if (showControls && isPlaying && !isScrubbing) {
      autoHideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, AUTO_HIDE_DELAY_MS);
    }
  }, [showControls, isPlaying, isScrubbing]);

  // Restart timer when controls visibility or playback state changes
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Step 6.3: OS AppState Interruption (Phone calls, screen lock, background)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState.match(/inactive|background/)) {
        setIsPlaying(false); // Pause so user doesn't lose position
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const play = useCallback(() => {
    setIsPlaying(true);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
  }, []);

  // Jump to specific timestamp
  const seekTo = useCallback(
    (targetSeconds: number) => {
      const clamped = Math.max(0, Math.min(targetSeconds, duration));
      setCurrentTime(clamped);
      setScrubTime(clamped);
      playerRef.current?.seek(clamped);
      resetInactivityTimer();
    },
    [duration, resetInactivityTimer]
  );

  // Relative jump (-10s, +10s, etc.)
  const seekRelative = useCallback(
    (deltaSeconds: number) => {
      const baseTime = isScrubbing ? scrubTime : currentTime;
      const target = Math.max(0, Math.min(baseTime + deltaSeconds, duration));
      seekTo(target);
    },
    [currentTime, scrubTime, isScrubbing, duration, seekTo]
  );

  // Double-tap seek accumulation
  const handleDoubleTapSeek = useCallback(
    (side: 'left' | 'right') => {
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }

      setDoubleTapSide(side);
      setAccumulatedSeek((prev) => {
        const next = doubleTapSide === side ? prev + 10 : 10;
        return next;
      });

      const delta = side === 'left' ? -10 : 10;
      seekRelative(delta);

      doubleTapTimeoutRef.current = setTimeout(() => {
        setDoubleTapSide(null);
        setAccumulatedSeek(0);
      }, 750);
    },
    [doubleTapSide, seekRelative]
  );

  // Instagram-Style Hold for 2x Speed
  const onHoldStart = useCallback(() => {
    setIsSpeedBoosted(true);
    setShowControls(false);
  }, []);

  const onHoldEnd = useCallback(() => {
    setIsSpeedBoosted(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // UI toggle
  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (next) {
        resetInactivityTimer();
      }
      return next;
    });
  }, [resetInactivityTimer]);

  // Scrubbing handlers (Anti-Jitter Lock)
  const onSlidingStart = useCallback(() => {
    setIsScrubbing(true);
    setScrubTime(currentTime);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
  }, [currentTime]);

  const onSlidingChange = useCallback((value: number) => {
    setScrubTime(value);
  }, []);

  const onSlidingComplete = useCallback(
    (value: number) => {
      seekTo(value);
      setIsScrubbing(false);
      resetInactivityTimer();
    },
    [seekTo, resetInactivityTimer]
  );

  // Native video event callbacks
  const onLoad = useCallback((data: OnLoadData) => {
    setIsBuffering(false);
    setPlayerError(null);
    if (data.duration && data.duration > 0) {
      setDuration(data.duration);
    }

    if (data.audioTracks && Array.isArray(data.audioTracks)) {
      const parsedAudio: AudioTrack[] = data.audioTracks.map((item, idx) => ({
        index: typeof item.index === 'number' ? item.index : idx,
        title: item.title || '',
        language: item.language || '',
        type: item.type,
        selected: item.selected,
      }));
      setAudioTracks(parsedAudio);

      const selected = parsedAudio.find((t) => t.selected);
      if (selected) {
        setSelectedAudioTrackIndex(selected.index);
      } else if (parsedAudio.length > 0) {
        setSelectedAudioTrackIndex(parsedAudio[0].index);
      }
    }

    if (data.textTracks && Array.isArray(data.textTracks)) {
      const parsedText: TextTrack[] = data.textTracks.map((item, idx) => ({
        index: typeof item.index === 'number' ? item.index : idx,
        title: item.title || '',
        language: item.language || '',
        type: item.type,
        selected: item.selected,
      }));
      setTextTracks(parsedText);

      const selected = parsedText.find((t) => t.selected);
      if (selected) {
        setSelectedTextTrackIndex(selected.index);
      } else {
        setSelectedTextTrackIndex(null);
      }
    }
  }, []);

  const selectAudioTrack = useCallback((index: number) => {
    setSelectedAudioTrackIndex(index);
    setPlayerError(null); // Clear previous codec errors when user switches stream
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const selectTextTrack = useCallback((index: number | null) => {
    setSelectedTextTrackIndex(index);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const onProgress = useCallback(
    (data: OnProgressData) => {
      if (!isScrubbing) {
        setCurrentTime(data.currentTime);
      }
      if (data.seekableDuration && data.seekableDuration > 0) {
        setDuration(data.seekableDuration);
      }
    },
    [isScrubbing]
  );

  const onBuffer = useCallback((data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  }, []);

  const onEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(duration);
    setShowControls(true); // Always reveal controls when movie finishes
  }, [duration]);

  // Step 6.4: Native Codec & Media Error Callback
  const onError = useCallback((error: any) => {
    setIsBuffering(false);
    const msg =
      error?.error?.errorString ||
      error?.error?.localizedDescription ||
      error?.message ||
      'This video stream or audio codec is not supported by the device hardware decoder.';
    setPlayerError(msg);
  }, []);

  const retryPlayback = useCallback(() => {
    setPlayerError(null);
    setIsBuffering(true);
    setIsPlaying(true);
    playerRef.current?.seek(currentTime);
  }, [currentTime]);

  return {
    playerRef,
    // Playback states
    isPlaying,
    isBuffering,
    currentTime: isScrubbing ? scrubTime : currentTime,
    actualCurrentTime: currentTime,
    duration,
    // Anti-jitter scrubbing
    isScrubbing,
    scrubTime,
    onSlidingStart,
    onSlidingChange,
    onSlidingComplete,
    // Speed management
    baseSpeed,
    setBaseSpeed,
    effectiveSpeed,
    isSpeedBoosted,
    // Double tap seeking
    doubleTapSide,
    accumulatedSeek,
    handleDoubleTapSeek,
    // Hold to 2x speed
    onHoldStart,
    onHoldEnd,
    // Multi-Audio & Subtitles
    audioTracks,
    textTracks,
    selectedAudioTrackIndex,
    selectedTextTrackIndex,
    selectAudioTrack,
    selectTextTrack,
    // UI visibility & Inactivity timer
    showControls,
    setShowControls,
    toggleControls,
    resetInactivityTimer,
    // Phase 6: Codec Error Handling
    playerError,
    onError,
    retryPlayback,
    // Controls actions
    togglePlayPause,
    play,
    pause,
    seekTo,
    seekRelative,
    // Event handlers for Video component
    onLoad,
    onProgress,
    onBuffer,
    onEnd,
  };
}
