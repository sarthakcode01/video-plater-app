import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { VideoFolder } from '../types/video';
import { COLORS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface FolderTabBarProps {
  folders: VideoFolder[];
  selectedFolderId: string | null;
  totalVideosCount: number;
  onSelectFolder: (folderId: string | null) => void;
}

export const FolderTabBar: React.FC<FolderTabBarProps> = ({
  folders,
  selectedFolderId,
  totalVideosCount,
  onSelectFolder,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "All Videos" chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            selectedFolderId === null && styles.chipActive,
          ]}
          onPress={() => onSelectFolder(null)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="film"
            size={14}
            color={selectedFolderId === null ? '#FFFFFF' : COLORS.textMuted}
            style={styles.chipIcon}
          />
          <Text
            style={[
              styles.chipText,
              selectedFolderId === null && styles.chipTextActive,
            ]}
          >
            All Videos ({totalVideosCount})
          </Text>
        </TouchableOpacity>

        {/* Individual Folder Chips */}
        {folders.map((folder) => {
          const isActive = selectedFolderId === folder.id;
          return (
            <TouchableOpacity
              key={folder.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelectFolder(folder.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="folder"
                size={14}
                color={isActive ? '#FFFFFF' : COLORS.textMuted}
                style={styles.chipIcon}
              />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {folder.title} ({folder.assetCount})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
