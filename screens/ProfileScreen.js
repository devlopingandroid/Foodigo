import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  TextInput,
  Modal,
  Switch,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown, FadeIn, SlideInDown } from 'react-native-reanimated';
import { callGroqAPI } from '../utils/api';

const { width, height } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const StatCard = ({ label, value, sub, icon, color = COLORS.accent }) => (
  <View style={s.statCard}>
    <View style={[s.statIconBg, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  </View>
);

const Section = ({ title, children, icon }) => (
  <View style={s.section}>
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={22} color={COLORS.accent} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InfoRow = ({ label, value }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value || 'Not set'}</Text>
  </View>
);

const ChipList = ({ items, color = COLORS.accent }) => (
  <View style={s.chipList}>
    {items && items.length > 0 ? items.map((item, i) => (
      <View key={i} style={[s.chip, { borderColor: color + '40', backgroundColor: color + '15' }]}>
        <Text style={[s.chipText, { color: color }]}>{item}</Text>
      </View>
    )) : (
      <Text style={s.emptyText}>None specified</Text>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [streak, setStreak] = useState(0);
  const [water, setWater] = useState(0);
  const [adherence, setAdherence] = useState({});
  const [aiInsights, setAiInsights] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [u, p, s_val, w_val, a_val, insights] = await Promise.all([
        AsyncStorage.getItem('foodigo_user_profile'),
        AsyncStorage.getItem('foodigo_diet_plan'),
        AsyncStorage.getItem('foodigo_streak'),
        AsyncStorage.getItem('foodigo_water'),
        AsyncStorage.getItem('foodigo_adherence'),
        AsyncStorage.getItem('foodigo_ai_insights'),
      ]);

      if (u) setProfile(JSON.parse(u));
      if (p) setDietPlan(JSON.parse(p));
      if (s_val) setStreak(parseInt(s_val));
      if (w_val) setWater(parseInt(w_val));
      if (a_val) setAdherence(JSON.parse(a_val));
      if (insights) setAiInsights(JSON.parse(insights));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    if (!profile || insightLoading) return;
    setInsightLoading(true);
    try {
      const res = await callGroqAPI([
        { role: 'system', content: 'You are a specialized Indian Wellness Coach. Respond ONLY with JSON.' },
        { role: 'user', content: `Generate 3 personalized health insights for this user: ${JSON.stringify(profile)}. Current Streak: ${streak}. Focus on Indian lifestyle, habits and nutrition. 
        Format: {"insights": [{"title": "...", "body": "...", "icon": "..."}]}` }
      ]);
      const clean = res.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setAiInsights(parsed.insights);
      await AsyncStorage.setItem('foodigo_ai_insights', JSON.stringify(parsed.insights));
    } catch (e) {
      console.error(e);
    } finally {
      setInsightLoading(false);
    }
  };

  const resetData = async () => {
    Alert.alert("Reset Data", "Are you sure? This will clear your entire profile and progress.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset Everything", style: "destructive", onPress: async () => {
        await AsyncStorage.clear();
        setProfile(null);
        setDietPlan(null);
        setStreak(0);
        setWater(0);
        setAdherence({});
        setAiInsights(null);
        Alert.alert("Success", "All data cleared. Please restart the app.");
      }}
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.accent} /></View>;

  if (!profile) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Ionicons name="person-outline" size={80} color="rgba(255,255,255,0.1)" />
        <Text style={s.noProfileText}>No profile found. Complete onboarding in the Explore tab!</Text>
      </View>
    </SafeAreaView>
  );

  const bmi = calcBMI(profile.weight, profile.height);
  const bmiCat = getBMICategory(bmi);
  const today = new Date().toDateString();
  const completedToday = dietPlan?.meals?.filter(m => adherence[`${today}-${m.type}`])?.length || 0;
  const progressPct = dietPlan?.meals?.length ? Math.round((completedToday / dietPlan.meals.length) * 100) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        
        {/* User Header */}
        <Animated.View entering={FadeInDown} style={s.header}>
          <LinearGradient colors={['#0D5C4E', '#062E27']} style={s.headerGrad}>
            <View style={s.headerTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{profile.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.headerMain}>
                <Text style={s.userName}>{profile.name}</Text>
                <View style={s.goalBadge}>
                  <Text style={s.goalBadgeText}>{profile.fitnessGoal} 💪</Text>
                </View>
              </View>
              <View style={s.streakCircle}>
                <Text style={s.streakVal}>{streak}</Text>
                <Text style={s.streakLab}>Streak</Text>
              </View>
            </View>
            <View style={s.headerStats}>
              <View style={s.hStat}>
                <Text style={s.hStatVal}>{dietPlan?.dailyCalories || '0'}</Text>
                <Text style={s.hStatLab}>Kcal Target</Text>
              </View>
              <View style={s.hDivider} />
              <View style={s.hStat}>
                <Text style={s.hStatVal}>{progressPct}%</Text>
                <Text style={s.hStatLab}>Today Adherence</Text>
              </View>
              <View style={s.hDivider} />
              <View style={s.hStat}>
                <Text style={s.hStatVal}>{water}/8</Text>
                <Text style={s.hStatLab}>Water Goal</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Body Metrics */}
        <Section title="Body Metrics & Analytics" icon="stats-chart-outline">
          <View style={s.statsGrid}>
            <StatCard label="Height" value={`${profile.height} cm`} icon="resize-outline" color="#3498db" />
            <StatCard label="Weight" value={`${profile.weight} kg`} sub={`Target: ${profile.targetWeight}kg`} icon="speedometer-outline" color="#e67e22" />
            <StatCard label="BMI" value={bmi} sub={bmiCat.label} icon="fitness-outline" color={bmiCat.color} />
            <StatCard label="Age" value={`${profile.age} yrs`} icon="calendar-outline" color="#9b59b6" />
          </View>
          <View style={s.infoBox}>
            <InfoRow label="Gender" value={profile.gender} />
            <InfoRow label="Activity Level" value={profile.activity} />
            <InfoRow label="Lifestyle" value={profile.lifestyle} />
          </View>
        </Section>

        {/* Fitness Goals */}
        <Section title="Nutrition Blueprint" icon="nutrition-outline">
          <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={s.macroCard}>
            <View style={s.macroRow}>
              <View style={s.macroItem}>
                <Text style={s.macroVal}>{dietPlan?.dailyProtein || '0'}g</Text>
                <Text style={s.macroLab}>Protein</Text>
                <View style={[s.macroLine, { backgroundColor: '#FF6B35' }]} />
              </View>
              <View style={s.macroItem}>
                <Text style={s.macroVal}>{dietPlan?.dailyCarbs || '0'}g</Text>
                <Text style={s.macroLab}>Carbs</Text>
                <View style={[s.macroLine, { backgroundColor: '#F5A623' }]} />
              </View>
              <View style={s.macroItem}>
                <Text style={s.macroVal}>{dietPlan?.dailyFat || '0'}g</Text>
                <Text style={s.macroLab}>Fats</Text>
                <View style={[s.macroLine, { backgroundColor: '#3498db' }]} />
              </View>
            </View>
          </LinearGradient>
        </Section>

        {/* Diet Preferences */}
        <Section title="Dietary Profile" icon="restaurant-outline">
          <View style={s.infoBox}>
            <InfoRow label="Preference" value={profile.dietaryPreference} />
            <Text style={s.subLabel}>Allergies</Text>
            <ChipList items={profile.allergies} color="#e74c3c" />
          </View>
        </Section>

        {/* Medical Section */}
        <Section title="Medical Awareness" icon="medical-outline">
          <View style={s.infoBox}>
            <Text style={s.subLabel}>Active Conditions</Text>
            <ChipList items={profile.conditions} color="#f1c40f" />
          </View>
        </Section>

        {/* AI Insights */}
        <Section title="Coach AI Insights" icon="sparkles-outline">
          {aiInsights ? (
            <View style={s.insightsList}>
              {aiInsights.map((ins, i) => (
                <Animated.View key={i} entering={FadeInUp.delay(i * 100)} style={s.insightCard}>
                  <View style={s.insightIcon}>
                    <Text style={{ fontSize: 20 }}>{ins.icon || '💡'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>{ins.title}</Text>
                    <Text style={s.insightBody}>{ins.body}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : (
            <TouchableOpacity style={s.genInsightBtn} onPress={generateAIInsights} disabled={insightLoading}>
              {insightLoading ? <ActivityIndicator color="white" /> : (
                <>
                  <Ionicons name="flash" size={18} color="white" />
                  <Text style={s.genInsightText}>Generate Health Protocol Insights</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Section>

        {/* Settings / Actions */}
        <View style={s.actionSection}>
          <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert("Edit Profile", "To update your profile, please use the intake form in the Explore tab.")}>
            <Ionicons name="create-outline" size={22} color="white" />
            <Text style={s.actionBtnText}>Re-calibrate Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(231, 76, 60, 0.15)' }]} onPress={resetData}>
            <Ionicons name="trash-outline" size={22} color="#e74c3c" />
            <Text style={[s.actionBtnText, { color: '#e74c3c' }]}>Wipe Local Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  scrollContent: { paddingBottom: 40 },
  noProfileText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, fontSize: 16, lineHeight: 24 },

  header: { padding: 20 },
  headerGrad: { borderRadius: 30, padding: 25, ...SHADOWS.medium },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarText: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  headerMain: { flex: 1, marginLeft: 15 },
  userName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  goalBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 5 },
  goalBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  streakCircle: { width: 55, height: 55, borderRadius: 28, backgroundColor: 'rgba(245, 166, 35, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent },
  streakVal: { color: COLORS.accent, fontSize: 18, fontWeight: 'bold' },
  streakLab: { color: 'white', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  headerStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  hStat: { alignItems: 'center' },
  hStatVal: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  hStatLab: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 },
  hDivider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.1)' },

  section: { paddingHorizontal: 20, marginTop: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: (width - 52) / 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 15, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { color: COLORS.textSecondary, fontSize: 10 },
  statValue: { color: 'white', fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  statSub: { color: COLORS.textSecondary, fontSize: 9, marginTop: 2 },

  infoBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, marginTop: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { color: COLORS.textSecondary, fontSize: 14 },
  infoValue: { color: 'white', fontSize: 14, fontWeight: '600' },
  subLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 15, marginBottom: 10 },

  macroCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroVal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  macroLab: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  macroLine: { width: 30, height: 3, borderRadius: 2, marginTop: 10 },

  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' },

  insightsList: { gap: 12 },
  insightCard: { flexDirection: 'row', gap: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  insightIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  insightTitle: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  insightBody: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  genInsightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.accent, height: 56, borderRadius: 18, marginTop: 10 },
  genInsightText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

  actionSection: { paddingHorizontal: 20, marginTop: 40, gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', height: 56, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});

export default ProfileScreen;
