import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface EmptyLibraryProps {
  isSearching: boolean;
  onClearSearch?: () => void;
  onRefresh?: () => void;
}

export const EmptyLibrary: React.FC<EmptyLibraryProps> = ({
  isSearching,
  onClearSearch,
  onRefresh,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={isSearching ? 'search-outline' : 'film-outline'}
          size={42}
          color={COLORS.textMuted}
        />
      </View>

      <Text style={styles.title}>
        {isSearching ? 'No Matching Videos' : 'No Videos Found'}
      </Text>

      <Text style={styles.description}>
        {isSearching
          ? 'We could not find any videos matching your search query. Try another keyword or clear the search.'
          : 'No supported video files (.mp4, .mkv, .mov) were detected in your device storage.'}
      </Text>

      {isSearching && onClearSearch ? (
        <TouchableOpacity style={styles.button} onPress={onClearSearch} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Clear Search</Text>
        </TouchableOpacity>
      ) : onRefresh ? (
        <TouchableOpacity style={styles.button} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.xl * 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
