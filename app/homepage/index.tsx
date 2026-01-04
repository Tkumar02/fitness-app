import { auth, db } from '@/firebase';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DimensionValue,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { UserContext } from '../context/UserContext';

export default function HomePage() {
    const { user, setUser } = useContext(UserContext);
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Stats states
    const [strengthStats, setStrengthStats] = useState({ current: 0, target: 0 });
    const [cardioStats, setCardioStats] = useState({ current: 0, target: 0 });
    const [activityGoal, setActivityGoal] = useState({
        name: 'Activity',
        distCurrent: 0,
        distTarget: 0,
        timeCurrent: 0,
        timeTarget: 0
    });

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Fetch User Info
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                setUsername(userSnap.data()?.username || 'User');

                // 2. Fetch Goals from the new location: users/UID/settings/goals
                const goalSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
                const goals = goalSnap.exists() ? goalSnap.data() : {};

                // 3. Fetch Workouts from last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const q = query(
                    collection(db, 'workouts'),
                    where('userId', '==', user.uid),
                    where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
                );
                
                const querySnapshot = await getDocs(q);
                const workouts = querySnapshot.docs.map(d => d.data());
                
                const sevenDaysAgo = new Date().toISOString().split('T')[0];
                const recentWorkouts = workouts.filter(w => w.date >= sevenDaysAgo);

                // 4. Calculate Frequency
                setStrengthStats({ 
                    current: recentWorkouts.filter(w => w.category === 'strength').length, 
                    target: Number(goals.strengthTarget) || 0 
                });
                setCardioStats({ 
                    current: recentWorkouts.filter(w => w.category === 'cardio').length, 
                    target: Number(goals.cardioTarget) || 0
                });

                // 5. Calculate Distance/Time for the specific activity
                const targetActivity = goals.activity || 'Run';
                const matchingWorkouts = workouts.filter(w => 
                    w.activity?.toLowerCase() === targetActivity.toLowerCase() ||
                    w.equipment?.toLowerCase() === targetActivity.toLowerCase()
                );

                const distances = matchingWorkouts.map(w => Number(w.distance) || 0);
                const durations = matchingWorkouts.map(w => Number(w.duration) || 0);

                setActivityGoal({
                    name: targetActivity,
                    distCurrent: distances.length > 0 ? Math.max(...distances) : 0,
                    distTarget: Number(goals.distGoal) || 0,
                    timeCurrent: durations.length > 0 ? Math.max(...durations) : 0,
                    timeTarget: Number(goals.timeGoal) || 0
                });

            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            if (setUser) setUser(null); // Clears the context to prevent "last user" data leak
            router.replace('/'); 
        } catch (error) {
            Alert.alert("Error", "Could not sign you out.");
        }
    };

    const getWidth = (current: number, target: number): DimensionValue => {
        if (!target || target === 0) return '0%';
        return `${Math.min((current / target) * 100, 100)}%` as DimensionValue;
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
    }

    return (
        <ImageBackground source={require('../../assets/images/bg-weights.png')} style={styles.background}>
            <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)' }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <View>
                                <Text style={[styles.welcome, { color: isDark ? '#ccc' : '#666' }]}>Welcome back,</Text>
                                <Text style={[styles.user, { color: isDark ? '#fff' : '#000' }]}>{username} 👋</Text>
                            </View>
                            <TouchableOpacity style={styles.settingsIcon} onPress={() => router.push('/Profile')}>
                                <Text style={{fontSize: 24}}>⚙️</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.statsContainer}>
                            {/* Strength Frequency Bar */}
                            {strengthStats.target > 0 && (
                                <View style={styles.progressSection}>
                                    <View style={styles.labelRow}>
                                        <Text style={[styles.barLabel, {color: isDark ? '#fff' : '#000'}]}>Lifting Weekly</Text>
                                        <Text style={[styles.barValue, {color: isDark ? '#aaa' : '#666'}]}>{strengthStats.current}/{strengthStats.target}</Text>
                                    </View>
                                    <View style={[styles.barTrack, {backgroundColor: isDark ? '#333' : '#e0e0e0'}]}>
                                        <View style={[styles.barFill, {width: getWidth(strengthStats.current, strengthStats.target), backgroundColor: '#007AFF'}]} />
                                    </View>
                                </View>
                            )}

                            {/* Distance Goal Bar */}
                            {activityGoal.distTarget > 0 && (
                                <View style={styles.progressSection}>
                                    <View style={styles.labelRow}>
                                        <Text style={[styles.barLabel, {color: isDark ? '#fff' : '#000'}]}>{activityGoal.name} (Dist)</Text>
                                        <Text style={[styles.barValue, {color: isDark ? '#aaa' : '#666'}]}>{activityGoal.distCurrent}/{activityGoal.distTarget}km</Text>
                                    </View>
                                    <View style={[styles.barTrack, {backgroundColor: isDark ? '#333' : '#e0e0e0'}]}>
                                        <View style={[styles.barFill, {width: getWidth(activityGoal.distCurrent, activityGoal.distTarget), backgroundColor: '#34C759'}]} />
                                    </View>
                                </View>
                            )}

                            {/* Time Goal Bar */}
                            {activityGoal.timeTarget > 0 && (
                                <View style={styles.progressSection}>
                                    <View style={styles.labelRow}>
                                        <Text style={[styles.barLabel, {color: isDark ? '#fff' : '#000'}]}>{activityGoal.name} (Time)</Text>
                                        <Text style={[styles.barValue, {color: isDark ? '#aaa' : '#666'}]}>{activityGoal.timeCurrent}/{activityGoal.timeTarget}m</Text>
                                    </View>
                                    <View style={[styles.barTrack, {backgroundColor: isDark ? '#333' : '#e0e0e0'}]}>
                                        <View style={[styles.barFill, {width: getWidth(activityGoal.timeCurrent, activityGoal.timeTarget), backgroundColor: '#FF9500'}]} />
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.menu}>
                        <TouchableOpacity style={[styles.card, { backgroundColor: '#007AFF' }]} onPress={() => router.push('/AddWorkout')}>
                            <Text style={styles.cardEmoji}>🏋️</Text>
                            <Text style={styles.cardTitle}>Log Workout</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, { backgroundColor: '#5856D6' }]} onPress={() => router.push('/ReviewWorkout')}>
                            <Text style={styles.cardEmoji}>📊</Text>
                            <Text style={styles.cardTitle}>Progression</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, { backgroundColor: '#34C759' }]} onPress={() => router.push('/Goals')}>
                            <Text style={styles.cardEmoji}>🎯</Text>
                            <Text style={styles.cardTitle}>My Goals</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleSignOut} style={styles.logout}>
                        <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 16 }}>Sign Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { flex: 1, paddingHorizontal: 25 },
    scrollContent: { paddingTop: 60, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    header: { marginBottom: 30 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    welcome: { fontSize: 16, fontWeight: '500' },
    user: { fontSize: 28, fontWeight: 'bold' },
    settingsIcon: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    statsContainer: { width: '100%', gap: 15 },
    progressSection: { width: '100%' },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    barLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
    barValue: { fontSize: 13, fontWeight: 'bold' },
    barTrack: { height: 10, width: '100%', borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    menu: { width: '100%' },
    card: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 18, marginBottom: 15 },
    cardEmoji: { fontSize: 24, marginRight: 15 },
    cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    logout: { marginTop: 20, alignSelf: 'center', padding: 10 }
});