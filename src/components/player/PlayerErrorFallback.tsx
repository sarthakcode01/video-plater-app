import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { CodecDiagnostic } from '../../hooks/useVideoPlayerController';

interface PlayerErrorFallbackProps {
  errorMessage?: string;
  diagnostic?: CodecDiagnostic | null;
  hasMultipleAudioTracks: boolean;
  onOpenAudioSelector: () => void;
  onPlayWithoutAudio?: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
}

export const PlayerErrorFallback: React.FC<PlayerErrorFallbackProps> = ({
  errorMessage,
  diagnostic,
  hasMultipleAudioTracks,
  onOpenAudioSelector,
  onPlayWithoutAudio,
  onRetry,
  onBackToLibrary,
}) => {
  const isAudioFailure = diagnostic?.failedCategory === 'audio';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name={diagnostic?.isDecoderInitFailed ? 'hardware-chip-outline' : 'alert-circle-outline'}
            size={44}
            color={COLORS.error}
          />
        </View>

        <Text style={styles.title}>
          {diagnostic?.isDecoderInitFailed ? 'Hardware Decoder Failure' : 'Playback Interrupted'}
        </Text>

        {diagnostic?.detectedCodec && (
          <View style={styles.badge}>
            <Ionicons name="film-outline" size={13} color={COLORS.accentYellow} />
            <Text style={styles.badgeText}>Codec: {diagnostic.detectedCodec}</Text>
          </View>
        )}

        <Text style={styles.description}>
          {diagnostic?.userExplanation ||
            errorMessage ||
            'This video format or one of its embedded audio streams could not be decoded by the device hardware.'}
        </Text>

        {diagnostic?.isDecoderInitFailed && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoBoxText}>
              Unlike players like VLC that bundle custom software decoders (FFmpeg), native Android players rely strictly on your phone's licensed hardware chips.
            </Text>
          </View>
        )}

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

          {isAudioFailure && onPlayWithoutAudio && (
            <TouchableOpacity
              style={hasMultipleAudioTracks ? styles.secondaryButton : styles.primaryButton}
              onPress={onPlayWithoutAudio}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbox-ellipses-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryButtonText}>Watch Video with Subtitles</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Reset Decoder & Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostButton}
            onPress={onBackToLibrary}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostButtonText}>Return to Library</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 12, 16, 0.96)',
    zIndex: 30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
    gap: 6,
  },
  badgeText: {
    color: COLORS.accentYellow,
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
    marginBottom: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 10,
    padding: SPACING.md,
    maxWidth: 320,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoBoxText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
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
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
