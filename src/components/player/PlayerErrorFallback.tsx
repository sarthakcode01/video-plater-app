import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

interface PlayerErrorFallbackProps {
  errorMessage?: string;
  hasMultipleAudioTracks: boolean;
  onOpenAudioSelector: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
}

export const PlayerErrorFallback: React.FC<PlayerErrorFallbackProps> = ({
  errorMessage,
  hasMultipleAudioTracks,
  onOpenAudioSelector,
  onRetry,
  onBackToLibrary,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
      </View>

      <Text style={styles.title}>Playback Interrupted</Text>

      <Text style={styles.description}>
        {errorMessage ||
          'This video format or one of its embedded audio streams could not be decoded by the device hardware.'}
      </Text>

      <View style={styles.actionsContainer}>
        {hasMultipleAudioTracks && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onOpenAudioSelector}
            activeOpacity={0.8}
          >
            <Ionicons name="volume-high" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>Switch Audio Stream</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={hasMultipleAudioTracks ? styles.secondaryButton : styles.primaryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryButtonText}>Retry Playback</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostButton}
          onPress={onBackToLibrary}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostButtonText}>Return to Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 12, 16, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    zIndex: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
    marginBottom: SPACING.xl,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 280,
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ghostButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  ghostButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
