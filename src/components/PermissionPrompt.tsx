import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { PermissionState } from '../hooks/useMediaLibrary';

interface PermissionPromptProps {
  permissionState: PermissionState;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  permissionState,
  onRequestPermission,
  onOpenSettings,
}) => {
  if (permissionState === 'granted') {
    return null;
  }

  if (permissionState === 'limited') {
    return (
      <View style={styles.limitedBanner}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.accentYellow} />
        <View style={styles.limitedTextContainer}>
          <Text style={styles.limitedTitle}>Limited Media Access</Text>
          <Text style={styles.limitedDescription}>
            Only selected videos are visible. Tap to manage media access.
          </Text>
        </View>
        <TouchableOpacity style={styles.limitedButton} onPress={onOpenSettings}>
          <Text style={styles.limitedButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Denied or Undetermined
  const isDenied = permissionState === 'denied';

  return (
    <View style={styles.fullscreenContainer}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={isDenied ? 'lock-closed-outline' : 'videocam-outline'}
          size={48}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.title}>
        {isDenied ? 'Storage Permission Denied' : 'Access Your Video Library'}
      </Text>

      <Text style={styles.description}>
        {isDenied
          ? 'To browse and play local movies and videos from your device storage, please grant media library permissions in device settings.'
          : 'Allow access to your device storage to automatically scan for downloaded movies, clips, and camera recordings.'}
      </Text>

      <TouchableOpacity
        style={styles.actionButton}
        activeOpacity={0.8}
        onPress={isDenied ? onOpenSettings : onRequestPermission}
      >
        <Text style={styles.actionButtonText}>
          {isDenied ? 'Open Device Settings' : 'Allow Access'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
    maxWidth: 320,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Limited access banner
  limitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 10,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  limitedTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  limitedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentYellow,
  },
  limitedDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  limitedButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  limitedButtonText: {
    color: COLORS.accentYellow,
    fontSize: 12,
    fontWeight: '700',
  },
});
