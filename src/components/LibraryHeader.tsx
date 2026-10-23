import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SortOption } from '../hooks/useMediaLibrary';

interface LibraryHeaderProps {
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layout: 'grid' | 'list';
  onToggleLayout: () => void;
  sortBy: SortOption;
  onChangeSort: (option: SortOption) => void;
}

export const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  totalCount,
  searchQuery,
  onSearchChange,
  layout,
  onToggleLayout,
  sortBy,
  onChangeSort,
}) => {
  const [showSortMenu, setShowSortMenu] = React.useState(false);

  const sortLabels: Record<SortOption, string> = {
    date_desc: 'Newest First',
    date_asc: 'Oldest First',
    title_asc: 'Name (A-Z)',
    duration_desc: 'Duration',
  };

  return (
    <View style={styles.container}>
      {/* Title & Count Row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Media Library</Text>
          <Text style={styles.subtitle}>
            {totalCount} {totalCount === 1 ? 'video' : 'videos'} found
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {/* Sort button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>

          {/* Grid / List layout toggle */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onToggleLayout}
            activeOpacity={0.7}
          >
            <Ionicons
              name={layout === 'grid' ? 'list-outline' : 'grid-outline'}
              size={20}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search by movie or file title..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Menu popup */}
      {showSortMenu && (
        <View style={styles.sortDropdown}>
          <Text style={styles.sortDropdownTitle}>SORT VIDEOS BY</Text>
          {(Object.keys(sortLabels) as SortOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortOption,
                sortBy === option && styles.sortOptionActive,
              ]}
              onPress={() => {
                onChangeSort(option);
                setShowSortMenu(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option && styles.sortOptionTextActive,
                ]}
              >
                {sortLabels[option]}
              </Text>
              {sortBy === option && (
                <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  sortDropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortDropdownTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginBottom: 4,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  sortOptionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
