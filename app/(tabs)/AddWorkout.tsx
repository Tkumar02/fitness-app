import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

const METRIC_TYPES = {
    DISTANCE: { label: 'DISTANCE', unitKey: 'unit' },
    FLOORS: { label: 'FLOORS', unitKey: 'fl' },
    LEVEL: { label: 'LEVEL/RESISTANCE', unitKey: 'lvl' },
};

const DEFAULT_METRICS: Record<string, string> = {
    'Running': 'DISTANCE', 'Cycling': 'DISTANCE', 'Treadmill': 'DISTANCE',
    'Stairs': 'FLOORS', 'StairMaster': 'FLOORS', 'Elliptical': 'LEVEL', 'Rowing': 'DISTANCE',
};

export default function AddWorkoutPage() {
    const navigation = useNavigation<any>();
    const { user } = useContext(UserContext);

    // --- UI State ---
    const [loading, setLoading] = useState(false);
    const [workoutType, setWorkoutType] = useState<'cardio' | 'strength'>('cardio');
    const [unit, setUnit] = useState<'km' | 'mi'>('km');
    const [pickerVisible, setPickerVisible] = useState(false);
    
    // --- Activity State ---
    const [activity, setActivity] = useState('');
    const [currentMetric, setCurrentMetric] = useState('DISTANCE');
    const [customList, setCustomList] = useState<any[]>([]);
    const [focus, setFocus] = useState<'endurance' | 'performance'>('endurance');
    const [isBodyweight, setIsBodyweight] = useState(false);

    // --- Inputs ---
    const [duration, setDuration] = useState('');
    const [metricValue, setMetricValue] = useState(''); 
    const [weight, setWeight] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [rpe, setRpe] = useState<number>(7);
    const [notes, setNotes] = useState('');

    const [newActivityName, setNewActivityName] = useState('');
    const [selectedMetricForNew, setSelectedMetricForNew] = useState('DISTANCE');

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'users', user.uid, 'customEquipment'));
        return onSnapshot(q, (snapshot) => {
            setCustomList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [user]);

    // Calculation Logic
    const secondaryStats = useMemo(() => {
        const t = parseFloat(duration);
        const mVal = parseFloat(metricValue);
        
        if (t > 0 && mVal > 0) {
            if (currentMetric === 'DISTANCE') {
                if (focus === 'performance') {
                    // Enter Speed -> Show Distance
                    const dist = (mVal * (t / 60)).toFixed(2);
                    return `Total Distance: ${dist} ${unit}`;
                } else {
                    // Enter Distance -> Show Pace
                    const paceDec = t / mVal;
                    const mins = Math.floor(paceDec);
                    const secs = Math.round((paceDec - mins) * 60);
                    return `Pace: ${mins}:${secs < 10 ? '0' : ''}${secs} /${unit}`;
                }
            }
            if (currentMetric === 'FLOORS') return `Rate: ${(mVal / t).toFixed(1)} fl/min`;
            return `Intensity: Level ${mVal}`;
        }
        return '--';
    }, [metricValue, duration, currentMetric, unit, focus]);

    const handleSaveWorkout = async () => {
        if (loading) return;
        if (!user?.uid || !activity) return Alert.alert("Error", "Select activity");
        
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const mVal = parseFloat(metricValue) || 0;
        const dur = parseFloat(duration) || 0;
        
        // Calculate final distance for storage if in performance mode
        let finalDistance = mVal;
        if (workoutType === 'cardio' && currentMetric === 'DISTANCE' && focus === 'performance') {
            finalDistance = parseFloat((mVal * (dur / 60)).toFixed(2));
        }

        const workoutData = {
            userId: user.uid,
            activity,
            category: workoutType,
            metricType: currentMetric,
            // If performance, metricValue is Speed. If endurance, it's Distance.
            metricValue: mVal, 
            calculatedDistance: currentMetric === 'DISTANCE' ? finalDistance : null,
            duration: dur,
            unit: currentMetric === 'DISTANCE' ? unit : null,
            focus: workoutType === 'cardio' ? focus : null,
            weight: isBodyweight ? 0 : (parseFloat(weight) || 0),
            addedWeight: isBodyweight ? (parseFloat(weight) || 0) : 0,
            isBW: isBodyweight,
            sets: parseInt(sets) || 0,
            reps: parseInt(reps) || 0,
            rpe,
            notes,
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, 'workouts'), workoutData);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate('ReviewWorkout');
        } catch (e) { 
            Alert.alert("Error", "Save failed"); 
            setLoading(false);
        }
    };

    const getRPEColor = (num: number) => {
    if (num <= 3) return '#4ade80'; // Green
    if (num <= 7) return '#facc15'; // Yellow/Gold
    return '#f87171'; // Red
};

    const handleSelectActivity = (name: string, metric?: string) => {
        setActivity(name);
        setCurrentMetric(metric || DEFAULT_METRICS[name] || 'DISTANCE');
        setPickerVisible(false);
    };

    return (
        <LinearGradient 
            colors={workoutType === 'strength' ? ['#000', '#0a0f1a', '#1a2333'] : ['#000', '#0a0f0d', '#0f241a']} 
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.container}>
                        
                        <View style={styles.header}>
                            {currentMetric === 'DISTANCE' && (
                                <TouchableOpacity style={styles.unitToggle} onPress={() => setUnit(unit === 'km' ? 'mi' : 'km')}>
                                    <Text style={styles.unitToggleText}>{unit.toUpperCase()}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.mainTabRow}>
                                <TouchableOpacity style={[styles.mainTab, workoutType === 'strength' && styles.activeStrength]} onPress={() => setWorkoutType('strength')}>
                                    <Text style={styles.tabLabel}>STRENGTH</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.mainTab, workoutType === 'cardio' && styles.activeCardio]} onPress={() => setWorkoutType('cardio')}>
                                    <Text style={styles.tabLabel}>CARDIO</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setPickerVisible(true)}>
                                <View>
                                    <Text style={styles.pickerLabel}>ACTIVITY</Text>
                                    <Text style={styles.pickerTriggerText}>{activity || "Select Exercise..."}</Text>
                                </View>
                                <Ionicons name="chevron-down" size={20} color="#fff" />
                            </TouchableOpacity>

                            {workoutType === 'cardio' ? (
                                <View>
                                    {currentMetric === 'DISTANCE' && (
                                        <View style={styles.toggleRow}>
                                            <TouchableOpacity style={[styles.toggleBtn, focus === 'endurance' && styles.activeCardio]} onPress={() => setFocus('endurance')}>
                                                <Text style={styles.toggleText}>ENDURANCE</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.toggleBtn, focus === 'performance' && styles.activeCardio]} onPress={() => setFocus('performance')}>
                                                <Text style={styles.toggleText}>PERFORMANCE</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    <Text style={styles.label}>TIME (MINUTES)</Text>
                                    <TextInput style={styles.input} placeholder="0" placeholderTextColor="#222" keyboardType="numeric" value={duration} onChangeText={setDuration} />

                                    <View style={{ marginTop: 20 }}>
                                        <Text style={styles.label}>
                                            {currentMetric !== 'DISTANCE' ? (currentMetric === 'FLOORS' ? 'TOTAL FLOORS' : 'INTENSITY LEVEL') : 
                                             (focus === 'performance' ? `SPEED (${unit === 'km' ? 'KM/H' : 'MPH'})` : `DISTANCE (${unit.toUpperCase()})`)}
                                        </Text>
                                        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#222" keyboardType="numeric" value={metricValue} onChangeText={setMetricValue} />
                                    </View>
                                    
                                    <View style={styles.resBox}><Text style={styles.resVal}>{secondaryStats}</Text></View>
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.toggleRow}>
                                        <TouchableOpacity style={[styles.toggleBtn, !isBodyweight && styles.activeStrength]} onPress={() => setIsBodyweight(false)}><Text style={styles.toggleText}>KG</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.toggleBtn, isBodyweight && styles.activeStrength]} onPress={() => setIsBodyweight(true)}><Text style={styles.toggleText}>BODYWEIGHT</Text></TouchableOpacity>
                                    </View>
                                    <View style={styles.strengthRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>{isBodyweight ? '+ KG' : 'KG'}</Text>
                                            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#222" keyboardType="numeric" value={weight} onChangeText={setWeight} />
                                        </View>
                                        <View style={{ flex: 1 }}><Text style={styles.label}>SETS</Text><TextInput style={styles.input} placeholder="0" placeholderTextColor="#222" keyboardType="numeric" value={sets} onChangeText={setSets} /></View>
                                        <View style={{ flex: 1 }}><Text style={styles.label}>REPS</Text><TextInput style={styles.input} placeholder="0" placeholderTextColor="#222" keyboardType="numeric" value={reps} onChangeText={setReps} /></View>
                                    </View>
                                </View>
                            )}

                            <Text style={[styles.label, { marginTop: 25 }]}>EFFORT (RPE: {rpe})</Text>
                            <View style={styles.rpeRow}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <TouchableOpacity key={num} style={[styles.rpeCircle, rpe === num && { backgroundColor: getRPEColor(num), borderColor: getRPEColor(num) }]} onPress={() => setRpe(num)}>
                                        <Text style={[styles.rpeText, rpe === num && { color: '#000' }]}>{num}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { marginTop: 20 }]}>NOTES</Text>
                            <TextInput style={styles.notesInput} placeholder="How did it feel?" placeholderTextColor="#333" multiline value={notes} onChangeText={setNotes} />

                            <TouchableOpacity 
                                style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
                                onPress={handleSaveWorkout}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>LOG WORKOUT</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>CHOOSE OR CREATE</Text>
                        <View style={styles.modalAddContainer}>
                            <TextInput style={styles.modalInput} placeholder="Exercise name..." placeholderTextColor="#444" value={newActivityName} onChangeText={setNewActivityName} />
                            {workoutType === 'cardio' && (
                                <View style={styles.metricSelectRow}>
                                    {Object.keys(METRIC_TYPES).map((m) => (
                                        <TouchableOpacity key={m} style={[styles.metricOpt, selectedMetricForNew === m && styles.metricOptActive]} onPress={() => setSelectedMetricForNew(m)}>
                                            <Text style={styles.metricOptText}>{m.slice(0, 4)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <TouchableOpacity style={styles.addBtn} onPress={async () => {
                                if (!newActivityName) return;
                                await addDoc(collection(db, 'users', user!.uid, 'customEquipment'), { name: newActivityName, category: workoutType, metricType: selectedMetricForNew });
                                handleSelectActivity(newActivityName, selectedMetricForNew);
                                setNewActivityName('');
                            }}><Text style={{fontWeight: '900', color: '#000'}}>ADD & SELECT</Text></TouchableOpacity>
                        </View>
                        <ScrollView>
                            {[...(workoutType === 'cardio' ? Object.keys(DEFAULT_METRICS) : ['Bench Press', 'Squats', 'Deadlift']), ...customList.filter(i => i.category === workoutType)].map((opt: any) => {
                                const name = typeof opt === 'string' ? opt : opt.name;
                                const metric = typeof opt === 'string' ? null : opt.metricType;
                                return (
                                    <TouchableOpacity key={name} style={styles.optionItem} onPress={() => handleSelectActivity(name, metric)}>
                                        <Text style={styles.optionText}>{name}</Text>
                                        <Text style={styles.optionSub}>{metric || DEFAULT_METRICS[name] || ''}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setPickerVisible(false)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>CANCEL</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { alignItems: 'flex-end', height: 40 },
    unitToggle: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
    unitToggleText: { color: '#888', fontWeight: 'bold', fontSize: 10 },
    card: { backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    mainTabRow: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 16, padding: 4, marginBottom: 25 },
    mainTab: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
    activeStrength: { backgroundColor: '#2b6cb0' },
    activeCardio: { backgroundColor: '#276749' },
    tabLabel: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    pickerTrigger: { backgroundColor: '#000', padding: 20, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    pickerLabel: { color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 4 },
    pickerTriggerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    label: { color: '#555', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    toggleRow: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 12, padding: 3, marginBottom: 15, borderWidth: 1, borderColor: '#111' },
    toggleBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
    toggleText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    input: { backgroundColor: '#000', padding: 18, borderRadius: 15, color: '#fff', fontSize: 22, fontWeight: 'bold', borderWidth: 1, borderColor: '#111' },
    resBox: { marginTop: 15, padding: 15, backgroundColor: 'rgba(167, 255, 131, 0.05)', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1a2e25' },
    resVal: { color: '#a7ff83', fontWeight: 'bold', fontSize: 13 },
    strengthRow: { flexDirection: 'row', gap: 12 },
    rpeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    rpeCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    rpeText: { color: '#555', fontSize: 11, fontWeight: 'bold' },
    notesInput: { backgroundColor: '#000', padding: 15, borderRadius: 15, color: '#fff', minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#111', marginTop: 5 },
    saveBtn: { backgroundColor: '#fff', padding: 22, borderRadius: 20, marginTop: 30, minHeight: 65, justifyContent: 'center' },
    saveBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    modalTitle: { color: '#a7ff83', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
    modalAddContainer: { backgroundColor: '#111', padding: 15, borderRadius: 20, marginBottom: 20 },
    modalInput: { color: '#fff', fontSize: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 15 },
    metricSelectRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    metricOpt: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    metricOptActive: { backgroundColor: '#a7ff83', borderColor: '#a7ff83' },
    metricOptText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#a7ff83', padding: 15, borderRadius: 15, alignItems: 'center' },
    optionItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#111', flexDirection: 'row', justifyContent: 'space-between' },
    optionText: { color: '#fff', fontSize: 18 },
    optionSub: { color: '#444', fontSize: 10, fontWeight: 'bold' },
    closeBtn: { marginTop: 20, padding: 20, borderRadius: 15, alignItems: 'center', backgroundColor: '#111' }
});