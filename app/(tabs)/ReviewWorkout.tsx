import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import {
    collection, deleteDoc, doc, onSnapshot, orderBy,
    query, serverTimestamp, updateDoc, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal, Platform,
    RefreshControl, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    
    // Updated: Now stores an array of specific goals from the activeGoals collection
    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'strength' | 'cardio'>('all');
    const [selectedActivity, setSelectedActivity] = useState<string>('All Exercises');
    const [activityPickerVisible, setActivityPickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [editSets, setEditSets] = useState('');
    const [editReps, setEditReps] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [editDate, setEditDate] = useState(new Date());
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [editIntensity, setEditIntensity] = useState('');

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        gold: '#FFD700',
        goldBg: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.2)'
    };

    const calculate1RM = (w: string, r: string) => {
    const weight = Number(w) || 0;
    const reps = Number(r) || 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
};

    // 1. SYNC GOALS AND WORKOUTS
    useEffect(() => {
        if (!user?.uid) return;

        // Listen to Active Goals collection (Matches your Goals Page)
        const unsubGoals = onSnapshot(collection(db, 'users', user.uid, 'activeGoals'), (snap) => {
            setActiveGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const q = query(
            collection(db, 'workouts'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc') 
        );

        const unsubWorkouts = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWorkouts(data);
            setLoading(false);
            setRefreshing(false);
        });

        return () => {
            unsubGoals();
            unsubWorkouts();
        };
    }, [user]);

    // 2. START EDIT LOGIC
    const startEdit = (workout: any) => {
        setEditingWorkout(workout);
        if (workout.date) {
            const [year, month, day] = workout.date.split('-').map(Number);
            setEditDate(new Date(year, month - 1, day)); 
        } else {
            setEditDate(new Date());
        }
        setEditSets(workout.sets?.toString() || '');
        setEditReps(workout.reps?.toString() || '');
        setEditWeight(workout.weight?.toString() || '');
        setEditDuration(workout.duration?.toString() || '');
        setEditDistance(workout.distance?.toString() || '');
        setEditModalVisible(true);
        setEditIntensity(workout.intensity?.toString() || '');
    };

    // 3. HANDLE UPDATE WITH MULTI-METRIC GOAL CHECK
const handleUpdate = async () => {
    if (!editingWorkout) return;

    try {
        const workoutRef = doc(db, 'workouts', editingWorkout.id);
        const dateString = editDate.toISOString().split('T')[0];
        
        const vSets = Number(editSets) || 0;
        const vReps = Number(editReps) || 0;
        const vWeight = Number(editWeight) || 0;
        const vDuration = Number(editDuration) || 0;
        const vDistance = Number(editDistance) || 0;

        // 1. Find the specific goal for this activity
        const specificGoal = activeGoals.find(g => g.activity === editingWorkout.activity);
        let stillGoalMet = false;

        if (specificGoal) {
            if (editingWorkout.category === 'strength') {
                // MATH: Calculate current workout performance
                const current1RM = vWeight * (1 + vReps / 30);
                const currentVolume = vWeight * vReps * vSets;

                // CHECK: Did we hit the Weight target OR the 1RM target OR the Volume target?
                // You can adjust this to require all 3 by using && instead of ||
                stillGoalMet = vWeight >= (specificGoal.loadGoal || 0) || 
                               current1RM >= (specificGoal.target1RM || 0) ||
                               currentVolume >= (specificGoal.targetVolume || 0);
            } else {
                // CARDIO LOGIC
                if (specificGoal.cardioMode === 'performance') {
                    // PERFORMANCE: Must hit distance AND be UNDER or equal to the time limit
                    stillGoalMet = vDistance >= (specificGoal.distGoal || 0) && 
                                   vDuration <= (specificGoal.timeGoal || 0) &&
                                   vDuration > 0;
                } else {
                    // ENDURANCE: Hit the distance OR the duration
                    stillGoalMet = (vDistance >= (specificGoal.distGoal || 0) && specificGoal.distGoal > 0) || 
                                   (vDuration >= (specificGoal.timeGoal || 0) && specificGoal.timeGoal > 0);
                }
            }
        }

        // 2. Save to Firestore
        await updateDoc(workoutRef, {
            date: dateString,
            sets: vSets,
            reps: vReps,
            weight: vWeight,
            duration: vDuration,
            distance: vDistance,
            goalMet: stillGoalMet, 
            updatedAt: serverTimestamp(),
            intensity: Number(editIntensity)
        });

        setEditModalVisible(false);
        setEditingWorkout(null);
    } catch (error) {
        if (Platform.OS === 'web') alert("Update failed");
        else Alert.alert("Error", "Could not update workout.");
    }
};

    const handleDelete = async (workoutId: string) => {
        const performDelete = async () => {
            try {
                await deleteDoc(doc(db, 'workouts', workoutId));
            } catch (error) {
                if (Platform.OS === 'web') alert("Could not delete.");
                else Alert.alert("Error", "Could not delete.");
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Delete this workout?")) performDelete();
        } else {
            Alert.alert("Delete", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: performDelete }
            ]);
        }
    };

const renderWorkoutItem = ({ item }: { item: any }) => {
    const current1RM = item.category === 'strength' 
        ? Math.round(Number(item.weight) * (1 + Number(item.reps) / 30)) 
        : 0;
    const currentVolume = (Number(item.weight) * Number(item.reps) * Number(item.sets)) || 0;
    
    // Determine RPE color (Green for easy, Orange for hard, Red for max)
    const getRPEColor = (rpe: number) => {
        if (rpe <= 6) return '#34C759';
        if (rpe <= 8) return '#FF9500';
        return '#FF3B30';
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.dateText}>{item.date}</Text>
                    {item.intensity && (
                        <View style={[styles.rpeBadge, { backgroundColor: getRPEColor(Number(item.intensity)) + '20' }]}>
                            <Text style={[styles.rpeBadgeText, { color: getRPEColor(Number(item.intensity)) }]}>
                                RPE {item.intensity}
                            </Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.headerRight}>
                    {item.goalMet && (
                        <View style={[styles.achievementBadge, { backgroundColor: theme.goldBg, borderColor: theme.gold }]}>
                            <Text style={styles.achievementText}>🏆</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => startEdit(item)} style={{ marginRight: 15 }}>
                        <Ionicons name="create-outline" size={20} color={theme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={theme.subtext} />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={[styles.activityTitle, { color: theme.text }]}>{item.activity}</Text>
            
            {/* Main Stats Row */}
            <View style={styles.statsRow}>
                {item.category === 'strength' ? (
                    <>
                        <View style={styles.statBox}><Text style={styles.statLabel}>Sets</Text><Text style={[styles.statValue, {color: theme.text}]}>{item.sets}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statLabel}>Reps</Text><Text style={[styles.statValue, {color: theme.text}]}>{item.reps}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statLabel}>Weight</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.weight}kg</Text></View>
                    </>
                ) : (
                    <>
                        <View style={styles.statBox}><Text style={styles.statLabel}>Min</Text><Text style={[styles.statValue, {color: theme.success}]}>{item.duration}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statLabel}>Km</Text><Text style={[styles.statValue, {color: theme.success}]}>{item.distance}</Text></View>
                    </>
                )}
            </View>

            {/* Performance Insights (1RM & Volume) */}
            {item.category === 'strength' && (
                <View style={[styles.performanceRow, { borderTopColor: isDark ? '#333' : '#eee' }]}>
                    <View style={styles.performanceItem}>
                        <Ionicons name="flash" size={12} color={theme.gold} />
                        <Text style={[styles.performanceText, { color: theme.subtext }]}>
                            1RM: <Text style={{color: theme.text}}>{current1RM}kg</Text>
                        </Text>
                    </View>
                    <View style={styles.performanceItem}>
                        <Ionicons name="barbell" size={12} color={theme.accent} />
                        <Text style={[styles.performanceText, { color: theme.subtext }]}>
                            Vol: <Text style={{color: theme.text}}>{currentVolume.toLocaleString()}kg</Text>
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
};

    const filteredWorkouts = workouts.filter(w => {
        const matchesCategory = categoryFilter === 'all' || w.category === categoryFilter;
        const matchesActivity = selectedActivity === 'All Exercises' || w.activity === selectedActivity;
        const matchesDate = !selectedDate || w.date === selectedDate.toISOString().split('T')[0];
        return matchesCategory && matchesActivity && matchesDate;
    });

    const uniqueActivities = ['All Exercises', ...Array.from(new Set(workouts.map(w => w.activity)))];

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.accent}/></View>;

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient 
                colors={isDark ? ['#893636ff', '#1c1c1e', '#2c3e50'] : ['#3e9aa4ff', '#CFDEF3']} 
                style={StyleSheet.absoluteFill} 
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.container}>
                    <Text style={[styles.header, { color: theme.text }]}>Progression</Text>

                    {/* FILTER TOGGLES */}
                    <View style={styles.toggleContainer}>
                        {(['all', 'strength', 'cardio'] as const).map((t) => (
                            <TouchableOpacity 
                                key={t}
                                style={[styles.toggleBtn, categoryFilter === t && (isDark ? styles.activeToggleDark : styles.activeToggleLight)]}
                                onPress={() => { setCategoryFilter(t); setSelectedActivity('All Exercises'); }}
                            >
                                <Text style={[styles.toggleText, categoryFilter === t && styles.activeToggleText]}>{t.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* DATE & EXERCISE DROPDOWNS */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        <TouchableOpacity style={[styles.dropdownTrigger, { flex: 1, backgroundColor: theme.card }]} onPress={() => setShowDatePicker(true)}>
                            <Text style={{color: theme.text, fontWeight: '700'}}>{selectedDate ? selectedDate.toLocaleDateString() : "All Dates"}</Text>
                            <Ionicons name="calendar" size={18} color={theme.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.dropdownTrigger, { flex: 1, backgroundColor: theme.card }]} onPress={() => setActivityPickerVisible(true)}>
                            <Text style={{color: theme.text, fontWeight: '700'}} numberOfLines={1}>{selectedActivity}</Text>
                            <Ionicons name="filter" size={18} color={theme.accent} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredWorkouts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderWorkoutItem}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />

                    {/* ACTIVITY PICKER MODAL */}
                    <Modal visible={activityPickerVisible} transparent animationType="slide">
                        <View style={styles.modalOverlay}>
                            <TouchableOpacity style={{flex: 1}} onPress={() => setActivityPickerVisible(false)} />
                            <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                                <ScrollView>
                                    {uniqueActivities.map((act) => (
                                        <TouchableOpacity key={act} style={styles.modalItem} onPress={() => { setSelectedActivity(act); setActivityPickerVisible(false); }}>
                                            <Text style={[styles.modalItemText, { color: theme.text }]}>{act}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

                    {/* EDIT WORKOUT MODAL */}
<Modal visible={editModalVisible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit {editingWorkout?.activity}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* 1RM / Volume Live Preview (Strength Only) */}
                {editingWorkout?.category === 'strength' && (
                    <View style={{ backgroundColor: theme.goldBg, padding: 12, borderRadius: 12, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: theme.gold }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: theme.subtext, fontWeight: 'bold' }}>EST. 1RM</Text>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>{calculate1RM(editWeight, editReps)}kg</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: theme.subtext, fontWeight: 'bold' }}>TOTAL VOLUME</Text>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>{(Number(editWeight) * Number(editReps) * Number(editSets)) || 0}kg</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.inputLabel}>Workout Date</Text>
                <TouchableOpacity 
                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', borderColor: theme.subtext }]} 
                    onPress={() => setShowEditDatePicker(true)}
                >
                    <Text style={{ color: theme.text }}>{editDate.toLocaleDateString()}</Text>
                    <Ionicons name="calendar-outline" size={20} color={theme.accent} />
                </TouchableOpacity>

                {editingWorkout?.category === 'strength' ? (
                    <>
                        <Text style={styles.inputLabel}>Sets</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subtext }]} value={editSets} onChangeText={setEditSets} keyboardType="numeric" />
                        <Text style={styles.inputLabel}>Reps</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subtext }]} value={editReps} onChangeText={setEditReps} keyboardType="numeric" />
                        <Text style={styles.inputLabel}>Weight (kg)</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subtext }]} value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" />
                    </>
                ) : (
                    <>
                        <Text style={styles.inputLabel}>Duration (min)</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subtext }]} value={editDuration} onChangeText={setEditDuration} keyboardType="numeric" />
                        <Text style={styles.inputLabel}>Distance (km)</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subtext }]} value={editDistance} onChangeText={setEditDistance} keyboardType="numeric" />
                    </>
                )}

                <Text style={styles.inputLabel}>Intensity (RPE 1-10)</Text>
<Text style={styles.inputLabel}>Intensity (RPE 1-10)</Text>
<TextInput 
    style={[styles.input, { color: theme.text, borderColor: theme.subtext }]} 
    value={editIntensity} 
    keyboardType="number-pad" // Shows only the number pad on mobile
    placeholder="1-10"
    placeholderTextColor={theme.subtext}
    onChangeText={(text) => {
        // 1. Remove anything that isn't a number
        const numericValue = text.replace(/[^0-9]/g, '');
        
        // 2. Convert to number to check range
        const num = Number(numericValue);
        
        if (num > 10) {
            setEditIntensity('10'); // Cap at 10
        } else if (numericValue === '0') {
            setEditIntensity('1');  // Floor at 1 (optional, adjust if you allow 0)
        } else {
            setEditIntensity(numericValue);
        }
    }} 
/>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleUpdate}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ padding: 15 }}>
                    <Text style={{ textAlign: 'center', color: theme.danger }}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    </View>

    {showEditDatePicker && (
        <DateTimePicker
            value={editDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
                setShowEditDatePicker(false);
                if (date) setEditDate(date);
            }}
        />
    )}
</Modal>

                    {showDatePicker && (
                        <DateTimePicker value={selectedDate || new Date()} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }} />
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { fontSize: 34, fontWeight: '900', marginBottom: 15, paddingTop: 10 },
    toggleContainer: { flexDirection: 'row', padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
    activeToggleLight: { backgroundColor: '#fff' },
    activeToggleDark: { backgroundColor: '#3a3a3c' },
    toggleText: { fontSize: 11, color: '#8e8e93', fontWeight: '800' },
    activeToggleText: { color: '#007AFF' },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginBottom: 10 },
    card: { padding: 20, borderRadius: 22, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 12, color: '#8e8e93' },
    activityTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 20 },
    statBox: { alignItems: 'flex-start' },
    statLabel: { fontSize: 9, color: '#8e8e93', textTransform: 'uppercase' },
    statValue: { fontWeight: '900', fontSize: 16 },
    achievementBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 },
    achievementText: { fontSize: 11, fontWeight: 'bold', color: '#DAA520' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalTitle: { 
        fontSize: 18, 
        fontWeight: '800', 
        marginBottom: 15, 
        textAlign: 'center' 
    },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    modalItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
    modalItemText: { fontSize: 16 },
    inputLabel: { fontSize: 12, fontWeight: '800', color: '#8e8e93', marginTop: 15, marginBottom: 5 },
    input: { padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1 },
    saveButton: { padding: 18, borderRadius: 16, marginTop: 30, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: '900' },
    performanceRow: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 15
    },
    performanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    performanceText: {
        fontSize: 12,
        fontWeight: '600'
    },
    rpeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 10,
    },
    rpeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
});