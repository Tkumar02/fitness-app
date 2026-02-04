import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView, StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function ProgressionCharts() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    const screenWidth = Dimensions.get("window").width;

    const [loading, setLoading] = useState(true);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<string>('');
    const [selectedVariation, setSelectedVariation] = useState<string>('All');
    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [variationModalVisible, setVariationModalVisible] = useState(false);
    
    // NEW: View Mode for Strength
    const [viewMode, setViewMode] = useState<'1RM' | 'Volume'>('1RM');

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        accent: '#007AFF', // Blue for 1RM
        volume: '#34C759', // Green for Volume
        intensity: '#FF9500' 
    };

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'workouts'), 
            where('userId', '==', user.uid), 
            orderBy('date', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => d.data());
            setWorkouts(data);
            if (data.length > 0 && !selectedActivity) {
                setSelectedActivity(data[data.length - 1].activity);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

// Independent timeframe states
const [runTimeframe, setRunTimeframe] = useState<'7' | '30' | 'All'>('30');
const [cycleTimeframe, setCycleTimeframe] = useState<'7' | '30' | 'All'>('30');

const toggleRunTimeframe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunTimeframe(prev => prev === '7' ? '30' : prev === '30' ? 'All' : '7');
};

const toggleCycleTimeframe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCycleTimeframe(prev => prev === '7' ? '30' : prev === '30' ? 'All' : '7');
};

const runningTotal = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date(0);

    if (runTimeframe !== 'All') {
        cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - parseInt(runTimeframe));
    }

    return workouts
        .filter(w => {
            const isRunning = w.activity === 'Running' || w.activity === 'Treadmill';
            return isRunning && new Date(w.date) >= cutoffDate;
        })
        .reduce((sum, current) => sum + (Number(current.distance) || 0), 0)
        .toFixed(1); // One decimal place looks cleaner
}, [workouts, runTimeframe]);

const cyclingTotal = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date(0);

    if (cycleTimeframe !== 'All') {
        cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - parseInt(cycleTimeframe));
    }

    return workouts
        .filter(w => {
            const isCycling = w.activity === 'Cycling';
            return isCycling && new Date(w.date) >= cutoffDate;
        })
        .reduce((sum, current) => sum + (Number(current.distance) || 0), 0)
        .toFixed(1); // One decimal place looks cleaner
}, [workouts, cycleTimeframe]);

    const uniqueActivities = useMemo(() => {
        const completed = workouts.map(w => w.activity);
        return Array.from(new Set(completed)).sort();
    }, [workouts]);

    const variations = useMemo(() => {
        const filtered = workouts.filter(w => w.activity === selectedActivity);
        const vals = filtered.map(w => {
            if (w.category === 'strength') return `${w.weight}kg`;
            if (Number(w.distance) > 0) return `${w.distance}km`;
            return `${w.duration}min`;
        });
        return ['All', ...Array.from(new Set(vals))];
    }, [selectedActivity, workouts]);

    // const last30DaysCyclingTotal = useMemo(() => {
    //     const thirtyDaysAgo = new Date();
    //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    //     return workouts
    //         .filter(w => {
    //             const workoutDate = new Date(w.date);
    //             // Match cardio + specific activity name + date range
    //             return w.category === 'cardio' && 
    //                 w.activity === 'Cycling' && 
    //                 w.distance > 0 && 
    //                 workoutDate >= thirtyDaysAgo;
    //         })
    //         .reduce((sum, current) => sum + (Number(current.distance) || 0), 0)
    //         .toFixed(2);
    // }, [workouts]);

    const processedCharts = useMemo(() => {
        let filtered = workouts.filter(w => w.activity === selectedActivity);
        if (selectedVariation !== 'All') {
            filtered = filtered.filter(w => {
                const val = w.category === 'strength' ? `${w.weight}kg` : (Number(w.distance) > 0 ? `${w.distance}km` : `${w.duration}min`);
                return val === selectedVariation;
            });
        }

        const lastSix = filtered.slice(-6);
        if (lastSix.length === 0) return null;

        const labels = lastSix.map(d => d.date.split('-').slice(1).join('/'));
        const isStrength = lastSix[0].category === 'strength';

        // 1RM Calculation (Brzycki Formula)
        const rmData = lastSix.map(d => {
            if (d.category === 'strength') {
                const w = parseFloat(d.weight) || 0;
                const r = parseInt(d.reps) || 0;
                return r > 1 ? Math.round(w * (1 + r / 30)) : w;
            }
            // For cardio, return distance (primary metric) or duration
            return Number(d.distance) > 0 ? Number(d.distance) : Number(d.duration);
        });

        // Volume Calculation
        const volumeData = lastSix.map(d => {
            if (d.category === 'strength') {
                const w = parseFloat(d.weight) || 0;
                const r = parseInt(d.reps) || 0;
                const s = parseInt(d.sets) || 0;
                return w * r * s;
            }
            return 0;
        });

        const intensityData = lastSix.map(d => Number(d.intensity || d.rpe) || 0);

        // Determine which line to show in Strength mode
        const activeProgressData = (isStrength && viewMode === 'Volume') ? volumeData : rmData;
        const activeColor = (isStrength && viewMode === 'Volume') ? theme.volume : theme.accent;
        

        return {
            labels,
            isStrength,
            progress: {
                labels,
                datasets: [{ data: activeProgressData, color: (opacity = 1) => activeColor, strokeWidth: 4 }],
                legend: isStrength ? [(viewMode === '1RM' ? "Est. 1RM (kg)" : "Total Volume (kg)")] : ["Performance"]
            },
            intensity: {
                labels,
                datasets: [{ data: intensityData, color: (opacity = 1) => theme.intensity, strokeWidth: 3 }],
                legend: ["Intensity (RPE)"]
            }
        };
    }, [selectedActivity, selectedVariation, workouts, viewMode, isDark]);

    if (loading) {
        return <View style={[styles.center, {backgroundColor: theme.background}]}><ActivityIndicator size="large" color={theme.accent}/></View>;
    }

    return (
<SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>Analytics</Text>
        
<TouchableOpacity activeOpacity={0.8} onPress={toggleRunTimeframe} style={{ marginBottom: 15 }}>
    <LinearGradient colors={['#FF3B3030', 'transparent']} style={[styles.totalDistanceCard, { borderColor: '#FF3B3040' }]}>
        <View style={styles.iconCircle}>
            <Ionicons name="footsteps" size={24} color="#FF3B30" />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={[styles.statSubLabel, { color: '#FF3B30' }]}>
                {runTimeframe === 'All' ? 'ALL TIME RUNNING' : `LAST ${runTimeframe} DAYS RUNNING`}
            </Text>
            <Text style={styles.statMainLabel}>{runningTotal} KM</Text>
        </View>
        <Ionicons name="refresh-outline" size={16} color="#FF3B30" style={{opacity: 0.3}} />
    </LinearGradient>
</TouchableOpacity>

{/* CYCLING CARD */}
<TouchableOpacity activeOpacity={0.8} onPress={toggleCycleTimeframe} style={{ marginBottom: 20 }}>
    <LinearGradient colors={['#A542CC30', 'transparent']} style={[styles.totalDistanceCard, { borderColor: '#A542CC40' }]}>
        <View style={[styles.iconCircle, { backgroundColor: '#A542CC20' }]}>
            <Ionicons name="bicycle-outline" size={28} color="#A542CC" /> 
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={[styles.statSubLabel, { color: '#A542CC' }]}>
                {cycleTimeframe === 'All' ? 'ALL TIME CYCLING' : `LAST ${cycleTimeframe} DAYS CYCLING`}
            </Text>
            <Text style={styles.statMainLabel}>{cyclingTotal} KM</Text>
        </View>
        <Ionicons name="refresh-outline" size={16} color="#A542CC" style={{opacity: 0.3}} />
    </LinearGradient>
</TouchableOpacity>
                <View style={styles.filterRow}>
                    <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.card }]} onPress={() => setActivityModalVisible(true)}>
                        <Text style={styles.filterLabel}>Activity</Text>
                        <Text style={[styles.filterValue, { color: theme.accent }]} numberOfLines={1}>{selectedActivity || 'None'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.card }]} onPress={() => setVariationModalVisible(true)}>
                        <Text style={styles.filterLabel}>Variation</Text>
                        <Text style={[styles.filterValue, { color: theme.accent }]}>{selectedVariation}</Text>
                    </TouchableOpacity>
                </View>

                {processedCharts ? (
                    <View>
                        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                            <View style={styles.chartHeader}>
                                <Text style={[styles.chartTitle, { color: theme.text }]}>Progress Trend</Text>
                                
                                {processedCharts.isStrength && (
                                    <View style={styles.toggleContainer}>
                                        <TouchableOpacity 
                                            style={[styles.miniToggle, viewMode === '1RM' && { backgroundColor: theme.accent }]}
                                            onPress={() => setViewMode('1RM')}
                                        >
                                            <Text style={[styles.miniToggleText, viewMode === '1RM' && { color: '#fff' }]}>1RM</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.miniToggle, viewMode === 'Volume' && { backgroundColor: theme.volume }]}
                                            onPress={() => setViewMode('Volume')}
                                        >
                                            <Text style={[styles.miniToggleText, viewMode === 'Volume' && { color: '#fff' }]}>VOL</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <LineChart 
                                data={processedCharts.progress} 
                                width={screenWidth - 60} 
                                height={220} 
                                chartConfig={getChartConfig(isDark, (processedCharts.isStrength && viewMode === 'Volume') ? theme.volume : theme.accent)} 
                                bezier 
                                fromZero={false} // Crucial: Zooms in to see smaller RM changes
                                style={styles.chart} 
                            />
                        </View>

                        <View style={[styles.chartCard, { backgroundColor: theme.card, marginTop: 20 }]}>
                            <Text style={[styles.chartTitle, { color: theme.text }]}>Effort Level (RPE)</Text>
                            <LineChart 
                                data={processedCharts.intensity} 
                                width={screenWidth - 60} 
                                height={200} 
                                chartConfig={getChartConfig(isDark, theme.intensity)} 
                                bezier 
                                fromZero={true}
                                style={styles.chart} 
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="analytics" size={80} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>No data for this selection.</Text>
                    </View>
                )}

                <SelectionModal visible={activityModalVisible} title="Your Exercises" data={uniqueActivities} selected={selectedActivity} onSelect={(val:any) => { setSelectedActivity(val); setSelectedVariation('All'); setActivityModalVisible(false); }} theme={theme} onClose={() => setActivityModalVisible(false)} />
                <SelectionModal visible={variationModalVisible} title="Select Variation" data={variations} selected={selectedVariation} onSelect={(val:any) => { setSelectedVariation(val); setVariationModalVisible(false); }} theme={theme} onClose={() => setVariationModalVisible(false)} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getChartConfig = (isDark: boolean, color: string) => ({
    backgroundGradientFrom: isDark ? '#1c1c1e' : '#fff',
    backgroundGradientTo: isDark ? '#1c1c1e' : '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    propsForDots: { r: "5", strokeWidth: "2", stroke: color },
    fillShadowGradientFrom: color,
    fillShadowGradientOpacity: 0.2,
});

function SelectionModal({ visible, title, data, selected, onSelect, theme, onClose }: any) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={{flex: 1}} onPress={onClose} />
                <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                    <Text style={[styles.modalTitle, {color: theme.text}]}>{title}</Text>
                    <ScrollView>
                        {data.map((item: string) => (
                            <TouchableOpacity key={item} style={styles.modalItem} onPress={() => onSelect(item)}>
                                <Text style={[styles.modalItemText, { color: theme.text, fontWeight: selected === item ? 'bold' : '400' }]}>{item}</Text>
                                {selected === item && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { fontSize: 34, fontWeight: '900', marginBottom: 20 },
    filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    filterBtn: { flex: 1, padding: 15, borderRadius: 18, elevation: 3 },
    filterLabel: { fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', fontWeight: '800' },
    filterValue: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    chartCard: { borderRadius: 24, padding: 16, elevation: 4 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    chartTitle: { fontSize: 18, fontWeight: '800' },
    toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(142,142,147,0.1)', borderRadius: 10, padding: 3 },
    miniToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    miniToggleText: { fontSize: 10, fontWeight: '900', color: '#8e8e93' },
    chart: { borderRadius: 16, marginTop: 10, marginLeft: -15 },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, marginTop: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '60%' },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: 'rgba(142,142,147,0.2)' },
    modalItemText: { fontSize: 17 },
statsContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
    },
    totalDistanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24, // Extra rounded for a modern look
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FF3B3020',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statSubLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    statMainLabel: {
        color: '#fff',
        fontSize: 36, // Bigger and bolder
        fontWeight: '900',
    }
});