import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
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
            orderBy('loggedAt', 'desc') 
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
        try { await deleteDoc(doc(db, 'workouts', workoutId)); } 
        catch (error) { Alert.alert("Error", "Could not delete."); }
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
        return matchesCategory && matchesActivity;
    });

    if (loading) return <View style={[styles.center, {backgroundColor: theme.background}]}><ActivityIndicator size="large" color={theme.accent}/></View>;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }} edges={['top']}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.header, { color: theme.text }]}>Progression</Text>

            <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]}>
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
        </View>
    </SafeAreaView>
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '60%' },
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
});