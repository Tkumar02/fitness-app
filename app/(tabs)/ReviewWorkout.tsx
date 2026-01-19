import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import {
    collection, deleteDoc, doc, onSnapshot, orderBy,
    query, serverTimestamp, updateDoc, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, FlatList, Modal, Platform,
    RefreshControl, ScrollView, StyleSheet, Text,
    TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    const webDateRef = useRef<any>(null); // For Web Calendar
    
    // States
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    
    // Filter States
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'strength' | 'cardio'>('all');
    const [selectedActivity, setSelectedActivity] = useState<string>('All Exercises');
    const [activityPickerVisible, setActivityPickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Edit States
    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editSets, setEditSets] = useState('');
    const [editReps, setEditReps] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [editDate, setEditDate] = useState(new Date());
    const [editIntensity, setEditIntensity] = useState('');

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        success: '#34C759',
        gold: '#FFD700',
        goldBg: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.2)',
        danger: '#FF3B30'
    };

    // 1. Sync Data
    useEffect(() => {
        if (!user?.uid) return;
        const unsubGoals = onSnapshot(collection(db, 'users', user.uid, 'activeGoals'), (snap) => {
            setActiveGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const q = query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('date', 'desc'));
        const unsubWorkouts = onSnapshot(q, (snapshot) => {
            setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
            setRefreshing(false);
        });
        return () => { unsubGoals(); unsubWorkouts(); };
    }, [user]);

    // 2. Logic & Helpers
    const calculate1RM = (w: string, r: string) => {
        const weight = Number(w) || 0;
        const reps = Number(r) || 0;
        return reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
    };

    const getRPEColor = (rpe: number) => {
        if (rpe <= 6) return '#34C759';
        if (rpe <= 8) return '#FF9500';
        return '#FF3B30';
    };

    const filteredWorkouts = useMemo(() => {
        return workouts.filter(w => {
            const matchesCat = categoryFilter === 'all' || w.category === categoryFilter;
            const matchesAct = selectedActivity === 'All Exercises' || w.activity === selectedActivity;
            const matchesDate = !selectedDate || w.date === selectedDate.toISOString().split('T')[0];
            return matchesCat && matchesAct && matchesDate;
        });
    }, [workouts, categoryFilter, selectedActivity, selectedDate]);

    const uniqueActivities = useMemo(() => 
        ['All Exercises', ...Array.from(new Set(workouts.map(w => w.activity)))].sort(), 
    [workouts]);

    // 3. Handlers
    const handleDateTrigger = () => {
        if (Platform.OS === 'web') {
            webDateRef.current?.showPicker();
        } else {
            setShowDatePicker(true);
        }
    };

    const handleUpdate = async () => {
        if (!editingWorkout) return;
        try {
            const dateString = editDate.toISOString().split('T')[0];
            await updateDoc(doc(db, 'workouts', editingWorkout.id), {
                date: dateString,
                sets: Number(editSets) || 0,
                reps: Number(editReps) || 0,
                weight: Number(editWeight) || 0,
                duration: Number(editDuration) || 0,
                distance: Number(editDistance) || 0,
                intensity: Number(editIntensity) || 0,
                updatedAt: serverTimestamp()
            });
            setEditModalVisible(false);
        } catch (e) { alert("Update failed"); }
    };

    const handleDelete = async (id: string) => {
        const performDelete = async () => await deleteDoc(doc(db, 'workouts', id));
        if (Platform.OS === 'web') { if (window.confirm("Delete?")) performDelete(); }
        else { Alert.alert("Delete", "Sure?", [{ text: "No" }, { text: "Yes", onPress: performDelete, style: 'destructive' }]); }
    };

    // 4. Render Item
    const renderWorkoutItem = ({ item }: { item: any }) => {
        const c1RM = item.category === 'strength' ? calculate1RM(item.weight, item.reps) : 0;
        const cVol = (Number(item.weight) * Number(item.reps) * Number(item.sets)) || 0;

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.dateText}>{item.date}</Text>
                        {item.intensity && (
                            <View style={[styles.rpeBadge, { backgroundColor: getRPEColor(Number(item.intensity)) + '20' }]}>
                                <Text style={[styles.rpeBadgeText, { color: getRPEColor(Number(item.intensity)) }]}>RPE {item.intensity}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {item.goalMet && <Text style={{marginRight: 10}}>🏆</Text>}
                        <TouchableOpacity onPress={() => {
                            setEditingWorkout(item);
                            setEditSets(item.sets?.toString() || '');
                            setEditReps(item.reps?.toString() || '');
                            setEditWeight(item.weight?.toString() || '');
                            setEditDate(new Date(item.date));
                            setEditModalVisible(true);
                        }}><Ionicons name="create-outline" size={20} color={theme.accent} style={{marginRight: 15}} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={18} color={theme.subtext} /></TouchableOpacity>
                    </View>
                </View>
                <Text style={[styles.activityTitle, { color: theme.text }]}>{item.activity}</Text>
                <View style={styles.statsRow}>
                    {item.category === 'strength' ? (
                        <>
                            <View><Text style={styles.statLabel}>Sets</Text><Text style={[styles.statValue, {color: theme.text}]}>{item.sets}</Text></View>
                            <View><Text style={styles.statLabel}>Reps</Text><Text style={[styles.statValue, {color: theme.text}]}>{item.reps}</Text></View>
                            <View><Text style={styles.statLabel}>Weight</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.weight}kg</Text></View>
                        </>
                    ) : (
                        <>
                            <View><Text style={styles.statLabel}>Min</Text><Text style={[styles.statValue, {color: theme.success}]}>{item.duration}</Text></View>
                            <View><Text style={styles.statLabel}>Km</Text><Text style={[styles.statValue, {color: theme.success}]}>{item.distance}</Text></View>
                        </>
                    )}
                </View>
                {item.category === 'strength' && (
                    <View style={[styles.performanceRow, { borderTopColor: isDark ? '#333' : '#eee' }]}>
                        <Text style={[styles.performanceText, { color: theme.subtext }]}>1RM: <Text style={{color: theme.text}}>{c1RM}kg</Text></Text>
                        <Text style={[styles.performanceText, { color: theme.subtext }]}>Vol: <Text style={{color: theme.text}}>{cVol.toLocaleString()}kg</Text></Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={isDark ? ['#893636', '#1c1c1e', '#121212'] : ['#3e9aa4', '#CFDEF3', '#f9fafb']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.container}>
                    <Text style={[styles.header, { color: theme.text }]}>Progression</Text>

                    {/* HIDDEN WEB INPUT */}
                    {Platform.OS === 'web' && (
                        <input type="date" ref={webDateRef} style={{position:'absolute', opacity:0, zIndex:-1}} onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))} />
                    )}

                    {/* FILTERS */}
                    <View style={styles.toggleContainer}>
                        {(['all', 'strength', 'cardio'] as const).map((t) => (
                            <TouchableOpacity key={t} style={[styles.toggleBtn, categoryFilter === t && (isDark ? styles.activeToggleDark : styles.activeToggleLight)]} onPress={() => setCategoryFilter(t)}>
                                <Text style={[styles.toggleText, categoryFilter === t && styles.activeToggleText]}>{t.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, zIndex: 10 }}>
                        <TouchableOpacity style={[styles.dropdownTrigger, { flex: 1, backgroundColor: theme.card }]} onPress={handleDateTrigger}>
                            <Text style={{color: theme.text, fontWeight: '700'}}>{selectedDate ? selectedDate.toLocaleDateString() : "All Dates"}</Text>
                            <Ionicons name="calendar" size={18} color={theme.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.dropdownTrigger, { flex: 1, backgroundColor: theme.card }]} onPress={() => setActivityPickerVisible(true)}>
                            <Text style={{color: theme.text, fontWeight: '700'}} numberOfLines={1}>{selectedActivity}</Text>
                            <Ionicons name="filter" size={18} color={theme.accent} />
                        </TouchableOpacity>
                    </View>

                    {/* CLEAR BANNER */}
                    {selectedDate && (
                        <TouchableOpacity style={styles.clearBanner} onPress={() => setSelectedDate(null)}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Showing {selectedDate.toLocaleDateString()} • Clear Filter ×</Text>
                        </TouchableOpacity>
                    )}

                    <FlatList
                        data={filteredWorkouts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderWorkoutItem}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
                        contentContainerStyle={{ paddingBottom: 60 }}
                    />
                </View>

                {/* ACTIVITY PICKER */}
                <Modal visible={activityPickerVisible} transparent animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setActivityPickerVisible(false)}>
                        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                            <ScrollView>{uniqueActivities.map(act => (
                                <TouchableOpacity key={act} style={styles.modalItem} onPress={() => { setSelectedActivity(act); setActivityPickerVisible(false); }}>
                                    <Text style={{ color: theme.text, fontSize: 16 }}>{act}</Text>
                                </TouchableOpacity>
                            ))}</ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* MOBILE DATE PICKER */}
                {Platform.OS !== 'web' && showDatePicker && (
                    <DateTimePicker value={selectedDate || new Date()} mode="date" onChange={(e, d) => { setShowDatePicker(false); if(d) setSelectedDate(d); }} />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 32, fontWeight: '900', marginBottom: 15 },
    toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeToggleLight: { backgroundColor: '#fff' },
    activeToggleDark: { backgroundColor: '#3a3a3c' },
    toggleText: { fontSize: 10, fontWeight: '800', color: '#8e8e93' },
    activeToggleText: { color: '#007AFF' },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12 },
    card: { padding: 20, borderRadius: 20, marginBottom: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    dateText: { fontSize: 12, color: '#8e8e93' },
    activityTitle: { fontSize: 18, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
    statLabel: { fontSize: 9, color: '#8e8e93', textTransform: 'uppercase' },
    statValue: { fontSize: 16, fontWeight: '800' },
    performanceRow: { flexDirection: 'row', marginTop: 15, paddingTop: 10, borderTopWidth: 1, gap: 20 },
    performanceText: { fontSize: 12, fontWeight: '600' },
    rpeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
    rpeBadgeText: { fontSize: 10, fontWeight: '800' },
    clearBanner: { backgroundColor: '#007AFF', padding: 12, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalSheet: { width: '80%', borderRadius: 20, padding: 20, maxHeight: '70%' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' }
});