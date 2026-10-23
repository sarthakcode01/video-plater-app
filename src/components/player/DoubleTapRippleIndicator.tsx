import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

interface DoubleTapRippleIndicatorProps {
  side: 'left' | 'right' | null;
  seconds: number;
}

export const DoubleTapRippleIndicator: React.FC<DoubleTapRippleIndicatorProps> = ({
  side,
  seconds,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (side) {
      // Trigger ripple bounce and fade in
      opacityAnim.setValue(0.9);
      scaleAnim.setValue(0.7);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 700,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [side, seconds, opacityAnim, scaleAnim]);

  if (!side) return null;

  const isLeft = side === 'left';

  return (
    <View
      style={[
        styles.container,
        isLeft ? styles.leftContainer : styles.rightContainer,
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.bubble,
          isLeft ? styles.leftBubble : styles.rightBubble,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons
          name={isLeft ? 'play-back' : 'play-forward'}
          size={32}
          color="#FFFFFF"
        />
        <Text style={styles.secondsText}>
          {seconds} seconds
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  leftContainer: {
    left: 0,
  },
  rightContainer: {
    right: 0,
  },
  bubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  leftBubble: {
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    width: '100%',
  },
  rightBubble: {
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
  },
  secondsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
