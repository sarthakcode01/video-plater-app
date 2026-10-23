import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@video_player_history_';

export interface WatchHistoryEntry {
  videoId: string;
  position: number; // in seconds
  duration: number; // in seconds
  percent: number; // 0 to 100
  updatedAt: number;
}

// In-memory fallback if storage isn't available
const memoryHistoryCache: Record<string, WatchHistoryEntry> = {};

/**
 * Saves video playback timestamp
 */
export async function savePlaybackPosition(
  videoId: string,
  positionSeconds: number,
  durationSeconds: number
): Promise<void> {
  if (!videoId || durationSeconds <= 0) return;

  const percent = Math.min(100, Math.max(0, Math.round((positionSeconds / durationSeconds) * 100)));

  // If video is finished (>95% watched), reset position to start
  const positionToSave = percent >= 95 ? 0 : Math.floor(positionSeconds);

  const entry: WatchHistoryEntry = {
    videoId,
    position: positionToSave,
    duration: Math.floor(durationSeconds),
    percent: percent >= 95 ? 0 : percent,
    updatedAt: Date.now(),
  };

  memoryHistoryCache[videoId] = entry;

  try {
    await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${videoId}`, JSON.stringify(entry));
  } catch (error) {
    // Silently fall back to in-memory cache
  }
}

/**
 * Retrieves saved playback timestamp for a video
 */
export async function getPlaybackPosition(videoId: string): Promise<WatchHistoryEntry | null> {
  if (!videoId) return null;

  if (memoryHistoryCache[videoId]) {
    return memoryHistoryCache[videoId];
  }

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${videoId}`);
    if (raw) {
      const parsed: WatchHistoryEntry = JSON.parse(raw);
      memoryHistoryCache[videoId] = parsed;
      return parsed;
    }
  } catch (error) {
    // Fall back to memory
  }

  return null;
}
