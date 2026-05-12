import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withSequence, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { COLORS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ message, type = 'error', onDismiss }) => {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (message) {
      translateY.value = withSpring(0);
      opacity.value = withTiming(1, { duration: 300 });

      const timeout = setTimeout(() => {
        translateY.value = withTiming(100, { duration: 300 }, (finished) => {
          if (finished && onDismiss) {
            runOnJS(onDismiss)();
          }
        });
        opacity.value = withTiming(0, { duration: 300 });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [message]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.content, type === 'error' ? styles.errorBg : styles.successBg]}>
        <Ionicons 
          name={type === 'error' ? 'alert-circle' : 'checkmark-circle'} 
          size={20} 
          color="white" 
        />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorBg: {
    backgroundColor: COLORS.error,
  },
  successBg: {
    backgroundColor: COLORS.success,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default Toast;
