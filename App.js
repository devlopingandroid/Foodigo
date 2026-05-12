import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RecipeDetailModal from './components/RecipeDetailModal';
import Toast from './components/Toast';
import { COLORS } from './constants/theme';
import ChatbotScreen from './screens/ChatbotScreen';
import CookSuggestScreen from './screens/CookSuggestScreen';
import ExploreScreen from './screens/ExploreScreen';
import HomeScreen from './screens/HomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ProfileScreen from './screens/ProfileScreen';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  useEffect(() => {
    async function prepare() {
      try {
        const onboardingShown = await AsyncStorage.getItem('foodigo_onboarding_shown');
        setShowOnboarding(onboardingShown !== 'true');
        
        // Artificially delay to ensure splash is visible as requested
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        setAppIsReady(true);
        setIsInitializing(false);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately!
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('foodigo_onboarding_shown', 'true');
      setShowOnboarding(false);
    } catch (e) {
      setShowOnboarding(false);
    }
  };

  const handleAddToLog = async (recipe) => {
    try {
      const savedMeals = await AsyncStorage.getItem('foodigo_meal_logs');
      const meals = savedMeals ? JSON.parse(savedMeals) : [];
      const newMeal = {
        id: Date.now(),
        name: recipe.name,
        calories: recipe.calories || 300,
        type: 'Lunch',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emoji: recipe.emoji
      };
      await AsyncStorage.setItem('foodigo_meal_logs', JSON.stringify([newMeal, ...meals]));
      setToast({ message: 'Meal added to your daily log! 🥗', type: 'success' });
    } catch (e) {
      setToast({ message: 'Failed to add meal. Try again.', type: 'error' });
    }
  };

  if (!appIsReady && isInitializing) {
    return (
      <View 
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} 
        onLayout={onLayoutRootView}
      >
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        {showOnboarding ? (
          <OnboardingScreen onComplete={completeOnboarding} />
        ) : (
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.accent,
                tabBarInactiveTintColor: COLORS.tabInactive,
                tabBarStyle: styles.tabBar,
                tabBarBackground: () => (
                  <View style={[
                    StyleSheet.absoluteFill, 
                    { 
                      borderRadius: 30, 
                      overflow: 'hidden',
                      backgroundColor: Platform.OS === 'android' ? 'rgba(10, 74, 62, 0.95)' : 'transparent' 
                    }
                  ]}>
                    {Platform.OS === 'ios' && (
                      <BlurView 
                        intensity={80} 
                        tint="dark" 
                        style={StyleSheet.absoluteFill} 
                      />
                    )}
                  </View>
                ),
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName;
                  if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                  else if (route.name === 'Explore') iconName = focused ? 'compass' : 'compass-outline';
                  else if (route.name === 'AI Chat') iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
                  else if (route.name === 'Cook') iconName = focused ? 'restaurant' : 'restaurant-outline';
                  else if (route.name === 'Profile') iconName = focused ? 'person-circle' : 'person-circle-outline';
    
                  return (
                    <TabIcon 
                      name={iconName} 
                      color={color} 
                      size={24} 
                      focused={focused} 
                    />
                  );
                },
              })}
            >
              <Tab.Screen name="Home">
                {props => <HomeScreen {...props} onRecipeSelect={setSelectedRecipe} />}
              </Tab.Screen>
              <Tab.Screen name="Explore">
                {props => <ExploreScreen {...props} onRecipeSelect={setSelectedRecipe} />}
              </Tab.Screen>
              <Tab.Screen name="AI Chat" component={ChatbotScreen} />
              <Tab.Screen name="Cook" component={CookSuggestScreen} />
              <Tab.Screen name="Profile" component={ProfileScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        )}

        <RecipeDetailModal 
          isVisible={!!selectedRecipe}
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onAddToLog={handleAddToLog}
        />

        <Toast 
          message={toast.message} 
          type={toast.type} 
          onDismiss={() => setToast({ ...toast, message: '' })} 
        />
      </View>
    </SafeAreaProvider>
  );
}

const TabIcon = ({ name, color, size, focused }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.2 : 1, { damping: 10 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  tabBar: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  }
});
