import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { VideoFolder } from '../types/video';
import { COLORS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface FolderCardProps {
  folder: VideoFolder;
  onPress: (folder: VideoFolder) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FOLDER_ITEM_WIDTH = (SCREEN_WIDTH - SPACING.md * 3) / 2;

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => onPress(folder)}
    >
      <View style={styles.thumbnailContainer}>
        {folder.previewUri ? (
          <Image source={{ uri: folder.previewUri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.emptyThumbnail}>
            <Ionicons name="folder-open" size={40} color={COLORS.textMuted} />
          </View>
        )}

        <View style={styles.folderBadge}>
          <Ionicons name="folder" size={14} color="#FFFFFF" />
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{folder.assetCount}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {folder.title}
        </Text>
        <Text style={styles.subtitle}>
          {folder.assetCount} {folder.assetCount === 1 ? 'video' : 'videos'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: FOLDER_ITEM_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnailContainer: {
    width: '100%',
    height: FOLDER_ITEM_WIDTH * 0.7,
    backgroundColor: COLORS.surfaceElevated,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.85)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  infoContainer: {
    padding: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
