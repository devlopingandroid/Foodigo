import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, Platform, StatusBar, ActivityIndicator,
  Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown, FadeInRight, FadeIn, SlideInDown } from 'react-native-reanimated';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { GROQ_API_KEY } from '../constants/config';

const { width, height } = Dimensions.get('window');

// ─── Constants & Helpers ───────────────────────────────────────────────────────

const FORM_STEPS = [
  { id: 'basic',     title: 'Basic Info',         sub: 'Your name, age and gender' },
  { id: 'body',      title: 'Body Stats',         sub: 'Height and weight for metrics' },
  { id: 'goals',     title: 'Health Goals',       sub: 'What do you want to achieve?' },
  { id: 'dietary',   title: 'Preferences',        sub: 'Diet types and allergies' },
  { id: 'conditions', title: 'Medical Info',       sub: 'Safe planning for health' },
  { id: 'lifestyle', title: 'Activity Level',     sub: 'Your daily energy burn' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning 👋';
  if (h < 17) return 'Good Afternoon ☀️';
  if (h < 21) return 'Good Evening 🌆';
  return 'Good Night 🌙';
};

const calcBMI = (w, h) => {
  if (!w || !h) return 0;
  const heightInM = h / 100;
  return (w / (heightInM * heightInM)).toFixed(1);
};

const getBMICategory = (bmi) => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3498db' };
  if (bmi < 25) return { label: 'Normal', color: '#2ecc71' };
  if (bmi < 30) return { label: 'Overweight', color: '#f1c40f' };
  return { label: 'Obese', color: '#e74c3c' };
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const PillRow = ({ options, value, onChange, multi = false }) => (
  <View style={s.pillRow}>
    {options.map(opt => {
      const active = multi ? (value || []).includes(opt) : value === opt;
      return (
        <TouchableOpacity
          key={opt}
          style={[s.pill, active && s.pillActive]}
          onPress={() => {
            if (multi) {
              const cur = value || [];
              onChange(cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]);
            } else {
              onChange(opt);
            }
          }}
        >
          <Text style={[s.pillText, active && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const MacroChip = ({ icon, label, val, color }) => (
  <View style={s.macroChip}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={s.macroChipText}>{val || 0} {label}</Text>
  </View>
);

const MealAdherenceCard = ({ meal, isCompleted, onToggle, onDetail }) => (
  <TouchableOpacity style={s.mealAdCard} onPress={onDetail} activeOpacity={0.85}>
    <View style={s.mealRowTop}>
      <Text style={s.mealEmoji}>{meal.emoji || '🍽️'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.mealName}>{meal.name || 'Unnamed Meal'}</Text>
        <Text style={s.mealQuantity}>{meal.quantity || 'Quantity not available'}</Text>
      </View>
      <TouchableOpacity 
        onPress={(e) => { e.stopPropagation(); onToggle(); }} 
        style={[s.checkCircle, isCompleted && s.checkCircleActive]}
      >
        {isCompleted && <Ionicons name="checkmark" size={18} color="white" />}
      </TouchableOpacity>
    </View>
    <View style={s.mealRowBottom}>
      <View style={s.mealMetaGroup}>
        <View style={s.miniStat}>
          <Ionicons name="flame" size={12} color={COLORS.accent} />
          <Text style={s.miniStatText}>{meal.calories || 0} kcal</Text>
        </View>
        <View style={s.miniStat}>
          <Ionicons name="fitness" size={12} color="#FF6B35" />
          <Text style={s.miniStatText}>{meal.protein || 0}g Pro</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ExploreScreen = () => {
  const [view, setView] = useState('loading');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male',
    height: '', weight: '', targetWeight: '',
    fitnessGoal: 'Fat Loss',
    dietaryPreference: 'Veg',
    allergies: [],
    conditions: [],
    activity: 'Moderate',
    lifestyle: 'Desk Job',
  });

  const [dietPlan, setDietPlan] = useState(null);
  const [adherence, setAdherence] = useState({});
  const [streak, setStreak] = useState(0);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [detailModal, setDetailModal] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const [profile, plan, adh, strk, water] = await Promise.all([
        AsyncStorage.getItem('foodigo_user_profile'),
        AsyncStorage.getItem('foodigo_diet_plan'),
        AsyncStorage.getItem('foodigo_adherence'),
        AsyncStorage.getItem('foodigo_streak'),
        AsyncStorage.getItem('foodigo_water'),
      ]);

      if (profile && plan) {
        setForm(JSON.parse(profile));
        setDietPlan(JSON.parse(plan));
        if (adh) setAdherence(JSON.parse(adh));
        if (strk) setStreak(parseInt(strk) || 0);
        if (water) setWaterGlasses(parseInt(water) || 0);
        setView('dashboard');
      } else {
        setView('form');
      }
    } catch (e) {
      setView('form');
    }
  };

  const nextStep = () => {
    if (step < FORM_STEPS.length - 1) setStep(step + 1);
    else generatePlan();
  };

  const generatePlan = async () => {
    setView('generating');
    setGenLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an Indian Nutritionist expert. Respond ONLY with JSON. No markdown, no text before or after JSON.' },
            {
              role: 'user',
              content: `Create a life-changing 1-day Indian nutrition protocol for: ${JSON.stringify(form)}. 
              
              CRITICAL: Every meal MUST follow this FLAT JSON schema exactly:
              {
                "dailyCalories": 2000,
                "dailyProtein": 120,
                "dailyCarbs": 200,
                "dailyFat": 60,
                "meals": [
                  {
                    "name": "Full Meal Name (e.g. 2 Paneer Stuffed Parathas + 1 cup Curd)",
                    "type": "Breakfast",
                    "quantity": "Exact quantity (e.g. 150g paratha, 100ml curd)",
                    "calories": 450,
                    "protein": 18,
                    "carbs": 55,
                    "fats": 12,
                    "fiber": 8,
                    "prepTime": "20 min",
                    "ingredients": ["Whole wheat flour", "Paneer", "Curd", "Spices"],
                    "coachInsight": "A high-fiber, protein-rich start to fuel your morning and stabilize blood sugar.",
                    "emoji": "🥞",
                    "timing": "8:30 AM",
                    "replacement": "Oats with nuts and milk"
                  }
                ],
                "tips": ["Tip 1", "Tip 2"]
              }`
            }
          ],
          max_tokens: 2000,
          temperature: 0.6
        })
      });

      const d = await res.json();
      console.log('=== AI NUTRITION RESPONSE RECEIVED ===');
      const content = d.choices[0].message.content;
      
      // ─── Production-Safe Parsing Logic ─────────────────────────────────────
      let cleanText = content || "";
      
      // 1. Remove markdown wrappers
      cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "");
      
      // 2. Remove invalid control characters (U+0000 to U+001F)
      cleanText = cleanText.replace(/[\x00-\x1F\x7F]/g, "");
      
      // 3. Trim whitespace
      cleanText = cleanText.trim();

      try {
        const plan = JSON.parse(cleanText);

        // Validation logging
        console.log('Validated Plan Meals:', plan.meals?.length || 0);
        plan.meals?.forEach((m, i) => {
          if (!m.protein || !m.quantity || !m.coachInsight) {
            console.warn(`Meal ${i} (${m.name}) is missing critical metadata!`);
          }
        });

        await Promise.all([
          AsyncStorage.setItem('foodigo_user_profile', JSON.stringify(form)),
          AsyncStorage.setItem('foodigo_diet_plan', JSON.stringify(plan)),
        ]);
        setDietPlan(plan);
        setView('dashboard');
      } catch (parseError) {
        console.error("JSON Parse Error in ExploreScreen:", parseError);
        Alert.alert("AI Architect Error", "The nutrition blueprint was malformed. Please try re-calibrating.");
        setView('form');
      }
    } catch (e) {
      console.error('Plan generation failed:', e);
      Alert.alert('Error', 'Nutrition blueprint could not be finalized. Please check your connection.');
      setView('form');
    } finally {
      setGenLoading(false);
    }
  };

  const toggleMeal = async (mealType) => {
    const today = new Date().toDateString();
    const key = `${today}-${mealType}`;
    const newAdh = { ...adherence, [key]: !adherence[key] };
    setAdherence(newAdh);
    await AsyncStorage.setItem('foodigo_adherence', JSON.stringify(newAdh));

    const mealsCount = dietPlan?.meals?.length || 0;
    const completedToday = Object.keys(newAdh).filter(k => k.startsWith(today) && newAdh[k]).length;
    if (completedToday === mealsCount) {
      const newStrk = streak + 1;
      setStreak(newStrk);
      await AsyncStorage.setItem('foodigo_streak', newStrk.toString());
    }
  };

  const addWater = async (val) => {
    const newWater = Math.max(0, waterGlasses + val);
    setWaterGlasses(newWater);
    await AsyncStorage.setItem('foodigo_water', newWater.toString());
  };

  const resetData = async () => {
    await AsyncStorage.clear();
    setView('form');
    setStep(0);
    setAdherence({});
    setStreak(0);
    setWaterGlasses(0);
  };

  if (view === 'loading') return <View style={s.center}><ActivityIndicator size="large" color={COLORS.accent} /></View>;

  if (view === 'generating') return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={s.genTitle}>AI Health Architect at Work...</Text>
      <Text style={s.genSub}>Building your high-resolution nutrition blueprint with complete macro metadata</Text>
    </View>
  );

  if (view === 'form') {
    const cur = FORM_STEPS[step];
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView style={s.formScroll} showsVerticalScrollIndicator={false}>
          <View style={s.formHeader}>
            <Text style={s.stepText}>STEP {step + 1} OF {FORM_STEPS.length}</Text>
            <Text style={s.stepTitle}>{cur.title}</Text>
            <Text style={s.stepSub}>{cur.sub}</Text>
          </View>
          <Animated.View entering={FadeInRight}>
            {cur.id === 'basic' && (
              <View>
                <Text style={s.label}>Your Name</Text>
                <TextInput style={s.input} placeholder="e.g. Yash" placeholderTextColor={COLORS.textSecondary} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
                <Text style={s.label}>Age</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="24" placeholderTextColor={COLORS.textSecondary} value={form.age} onChangeText={v => setForm({ ...form, age: v })} />
                <Text style={s.label}>Gender</Text>
                <PillRow options={['Male', 'Female', 'Other']} value={form.gender} onChange={v => setForm({ ...form, gender: v })} />
              </View>
            )}
            {cur.id === 'body' && (
              <View>
                <Text style={s.label}>Height (cm)</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="178" placeholderTextColor={COLORS.textSecondary} value={form.height} onChangeText={v => setForm({ ...form, height: v })} />
                <Text style={s.label}>Current Weight (kg)</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="82" placeholderTextColor={COLORS.textSecondary} value={form.weight} onChangeText={v => setForm({ ...form, weight: v })} />
                <Text style={s.label}>Target Weight (kg)</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="75" placeholderTextColor={COLORS.textSecondary} value={form.targetWeight} onChangeText={v => setForm({ ...form, targetWeight: v })} />
              </View>
            )}
            {cur.id === 'goals' && (
              <View>
                <Text style={s.label}>Your Primary Fitness Goal</Text>
                <PillRow options={['Fat Loss', 'Muscle Gain', 'Maintenance', 'Bulking', 'Cutting']} value={form.fitnessGoal} onChange={v => setForm({ ...form, fitnessGoal: v })} />
              </View>
            )}
            {cur.id === 'dietary' && (
              <View>
                <Text style={s.label}>Dietary Preference</Text>
                <PillRow options={['Veg', 'Non-Veg', 'Vegan', 'Jain']} value={form.dietaryPreference} onChange={v => setForm({ ...form, dietaryPreference: v })} />
                <Text style={s.label}>Food Allergies</Text>
                <PillRow options={['None', 'Dairy', 'Gluten', 'Nuts', 'Eggs']} value={form.allergies} multi onChange={v => setForm({ ...form, allergies: v })} />
              </View>
            )}
            {cur.id === 'conditions' && (
              <View>
                <Text style={s.label}>Medical History</Text>
                <PillRow options={['None', 'Diabetes', 'Thyroid', 'PCOS', 'BP', 'IBS']} value={form.conditions} multi onChange={v => setForm({ ...form, conditions: v })} />
              </View>
            )}
            {cur.id === 'lifestyle' && (
              <View>
                <Text style={s.label}>Activity Level</Text>
                <PillRow options={['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active']} value={form.activity} onChange={v => setForm({ ...form, activity: v })} />
              </View>
            )}
          </Animated.View>
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={s.formFooter}>
          {step > 0 && <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)}><Text style={s.backBtnText}>Back</Text></TouchableOpacity>}
          <TouchableOpacity style={s.nextBtn} onPress={nextStep}>
            <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.nextBtnGrad}>
              <Text style={s.nextBtnText}>{step === FORM_STEPS.length - 1 ? 'Build Blueprint' : 'Continue'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date().toDateString();
  const completedCount = dietPlan?.meals?.filter(m => adherence[`${today}-${m.type}`]).length || 0;
  const progressPct = dietPlan?.meals?.length ? (completedCount / dietPlan.meals.length) * 100 : 0;
  const eatenCal = dietPlan?.meals?.filter(m => adherence[`${today}-${m.type}`]).reduce((a, b) => a + b.calories, 0) || 0;
  const bmi = calcBMI(form.weight, form.height);
  const bmiCat = getBMICategory(bmi);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.dashScroll}>
        <View style={s.dashHeader}>
          <View>
            <Text style={s.dashGreet}>{getGreeting()}</Text>
            <Text style={s.dashName}>{form.name || 'Champion'} ✨</Text>
          </View>
          <TouchableOpacity style={s.resetMini} onPress={resetData}><Ionicons name="settings-outline" size={20} color="white" /></TouchableOpacity>
        </View>

        {/* BMI & Health Status Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={s.healthStatusCard}>
          <View style={s.bmiBox}>
            <Text style={s.bmiVal}>{bmi}</Text>
            <Text style={s.bmiLab}>Current BMI</Text>
          </View>
          <View style={s.bmiInfo}>
            <Text style={s.statusTitle}>Health Status</Text>
            <View style={[s.statusBadge, { backgroundColor: bmiCat.color }]}>
              <Text style={s.statusText}>{bmiCat.label}</Text>
            </View>
            <Text style={s.targetWeightText}>Goal: {form.targetWeight} kg</Text>
          </View>
          <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={s.scoreBox}>
            <Text style={s.scoreVal}>{Math.round(progressPct * 0.8 + streak * 2)}</Text>
            <Text style={s.scoreLab}>Health Score</Text>
          </LinearGradient>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <LinearGradient colors={['#0A4A3E', '#062E27']} style={s.mainProgressCard}>
            <View style={s.progHeader}>
              <View>
                <Text style={s.progTitle}>Daily Calories</Text>
                <Text style={s.progSub}>{ (dietPlan?.dailyCalories || 0) - eatenCal} kcal remaining</Text>
              </View>
              <View style={s.streakBadgeWrap}>
                <Text style={s.streakBadgeText}>🔥 {streak}</Text>
              </View>
            </View>
            <View style={s.mainBarBg}>
              <View style={[s.mainBarFill, { width: `${(eatenCal / (dietPlan?.dailyCalories || 1)) * 100}%` }]} />
            </View>
            <View style={s.dashMacros}>
              <MacroChip icon="fitness" label="Protein" val={dietPlan?.dailyProtein} color="#FF6B35" />
              <MacroChip icon="pizza" label="Carbs" val={dietPlan?.dailyCarbs} color="#F5A623" />
              <MacroChip icon="water" label="Fat" val={dietPlan?.dailyFat} color="#3498db" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Water Tracker */}
        <Animated.View entering={FadeInDown.delay(300)} style={s.waterCard}>
          <View style={s.waterInfo}>
            <Ionicons name="water" size={30} color="#3498db" />
            <View>
              <Text style={s.waterTitle}>Water Intake</Text>
              <Text style={s.waterSub}>{waterGlasses}/8 Glasses ({(waterGlasses * 250) / 1000}L)</Text>
            </View>
          </View>
          <View style={s.waterActions}>
            <TouchableOpacity onPress={() => addWater(-1)} style={s.waterBtn}><Ionicons name="remove" size={20} color="white" /></TouchableOpacity>
            <Text style={s.waterCount}>{waterGlasses}</Text>
            <TouchableOpacity onPress={() => addWater(1)} style={s.waterBtn}><Ionicons name="add" size={20} color="white" /></TouchableOpacity>
          </View>
        </Animated.View>

        {/* Meal Protocol Section */}
        <View style={s.planSection}>
          <Text style={s.sectionTitle}>Daily Meal Protocol 🍽️</Text>
          {dietPlan?.meals?.map((meal, idx) => (
            <Animated.View key={idx} entering={FadeInDown.delay(400 + idx * 50)}>
              <MealAdherenceCard 
                meal={meal} 
                isCompleted={!!adherence[`${today}-${meal.type}`]} 
                onToggle={() => toggleMeal(meal.type)}
                onDetail={() => { setSelectedMeal(meal); setDetailModal(true); }}
              />
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* ─── Meal Detail Modal ─────────────────────────────────────────────────── */}
      <Modal visible={detailModal} animationType="slide" transparent onRequestClose={() => setDetailModal(false)}>
        <View style={s.modalOverlay}>
          <Animated.View entering={SlideInDown.duration(400)} style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selectedMeal && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
                <View style={s.modalHeader}>
                  <Text style={s.modalEmojiLg}>{selectedMeal.emoji || '🍱'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalMealType}>{selectedMeal.type || 'Protocol'} Mode</Text>
                    <Text style={s.modalMealName}>{selectedMeal.name || 'Meal Details'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModal(false)} style={s.closeBtn}>
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Macro Summary Row */}
                <View style={s.modalStatsRow}>
                  <View style={s.modalStatItem}>
                    <Ionicons name="flame" size={20} color={COLORS.accent} />
                    <Text style={s.modalStatVal}>{selectedMeal.calories ?? 0}</Text>
                    <Text style={s.modalStatLab}>Calories</Text>
                  </View>
                  <View style={s.modalStatDivider} />
                  <View style={s.modalStatItem}>
                    <Ionicons name="fitness" size={20} color="#FF6B35" />
                    <Text style={s.modalStatVal}>{selectedMeal.protein ?? 0}g</Text>
                    <Text style={s.modalStatLab}>Protein</Text>
                  </View>
                  <View style={s.modalStatDivider} />
                  <View style={s.modalStatItem}>
                    <Ionicons name="time" size={20} color="#3498db" />
                    <Text style={s.modalStatVal}>{selectedMeal.prepTime || '10 min'}</Text>
                    <Text style={s.modalStatLab}>Prep Time</Text>
                  </View>
                </View>

                {/* Detailed Breakdown */}
                <View style={s.modalSection}>
                  <Text style={s.modalSectionTitle}>Detailed Nutrition</Text>
                  <View style={s.nutRow}>
                    <Text style={s.nutLabel}>Recommended Quantity</Text>
                    <Text style={s.nutVal}>{selectedMeal.quantity || 'Quantity not available'}</Text>
                  </View>
                  <View style={s.nutRow}>
                    <Text style={s.nutLabel}>Carbohydrates</Text>
                    <Text style={s.nutVal}>{selectedMeal.carbs ?? 0}g</Text>
                  </View>
                  <View style={s.nutRow}>
                    <Text style={s.nutLabel}>Fats</Text>
                    <Text style={s.nutVal}>{selectedMeal.fats ?? 0}g</Text>
                  </View>
                  <View style={s.nutRow}>
                    <Text style={s.nutLabel}>Dietary Fiber</Text>
                    <Text style={s.nutVal}>{selectedMeal.fiber ?? 0}g</Text>
                  </View>
                </View>

                {/* Ingredients */}
                <View style={s.modalSection}>
                  <Text style={s.modalSectionTitle}>Ingredients</Text>
                  <View style={s.ingredList}>
                    {selectedMeal.ingredients?.length > 0 ? (
                      selectedMeal.ingredients.map((ing, i) => (
                        <View key={i} style={s.ingredItem}>
                          <View style={s.ingredDot} />
                          <Text style={s.ingredText}>{ing}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={s.insightText}>Ingredient data unavailable</Text>
                    )}
                  </View>
                </View>

                <View style={s.modalSection}>
                  <Text style={s.modalSectionTitle}>Coach's Insight 🧠</Text>
                  <Text style={s.insightText}>
                    {selectedMeal.coachInsight || 'This balanced meal is designed to support your metabolic health and fitness goals.'}
                  </Text>
                </View>

                <LinearGradient colors={['rgba(245, 166, 35, 0.1)', 'rgba(245, 166, 35, 0.05)']} style={s.altBox}>
                  <Text style={s.altTitle}>Healthy Alternative</Text>
                  <Text style={s.altText}>{selectedMeal.replacement || 'Fresh seasonal salad or fruit bowl'}</Text>
                </LinearGradient>

                <View style={{ height: 100 }} />
              </ScrollView>
            )}
            <TouchableOpacity 
              style={s.markDoneBtn} 
              onPress={() => { toggleMeal(selectedMeal.type); setDetailModal(false); }}
            >
              <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.markDoneGrad}>
                <Text style={s.markDoneText}>
                  {adherence[`${today}-${selectedMeal?.type}`] ? 'Mark as Pending' : 'Log This Meal'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary },
  genTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  genSub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22 },

  formScroll: { paddingHorizontal: 25 },
  formHeader: { marginTop: 40, marginBottom: 20 },
  stepText: { color: COLORS.accent, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  stepTitle: { color: 'white', fontSize: 32, fontWeight: 'bold', marginTop: 8 },
  stepSub: { color: COLORS.textSecondary, fontSize: 16, marginTop: 5 },
  label: { color: 'white', fontSize: 16, fontWeight: '600', marginTop: 30, marginBottom: 15 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 18, color: 'white', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  pillText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: 'white' },
  formFooter: { flexDirection: 'row', padding: 20, paddingBottom: Platform.OS === 'ios' ? 120 : 100, gap: 15 },
  backBtn: { flex: 1, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  nextBtn: { flex: 2, height: 60, borderRadius: 20, overflow: 'hidden' },
  nextBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  dashScroll: { paddingHorizontal: 20, paddingTop: 20 },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  dashGreet: { color: COLORS.textSecondary, fontSize: 14 },
  dashName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  resetMini: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  healthStatusCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bmiBox: { alignItems: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  bmiVal: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  bmiLab: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4 },
  bmiInfo: { flex: 1, paddingLeft: 20 },
  statusTitle: { color: COLORS.textSecondary, fontSize: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 5 },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  targetWeightText: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  scoreBox: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  scoreVal: { color: COLORS.accent, fontSize: 20, fontWeight: 'bold' },
  scoreLab: { color: COLORS.textSecondary, fontSize: 8, marginTop: 2, textAlign: 'center' },

  mainProgressCard: { borderRadius: 28, padding: 25, marginBottom: 20, ...SHADOWS.medium },
  progHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  progTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  progSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  streakBadgeWrap: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  streakBadgeText: { color: 'white', fontWeight: 'bold' },
  mainBarBg: { height: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, marginBottom: 20 },
  mainBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 6 },
  dashMacros: { flexDirection: 'row', justifyContent: 'space-between' },
  macroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  macroChipText: { color: 'white', fontSize: 11, fontWeight: '600' },

  waterCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(52, 152, 219, 0.15)', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(52, 152, 219, 0.3)' },
  waterInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  waterTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  waterSub: { color: '#3498db', fontSize: 12, marginTop: 2 },
  waterActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  waterBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center' },
  waterCount: { color: 'white', fontSize: 18, fontWeight: 'bold', width: 20, textAlign: 'center' },

  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  mealAdCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mealRowTop: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  mealEmoji: { fontSize: 36 },
  mealName: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  mealQuantity: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  checkCircleActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  mealRowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  mealMetaGroup: { flexDirection: 'row', gap: 15 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniStatText: { color: 'white', fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0D2E27', height: height * 0.85, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingBottom: 40 },
  modalHandle: { width: 45, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginTop: 15, marginBottom: 10 },
  modalScroll: { padding: 25 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  modalEmojiLg: { fontSize: 50 },
  modalMealType: { color: COLORS.accent, fontSize: 13, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  modalMealName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalStatsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 20, marginBottom: 30 },
  modalStatItem: { alignItems: 'center', flex: 1 },
  modalStatVal: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  modalStatLab: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  modalStatDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.1)' },
  modalSection: { marginBottom: 30 },
  modalSectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  nutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  nutLabel: { color: COLORS.textSecondary, fontSize: 14 },
  nutVal: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  ingredList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ingredItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  ingredDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  ingredText: { color: 'white', fontSize: 13 },
  insightText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 24 },
  altBox: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(245, 166, 35, 0.2)' },
  altTitle: { color: COLORS.accent, fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  altText: { color: 'white', fontSize: 14, fontStyle: 'italic' },
  markDoneBtn: { position: 'absolute', bottom: 30, left: 25, right: 25, height: 60, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
  markDoneGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markDoneText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  resetMini: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  resetBtn: { alignSelf: 'center', marginTop: 10 },
  resetText: { color: COLORS.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
});

export default ExploreScreen;
