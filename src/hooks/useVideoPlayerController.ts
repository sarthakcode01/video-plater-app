import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VideoRef, OnProgressData, OnLoadData, OnBufferData } from 'react-native-video';
import { PlaybackSpeed, AudioTrack, TextTrack } from '../types/video';

const AUTO_HIDE_DELAY_MS = 3500;

export interface CodecDiagnostic {
  isDecoderInitFailed: boolean;
  failedCategory: 'audio' | 'video' | 'unknown';
  detectedCodec?: string;
  userExplanation: string;
}

export function parseExoPlayerError(error: any): CodecDiagnostic {
  const errObj = error?.error || {};
  const rawMsg = errObj.errorString || error?.message || '';
  const stack = errObj.errorStackTrace || errObj.errorException || '';
  const fullText = `${rawMsg} ${stack}`;

  const isDecoderInitFailed =
    fullText.toLowerCase().includes('decoder_init_failed') ||
    fullText.includes('ERROR_CODE_DECODER_INIT_FAILED') ||
    fullText.includes('DecoderInitializationException');

  let failedCategory: 'audio' | 'video' | 'unknown' = 'unknown';
  let detectedCodec: string | undefined = undefined;

  if (fullText.includes('audio/vnd.dts') || fullText.toLowerCase().includes('dts')) {
    failedCategory = 'audio';
    detectedCodec = 'DTS Surround Audio';
  } else if (fullText.includes('audio/true-hd') || fullText.toLowerCase().includes('truehd')) {
    failedCategory = 'audio';
    detectedCodec = 'Dolby TrueHD Audio';
  } else if (fullText.includes('audio/eac3') || fullText.includes('audio/ac3')) {
    failedCategory = 'audio';
    detectedCodec = 'Dolby Digital (AC3/EAC3)';
  } else if (fullText.includes('audio/')) {
    failedCategory = 'audio';
    detectedCodec = 'Unsupported Audio Format';
  } else if (fullText.includes('video/hevc') || fullText.toLowerCase().includes('hevc')) {
    failedCategory = 'video';
    detectedCodec = 'HEVC / H.265 (10-bit)';
  } else if (fullText.includes('video/av01') || fullText.toLowerCase().includes('av1')) {
    failedCategory = 'video';
    detectedCodec = 'AV1 Video';
  } else if (fullText.includes('video/')) {
    failedCategory = 'video';
    detectedCodec = 'High-Bitrate Video Stream';
  }

  let userExplanation = '';
  if (isDecoderInitFailed) {
    if (failedCategory === 'audio') {
      userExplanation = `The audio stream is encoded in ${detectedCodec || 'an unsupported format'}, which your phone's Android hardware decoder does not support. (Players like VLC play this because they bundle software FFmpeg decoders).`;
    } else if (failedCategory === 'video') {
      userExplanation = `The video stream is encoded in ${detectedCodec || 'a high-profile format'} that exceeds your phone's hardware decoder capabilities.`;
    } else {
      userExplanation = `Hardware decoder initialization failed. This commonly occurs with multi-channel surround audio (DTS/Dolby) or 10-bit HDR video profiles.`;
    }
  } else {
    userExplanation = rawMsg || 'A playback error occurred.';
  }

  return {
    isDecoderInitFailed,
    failedCategory,
    detectedCodec,
    userExplanation,
  };
}

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

  // UI overlay visibility & Auto-hide Timer
  const [showControls, setShowControls] = useState<boolean>(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // YouTube Double-Tap Seek Accumulation
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [accumulatedSeek, setAccumulatedSeek] = useState<number>(0);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio & Subtitle Tracks
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState<number | null>(null);
  const [selectedTextTrackIndex, setSelectedTextTrackIndex] = useState<number | null>(null);

  // Codec Error & Diagnostic State
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<CodecDiagnostic | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [playerKey, setPlayerKey] = useState<number>(1);
  const [isAudioMutedFallback, setIsAudioMutedFallback] = useState<boolean>(false);
  const hasAttemptedAudioFallbackRef = useRef<boolean>(false);

  // Auto-dismiss audio notice after 8 seconds
  useEffect(() => {
    if (audioNotice) {
      const timer = setTimeout(() => {
        setAudioNotice(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [audioNotice]);

  const dismissAudioNotice = useCallback(() => {
    setAudioNotice(null);
  }, []);

  // Clean up player reference on unmount to free hardware decoders
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
      setIsPlaying(false);
    };
  }, []);

  // Reset & run 3.5-second inactivity countdown
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

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // OS AppState Interruption
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState.match(/inactive|background/)) {
        setIsPlaying(false);
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

  // Stream Metadata Extraction on Load
  const onLoad = useCallback((data: OnLoadData) => {
    setIsBuffering(false);
    setPlayerError(null);
    setDiagnostic(null);
    hasAttemptedAudioFallbackRef.current = false;
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
        type: item.type ? String(item.type) : undefined,
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
    setIsAudioMutedFallback(false);
    setPlayerError(null);
    setDiagnostic(null);
    setPlayerKey((k) => k + 1); // remount native player to reset decoder state
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
    setShowControls(true);
  }, [duration]);

  // Codec & Media Error Callback with deep diagnostics & auto audio fallback
  const onError = useCallback((error: any) => {
    setIsBuffering(false);
    const parsed = parseExoPlayerError(error);
    setDiagnostic(parsed);

    if (parsed.isDecoderInitFailed) {
      // If the failure is an audio decoder issue (Dolby AC3/EAC3, DTS, TrueHD)
      if (parsed.failedCategory === 'audio') {
        // Step 1: If there are alternate audio tracks available, switch to secondary track
        if (audioTracks.length > 1 && !hasAttemptedAudioFallbackRef.current) {
          hasAttemptedAudioFallbackRef.current = true;
          const nextIndex = selectedAudioTrackIndex === 0 ? 1 : 0;
          console.warn(`Audio decoder failed (${parsed.detectedCodec}). Auto-switching to audio track index ${nextIndex}`);
          setSelectedAudioTrackIndex(nextIndex);
          setPlayerError(null);
          setAudioNotice(`Switched audio track: ${parsed.detectedCodec || 'Dolby'} format unsupported by phone hardware.`);
          setPlayerKey((k) => k + 1); // Force fresh native instance
          setIsPlaying(true);
          return;
        }

        // Step 2: If there are no other tracks or switching failed, AUTOMATICALLY play video with subtitles!
        if (!isAudioMutedFallback) {
          console.warn(`Audio decoder failed (${parsed.detectedCodec}). Automatically engaging subtitle playback fallback.`);
          hasAttemptedAudioFallbackRef.current = true;
          setIsAudioMutedFallback(true);
          setPlayerError(null);
          setAudioNotice(`${parsed.detectedCodec || 'Dolby Digital (AC3/EAC3)'} is unsupported by phone hardware. Playing video with subtitles.`);
          setPlayerKey((k) => k + 1); // Remount native player cleanly with audio disabled
          setIsPlaying(true);
          return;
        }
      }

      setPlayerError(parsed.userExplanation);
    } else {
      setPlayerError(parsed.userExplanation);
    }
  }, [audioTracks, selectedAudioTrackIndex, isAudioMutedFallback]);

  // Watch video-only (mutes/disables failing audio stream so video plays smoothly with subtitles)
  const playWithoutAudio = useCallback(() => {
    setIsAudioMutedFallback(true);
    setPlayerError(null);
    setDiagnostic(null);
    setAudioNotice('Playing in subtitle mode (audio stream disabled).');
    setIsBuffering(true);
    setIsPlaying(true);
    setPlayerKey((k) => k + 1); // Remount native player cleanly
  }, []);

  const retryPlayback = useCallback(() => {
    setPlayerError(null);
    setDiagnostic(null);
    setAudioNotice(null);
    setIsAudioMutedFallback(false);
    setIsBuffering(true);
    setIsPlaying(true);
    hasAttemptedAudioFallbackRef.current = false;
    setPlayerKey((k) => k + 1); // Remount to clear Android MediaCodec allocation table
  }, []);

  return {
    playerRef,
    playerKey,
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
    onValueChange: onSlidingChange,
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
    isAudioMutedFallback,
    playWithoutAudio,
    audioNotice,
    dismissAudioNotice,
    // UI visibility & Inactivity timer
    showControls,
    setShowControls,
    toggleControls,
    resetInactivityTimer,
    // Codec Error & Diagnostics
    playerError,
    diagnostic,
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
