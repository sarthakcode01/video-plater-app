import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { HoldSide } from '../../types/video';

interface GestureOverlayProps {
  onSingleTap: () => void;
  onDoubleTapSeek: (side: 'left' | 'right') => void;
  onHoldStart: (side: HoldSide) => void;
  onHoldEnd: () => void;
  children?: React.ReactNode;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({
  onSingleTap,
  onDoubleTapSeek,
  onHoldStart,
  onHoldEnd,
  children,
}) => {
  const [containerWidth, setContainerWidth] = useState<number>(
    Dimensions.get('window').width
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const composedGesture = useMemo(() => {
    // 1. Single-Tap recognizer: Toggles UI overlay after ensuring no second tap is incoming
    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .maxDuration(250)
      .onEnd(() => {
        'worklet';
        runOnJS(onSingleTap)();
      });

    // 2. Double-Tap recognizer: Screen zone partitioning (Left 40% vs Right 40% vs Center 20%)
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      // Single taps wait out this window before firing, so keep it short for snappy control toggling
      .maxDelay(250)
      .onEnd((e) => {
        'worklet';
        const x = e.x;
        const width = containerWidth;
        const leftBoundary = width * 0.4;
        const rightBoundary = width * 0.6;

        if (x <= leftBoundary) {
          // Left Zone: Rewind
          runOnJS(onDoubleTapSeek)('left');
        } else if (x >= rightBoundary) {
          // Right Zone: Fast-forward
          runOnJS(onDoubleTapSeek)('right');
        } else {
          // Center Zone: Regular toggle
          runOnJS(onSingleTap)();
        }
      });

    // 3. Long-Press recognizer: holding the left or right 40% fast-forwards; the center 20% does nothing
    const longPress = Gesture.LongPress()
      .minDuration(250)
      .onStart((e) => {
        'worklet';
        const width = containerWidth;
        if (e.x <= width * 0.4) {
          runOnJS(onHoldStart)('left');
        } else if (e.x >= width * 0.6) {
          runOnJS(onHoldStart)('right');
        }
      })
      .onFinalize((_e, success) => {
        'worklet';
        // onFinalize also fires for plain taps; only end a hold that actually began
        if (success) {
          runOnJS(onHoldEnd)();
        }
      });

    // Priority hierarchy:
    // DoubleTap has priority over SingleTap (Exclusive)
    const tapGestures = Gesture.Exclusive(doubleTap, singleTap);
    // LongPress races with tap gestures: holding for 250ms activates 2x speed without triggering taps
    return Gesture.Race(longPress, tapGestures);
  }, [containerWidth, onSingleTap, onDoubleTapSeek, onHoldStart, onHoldEnd]);

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container} onLayout={onLayout} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
});
