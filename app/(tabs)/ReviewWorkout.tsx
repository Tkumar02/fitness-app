import { db } from '@/firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { UserContext } from '../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'strength' | 'cardio'>('all');

    useEffect(() => {
        if (!user?.uid) return;

        // Ensure this matches exactly what is saved in AddWorkout.tsx
        const q = query(
            collection(db, 'workouts'),
            where('userId', '==', user.uid),
            orderBy('loggedAt', 'desc') 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                // Map the data safely
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setWorkouts(data);
                setLoading(false);
                setRefreshing(false);
            } catch (err) {
                console.error("Snapshot processing error:", err);
                setLoading(false);
            }
        }, (error) => {
            console.error("Firestore Listener Error:", error);
            setLoading(false);
            // If you see this Alert, you likely need to click the link in your console 
            // to create the Composite Index for userId + loggedAt.
            Alert.alert("Sync Error", "Could not connect to database. Check your internet or Firestore indexes.");
        });

        return () => unsubscribe();
    }, [user]);

    const confirmDelete = (workoutId: string) => {
        Alert.alert(
            "Delete Workout",
            "Are you sure? This will permanently remove this log.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => handleDelete(workoutId) 
                }
            ]
        );
    };

    const handleDelete = async (workoutId: string) => {
        // OPTIMISTIC UPDATE: 
        // We remove it from the local list immediately so the UI doesn't "freeze"
        const previousWorkouts = [...workouts];
        setWorkouts(prev => prev.filter(w => w.id !== workoutId));

        try {
            await deleteDoc(doc(db, 'workouts', workoutId));
            // Snapshot will handle the final state sync
        } catch (error) {
            console.error("Delete Error:", error);
            // ROLLBACK: If the server fails, put the data back
            setWorkouts(previousWorkouts);
            Alert.alert("Error", "Could not delete from server.");
        }
    };

    const displayedWorkouts = workouts.filter(w => 
        filter === 'all' || w.category === filter
    );

    const renderWorkoutItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{item.date}</Text>
                <View style={styles.headerRight}>
                    <Text style={[styles.badge, { 
                        backgroundColor: item.category === 'strength' ? '#007AFF' : '#34C759' 
                    }]}>
                        {item.category?.toUpperCase()}
                    </Text>
                    <TouchableOpacity 
                        onPress={() => confirmDelete(item.id)} 
                        style={styles.deleteBtn}
                    >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={[styles.activityTitle, { color: isDark ? '#fff' : '#000' }]}>
                {item.activity}
            </Text>
            
            {item.category === 'strength' && item.focusArea && (
                <Text style={styles.subTitle}>{item.focusArea}</Text>
            )}

            <View style={styles.statsRow}>
                {item.category === 'strength' ? (
                    <>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Sets</Text>
                            <Text style={styles.statValue}>{item.sets}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Reps</Text>
                            <Text style={styles.statValue}>{item.reps}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Weight</Text>
                            <Text style={styles.statValue}>{item.weight}{item.weightUnit}</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValue}>{item.duration} {item.durationUnit}</Text>
                        </View>
                        {item.distance > 0 && (
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Distance</Text>
                                <Text style={styles.statValue}>{item.distance} km</Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        </View>
    );

    if (loading) return (
        <View style={[styles.center, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}>
            <Text style={[styles.header, { color: isDark ? '#fff' : '#000' }]}>Progression</Text>

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
                data={displayedWorkouts}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor="#007AFF" />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No workouts found. Try logging one!</Text>
                }
                contentContainerStyle={{ paddingBottom: 40 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { fontSize: 34, fontWeight: '900', marginBottom: 20 },
    toggleContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 25 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
    activeToggleLight: { backgroundColor: '#fff', elevation: 4, shadowOpacity: 0.1 },
    activeToggleDark: { backgroundColor: '#3a3a3c' },
    toggleText: { fontSize: 12, color: '#8e8e93', fontWeight: '800', letterSpacing: 0.5 },
    activeToggleText: { color: '#007AFF' },
    card: { 
        padding: 22, 
        borderRadius: 26, 
        marginBottom: 16, 
        elevation: 4, 
        shadowColor: '#000', 
        shadowOpacity: 0.08, 
        shadowRadius: 12 
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 13, color: '#8e8e93', fontWeight: '600' },
    badge: { 
        paddingHorizontal: 12, 
        paddingVertical: 4, 
        borderRadius: 8, 
        color: '#fff', 
        fontSize: 10, 
        fontWeight: '900', 
        overflow: 'hidden' 
    },
    deleteBtn: { marginLeft: 15, padding: 5 },
    deleteIcon: { fontSize: 18 },
    activityTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    subTitle: { fontSize: 14, color: '#8e8e93', fontWeight: '600', marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 25, marginTop: 10 },
    statBox: { alignItems: 'flex-start' },
    statLabel: { fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', fontWeight: '800', marginBottom: 3 },
    statValue: { color: '#007AFF', fontWeight: '900', fontSize: 18 },
    emptyText: { textAlign: 'center', color: '#8e8e93', marginTop: 60, fontSize: 16 }
});