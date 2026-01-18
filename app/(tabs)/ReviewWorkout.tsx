import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [userGoals, setUserGoals] = useState<any>(null);
    
    // FILTERS
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'strength' | 'cardio'>('all');
    const [selectedActivity, setSelectedActivity] = useState<string>('All Exercises');
    const [activityPickerVisible, setActivityPickerVisible] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [editingWorkout, setEditingWorkout] = useState<any>(null); // Stores the workout being edited
const [editModalVisible, setEditModalVisible] = useState(false);

// Temporary state for the edit form fields
const [editSets, setEditSets] = useState('');
const [editReps, setEditReps] = useState('');
const [editWeight, setEditWeight] = useState('');
const [editDuration, setEditDuration] = useState('');
const [editDistance, setEditDistance] = useState('');
const [editDate, setEditDate] = useState(new Date());
const [showEditDatePicker, setShowEditDatePicker] = useState(false);

const startEdit = (workout: any) => {
    setEditingWorkout(workout);
    
    // Convert string "YYYY-MM-DD" to a Date object safely for the picker
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
};

const handleUpdate = async () => {
    if (!editingWorkout || !userGoals) return;

    try {
        const workoutRef = doc(db, 'workouts', editingWorkout.id);
        
        // --- NEW: Prepare the Date String ---
        const dateString = editDate.toISOString().split('T')[0];
        
        // 1. Prepare the updated values (YOUR ORIGINAL LOGIC)
        const updatedSets = Number(editSets) || 0;
        const updatedReps = Number(editReps) || 0;
        const updatedWeight = Number(editWeight) || 0;
        const updatedDuration = Number(editDuration) || 0;
        const updatedDistance = Number(editDistance) || 0;

        // 2. Recalculate if Goal is still met (YOUR ORIGINAL LOGIC)
        let stillGoalMet = false;
        if (editingWorkout.category === 'strength') {
            stillGoalMet = updatedWeight >= (userGoals.strengthWeight || 0);
        } else {
            stillGoalMet = updatedDuration >= (userGoals.cardioDuration || 0);
        }

        // 3. Update Firestore (NOW INCLUDING DATE)
        await updateDoc(workoutRef, {
            date: dateString, // <--- ADDED THIS
            sets: updatedSets,
            reps: updatedReps,
            weight: updatedWeight,
            duration: updatedDuration,
            distance: updatedDistance,
            goalMet: stillGoalMet, 
            updatedAt: serverTimestamp(),
        });

        // 4. Close Modal
        setEditModalVisible(false);
        setEditingWorkout(null);
        
    } catch (error) {
        // YOUR ORIGINAL ERROR HANDLING
        if (Platform.OS === 'web') alert("Update failed");
        else Alert.alert("Error", "Could not update workout.");
    }
};

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

    useEffect(() => {
        if (!user?.uid) return;

        // Fetch User Goals for comparison
        const fetchGoals = async () => {
            try {
                const goalSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
                if (goalSnap.exists()) setUserGoals(goalSnap.data());
            } catch (err) { console.error("Error fetching goals:", err); }
        };
        fetchGoals();

        const q = query(
            collection(db, 'workouts'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc') 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWorkouts(data);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsubscribe();
    }, [user]);

    const uniqueActivities = [
        'All Exercises',
        ...Array.from(new Set(workouts
            .filter(w => categoryFilter === 'all' || w.category === categoryFilter)
            .map(w => w.activity)))
    ];

    const getIntensityColor = (val: number) => {
        if (val >= 8) return theme.danger;
        if (val >= 5) return theme.warning;
        return theme.success;
    };

    const handleDelete = async (workoutId: string) => {
    const performDelete = async () => {
        try {
            await deleteDoc(doc(db, 'workouts', workoutId));
        } catch (error) {
            console.error("Delete error:", error);
            // Use basic alert for web, native Alert for mobile
            if (Platform.OS === 'web') {
                alert("Could not delete.");
            } else {
                Alert.alert("Error", "Could not delete.");
            }
        }
    };

    // Platform-specific confirmation
    if (Platform.OS === 'web') {
        if (window.confirm("Are you sure you want to delete this workout?")) {
            performDelete();
        }
    } else {
        Alert.alert(
            "Delete Workout",
            "Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: performDelete }
            ]
        );
    }
};

    const renderWorkoutItem = ({ item }: { item: any }) => {
        // PRESERVED: Goal Met Logic
        const isGoalMet = item.goalMet === true;

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{item.date}</Text>
                    <View style={styles.headerRight}>
                        {/* RESTORED: Trophy Badge */}
                        {isGoalMet && (
                            <View style={[styles.achievementBadge, { backgroundColor: theme.goldBg, borderColor: theme.gold }]}>
                                <Text style={styles.achievementText}>🏆 Goal Met</Text>
                            </View>
                        )}
                        
                        {item.intensity && (
                            <View style={[styles.intensityBadge, { borderColor: getIntensityColor(item.intensity) }]}>
                                <Text style={[styles.intensityText, { color: getIntensityColor(item.intensity) }]}>
                                    RPE {item.intensity}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity onPress={() => startEdit(item)} style={[styles.deleteBtn, { marginRight: 10 }]}>
        <Ionicons name="create-outline" size={20} color={theme.accent} />
    </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={18} color={theme.subtext} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.activityTitle, { color: theme.text }]}>{item.activity}</Text>
                
                <View style={styles.statsRow}>
                    {item.category === 'strength' ? (
                        <>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Sets</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.sets}</Text></View>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Reps</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.reps}</Text></View>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Weight</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.weight}kg</Text></View>
                        </>
                    ) : (
                        <>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Min</Text><Text style={[styles.statValue, {color: theme.success}]}>{item.duration}</Text></View>
                            {Number(item.distance) > 0 && (
                                <View style={styles.statBox}><Text style={styles.statLabel}>Km</Text><Text style={[styles.statValue, {color: theme.success}]}>{item.distance}</Text></View>
                            )}
                        </>
                    )}
                </View>
            </View>
        );
    };

const filteredWorkouts = workouts.filter(w => {
    const matchesCategory = categoryFilter === 'all' || w.category === categoryFilter;
    const matchesActivity = selectedActivity === 'All Exercises' || w.activity === selectedActivity;
    
    // Updated Date Logic
    if (!selectedDate) {
        return matchesCategory && matchesActivity; // Show all dates
    }

    const workoutDate = w.date; 
    const filterDate = selectedDate.toISOString().split('T')[0];
    const matchesDate = workoutDate === filterDate;

    return matchesCategory && matchesActivity && matchesDate;
});

    if (loading) return <View style={[styles.center, {backgroundColor: theme.background}]}><ActivityIndicator size="large" color={theme.accent}/></View>;

    return (
        <View style={{ flex: 1 }}>
        <LinearGradient
            // Colors: A deep navy to a dark slate (looks great with your dark theme)
            colors={isDark 
        ? ['#893636ff', '#1c1c1e', '#2c3e50'] // Dark: Charcoal to Deep Navy
        : ['#3e9aa4ff', '#CFDEF3']            // Light: Soft Sky Blue to Powder Blue
    }
            style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.container]}>
            <Text style={[styles.header, { color: theme.text }]}>Progression</Text>

            <View style={[styles.toggleContainer]}>
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

<View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
    <TouchableOpacity 
        style={[styles.dropdownTrigger, { flex: 1, marginBottom: 0, backgroundColor: theme.card }]} 
        onPress={() => setShowDatePicker(true)}
    >
        <Text style={{color: theme.text, fontWeight: '700'}}>
            {selectedDate 
                ? `📅 ${selectedDate.toLocaleDateString()}` 
                : "📅 All Dates"}
        </Text>
        <Ionicons name="calendar" size={18} color={theme.accent} />
    </TouchableOpacity>

    {/* The "Clear" Button - only show if a date is selected */}
    {selectedDate && (
        <TouchableOpacity 
            style={[styles.dropdownTrigger, { paddingHorizontal: 15, marginBottom: 0, backgroundColor: theme.card }]}
            onPress={() => setSelectedDate(null)} 
        >
            <Ionicons name="close-circle" size={18} color={theme.danger} />
        </TouchableOpacity>
    )}
</View>

{showDatePicker && (
    Platform.OS === 'web' ? (
        // WEB VERSION: Using native HTML5 date input
        <View style={[styles.card, { marginTop: 10, padding: 10 }]}>
            <Text style={{ color: theme.text, marginBottom: 8 }}>Pick a Date:</Text>
            <input 
                type="date" 
                // Convert Date object to YYYY-MM-DD for the input
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : null;
                    setSelectedDate(newDate);
                    setShowDatePicker(false);
                }}
                style={{
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${theme.accent}`,
                    backgroundColor: theme.card,
                    color: theme.text,
                    fontSize: '16px',
                    width: '100%'
                }}
            />
            <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={{ marginTop: 10, alignItems: 'center' }}
            >
                <Text style={{ color: theme.danger }}>Cancel</Text>
            </TouchableOpacity>
        </View>
    ) : (
        // MOBILE VERSION: Using the library you installed
        <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date?: Date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
            }}
        />
    )
)}
            

            <TouchableOpacity 
                style={[styles.dropdownTrigger, {backgroundColor: theme.card}]} 
                onPress={() => setActivityPickerVisible(true)}
            >
                <Text style={{color: theme.text, fontWeight: '700'}}>{selectedActivity}</Text>
                <Ionicons name="filter" size={18} color={theme.accent} />
            </TouchableOpacity>

            <FlatList
                data={filteredWorkouts}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
                ListEmptyComponent={<Text style={styles.emptyText}>No results found.</Text>}
                contentContainerStyle={{ paddingBottom: 40 }}
            />

            <Modal visible={activityPickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setActivityPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, {color: theme.text}]}>Filter by Exercise</Text>
                        <ScrollView>
                            {uniqueActivities.map((act) => (
                                <TouchableOpacity 
                                    key={act} 
                                    style={styles.modalItem} 
                                    onPress={() => { setSelectedActivity(act); setActivityPickerVisible(false); }}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text, fontWeight: selectedActivity === act ? 'bold' : '400' }]}>{act}</Text>
                                    {selectedActivity === act && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

<Modal visible={editModalVisible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Workout</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Workout Date</Text>
                <TouchableOpacity 
                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }]} 
                    onPress={() => setShowEditDatePicker(true)}
                >
                    <Text style={{ color: theme.text }}>{editDate.toLocaleDateString()}</Text>
                    <Ionicons name="calendar-outline" size={20} color={theme.accent} />
                </TouchableOpacity>

                {editingWorkout?.category === 'strength' ? (
                    <>
                        <Text style={styles.inputLabel}>Sets</Text>
                        <TextInput style={[styles.input, { color: theme.text }]} value={editSets} onChangeText={setEditSets} keyboardType="numeric" />
                        <Text style={styles.inputLabel}>Reps</Text>
                        <TextInput style={[styles.input, { color: theme.text }]} value={editReps} onChangeText={setEditReps} keyboardType="numeric" />
                        <Text style={styles.inputLabel}>Weight (kg)</Text>
                        <TextInput style={[styles.input, { color: theme.text }]} value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" />
                    </>
                ) : (
                    <>
                        <Text style={styles.inputLabel}>Duration (min)</Text>
                        <TextInput style={[styles.input, { color: theme.text }]} value={editDuration} onChangeText={setEditDuration} keyboardType="numeric" />
                        <Text style={styles.inputLabel}>Distance (km)</Text>
                        <TextInput style={[styles.input, { color: theme.text }]} value={editDistance} onChangeText={setEditDistance} keyboardType="numeric" />
                    </>
                )}

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

        </View>
    </SafeAreaView>
    </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { fontSize: 34, fontWeight: '900', marginBottom: 15, paddingTop: 20 },
    toggleContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
    activeToggleLight: { backgroundColor: '#fff', elevation: 2 },
    activeToggleDark: { backgroundColor: '#3a3a3c' },
    toggleText: { fontSize: 11, color: '#8e8e93', fontWeight: '800' },
    activeToggleText: { color: '#007AFF' },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 2 },
    card: { padding: 20, borderRadius: 22, marginBottom: 16, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 12, color: '#8e8e93', fontWeight: '600' },
    intensityBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 10 },
    intensityText: { fontSize: 10, fontWeight: '900' },
    deleteBtn: { padding: 4 },
    activityTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 20 },
    statBox: { alignItems: 'flex-start' },
    statLabel: { fontSize: 9, color: '#8e8e93', textTransform: 'uppercase', fontWeight: '800', marginBottom: 2 },
    statValue: { fontWeight: '900', fontSize: 16 },
    emptyText: { textAlign: 'center', color: '#8e8e93', marginTop: 40 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
    modalItemText: { fontSize: 16 },
    achievementBadge: { 
        borderWidth: 1, 
        borderRadius: 8, 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        marginRight: 10 
    },
    achievementText: { 
        fontSize: 11, 
        fontWeight: 'bold', 
        color: '#DAA520' 
    },
    // EDIT MODAL STYLES
    inputLabel: { 
        fontSize: 12, 
        fontWeight: '800', 
        color: '#8e8e93', 
        marginTop: 15, 
        marginBottom: 5, 
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    input: { 
    padding: 15, 
    borderRadius: 12, 
    fontSize: 16,
    borderWidth: 1,
    },
    saveButton: { 
        padding: 18, 
        borderRadius: 16, 
        marginTop: 30, 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5
    },
    saveButtonText: { 
        color: '#fff', 
        fontWeight: '900', 
        fontSize: 16, 
        textTransform: 'uppercase' 
    },
    // Ensure modalOverlay and modalSheet are defined correctly
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)', // Dim the background
        justifyContent: 'flex-end' 
    },
    modalSheet: { 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        padding: 25, 
        paddingBottom: Platform.OS === 'ios' ? 40 : 25, // Extra space for iPhone home bar
    },
});