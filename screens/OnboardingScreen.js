import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { COLORS, SIZES } from '../constants/theme';

const { width } = Dimensions.get('window');

// ─── Pill selector helper ──────────────────────────────────────────────────────

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

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome' },
  { id: 'basic',     title: 'Tell us about you',         subtitle: 'Basic info for accurate targets' },
  { id: 'body',      title: 'Your body stats',            subtitle: 'Used to calculate your calorie target' },
  { id: 'goal',      title: 'What\'s your goal?',        subtitle: 'We\'ll tailor your plan around this' },
  { id: 'diet',      title: 'Dietary preferences',        subtitle: 'We respect your food choices' },
  { id: 'health',    title: 'Health conditions',          subtitle: 'Helps us suggest safer meals' },
  { id: 'lifestyle', title: 'Your daily lifestyle',       subtitle: 'Activity affects your calorie needs' },
  { id: 'done' },
];

// ─── Main component ───────────────────────────────────────────────────────────

const OnboardingScreen = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male',
    height: '', weight: '', targetWeight: '',
    goal: 'Fat Loss',
    diet: 'Veg',
    allergies: [],
    conditions: [],
    activity: 'Moderate',
    workout: '3-4x / week',
    lifestyle: 'Student',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const next = () => setStep(p => Math.min(p + 1, STEPS.length - 1));
  const back = () => setStep(p => Math.max(p - 1, 0));

  const finish = async () => {
    try {
      await AsyncStorage.setItem('foodigo_user_profile', JSON.stringify({
        ...form,
        createdAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem('foodigo_onboarding_shown', 'true');
      onComplete();
    } catch (e) {
      console.warn('Save profile error:', e);
      onComplete();
    }
  };

  const cur = STEPS[step];
  const progress = (step / (STEPS.length - 1)) * 100;

  const renderStep = () => {
    switch (cur.id) {
      case 'welcome':
        return (
          <View style={s.centerSlide}>
            <Text style={s.welcomeEmoji}>🍽️</Text>
            <Text style={s.welcomeTitle}>Welcome to Foodigo</Text>
            <Text style={s.welcomeSub}>
              Your AI-powered nutrition coach. Let's take 60 seconds to personalise your experience.
            </Text>
            <TouchableOpacity style={s.cta} onPress={next}>
              <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.ctaGrad}>
                <Text style={s.ctaText}>Get Started 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case 'basic':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Your Name</Text>
            <TextInput
              placeholder="e.g. Arjun Sharma"
              placeholderTextColor={COLORS.textSecondary}
              style={s.input}
              value={form.name}
              onChangeText={v => set('name', v)}
            />
            <Text style={s.inputLabel}>Age</Text>
            <TextInput
              placeholder="e.g. 22"
              placeholderTextColor={COLORS.textSecondary}
              style={s.input}
              keyboardType="numeric"
              value={form.age}
              onChangeText={v => set('age', v)}
            />
            <Text style={s.inputLabel}>Gender</Text>
            <PillRow options={['Male', 'Female', 'Other']} value={form.gender} onChange={v => set('gender', v)} />
          </ScrollView>
        );

      case 'body':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Height (cm)</Text>
            <TextInput placeholder="e.g. 172" placeholderTextColor={COLORS.textSecondary} style={s.input} keyboardType="numeric" value={form.height} onChangeText={v => set('height', v)} />
            <Text style={s.inputLabel}>Current Weight (kg)</Text>
            <TextInput placeholder="e.g. 78" placeholderTextColor={COLORS.textSecondary} style={s.input} keyboardType="numeric" value={form.weight} onChangeText={v => set('weight', v)} />
            <Text style={s.inputLabel}>Target Weight (kg)</Text>
            <TextInput placeholder="e.g. 70" placeholderTextColor={COLORS.textSecondary} style={s.input} keyboardType="numeric" value={form.targetWeight} onChangeText={v => set('targetWeight', v)} />
          </ScrollView>
        );

      case 'goal':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Fitness Goal</Text>
            <PillRow
              options={['Fat Loss', 'Muscle Gain', 'Maintenance', 'Bulking', 'Cutting']}
              value={form.goal}
              onChange={v => set('goal', v)}
            />
            <Text style={s.inputLabel}>Workout Frequency</Text>
            <PillRow
              options={['No workout', '1-2x / week', '3-4x / week', '5-6x / week', 'Daily']}
              value={form.workout}
              onChange={v => set('workout', v)}
            />
          </ScrollView>
        );

      case 'diet':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Diet Type</Text>
            <PillRow options={['Veg', 'Non-Veg', 'Vegan', 'Eggetarian', 'Jain']} value={form.diet} onChange={v => set('diet', v)} />
            <Text style={s.inputLabel}>Allergies (select all that apply)</Text>
            <PillRow
              options={['None', 'Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Shellfish']}
              value={form.allergies}
              onChange={v => set('allergies', v)}
              multi
            />
          </ScrollView>
        );

      case 'health':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Health Conditions (select all that apply)</Text>
            <PillRow
              options={['None', 'Diabetes', 'Thyroid', 'High BP', 'Low BP', 'PCOS', 'Cholesterol', 'IBS', 'Heart Issue']}
              value={form.conditions}
              onChange={v => set('conditions', v)}
              multi
            />
          </ScrollView>
        );

      case 'lifestyle':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.inputLabel}>Activity Level</Text>
            <PillRow
              options={['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active']}
              value={form.activity}
              onChange={v => set('activity', v)}
            />
            <Text style={s.inputLabel}>Daily Lifestyle</Text>
            <PillRow
              options={['Student', 'Desk Job', 'Field Job', 'Homemaker', 'Athlete', 'Night Shift']}
              value={form.lifestyle}
              onChange={v => set('lifestyle', v)}
            />
          </ScrollView>
        );

      case 'done':
        return (
          <View style={s.centerSlide}>
            <Text style={s.welcomeEmoji}>🎉</Text>
            <Text style={s.welcomeTitle}>You're all set!</Text>
            <Text style={s.welcomeSub}>
              Your personalised health dashboard is ready.{'\n'}
              Start exploring your daily targets and AI-powered meal plans.
            </Text>
            <TouchableOpacity style={s.cta} onPress={finish}>
              <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.ctaGrad}>
                <Text style={s.ctaText}>Enter Foodigo 🍽️</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const isWelcomeOrDone = cur.id === 'welcome' || cur.id === 'done';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Progress bar */}
      {!isWelcomeOrDone && (
        <View style={s.progressWrap}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressText}>Step {step} of {STEPS.length - 2}</Text>
        </View>
      )}

      {/* Title */}
      {!isWelcomeOrDone && (
        <View style={s.stepHeader}>
          <Text style={s.stepTitle}>{cur.title}</Text>
          <Text style={s.stepSubtitle}>{cur.subtitle}</Text>
        </View>
      )}

      {/* Content */}
      <Animated.View entering={FadeInRight.duration(300)} style={s.content}>
        {renderStep()}
      </Animated.View>

      {/* Footer nav */}
      {!isWelcomeOrDone && (
        <View style={s.footer}>
          {step > 1 && (
            <TouchableOpacity style={s.backBtn} onPress={back}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.nextBtn, step <= 1 && { flex: 1 }]} onPress={next}>
            <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.nextBtnGrad}>
              <Text style={s.nextBtnText}>{step === STEPS.length - 2 ? 'Finish ✓' : 'Next →'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },

  progressWrap: { paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 6 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
  progressText: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'right' },

  stepHeader: { paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 10 },
  stepTitle: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  stepSubtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },

  content: { flex: 1, paddingHorizontal: SIZES.padding, paddingTop: 10 },

  centerSlide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  welcomeEmoji: { fontSize: 100, marginBottom: 30 },
  welcomeTitle: { color: 'white', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  welcomeSub: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  cta: { width: '100%', borderRadius: SIZES.radiusButton, overflow: 'hidden' },
  ctaGrad: { paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  inputLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14,
    color: 'white', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  pillText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: 'white' },

  footer: { flexDirection: 'row', paddingHorizontal: SIZES.padding, paddingBottom: Platform.OS === 'ios' ? 30 : 20, paddingTop: 16, gap: 12 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' },
  backBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  nextBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  nextBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default OnboardingScreen;
