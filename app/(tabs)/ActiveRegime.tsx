import { UserContext } from '@/context/UserContext';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform, ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = {
  ActiveRegime: {
    template?: any;
  };
};

export default function ActiveRegime() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ActiveRegime'>>();
  const isFocused = useIsFocused();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const template = route.params?.template;

  // State
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [exerciseStartTime, setExerciseStartTime] = useState<Date | null>(null);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]); 
  const [saving, setSaving] = useState(false);

  // Theme Object
  const theme = {
    background: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    subtext: isDark ? '#8E8E93' : '#636366',
    accent: '#007AFF',
    success: '#34C759',
    border: isDark ? '#38383A' : '#E5E5EA',
  };

  useEffect(() => {
    if (isFocused) {
      setExerciseIndex(0);
      setIsStarted(false);
      setSessionExercises([]);
    }
  }, [isFocused]);

  if (!template) return null;

  const currentEx = template.exercises[exerciseIndex];

  const handleStartExercise = () => {
    setIsStarted(true);
    setExerciseStartTime(new Date());
  };

const handleFinishExercise = async () => {
  setSaving(true);
  const endTime = new Date();
  const durationSeconds = exerciseStartTime 
    ? Math.floor((endTime.getTime() - exerciseStartTime.getTime()) / 1000) 
    : 0;

  // 1. Construct the exercise record
  const exerciseRecord = {
    userId: user?.uid,
    activity: currentEx.name,
    category: currentEx.category,
    // Use JS Date for the array-compatible version
    createdAt: new Date().toISOString(), 
    date: new Date().toLocaleDateString('en-GB'),
    reps: currentEx.reps || 0,
    sets: currentEx.sets || 0,
    weightUnit: currentEx.weightUnit || 'kg',
    weight: currentEx.weight || 0,
    distance: currentEx.metricValue || 0,
    duration: currentEx.duration || 0,
    unit: currentEx.unit || 'km',
    actualTimeSec: durationSeconds,
  };

  try {
    // 2. SAVE INDIVIDUAL (Still uses serverTimestamp for the standalone doc)
    await addDoc(collection(db, 'workouts'), {
      ...exerciseRecord,
      createdAt: serverTimestamp(), // This is fine here because it's top-level
    });

    const updatedSession = [...sessionExercises, exerciseRecord];
    setSessionExercises(updatedSession);

    if (exerciseIndex + 1 < template.exercises.length) {
      setExerciseIndex(exerciseIndex + 1);
      setIsStarted(false);
      setExerciseStartTime(null);
    } else {
      // 3. SAVE SESSION (Uses serverTimestamp for the session itself)
      await addDoc(collection(db, 'workoutSession'), {
        userId: user?.uid,
        regimeName: template.name || template.title,
        exercises: updatedSession, // No serverTimestamp inside this array anymore!
        createdAt: serverTimestamp(), // Top-level is fine
        date: new Date().toLocaleDateString('en-GB'),
      });

      // 4. NAVIGATION
      if (Platform.OS === 'web') {
        // Simple browser alert for web
        alert("Regime Completed! Redirecting to progress...");
        navigation.navigate('ReviewWorkout');
      } else {
        Alert.alert(
          "Regime Completed! 🎉", 
          "Your progress has been updated.",
          [{ text: "View Progress", onPress: () => navigation.navigate('ReviewWorkout') }]
        );
      }
    }
  } catch (e) {
    console.error("Firebase Save Error:", e);
    alert("Error saving workout. Check console.");
  } finally {
    setSaving(false);
  }
};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={32} color={theme.subtext} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Active Session</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressBar, { 
            width: `${((exerciseIndex + 1) / template.exercises.length) * 100}%`,
            backgroundColor: theme.accent 
          }]} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#999' }]}>
          <Text style={[styles.label, { color: theme.accent }]}>
            {currentEx.category?.toUpperCase()} • {exerciseIndex + 1} OF {template.exercises.length}
          </Text>
          <Text style={[styles.exName, { color: theme.text }]}>{currentEx.name}</Text>
          
          <View style={styles.detailRow}>
            {currentEx.category === 'strength' ? (
              <>
                <DetailItem label="Sets" value={currentEx.sets} theme={theme} />
                <DetailItem label="Reps" value={currentEx.reps} theme={theme} />
                <DetailItem label="Load" value={`${currentEx.weight}${currentEx.weightUnit}`} theme={theme} />
              </>
            ) : (
              <>
                <DetailItem label="Mins" value={currentEx.duration} theme={theme} />
                <DetailItem label="Goal" value={`${currentEx.metricValue}${currentEx.unit}`} theme={theme} />
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {!isStarted ? (
            <TouchableOpacity style={[styles.mainBtn, { backgroundColor: theme.accent }]} onPress={handleStartExercise}>
              <Ionicons name="play" size={24} color="#FFF" />
              <Text style={styles.btnText}>START EXERCISE</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: theme.success }]} 
              onPress={handleFinishExercise}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark-done" size={24} color="#FFF" />
                  <Text style={styles.btnText}>
                      {exerciseIndex + 1 === template.exercises.length ? 'FINISH REGIME' : 'COMPLETE & NEXT'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailItem = ({ label, value, theme }: any) => (
  <View style={styles.detailItem}>
    <Text style={[styles.detailLabel, { color: theme.subtext }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  iconBtn: { padding: 5 },
  title: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  progressTrack: { height: 6, width: '100%' },
  progressBar: { height: '100%' },
  card: { 
    margin: 20, 
    padding: 40, 
    borderRadius: 30, 
    alignItems: 'center', 
    shadowOpacity: 0.1, 
    shadowRadius: 15, 
    elevation: 5,
    // Max width for web browsing so it doesn't look stretched
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%'
  },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15 },
  exName: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 40 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  detailValue: { fontSize: 20, fontWeight: '800' },
  footer: { 
    marginTop: 'auto', 
    paddingBottom: 60, 
    paddingHorizontal: 30,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%'
  },
  mainBtn: { flexDirection: 'row', padding: 20, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 18 }
});