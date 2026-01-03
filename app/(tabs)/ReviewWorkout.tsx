import { db } from '@/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    const [loading, setLoading] = useState(true);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'strength' | 'cardio'>('all');

    useEffect(() => {
        if (!user?.uid) return;

        // Base Query
        let q = query(
            collection(db, 'workouts'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        // Listen for real-time updates
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWorkouts(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Filter logic
    const displayedWorkouts = workouts.filter(w => filter === 'all' || w.category === filter);

    const renderWorkoutItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{item.date}</Text>
                <Text style={[styles.badge, { backgroundColor: item.category === 'strength' ? '#5856D6' : '#FF9500' }]}>
                    {item.category.toUpperCase()}
                </Text>
            </View>

            <Text style={[styles.activityTitle, { color: isDark ? '#fff' : '#000' }]}>
                {item.category === 'strength' ? item.equipment : item.activity}
            </Text>

            {item.category === 'strength' ? (
                <View style={styles.statsRow}>
                    <Text style={styles.statLabel}>Sets: <Text style={styles.statValue}>{item.sets}</Text></Text>
                    <Text style={styles.statLabel}>Reps: <Text style={styles.statValue}>{item.reps}</Text></Text>
                    <Text style={styles.statLabel}>Weight: <Text style={styles.statValue}>{item.weight}{item.weightUnit}</Text></Text>
                </View>
            ) : (
                <View style={styles.statsRow}>
                    <Text style={styles.statLabel}>Duration: <Text style={styles.statValue}>{item.duration} {item.durationUnit}</Text></Text>
                </View>
            )}
        </View>
    );

    if (loading) return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}>
            <Text style={[styles.header, { color: isDark ? '#fff' : '#000' }]}>Progression</Text>

            {/* Toggle Filter */}
            <View style={styles.toggleContainer}>
                {(['all', 'strength', 'cardio'] as const).map((t) => (
                    <TouchableOpacity 
                        key={t}
                        style={[styles.toggleBtn, filter === t && styles.activeToggle]}
                        onPress={() => setFilter(t)}
                    >
                        <Text style={[styles.toggleText, filter === t && styles.activeToggleText]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={displayedWorkouts}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutItem}
                ListEmptyComponent={<Text style={styles.emptyText}>No workouts found for this category.</Text>}
                contentContainerStyle={{ paddingBottom: 40 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    activeToggle: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    toggleText: { fontSize: 14, color: '#8e8e93', fontWeight: '600' },
    activeToggleText: { color: '#000' },
    card: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dateText: { fontSize: 12, color: '#8e8e93', fontWeight: '500' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', color: '#fff', fontSize: 10, fontWeight: 'bold' },
    activityTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    statLabel: { fontSize: 14, color: '#8e8e93', marginRight: 15 },
    statValue: { color: '#007AFF', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#8e8e93', marginTop: 50 }
});