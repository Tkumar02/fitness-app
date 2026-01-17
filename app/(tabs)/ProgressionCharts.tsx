import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
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

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        intensity: '#FF9500' 
    };

    useEffect(() => {
        if (!user?.uid) return;
        
        // This query ensures we only get workouts that ACTUALLY exist
        const q = query(
            collection(db, 'workouts'), 
            where('userId', '==', user.uid), 
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => d.data());
            setWorkouts(data);
            
            // Set initial activity to the most recent one if not set
            if (data.length > 0 && !selectedActivity) {
                setSelectedActivity(data[data.length - 1].activity);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // ONLY show exercises that have been completed
    const uniqueActivities = useMemo(() => {
        const completed = workouts.map(w => w.activity);
        return Array.from(new Set(completed)).sort();
    }, [workouts]);

    // Filter Variations based on the selected Activity
    const variations = useMemo(() => {
        const filtered = workouts.filter(w => w.activity === selectedActivity);
        const vals = filtered.map(w => {
            if (w.category === 'strength') return `${w.weight}kg`;
            if (Number(w.distance) > 0) return `${w.distance}km`;
            return `${w.duration}min`;
        });
        return ['All', ...Array.from(new Set(vals))];
    }, [selectedActivity, workouts]);

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
        const sample = lastSix[lastSix.length - 1];
        
        const performanceData = lastSix.map(d => 
            d.category === 'strength' ? Number(d.weight) : (Number(d.distance) > 0 ? Number(d.distance) : Number(d.duration))
        );
        const performanceUnit = sample.category === 'strength' ? 'kg' : (Number(sample.distance) > 0 ? 'km' : 'min');
        const intensityData = lastSix.map(d => Number(d.intensity) || 0);

        return {
            labels,
            performance: {
                labels,
                datasets: [{ data: performanceData, color: (opacity = 1) => theme.accent, strokeWidth: 3 }],
                legend: [`Load/Dist (${performanceUnit})`]
            },
            intensity: {
                labels,
                datasets: [{ data: intensityData, color: (opacity = 1) => theme.intensity, strokeWidth: 3 }],
                legend: ["Intensity (RPE)"]
            }
        };
    }, [selectedActivity, selectedVariation, workouts, isDark]);

    if (loading) {
        return <View style={[styles.center, {backgroundColor: theme.background}]}><ActivityIndicator size="large" color={theme.accent}/></View>;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
            <ScrollView 
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.header, { color: theme.text }]}>Analytics</Text>

                <View style={styles.filterRow}>
                    <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.card }]} onPress={() => setActivityModalVisible(true)}>
                        <Text style={styles.filterLabel}>Activity</Text>
                        <Text style={[styles.filterValue, { color: theme.accent }]} numberOfLines={1}>{selectedActivity || 'None'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.card }]} onPress={() => setVariationModalVisible(true)}>
                        <Text style={styles.filterLabel}>Goal/Weight</Text>
                        <Text style={[styles.filterValue, { color: theme.accent }]}>{selectedVariation}</Text>
                    </TouchableOpacity>
                </View>

                {processedCharts ? (
                    <View>
                        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                            <Text style={[styles.chartTitle, { color: theme.text }]}>Progress Trend</Text>
                            <LineChart 
                                data={processedCharts.performance} 
                                width={screenWidth - 60} 
                                height={200} 
                                chartConfig={getChartConfig(isDark, theme.accent)} 
                                bezier 
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
                                style={styles.chart} 
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="analytics" size={80} color={theme.subtext} />
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>
                            No data for this variation yet.
                        </Text>
                    </View>
                )}

                <SelectionModal 
                    visible={activityModalVisible} 
                    title="Your Exercises" 
                    data={uniqueActivities} 
                    selected={selectedActivity} 
                    onSelect={(val:any) => { setSelectedActivity(val); setSelectedVariation('All'); setActivityModalVisible(false); }} 
                    theme={theme} 
                    onClose={() => setActivityModalVisible(false)} 
                />
                
                <SelectionModal 
                    visible={variationModalVisible} 
                    title="Select Variation" 
                    data={variations} 
                    selected={selectedVariation} 
                    onSelect={(val:any) => { setSelectedVariation(val); setVariationModalVisible(false); }} 
                    theme={theme} 
                    onClose={() => setVariationModalVisible(false)} 
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const getChartConfig = (isDark: boolean, color: string) => ({
    backgroundGradientFrom: isDark ? '#1c1c1e' : '#fff',
    backgroundGradientTo: isDark ? '#1c1c1e' : '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    propsForDots: { r: "4", strokeWidth: "2", stroke: color }
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
    chartCard: { borderRadius: 24, padding: 15, elevation: 4 },
    chartTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12, marginLeft: 5 },
    chart: { borderRadius: 16 },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, marginTop: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '60%' },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: 'rgba(142,142,147,0.2)' },
    modalItemText: { fontSize: 17 }
});