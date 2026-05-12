import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callGroqAPI } from '../utils/api';
import Animated, { FadeInUp, FadeIn, Layout } from 'react-native-reanimated';
import SkeletonCard from '../components/SkeletonCard';

const { width } = Dimensions.get('window');

const FALLBACK_PLAN = {
  macros: { calories: 2000, protein: 150, carbs: 200, fat: 70 },
  plan: {
    "Mon": [{ meal: "Breakfast", name: "Classic Oatmeal", emoji: "🥣", calories: 350, protein: 15, carbs: 50, fat: 10, ingredients: ["Oats", "Milk", "Honey"], steps: ["Boil oats", "Add honey"], category: "Standard" }, { meal: "Lunch", name: "Grilled Chicken Salad", emoji: "🥗", calories: 500, protein: 40, carbs: 20, fat: 15, ingredients: ["Chicken", "Lettuce", "Olive Oil"], steps: ["Grill chicken", "Mix greens"], category: "Standard" }, { meal: "Dinner", name: "Salmon & Quinoa", emoji: "🍣", calories: 600, protein: 35, carbs: 45, fat: 20, ingredients: ["Salmon", "Quinoa", "Lemon"], steps: ["Bake salmon", "Cook quinoa"], category: "Standard" }],
    "Tue": [{ meal: "Breakfast", name: "Egg & Toast", emoji: "🍳", calories: 300, protein: 20, carbs: 30, fat: 15, ingredients: ["Eggs", "Bread"], steps: ["Fry eggs", "Toast bread"], category: "Standard" }],
    "Wed": [{ meal: "Breakfast", name: "Smoothie Bowl", emoji: "🍓", calories: 400, protein: 10, carbs: 60, fat: 8, ingredients: ["Berries", "Yogurt"], steps: ["Blend fruits"], category: "Standard" }],
    "Thu": [{ meal: "Breakfast", name: "Greek Yogurt", emoji: "🥛", calories: 250, protein: 25, carbs: 15, fat: 5, ingredients: ["Yogurt", "Nuts"], steps: ["Mix together"], category: "Standard" }],
    "Fri": [{ meal: "Breakfast", name: "Pancake stack", emoji: "🥞", calories: 450, protein: 12, carbs: 70, fat: 15, ingredients: ["Flour", "Eggs", "Syrup"], steps: ["Cook pancakes"], category: "Standard" }],
    "Sat": [{ meal: "Breakfast", name: "Fruit Salad", emoji: "🍉", calories: 200, protein: 5, carbs: 45, fat: 2, ingredients: ["Melon", "Grapes"], steps: ["Chop fruits"], category: "Standard" }],
    "Sun": [{ meal: "Breakfast", name: "Full Breakfast", emoji: "🥓", calories: 650, protein: 30, carbs: 40, fat: 35, ingredients: ["Eggs", "Bacon"], steps: ["Cook thoroughly"], category: "Standard" }]
  }
};

const MacroCard = ({ label, val, color }) => (
  <View style={styles.macroCard}>
    <Text style={styles.macroVal}>{val}</Text>
    <Text style={[styles.macroLabel, { color }]}>{label}</Text>
  </View>
);

const MealCard = ({ meal, onPress }) => (
  <Animated.View entering={FadeInUp.duration(400)} layout={Layout.springify()}>
    <TouchableOpacity style={styles.mealCard} onPress={onPress}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="light" style={styles.mealBlur} />
        ) : (
          <View style={[styles.mealBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        )}
      </View>
      <View style={styles.mealContent}>
        <View style={styles.mealIndicator} />
        <Text style={styles.mealEmoji}>{meal.emoji || '🍽️'}</Text>
        <View style={styles.mealInfo}>
          <Text style={styles.mealType}>{meal.meal || 'Meal'}</Text>
          <Text style={styles.mealName}>{meal.name || 'Healthy Dish'}</Text>
        </View>
        <View style={styles.mealCalBadge}>
          <Text style={styles.mealCalText}>{meal.calories || 0} cal</Text>
        </View>
      </View>
    </TouchableOpacity>
  </Animated.View>
);

const DietPlanScreen = ({ onRecipeSelect }) => {
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    height: '',
    weight: '',
    targetWeight: '',
    goal: 'Lose Weight',
    activity: 'Moderate',
    diet: 'Veg'
  });

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const savedPlan = await AsyncStorage.getItem('foodigo_diet_plan');
      if (savedPlan) {
        const parsed = JSON.parse(savedPlan);
        if (parsed && parsed.plan) {
          setDietPlan(parsed);
          setHasPlan(true);
        }
      }
    } catch (e) {
      console.error("Load Plan Error:", e);
    }
  };


  const generatePlan = async () => {
    if (!formData.name || !formData.age || !formData.weight) {
      Alert.alert("Missing Info", "Please fill in your basic details first!");
      return;
    }

    setLoading(true);
    
    try {
      const groqMessages = [
        { 
          role: "system", 
          content: "You are a professional nutritionist. Respond ONLY with a valid JSON object representing a 7-day diet plan. Do not include any text outside the JSON." 
        },
        { 
          role: "user", 
          content: `Create a 7-day diet plan for ${formData.name}, ${formData.age} year old ${formData.gender}. Goal: ${formData.goal}. Activity: ${formData.activity}. Diet: ${formData.diet}. The JSON should include a 'macros' object (calories, protein, carbs, fat) and a 'plan' object with keys for each day (Mon, Tue, etc.) containing an array of meals (Breakfast, Lunch, Dinner). Each meal needs: name, emoji, calories, protein, carbs, fat, ingredients (array), steps (array).`
        }
      ];

      const rawText = await callGroqAPI(groqMessages, 30000);
      
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      const parsedPlan = JSON.parse(cleanJson);
      
      await AsyncStorage.setItem('foodigo_diet_plan', JSON.stringify(parsedPlan));
      setDietPlan(parsedPlan);
      setHasPlan(true);
    } catch (e) {
      console.error("Generate Plan Error:", e.message);
      
      Alert.alert(
        "AI Chef is Busy 🧑‍🍳", 
        "Could not generate your custom plan right now. We've loaded a standard healthy plan for you instead!",
        [{ 
          text: "View Standard Plan", 
          onPress: async () => {
            setDietPlan(FALLBACK_PLAN);
            setHasPlan(true);
            await AsyncStorage.setItem('foodigo_diet_plan', JSON.stringify(FALLBACK_PLAN));
          } 
        }]
      );
    } finally {
      setLoading(false);
    }
  };

  const clearPlan = async () => {
    Alert.alert(
      "Reset Plan?",
      "Delete current plan?",
      [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await AsyncStorage.removeItem('foodigo_diet_plan'); setHasPlan(false); setDietPlan(null); } }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingTitle}>Crafting your plan... 🤖</Text>
          <View style={styles.skeletonBox}>
            {[1,2,3,4].map(i => (
              <SkeletonCard key={i} width="100%" height={100} borderRadius={20} style={{ marginBottom: 15 }} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp}>
            <Text style={styles.title}>Build My Diet Plan 🥗</Text>
            <View style={styles.formCard}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 25, overflow: 'hidden' }]}>
                {Platform.OS === 'ios' ? <BlurView intensity={20} tint="light" style={styles.formBlur} /> : <View style={[styles.formBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />}
              </View>
              <View style={styles.formContent}>
                <TextInput placeholder="Name" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={formData.name} onChangeText={(v) => setFormData({...formData, name: v})} />
                <TextInput placeholder="Age" placeholderTextColor={COLORS.textSecondary} style={styles.input} keyboardType="numeric" value={formData.age} onChangeText={(v) => setFormData({...formData, age: v})} />
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map(g => (
                    <TouchableOpacity key={g} style={[styles.genderPill, formData.gender === g && styles.genderPillActive]} onPress={() => setFormData({...formData, gender: g})}>
                      <Text style={[styles.genderText, formData.gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.statsRow}>
                  <TextInput placeholder="Height (cm)" placeholderTextColor={COLORS.textSecondary} style={[styles.input, { flex: 1, marginRight: 10 }]} keyboardType="numeric" value={formData.height} onChangeText={(v) => setFormData({...formData, height: v})} />
                  <TextInput placeholder="Weight (kg)" placeholderTextColor={COLORS.textSecondary} style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={formData.weight} onChangeText={(v) => setFormData({...formData, weight: v})} />
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.generateBtn} onPress={generatePlan}>
              <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={styles.buttonGradient}><Text style={styles.buttonText}>Generate AI Plan 🚀</Text></LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Weekly Plan 📅</Text>
            <TouchableOpacity onPress={clearPlan}><Ionicons name="refresh-circle" size={32} color={COLORS.textSecondary} /></TouchableOpacity>
          </View>
          <View style={styles.macrosRow}>
            <MacroCard label="Cals" val={dietPlan?.macros?.calories || 0} color={COLORS.accent} />
            <MacroCard label="Prot" val={dietPlan?.macros?.protein || 0} color="#4CAF50" />
            <MacroCard label="Carb" val={dietPlan?.macros?.carbs || 0} color="#2196F3" />
            <MacroCard label="Fat" val={dietPlan?.macros?.fat || 0} color="#FF6B35" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
            {Object.keys(dietPlan?.plan || {}).map(day => (
              <TouchableOpacity key={day} style={[styles.dayPill, selectedDay === day && styles.dayPillSelected]} onPress={() => setSelectedDay(day)}><Text style={[styles.dayText, selectedDay === day && styles.dayTextSelected]}>{day}</Text></TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.mealsContainer}>
            {(dietPlan?.plan?.[selectedDay] || []).map((meal, idx) => (
              <MealCard key={idx} meal={meal} onPress={() => onRecipeSelect({...meal, category: 'Diet Plan'})} />
            ))}
          </View>
        </Animated.View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  loadingTitle: { color: 'white', marginTop: 25, fontSize: 18, fontWeight: 'bold' },
  skeletonBox: { width: '100%', marginTop: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  formCard: { borderRadius: 25, overflow: 'hidden', marginBottom: 25 },
  formBlur: { ...StyleSheet.absoluteFillObject },
  formContent: { padding: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 15, color: 'white', marginBottom: 15 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  genderPill: { flex: 1, padding: 12, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', marginHorizontal: 5 },
  genderPillActive: { backgroundColor: COLORS.accent },
  genderText: { color: COLORS.textSecondary, fontWeight: 'bold' },
  genderTextActive: { color: 'white' },
  statsRow: { flexDirection: 'row' },
  generateBtn: { borderRadius: 30, overflow: 'hidden', ...SHADOWS.medium },
  buttonGradient: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  macroCard: { width: '22%', backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 20, alignItems: 'center' },
  macroVal: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  macroLabel: { fontSize: 12, marginTop: 4 },
  daySelector: { marginBottom: 25 },
  dayPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  dayPillSelected: { backgroundColor: COLORS.accent },
  dayText: { color: COLORS.textSecondary, fontWeight: 'bold' },
  dayTextSelected: { color: 'white' },
  mealCard: { marginBottom: 15, borderRadius: 24, overflow: 'hidden' },
  mealBlur: { ...StyleSheet.absoluteFillObject },
  mealContent: { padding: 18, flexDirection: 'row', alignItems: 'center' },
  mealIndicator: { width: 4, height: 40, backgroundColor: COLORS.accent, borderRadius: 2, marginRight: 15 },
  mealEmoji: { fontSize: 36, marginRight: 15 },
  mealInfo: { flex: 1 },
  mealType: { color: COLORS.textSecondary, fontSize: 12, fontWeight: 'bold' },
  mealName: { color: 'white', fontSize: 17, fontWeight: 'bold', marginTop: 2 },
  mealCalBadge: { backgroundColor: 'rgba(245, 166, 35, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  mealCalText: { color: COLORS.accent, fontSize: 12, fontWeight: 'bold' },
});

export default DietPlanScreen;
