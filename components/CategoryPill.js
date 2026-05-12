import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES } from '../constants/theme';

const CategoryPill = ({ category, isSelected, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        isSelected && styles.selectedContainer
      ]}
    >
      {!isSelected && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: SIZES.radiusPill, overflow: 'hidden' }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
          )}
        </View>
      )}
      <Text style={[
        styles.text,
        isSelected && styles.selectedText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: SIZES.radiusPill,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedContainer: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
  },
});

export default CategoryPill;
