import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoRef, OnProgressData, OnLoadData, OnBufferData } from 'react-native-video';
import type { VLCPlayer, VideoInfo } from 'react-native-vlc-media-player';
import { PlaybackSpeed, AudioTrack, TextTrack, AspectMode, HoldSpeed, HoldSide } from '../types/video';

const AUTO_HIDE_DELAY_MS = 3500;
const HOLD_SPEED_STORAGE_KEY = '@video_player_hold_speed';
const DEFAULT_HOLD_SPEED: HoldSpeed = 2;
export const HOLD_SPEED_OPTIONS: HoldSpeed[] = [1.5, 2, 3, 4];
export const ASPECT_MODES: AspectMode[] = ['fit', 'fill', 'zoom', '16:9', '4:3'];

// 'exo' = react-native-video (hardware decoders), 'vlc' = libVLC (software decoders for AC3/EAC3/DTS/TrueHD)
export type PlayerEngine = 'exo' | 'vlc';

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
  const vlcRef = useRef<VLCPlayer>(null);
  const [engine, setEngine] = useState<PlayerEngine>('exo');

  // Core playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(initialDuration);

  // Mirrors of time state so seek callbacks stay stable across progress ticks
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(initialDuration);
  const scrubTimeRef = useRef<number>(0);
  const isScrubbingRef = useRef<boolean>(false);
  // Position (seconds) to restore once VLC has loaded after an engine switch
  const pendingVlcSeekRef = useRef<number | null>(null);

  // Anti-jitter scrubber states
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(0);

  // Speed state
  const [baseSpeed, setBaseSpeed] = useState<PlaybackSpeed>(1.0);
  const [isSpeedBoosted, setIsSpeedBoosted] = useState<boolean>(false);

  // Hold-to-fast-forward: speed is user-adjustable and remembered between videos
  const [holdSpeed, setHoldSpeedState] = useState<HoldSpeed>(DEFAULT_HOLD_SPEED);
  const [holdSide, setHoldSide] = useState<HoldSide | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HOLD_SPEED_STORAGE_KEY)
      .then((raw) => {
        const parsed = raw ? Number(raw) : NaN;
        if ((HOLD_SPEED_OPTIONS as number[]).includes(parsed)) {
          setHoldSpeedState(parsed as HoldSpeed);
        }
      })
      .catch(() => {});
  }, []);

  const setHoldSpeed = useCallback((speed: HoldSpeed) => {
    setHoldSpeedState(speed);
    AsyncStorage.setItem(HOLD_SPEED_STORAGE_KEY, String(speed)).catch(() => {});
  }, []);

  // Effective speed (holdSpeed during hold; reverts to baseSpeed on release)
  const effectiveSpeed = isSpeedBoosted ? holdSpeed : baseSpeed;

  // Aspect ratio mode (cycled from the overlay)
  const [aspectMode, setAspectMode] = useState<AspectMode>('fit');
  const cycleAspectMode = useCallback(() => {
    setAspectMode((prev) => ASPECT_MODES[(ASPECT_MODES.indexOf(prev) + 1) % ASPECT_MODES.length]);
  }, []);

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

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    scrubTimeRef.current = scrubTime;
    isScrubbingRef.current = isScrubbing;
  }, [scrubTime, isScrubbing]);

  // Jump to specific timestamp
  const seekTo = useCallback(
    (targetSeconds: number) => {
      const total = durationRef.current;
      const clamped = Math.max(0, Math.min(targetSeconds, total));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
      setScrubTime(clamped);
      if (engine === 'vlc') {
        // VLC seeks by fraction of total length (0..1)
        if (total > 0) vlcRef.current?.seek(clamped / total);
      } else {
        playerRef.current?.seek(clamped);
      }
      resetInactivityTimer();
    },
    [engine, resetInactivityTimer]
  );

  // Relative jump (-10s, +10s, etc.)
  const seekRelative = useCallback(
    (deltaSeconds: number) => {
      const baseTime = isScrubbingRef.current ? scrubTimeRef.current : currentTimeRef.current;
      seekTo(baseTime + deltaSeconds);
    },
    [seekTo]
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

  // Hold the left or right side of the screen to fast-forward at holdSpeed
  const onHoldStart = useCallback((side: HoldSide) => {
    setHoldSide(side);
    setIsSpeedBoosted(true);
    setShowControls(false);
  }, []);

  const onHoldEnd = useCallback(() => {
    setHoldSide(null);
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
    setScrubTime(currentTimeRef.current);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
  }, []);

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

  // Hand the file over to libVLC (software decoders for Dolby AC3/EAC3/DDP, DTS, TrueHD, HEVC 10-bit).
  // Only attempted once per file; if VLC also fails, onVlcError shows the error screen.
  const switchToVlc = useCallback((reason: string) => {
    if (hasAttemptedAudioFallbackRef.current) return false;
    hasAttemptedAudioFallbackRef.current = true;
    console.warn(`${reason} Switching to VLC software decoding.`);
    pendingVlcSeekRef.current = currentTimeRef.current > 1 ? currentTimeRef.current : null;
    setEngine('vlc');
    // Exo track indexes do not match VLC track ids; onVlcLoad repopulates them
    setAudioTracks([]);
    setTextTracks([]);
    setSelectedAudioTrackIndex(null);
    setSelectedTextTrackIndex(null);
    setIsAudioMutedFallback(false);
    setPlayerError(null);
    setDiagnostic(null);
    setIsBuffering(true);
    setIsPlaying(true);
    return true;
  }, []);

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
      // ExoPlayer does not raise an error for an audio codec the phone can't decode (e.g. Dolby
      // Digital Plus / DDP5.1): it silently plays video only and leaves every audio track unselected.
      if (parsedAudio.length > 0 && !parsedAudio.some((t) => t.selected)) {
        const codecs = Array.from(new Set(parsedAudio.map((t) => t.type).filter(Boolean))).join(', ');
        if (switchToVlc(`No playable audio track (${codecs || 'unknown codec'}).`)) {
          setAudioNotice('Audio format not supported by phone hardware. Playing with software decoding.');
          return;
        }
      }

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
  }, [switchToVlc]);

  const selectAudioTrack = useCallback((index: number) => {
    setSelectedAudioTrackIndex(index);
    setIsAudioMutedFallback(false);
    setPlayerError(null);
    setDiagnostic(null);
    if (engine === 'exo') {
      setPlayerKey((k) => k + 1); // remount native player to reset decoder state
    }
    // VLC switches audio tracks live via the audioTrack prop
    resetInactivityTimer();
  }, [engine, resetInactivityTimer]);

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

  // Codec & Media Error Callback (react-native-video). Any hardware decoder failure hands the
  // file over to libVLC, which decodes Dolby AC3/EAC3, DTS, TrueHD and HEVC 10-bit in software.
  const onError = useCallback((error: any) => {
    setIsBuffering(false);
    const parsed = parseExoPlayerError(error);
    setDiagnostic(parsed);

    // Any playback failure (not only decoder init) gets one try with VLC before showing an error
    if (switchToVlc(`Hardware playback failed (${parsed.detectedCodec ?? 'unknown'}).`)) {
      setAudioNotice(
        `${parsed.detectedCodec || 'This file'} is not supported by phone hardware. Playing with software decoding.`
      );
      return;
    }

    setPlayerError(parsed.userExplanation);
  }, [switchToVlc]);

  // ---- libVLC (software decoding) event handlers. VLC reports times in milliseconds. ----
  const onVlcLoad = useCallback((info: VideoInfo) => {
    setPlayerError(null);
    if (info.duration && info.duration > 0) {
      setDuration(info.duration / 1000);
    }

    if (Array.isArray(info.audioTracks)) {
      // VLC lists a "Disable" pseudo-track with id -1
      const parsedAudio: AudioTrack[] = info.audioTracks
        .filter((t) => t.id >= 0)
        .map((t) => ({ index: t.id, title: t.name || '', language: '' }));
      setAudioTracks(parsedAudio);
      setSelectedAudioTrackIndex((prev) =>
        prev !== null && parsedAudio.some((t) => t.index === prev) ? prev : parsedAudio[0]?.index ?? null
      );
    }

    if (Array.isArray(info.textTracks)) {
      const parsedText: TextTrack[] = info.textTracks
        .filter((t) => t.id >= 0)
        .map((t) => ({ index: t.id, title: t.name || '', language: '' }));
      setTextTracks(parsedText);
      setSelectedTextTrackIndex((prev) =>
        prev !== null && parsedText.some((t) => t.index === prev) ? prev : null
      );
    }
  }, []);

  const onVlcProgress = useCallback(
    (event: { currentTime: number; duration: number }) => {
      const totalSec = event.duration / 1000;
      if (totalSec > 0) {
        setDuration((prev) => (Math.abs(prev - totalSec) > 0.5 ? totalSec : prev));
      }

      // Restore the position the hardware player had reached before the switch
      const pending = pendingVlcSeekRef.current;
      if (pending !== null && totalSec > 0) {
        pendingVlcSeekRef.current = null;
        vlcRef.current?.seek(Math.min(pending / totalSec, 0.99));
        setCurrentTime(pending);
        return;
      }

      if (!isScrubbingRef.current) {
        setCurrentTime(event.currentTime / 1000);
      }
    },
    []
  );

  // bufferRate is sent by the native side but missing from the library's typings
  const onVlcBuffering = useCallback((event: { target: number; bufferRate?: number }) => {
    // VLC emits Buffering events continuously; only show the spinner until the buffer fills
    setIsBuffering(typeof event?.bufferRate === 'number' ? event.bufferRate < 100 : false);
  }, []);

  const onVlcPlaying = useCallback(() => {
    setIsBuffering(false);
  }, []);

  const onVlcError = useCallback(() => {
    setIsBuffering(false);
    setPlayerError('This file could not be decoded, even with software decoding. The file may be corrupted or use an unsupported container.');
  }, []);

  // Watch video-only (mutes/disables failing audio stream so video plays smoothly with subtitles)
  const playWithoutAudio = useCallback(() => {
    setIsAudioMutedFallback(true);
    setPlayerError(null);
    setDiagnostic(null);
    setAudioNotice('Playing in subtitle mode (audio stream disabled).');
    setIsPlaying(true);
    if (engine === 'exo') {
      setIsBuffering(true);
      setPlayerKey((k) => k + 1); // Remount native player cleanly
    }
  }, [engine]);

  const retryPlayback = useCallback(() => {
    setPlayerError(null);
    setDiagnostic(null);
    setAudioNotice(null);
    setIsAudioMutedFallback(false);
    setIsBuffering(true);
    setIsPlaying(true);
    if (engine === 'vlc') {
      pendingVlcSeekRef.current = currentTimeRef.current > 1 ? currentTimeRef.current : null;
    } else {
      hasAttemptedAudioFallbackRef.current = false;
    }
    setPlayerKey((k) => k + 1); // Remount to clear Android MediaCodec allocation table
  }, [engine]);

  return {
    playerRef,
    vlcRef,
    engine,
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
    holdSpeed,
    setHoldSpeed,
    holdSide,
    // Aspect ratio
    aspectMode,
    cycleAspectMode,
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
    // Event handlers for VLCPlayer (software decoding fallback)
    onVlcLoad,
    onVlcProgress,
    onVlcBuffering,
    onVlcPlaying,
    onVlcError,
  };
}
