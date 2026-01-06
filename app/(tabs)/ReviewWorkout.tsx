import { db } from '@/firebase';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [userGoals, setUserGoals] = useState<any>(null);
    const [filter, setFilter] = useState<'all' | 'strength' | 'cardio'>('all');

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        success: '#34C759',
        gold: '#FFD700',
        goldBg: 'rgba(255, 215, 0, 0.15)'
    };

    useEffect(() => {
        if (!user?.uid) return;

        // 1. Fetch Goals for comparison
        const fetchGoals = async () => {
            try {
                const goalSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
                if (goalSnap.exists()) {
                    setUserGoals(goalSnap.data());
                }
            } catch (err) {
                console.error("Error fetching goals:", err);
            }
        };
        fetchGoals();

        // 2. Real-time Workout Listener
        const q = query(
            collection(db, 'workouts'),
            where('userId', '==', user.uid),
            orderBy('loggedAt', 'desc') 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setWorkouts(data);
                setLoading(false);
                setRefreshing(false);
            } catch (err) {
                console.error("Snapshot error:", err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // TROPHY LOGIC
    const checkAchievement = (workout: any) => {
        if (!userGoals || !workout.activity) return null;

        const targetActivity = userGoals.activity?.toLowerCase().trim();
        const currentActivity = workout.activity?.toLowerCase().trim();

        if (currentActivity === targetActivity) {
            const isDistGoalMet = Number(userGoals.distGoal) > 0 && Number(workout.distance) >= Number(userGoals.distGoal);
            const isTimeGoalMet = Number(userGoals.timeGoal) > 0 && Number(workout.duration) >= Number(userGoals.timeGoal);

            if (isDistGoalMet) return { icon: '🏆', label: 'Goal Met' };
            if (isTimeGoalMet) return { icon: '🏆', label: 'Goal Met' };
        }
        return null;
    };

    // CROSS-PLATFORM DELETE
    const confirmDelete = (workoutId: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to delete this workout?");
            if (confirmed) handleDelete(workoutId);
        } else {
            Alert.alert("Delete Workout", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(workoutId) }
            ]);
        }
    };

    const handleDelete = async (workoutId: string) => {
        try {
            await deleteDoc(doc(db, 'workouts', workoutId));
        } catch (error) {
            Alert.alert("Error", "Could not delete from server.");
        }
    };

    const renderWorkoutItem = ({ item }: { item: any }) => {
        const isTrophy = item.goalMet === true;

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{item.date}</Text>
                    <View style={styles.headerRight}>
                        {isTrophy && (
                            <View style={[styles.achievementBadge, { backgroundColor: theme.goldBg, borderColor: theme.gold }]}>
                                <Text style={styles.achievementText}>🏆 Goal Met</Text>
                            </View>
                        )}
                        <Text style={[styles.badge, { 
                            backgroundColor: item.category === 'strength' ? theme.accent : theme.success 
                        }]}>
                            {item.category?.toUpperCase()}
                        </Text>
                        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn}>
                            <Text style={styles.deleteIcon}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.activityTitle, { color: theme.text }]}>
                    {item.activity}
                </Text>
                
                {item.category === 'strength' && item.focusArea && (
                    <Text style={styles.subTitle}>{item.focusArea}</Text>
                )}

                <View style={styles.statsRow}>
                    {item.category === 'strength' ? (
                        <>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Sets</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.sets}</Text></View>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Reps</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.reps}</Text></View>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Weight</Text><Text style={[styles.statValue, {color: theme.accent}]}>{item.weight}{item.weightUnit}</Text></View>
                        </>
                    ) : (
                        <>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Duration</Text>
                                <Text style={[styles.statValue, {color: theme.success}]}>{item.duration} {item.durationUnit || 'm'}</Text>
                            </View>
                            {Number(item.distance) > 0 && (
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Distance</Text>
                                    <Text style={[styles.statValue, {color: theme.success}]}>{item.distance} km</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </View>
        );
    };

    if (loading) return (
        <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.accent} /></View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.header, { color: theme.text }]}>Progression</Text>

            <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]}>
                {(['all', 'strength', 'cardio'] as const).map((t) => (
                    <TouchableOpacity 
                        key={t}
                        style={[styles.toggleBtn, filter === t && (isDark ? styles.activeToggleDark : styles.activeToggleLight)]}
                        onPress={() => setFilter(t)}
                    >
                        <Text style={[styles.toggleText, filter === t && styles.activeToggleText]}>
                            {t.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={workouts.filter(w => filter === 'all' || w.category === filter)}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor={theme.accent} />}
                ListEmptyComponent={<Text style={styles.emptyText}>No workouts found. Log one to start!</Text>}
                contentContainerStyle={{ paddingBottom: 40 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { fontSize: 34, fontWeight: '900', marginBottom: 20, paddingTop: 20 },
    toggleContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 25 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
    activeToggleLight: { backgroundColor: '#fff', elevation: 4 },
    activeToggleDark: { backgroundColor: '#3a3a3c' },
    toggleText: { fontSize: 12, color: '#8e8e93', fontWeight: '800', letterSpacing: 0.5 },
    activeToggleText: { color: '#007AFF' },
    card: { padding: 22, borderRadius: 26, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 13, color: '#8e8e93', fontWeight: '600' },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, color: '#fff', fontSize: 10, fontWeight: '900', overflow: 'hidden' },
    achievementBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 },
    achievementText: { fontSize: 11, fontWeight: 'bold', color: '#DAA520' },
    deleteBtn: { marginLeft: 15, padding: 5 },
    deleteIcon: { fontSize: 18 },
    activityTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    subTitle: { fontSize: 14, color: '#8e8e93', fontWeight: '600', marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 25, marginTop: 10 },
    statBox: { alignItems: 'flex-start' },
    statLabel: { fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', fontWeight: '800', marginBottom: 3 },
    statValue: { fontWeight: '900', fontSize: 18 },
    emptyText: { textAlign: 'center', color: '#8e8e93', marginTop: 60, fontSize: 16 }
});