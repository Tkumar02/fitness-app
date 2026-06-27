import { UserContext } from '@/context/UserContext';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform, ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = {
  ActiveRegime: {
    template?: any;
    sessionId?: string;
    viewMode?: boolean;
  };
};

export default function ActiveRegime() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation<any>();
  const route = useRoute<any>(); 
  const isFocused = useIsFocused();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [template, setTemplate] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [exerciseStartTime, setExerciseStartTime] = useState<Date | null>(null);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]); 
  const [saving, setSaving] = useState(false);
  const [exerciseNote, setExerciseNote] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<boolean[]>([]);
  const [pauseOffset, setPauseOffset] = useState(0);
  
  // Stopwatch state
  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timerActive && exerciseStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - exerciseStartTime.getTime()) / 1000);
        
        // Safety cap: if timer exceeds 4 hours, auto-stop it to prevent "ghost" high numbers
        if (diff > 14400) { 
            setTimerActive(false);
            setSeconds(14400);
            return;
        }
        
        setSeconds(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, exerciseStartTime]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
      const params = route.params ?? {};
      let parsedTemplate = params.template;
      if (typeof parsedTemplate === 'string') {
        try {
          parsedTemplate = JSON.parse(parsedTemplate);
        } catch (e) {
          console.error('Failed to parse template JSON', e);
        }
      }
      setTemplate(parsedTemplate);
      setSessionId(params.sessionId ?? null);
      setViewMode(params.viewMode ?? false);
      setShowSummary(false);

      // If we have a sessionId, fetch the current progress
      if (params?.sessionId) {
          getDoc(doc(db, 'workoutSessions', params.sessionId)).then(snap => {
              if (snap.exists()) {
                  const data = snap.data();
                  if (data.exercises) {
                      setSessionExercises(data.exercises);
                      const nextIndex = data.exercises.length;
                      if (nextIndex >= (parsedTemplate?.exercises?.length || 0)) {
                          setExerciseIndex((parsedTemplate?.exercises?.length || 1) - 1);
                          setShowSummary(true);
                      } else {
                          setExerciseIndex(nextIndex);
                          // Check if currently in progress
                          if (data.currentExerciseStartedAt) {
                              const startTime = data.currentExerciseStartedAt.toDate();
                              setExerciseStartTime(startTime);
                              setIsStarted(true);
                              setTimerActive(true);
                          } else {
                              setIsStarted(false);
                              setTimerActive(false);
                              setExerciseStartTime(null);
                          }
                      }
                  }
              }
          });
      } else {
          // Reset only if no session (starting fresh)
          setExerciseIndex(0);
          setIsStarted(false);
          setTimerActive(false);
          setExerciseStartTime(null);
          setSessionExercises([]);
      }
    }
  }, [isFocused, route.params]);

  const handleAbandon = async () => {
    const doAbandon = async () => {
        if (sessionId) {
            await updateDoc(doc(db, 'workoutSessions', sessionId), { 
                status: 'abandoned', 
                currentExerciseStartedAt: null,
                endedAt: serverTimestamp() 
            });
        }
        navigation.navigate('TemplateList');
    };

    if (Platform.OS === 'web') {
        if (window.confirm("Abandon this workout? Progress won't be saved to session history.")) doAbandon();
    } else {
        Alert.alert("Abandon Workout?", "Progress won't be saved to session history.", [
            { text: "Cancel", style: "cancel" },
            { text: "Abandon", style: "destructive", onPress: doAbandon }
        ]);
    }
  };

  if (!template) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="fitness-outline" size={80} color={theme.subtext} style={{ opacity: 0.5 }} />
        <Text style={[styles.exName, { color: theme.text, fontSize: 24, marginTop: 20 }]}>
          No Active Session
        </Text>
        <Text style={{ color: theme.subtext, textAlign: 'center', paddingHorizontal: 40, marginBottom: 30 }}>
          Select a regime from your library or create a new one to start tracking your progress.
        </Text>
        <TouchableOpacity 
          style={[styles.mainBtn, { backgroundColor: theme.accent, width: '80%' }]}
          onPress={() => navigation.navigate('TemplateList')} // Ensure 'Templates' matches your tab name
        >
          <Text style={styles.btnText}>GO TO REGIMES</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  const currentEx = (template?.exercises?.[exerciseIndex]) ?? (template?.exercises?.[0] ?? {});

  const handleStartExercise = async () => {
    // Original start for single exercise (kept for compatibility)
    const startTime = new Date();
    setIsStarted(true);
    setExerciseStartTime(startTime);
    setTimerActive(true);
    setSeconds(0);
    setExerciseNote('');

    if (sessionId) {
        try {
            await updateDoc(doc(db, 'workoutSessions', sessionId), {
                currentExerciseStartedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error saving start state:", e);
        }
    }
  };

  // Start a specific exercise by index (used in playlist mode)
  const startExerciseAt = (idx: number) => {
    setExerciseIndex(idx);
    const startTime = new Date();
    setIsStarted(true);
    setExerciseStartTime(startTime);
    setTimerActive(true);
    setSeconds(0);
    setExerciseNote('');
    if (sessionId) {
        updateDoc(doc(db, 'workoutSessions', sessionId), {
            currentExerciseStartedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }).catch(e => console.error('Error updating start time:', e));
    }
  };


const handleFinishExercise = async () => {
  setSaving(true);
  setTimerActive(false);
  const endTime = new Date();
  const durationSeconds = exerciseStartTime 
    ? Math.floor((endTime.getTime() - exerciseStartTime.getTime()) / 1000) 
    : 0;

  // 1. Construct the exercise record
  const exerciseRecord = {
      userId: user?.uid,
      activity: currentEx.name,
      category: currentEx.category,
      metricType: currentEx.metricType || (currentEx.category === 'cardio' ? 'DISTANCE' : 'WEIGHT'),
      createdAt: new Date().toISOString(), 
      date: new Date().toISOString().split('T')[0],
      reps: currentEx.reps || 0,
      sets: currentEx.sets || 0,
      weightUnit: currentEx.weightUnit || 'kg',
      strengthMetric: currentEx.strengthMetric || 'reps',
      weight: currentEx.weight || 0,
      distance: currentEx.metricValue || 0,
      intensity: currentEx.intensity || 0,
      duration: currentEx.duration || 0,
      unit: currentEx.unit || 'km',
      actualTimeSec: durationSeconds,
      calories: 0, 
      notes: exerciseNote.trim(),
    };

    // Calculate calories if biometrics exist
    // Use actualTimeSec (stopwatch) as fallback duration for strength exercises
    const effectiveDuration = exerciseRecord.duration > 0 
        ? exerciseRecord.duration 
        : Math.round(durationSeconds / 60);
    if (user?.weight && user?.dob && user?.height && effectiveDuration > 0) {
        const birthDate = new Date(user.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        const stats = {
            category: exerciseRecord.category,
            activity: exerciseRecord.activity,
            duration: effectiveDuration,
            sets: exerciseRecord.sets,
            reps: exerciseRecord.reps,
            weightUsed: exerciseRecord.weight,
            rpe: exerciseRecord.intensity || 5 // Default RPE 5 if not set
        };

        const biometrics = {
            weight: parseFloat(user.weight),
            height: parseFloat(user.height),
            age: age,
            sex: user.sex || 'male'
        };

        exerciseRecord.calories = require('@/utils/calorieCalculator').calculateCalories(stats, biometrics);
    }
  try {
    // 2. SAVE INDIVIDUAL 
    await addDoc(collection(db, 'workouts'), {
      ...exerciseRecord,
      createdAt: serverTimestamp(), 
    });

    const updatedSession = [...sessionExercises, exerciseRecord];
    setSessionExercises(updatedSession);

    // Update the session doc in real-time as we go
    if (sessionId) {
        await updateDoc(doc(db, 'workoutSessions', sessionId), {
            exercises: updatedSession,
            currentExerciseStartedAt: null,
            updatedAt: serverTimestamp()
        });
    }

    if (exerciseIndex + 1 < template.exercises.length) {
      setExerciseIndex(exerciseIndex + 1);
      setIsStarted(false);
      setExerciseStartTime(null);
    } else {
        setShowSummary(true);
    }
  } catch (e) {
    console.error("Firebase Save Error:", e);
    alert("Error saving exercise. Check console.");
  } finally {
    setSaving(false);
  }
};

const handleFinalSubmit = async () => {
    setSaving(true);
    try {
        console.log("Submitting workout. Template:", template);
        const linkedTrainerId = template.userId !== user?.uid ? template.userId : user?.trainerId;
        console.log("Assigned trainerId:", linkedTrainerId);

        if (sessionId) {
            await updateDoc(doc(db, 'workoutSessions', sessionId), {
                status: 'completed',
                endedAt: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                notes: sessionNote.trim(),
                trainerId: linkedTrainerId || null,
            });
        } else {
            await addDoc(collection(db, 'workoutSessions'), {
                userId: user?.uid,
                regimeName: template.name || template.title,
                exercises: sessionExercises,
                status: 'completed',
                createdAt: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                notes: sessionNote.trim(),
                trainerId: linkedTrainerId || null,
            });
        }

        navigation.setParams({ template: undefined, sessionId: undefined });

        if (Platform.OS === 'web') {
            alert("Regime Completed! 🎉");
            navigation.navigate('ReviewWorkout');
        } else {
            Alert.alert(
                "Regime Completed! 🎉", 
                "Your progress has been updated.",
                [{ text: "View Progress", onPress: () => navigation.navigate('ReviewWorkout') }]
            );
        }
    } catch (e) {
        console.error("Final Save Error:", e);
    } finally {
        setSaving(false);
    }
};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('TemplateList')} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={32} color={theme.subtext} />
          </TouchableOpacity>
<Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>
  {template.name}{"\n"}
  <Text 
    style={{ 
      fontSize: 20, 
      fontWeight: '900', 
      color: viewMode ? theme.accent : theme.success,
      letterSpacing: 2,
      textShadowColor: viewMode ? theme.accent : theme.success, 
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10 
    }}
  >
    {viewMode ? 'PREVIEW' : (showSummary ? 'COMPLETE' : 'ACTIVE')}
  </Text>
</Text>          
          {!viewMode && !showSummary ? (
            <TouchableOpacity onPress={handleAbandon} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={28} color="#ff453a" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>

        {!viewMode && (
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressBar, { 
                width: `${((exerciseIndex + 1) / template.exercises.length) * 100}%`,
                backgroundColor: theme.accent 
            }]} />
            </View>
        )}

        {template.description && (
            <View style={[styles.card, { backgroundColor: theme.card, marginBottom: 15, padding: 20 }]}>
                <Text style={[styles.label, { color: theme.accent }]}>TRAINER NOTES / LINKS</Text>
                <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{template.description}</Text>
            </View>
        )}

        {showSummary ? (
            <View style={[styles.card, { backgroundColor: theme.card, padding: 30 }]}>
                <Ionicons name="trophy-outline" size={60} color={theme.success} style={{ alignSelf: 'center', marginBottom: 20 }} />
                <Text style={[styles.exName, { color: theme.text, fontSize: 24, marginBottom: 10 }]}>Great Workout!</Text>
                <Text style={{ color: theme.subtext, textAlign: 'center', marginBottom: 30 }}>You&apos;ve finished all exercises. Add any final notes for your records or your trainer.</Text>
                
                <View style={{ width: '100%' }}>
                    <Text style={[styles.detailLabel, { color: theme.subtext, marginBottom: 8 }]}>FINAL COMMENTS</Text>
                    <TextInput 
                        style={{ 
                            backgroundColor: theme.background, 
                            color: theme.text, 
                            padding: 15, 
                            borderRadius: 12,
                            height: 120,
                            textAlignVertical: 'top'
                        }}
                        placeholder="Overall feedback..."
                        placeholderTextColor={theme.subtext}
                        multiline
                        value={sessionNote}
                        onChangeText={setSessionNote}
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.mainBtn, { backgroundColor: theme.success, marginTop: 30, width: '100%' }]} 
                    onPress={handleFinalSubmit}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#FFF" /> : (
                        <Text style={styles.btnText}>SUBMIT WORKOUT</Text>
                    )}
                </TouchableOpacity>
            </View>
        ) : viewMode ? (
            <View style={{ padding: 20 }}>
                {template?.exercises?.map((ex: any, idx: number) => (
                    <View key={idx} style={[styles.card, { backgroundColor: theme.card, marginBottom: 15, padding: 25 }]}>
                        <Text style={[styles.label, { color: theme.accent }]}>{ex.category?.toUpperCase()}</Text>
                        <Text style={[styles.exName, { color: theme.text, fontSize: 24, marginBottom: 20 }]}>{ex.name}</Text>
                        <View style={styles.detailRow}>
                            {ex.category === 'strength' ? (
                                <>
                                    <DetailItem label="Sets" value={ex.sets} theme={theme} />
                                    <DetailItem label={ex.strengthMetric === 'time' ? "Secs" : "Reps"} value={ex.reps} theme={theme} />
                                    <DetailItem label="Load" value={`${ex.weight}${ex.unit || ex.weightUnit || 'kg'}`} theme={theme} />
                                </>
                            ) : (
                                <>
                                    <DetailItem label="Mins" value={ex.duration} theme={theme} />
                                    <DetailItem label="Goal" value={`${ex.metricValue}${ex.unit}`} theme={theme} />
                                </>
                            )}
                        </View>
                    </View>
                ))}
                <TouchableOpacity
                  style={[styles.mainBtn, { backgroundColor: theme.accent, marginTop: 20 }]}
                  onPress={() => {
                    setCompletedExercises(Array(template?.exercises?.length ?? 0).fill(false));
                    setPlaylistMode(true);
                  }}
                >
                  <Ionicons name="play" size={24} color="#FFF" />
                  <Text style={styles.btnText}>START REGIME</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <>
                <View style={[styles.card, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#999' }]}>
                <Text style={[styles.label, { color: theme.accent }]}>
                    {currentEx.category?.toUpperCase()} • {exerciseIndex + 1} OF {template.exercises.length}
                </Text>
                <Text style={[styles.exName, { color: theme.text }]}>{currentEx.name}</Text>
                
                <View style={styles.detailRow}>
                    {currentEx.category === 'strength' ? (
                    <>
                        <DetailItem label="Sets" value={currentEx.sets} theme={theme} />
                        <DetailItem label={currentEx.strengthMetric === 'time' ? "Secs" : "Reps"} value={currentEx.reps} theme={theme} />
                        <DetailItem label="Load" value={`${currentEx.weight}${currentEx.unit || currentEx.weightUnit || 'kg'}`} theme={theme} />
                    </>
                    ) : (
                    <>
                        <DetailItem label="Mins" value={currentEx.duration} theme={theme} />
                        <DetailItem label="Goal" value={`${currentEx.metricValue}${currentEx.unit}`} theme={theme} />
                    </>
                    )}
                </View>
                {isStarted && (
                    <View style={{ width: '100%', marginTop: 30 }}>
                        <View style={styles.timerContainer}>
                            <Ionicons name="stopwatch-outline" size={20} color={theme.accent} />
                            <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(seconds)}</Text>
                        </View>
                        
                        <View style={{ marginTop: 20 }}>
                            <Text style={[styles.detailLabel, { color: theme.subtext, marginBottom: 8 }]}>EXERCISE NOTES</Text>
                            <TextInput 
                                style={{ 
                                    backgroundColor: theme.background, 
                                    color: theme.text, 
                                    padding: 15, 
                                    borderRadius: 12,
                                    height: 80,
                                    textAlignVertical: 'top'
                                }}
                                placeholder="How did it feel?"
                                placeholderTextColor={theme.subtext}
                                multiline
                                value={exerciseNote}
                                onChangeText={setExerciseNote}
                            />
                        </View>
                    </View>
                )}
                </View>

             <View style={styles.footer}>
  <TouchableOpacity
    style={[styles.mainBtn, { backgroundColor: theme.accent }]}
    onPress={() => {
      setCompletedExercises(Array(template.exercises.length).fill(false));
      setPlaylistMode(true);
    }}
  >
    <Ionicons name="play" size={24} color="#FFF" />
    <Text style={styles.btnText}>START REGIME</Text>
  </TouchableOpacity>
</View>
            </>
        )}
        {/* Playlist Mode */}
        {playlistMode && !showSummary && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {template.exercises.map((ex: any, idx: number) => (
                    <View key={idx} style={[styles.card, { backgroundColor: theme.card, marginBottom: 15, padding: 20 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.exName, { color: theme.text, fontSize: 20 }]}>{ex.name}</Text>
                            {completedExercises[idx] ? (
                                <Ionicons name="checkmark-circle" size={28} color={theme.success} />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.mainBtn, { backgroundColor: theme.accent, paddingHorizontal: 15, paddingVertical: 8 }]}
                                    onPress={() => {
                                      if (isStarted && exerciseIndex === idx) {
                                        // Pause: capture current seconds
                                        setPauseOffset(seconds);
                                        setTimerActive(false);
                                        setIsStarted(false);
                                      } else if (!isStarted && exerciseIndex === idx && pauseOffset > 0) {
                                        // Resume from pause
                                        const resumedStart = new Date(Date.now() - pauseOffset * 1000);
                                        setExerciseStartTime(resumedStart);
                                        setTimerActive(true);
                                        setIsStarted(true);
                                        setPauseOffset(0);
                                      } else {
                                        // Start a new exercise
                                        setExerciseIndex(idx);
                                        startExerciseAt(idx);
                                        setPauseOffset(0);
                                      }
                                    }}
                                    disabled={isStarted && exerciseIndex !== idx}
                                >
                                    <Ionicons name={isStarted && exerciseIndex === idx ? "pause" : "play"} size={20} color="#FFF" />
                                    <Text style={styles.btnText}>{isStarted && exerciseIndex === idx ? 'PAUSE' : (pauseOffset > 0 && exerciseIndex === idx ? 'RESUME' : 'START')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* Details */}
                        <View style={styles.detailRow}>
                            {ex.category === 'strength' ? (
                                <>
                                    <DetailItem label="Sets" value={ex.sets} theme={theme} />
                                    <DetailItem label={ex.strengthMetric === 'time' ? "Secs" : "Reps"} value={ex.reps} theme={theme} />
                                    <DetailItem label="Load" value={`${ex.weight}${ex.unit || ex.weightUnit || 'kg'}`} theme={theme} />
                                </>
                            ) : (
                                <>
                                    <DetailItem label="Mins" value={ex.duration} theme={theme} />
                                    <DetailItem label="Goal" value={`${ex.metricValue}${ex.unit}`} theme={theme} />
                                </>
                            )}
                        </View>
                        {((isStarted && exerciseIndex === idx) || (!isStarted && exerciseIndex === idx && pauseOffset > 0)) && (
                            <View style={{ marginTop: 15 }}>
                                <View style={styles.timerContainer}>
                                    <Ionicons name="stopwatch-outline" size={20} color={theme.accent} />
                                    <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(seconds)}</Text>
                                    {!isStarted && pauseOffset > 0 && (
                                        <Text style={{ color: theme.subtext, fontSize: 12, marginLeft: 8 }}>PAUSED</Text>
                                    )}
                                </View>
                                <View style={{ marginTop: 10 }}>
                                    <Text style={[styles.detailLabel, { color: theme.subtext, marginBottom: 8 }]}>EXERCISE NOTES</Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: theme.background,
                                            color: theme.text,
                                            padding: 15,
                                            borderRadius: 12,
                                            height: 80,
                                            textAlignVertical: 'top'
                                        }}
                                        placeholder="How did it feel?"
                                        placeholderTextColor={theme.subtext}
                                        multiline
                                        value={exerciseNote}
                                        onChangeText={setExerciseNote}
                                    />
                                    <TouchableOpacity
                                        style={[styles.mainBtn, { backgroundColor: theme.success, marginTop: 15 }]}
                                        onPress={async () => {
                                            await handleFinishExercise();
                                            // mark completed and check if all done
                                            setCompletedExercises(prev => {
                                                const copy = [...prev];
                                                copy[idx] = true;
                                                if (copy.every(Boolean)) {
                                                    setPlaylistMode(false);
                                                }
                                                return copy;
                                            });
                                        }}
                                        disabled={saving}
                                    >
                                        {saving ? <ActivityIndicator color="#FFF" /> : (
                                            <>
                                                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                                <Text style={styles.btnText}>COMPLETE EXERCISE</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                ))}
                {/* Exit playlist button */}
                <TouchableOpacity style={[styles.mainBtn, { backgroundColor: theme.border, marginTop: 20 }]} onPress={() => setPlaylistMode(false)}>
                    <Text style={[styles.btnText, { color: theme.text }]}>EXIT WORKOUT</Text>
                </TouchableOpacity>
            </ScrollView>
        )}
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
  timerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 30, 
    gap: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15
  },
  timerText: { fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
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