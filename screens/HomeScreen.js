import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { GROQ_API_KEY } from '../constants/config';

// ─── helpers ──────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning 👋';
  if (h < 17) return 'Good Afternoon ☀️';
  if (h < 21) return 'Good Evening 🌆';
  return 'Good Night 🌙';
};

const calcBMR = (p) => {
  const w = parseFloat(p.weight) || 70;
  const h = parseFloat(p.height) || 170;
  const a = parseFloat(p.age) || 25;
  const base = p.gender === 'Female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5;
  const actMult = { Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Active: 1.725, 'Very Active': 1.9 };
  const tdee = base * (actMult[p.activity] || 1.55);
  const goalDelta = { 'Fat Loss': -400, Cutting: -500, Maintenance: 0, 'Muscle Gain': 300, Bulking: 500 };
  return Math.round(tdee + (goalDelta[p.goal] || 0));
};

const calcMacros = (calories, goal) => {
  const high = ['Muscle Gain', 'Bulking'];
  const pCal = high.includes(goal) ? 0.35 : 0.30;
  const fCal = 0.25;
  const cCal = 1 - pCal - fCal;
  return {
    protein: Math.round((calories * pCal) / 4),
    carbs: Math.round((calories * cCal) / 4),
    fat: Math.round((calories * fCal) / 9),
  };
};

const getMealEmoji = (type) =>
  ({ Breakfast: '🌅', Lunch: '☀️', Snack: '🍎', Dinner: '🌙' }[type] || '🥗');

// ─── sub-components ───────────────────────────────────────────────────────────

const MacroBar = ({ label, current, total, color }) => {
  const pct = Math.min((current / (total || 1)) * 100, 100);
  return (
    <View style={s.macroBarWrap}>
      <View style={s.macroBarRow}>
        <Text style={s.macroBarLabel}>{label}</Text>
        <Text style={s.macroBarVal}>{current}/{total}g</Text>
      </View>
      <View style={s.macroBarBg}>
        <View style={[s.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const MealRow = ({ meal, onDelete }) => (
  <View style={s.mealRow}>
    <Text style={s.mealRowEmoji}>{meal.emoji || '🥗'}</Text>
    <View style={s.mealRowInfo}>
      <Text style={s.mealRowName} numberOfLines={1}>{meal.name}</Text>
      <Text style={s.mealRowMeta}>{meal.type} · {meal.time}</Text>
    </View>
    <Text style={s.mealRowCal}>{meal.calories} kcal</Text>
    <TouchableOpacity onPress={onDelete} style={s.mealRowDelete}>
      <Ionicons name="trash-outline" size={16} color="rgba(255,80,80,0.8)" />
    </TouchableOpacity>
  </View>
);

// ─── main screen ──────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [streak, setStreak] = useState(0);
  const [aiTip, setAiTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: '', calories: '', type: 'Breakfast' });

  const loadData = useCallback(async () => {
    try {
      const [rawProfile, rawMeals, rawStreak] = await Promise.all([
        AsyncStorage.getItem('foodigo_user_profile'),
        AsyncStorage.getItem('foodigo_meal_logs'),
        AsyncStorage.getItem('foodigo_streak'),
      ]);
      if (rawProfile) setProfile(JSON.parse(rawProfile));
      if (rawMeals) {
        const all = JSON.parse(rawMeals);
        const today = new Date().toDateString();
        setMeals(all.filter(m => new Date(m.date || Date.now()).toDateString() === today));
      }
      if (rawStreak) setStreak(parseInt(rawStreak) || 0);
    } catch (e) { console.warn('loadData:', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const fetchAiTip = async () => {
    if (!profile || tipLoading) return;
    setTipLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a concise Indian nutrition coach. Give one practical tip in 1-2 sentences. No markdown.' },
            { role: 'user', content: `User: ${profile.age}y ${profile.gender}, goal: ${profile.goal}, diet: ${profile.diet}. Give one actionable daily nutrition tip.` }
          ],
          max_tokens: 120, temperature: 0.7,
        }),
      });
      const d = await res.json();
      setAiTip(d?.choices?.[0]?.message?.content || '');
    } catch (e) { console.warn('AI tip error:', e); }
    finally { setTipLoading(false); }
  };

  const logMeal = async () => {
    if (!newMeal.name || !newMeal.calories) return;
    const meal = {
      id: Date.now(),
      name: newMeal.name.trim(),
      calories: parseInt(newMeal.calories) || 0,
      type: newMeal.type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      emoji: getMealEmoji(newMeal.type),
      date: new Date().toISOString(),
    };
    try {
      const raw = await AsyncStorage.getItem('foodigo_meal_logs');
      const all = raw ? JSON.parse(raw) : [];
      const updated = [meal, ...all];
      await AsyncStorage.setItem('foodigo_meal_logs', JSON.stringify(updated));
      // update streak
      const newStreak = streak + 1;
      setStreak(newStreak);
      await AsyncStorage.setItem('foodigo_streak', String(newStreak));
      setMeals(prev => [meal, ...prev]);
      setLogModal(false);
      setNewMeal({ name: '', calories: '', type: 'Breakfast' });
    } catch (e) { console.warn('logMeal:', e); }
  };

  const deleteMeal = async (id) => {
    try {
      const raw = await AsyncStorage.getItem('foodigo_meal_logs');
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.filter(m => m.id !== id);
      await AsyncStorage.setItem('foodigo_meal_logs', JSON.stringify(updated));
      setMeals(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.warn('deleteMeal:', e); }
  };

  const targetCal = profile ? calcBMR(profile) : 2000;
  const macros = calcMacros(targetCal, profile?.goal || 'Maintenance');
  const consumedCal = meals.reduce((a, m) => a + (parseInt(m.calories) || 0), 0);
  const calPct = Math.min((consumedCal / targetCal) * 100, 100);
  const remaining = Math.max(targetCal - consumedCal, 0);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.duration(500)} style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{profile?.name || 'Foodigo User'} 🍽️</Text>
          </View>
          <TouchableOpacity style={s.avatarBtn}>
            <Text style={s.avatarEmoji}>👨‍🍳</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Calorie Ring Card ── */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <LinearGradient colors={['#0A4A3E', '#062E27']} style={s.calorieCard}>
            <View style={s.calRingOuter}>
              <View style={s.calRingInner}>
                <Text style={s.calConsumed}>{consumedCal}</Text>
                <Text style={s.calLabel}>kcal eaten</Text>
              </View>
            </View>
            <View style={s.calRight}>
              <Text style={s.calTitle}>Today's Calories</Text>
              <View style={s.calBarBg}>
                <View style={[s.calBarFill, { width: `${calPct}%` }]} />
              </View>
              <Text style={s.calRemain}>{remaining} kcal remaining</Text>
              <Text style={s.calTarget}>Target: {targetCal} kcal</Text>

              {profile && (
                <View style={s.goalBadge}>
                  <Text style={s.goalBadgeText}>🎯 {profile.goal}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Macros ── */}
        <Animated.View entering={FadeInUp.delay(180).duration(500)} style={s.card}>
          <Text style={s.sectionTitle}>Macro Targets</Text>
          <MacroBar label="Protein" current={0} total={macros.protein} color="#FF6B35" />
          <MacroBar label="Carbs"   current={0} total={macros.carbs}   color="#F5A623" />
          <MacroBar label="Fat"     current={0} total={macros.fat}     color="#4CAF50" />
          <Text style={s.macroNote}>* Track meals below to fill progress bars</Text>
        </Animated.View>

        {/* ── AI Tip ── */}
        <Animated.View entering={FadeInUp.delay(260).duration(500)} style={s.tipCard}>
          <View style={s.tipHeader}>
            <Ionicons name="sparkles" size={18} color="#F5A623" />
            <Text style={s.tipTitle}>AI Nutrition Tip</Text>
          </View>
          {aiTip ? (
            <Text style={s.tipText}>{aiTip}</Text>
          ) : (
            <TouchableOpacity style={s.tipBtn} onPress={fetchAiTip} disabled={tipLoading}>
              {tipLoading
                ? <ActivityIndicator size="small" color={COLORS.accent} />
                : <Text style={s.tipBtnText}>Get Today's Tip ✨</Text>}
            </TouchableOpacity>
          )}
          {aiTip ? (
            <TouchableOpacity onPress={() => { setAiTip(''); fetchAiTip(); }} style={{ marginTop: 10 }}>
              <Text style={{ color: COLORS.accent, fontSize: 12 }}>Refresh tip 🔄</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        {/* ── Streak ── */}
        <Animated.View entering={FadeInUp.delay(340).duration(500)} style={s.streakCard}>
          <Text style={s.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.streakTitle}>{streak} Day Streak!</Text>
            <Text style={s.streakSub}>Keep logging your meals every day</Text>
          </View>
          <View style={s.streakBadge}><Text style={s.streakBadgeText}>Active</Text></View>
        </Animated.View>

        {/* ── Today's Meals ── */}
        <Animated.View entering={FadeInUp.delay(420).duration(500)}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today's Meals 🍽️</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setLogModal(true)}>
              <Ionicons name="add-circle" size={28} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            {meals.length === 0 ? (
              <View style={s.emptyMeals}>
                <Text style={s.emptyMealsIcon}>🥗</Text>
                <Text style={s.emptyMealsText}>No meals logged today</Text>
                <TouchableOpacity style={s.logNowBtn} onPress={() => setLogModal(true)}>
                  <Text style={s.logNowText}>Log your first meal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              meals.map(m => (
                <MealRow key={m.id} meal={m} onDelete={() => deleteMeal(m.id)} />
              ))
            )}
          </View>
        </Animated.View>

        {/* ── Profile Prompt if no profile ── */}
        {!profile && (
          <Animated.View entering={FadeInDown.delay(500)} style={s.profilePrompt}>
            <Text style={s.promptEmoji}>👤</Text>
            <Text style={s.promptTitle}>Set Up Your Profile</Text>
            <Text style={s.promptSub}>
              Go to the Profile tab to enter your health details and get personalized targets.
            </Text>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Log Meal Modal ── */}
      <Modal visible={logModal} animationType="slide" transparent onRequestClose={() => setLogModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Log a Meal 🍽️</Text>

            <TextInput
              placeholder="What did you eat?"
              placeholderTextColor={COLORS.textSecondary}
              style={s.input}
              value={newMeal.name}
              onChangeText={v => setNewMeal(p => ({ ...p, name: v }))}
            />
            <TextInput
              placeholder="Calories (kcal)"
              placeholderTextColor={COLORS.textSecondary}
              style={s.input}
              keyboardType="numeric"
              value={newMeal.calories}
              onChangeText={v => setNewMeal(p => ({ ...p, calories: v }))}
            />

            <View style={s.mealTypeRow}>
              {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typePill, newMeal.type === t && s.typePillActive]}
                  onPress={() => setNewMeal(p => ({ ...p, type: t }))}
                >
                  <Text style={[s.typePillText, newMeal.type === t && s.typePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.logBtn} onPress={logMeal}>
              <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.logBtnGrad}>
                <Text style={s.logBtnText}>Save Meal</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={() => setLogModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { paddingHorizontal: SIZES.padding, paddingTop: 10 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  name: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 24 },

  calorieCard: {
    borderRadius: 24, padding: 20, flexDirection: 'row',
    alignItems: 'center', marginBottom: 20, gap: 20, ...SHADOWS.medium,
  },
  calRingOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  calRingInner: { alignItems: 'center' },
  calConsumed: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  calLabel: { color: COLORS.textSecondary, fontSize: 10 },
  calRight: { flex: 1 },
  calTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  calBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  calBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  calRemain: { color: COLORS.textSecondary, fontSize: 12 },
  calTarget: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  goalBadge: { marginTop: 8, backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  goalBadgeText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },

  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 14 },

  macroBarWrap: { marginBottom: 12 },
  macroBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroBarLabel: { color: COLORS.textSecondary, fontSize: 13 },
  macroBarVal: { color: 'white', fontSize: 13, fontWeight: '600' },
  macroBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 4 },
  macroNote: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4, fontStyle: 'italic' },

  tipCard: { backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipTitle: { color: COLORS.accent, fontSize: 15, fontWeight: 'bold' },
  tipText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22 },
  tipBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tipBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  streakCard: { backgroundColor: 'rgba(255,100,0,0.1)', borderRadius: 20, padding: 18, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,100,0,0.3)' },
  streakEmoji: { fontSize: 36 },
  streakTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  streakSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  streakBadge: { backgroundColor: '#FF6B35', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  streakBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBtn: { padding: 4 },

  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  mealRowEmoji: { fontSize: 26, marginRight: 12 },
  mealRowInfo: { flex: 1 },
  mealRowName: { color: 'white', fontSize: 14, fontWeight: '600' },
  mealRowMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  mealRowCal: { color: COLORS.accent, fontSize: 13, fontWeight: 'bold', marginRight: 10 },
  mealRowDelete: { padding: 6 },

  emptyMeals: { alignItems: 'center', paddingVertical: 20 },
  emptyMealsIcon: { fontSize: 40, marginBottom: 8 },
  emptyMealsText: { color: COLORS.textSecondary, fontSize: 14 },
  logNowBtn: { marginTop: 14, backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  logNowText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  profilePrompt: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  promptEmoji: { fontSize: 40, marginBottom: 10 },
  promptTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  promptSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0D4A3E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50 },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, color: 'white', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mealTypeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  typePill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  typePillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typePillText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  typePillTextActive: { color: 'white' },
  logBtn: { borderRadius: 15, overflow: 'hidden', marginBottom: 12 },
  logBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  logBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14 },
});

export default HomeScreen;
