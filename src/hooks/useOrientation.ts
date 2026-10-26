import { useState, useEffect, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

const { Orientation, OrientationLock } = ScreenOrientation;

function isLandscapeOrientation(o: ScreenOrientation.Orientation): boolean {
  return o === Orientation.LANDSCAPE_LEFT || o === Orientation.LANDSCAPE_RIGHT;
}

/**
 * Player orientation control.
 * - Auto (default): screen follows the phone's sensor (and the system auto-rotate toggle).
 * - Locked: orientation is frozen until the user unlocks.
 * isFullscreen simply reports whether the screen is currently landscape.
 */
export function useOrientation(initialFullscreen = false) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialFullscreen);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Start in auto-rotate and track the real orientation
  useEffect(() => {
    let mounted = true;

    ScreenOrientation.unlockAsync().catch(() => {});
    ScreenOrientation.getOrientationAsync()
      .then((o) => {
        if (mounted) setIsFullscreen(isLandscapeOrientation(o));
      })
      .catch(() => {});

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setIsFullscreen(isLandscapeOrientation(event.orientationInfo.orientation));
    });

    return () => {
      mounted = false;
      ScreenOrientation.removeOrientationChangeListener(subscription);
      // Always restore portrait when leaving the player
      ScreenOrientation.lockAsync(OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // Freeze the current orientation, or return to auto-rotate
  const toggleLock = useCallback(async () => {
    try {
      if (isLocked) {
        await ScreenOrientation.unlockAsync();
        setIsLocked(false);
        return;
      }
      const current = await ScreenOrientation.getOrientationAsync();
      const lock =
        current === Orientation.LANDSCAPE_LEFT
          ? OrientationLock.LANDSCAPE_LEFT
          : current === Orientation.LANDSCAPE_RIGHT
          ? OrientationLock.LANDSCAPE_RIGHT
          : OrientationLock.PORTRAIT_UP;
      await ScreenOrientation.lockAsync(lock);
      setIsLocked(true);
    } catch (error) {
      console.warn('Failed to toggle orientation lock:', error);
    }
  }, [isLocked]);

  // Force landscape (lock on)
  const enterFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
      setIsLocked(true);
    } catch (error) {
      console.warn('Failed to lock orientation to landscape:', error);
    }
  }, []);

  // Force portrait (lock on)
  const exitFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
      setIsLocked(true);
    } catch (error) {
      console.warn('Failed to restore orientation to portrait:', error);
    }
  }, []);

  // Fullscreen button: jump to the other orientation and hold it there
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isLocked,
    toggleLock,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
