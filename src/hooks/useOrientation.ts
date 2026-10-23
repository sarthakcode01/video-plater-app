import { useState, useEffect, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useOrientation(initialFullscreen = false) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialFullscreen);

  // Lock to landscape
  const enterFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    } catch (error) {
      console.warn('Failed to lock orientation to landscape:', error);
    }
  }, []);

  // Restore to portrait
  const exitFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } catch (error) {
      console.warn('Failed to restore orientation to portrait:', error);
    }
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Clean up: Always restore portrait mode when unmounting the player
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
