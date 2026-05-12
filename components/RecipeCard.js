import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const RecipeCard = ({ item, onPlayVideo }) => {
  return (
    <View style={styles.card}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: SIZES.radiusCard, overflow: 'hidden' }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />
        )}
      </View>
      
      <View style={styles.header}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => onPlayVideo?.(item.name)}
        >
          <Ionicons name="play-circle" size={32} color="#FF0000" />
        </TouchableOpacity>
      </View>

      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      
      <View style={styles.footer}>
        <View style={styles.statsContainer}>
          <Text style={styles.calories}>{item.cal} cal</Text>
          <View style={styles.dot} />
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 200,
    borderRadius: SIZES.radiusCard,
    padding: 15,
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 40,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  footer: {
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calories: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 6,
  },
  time: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  }
});

export default RecipeCard;
