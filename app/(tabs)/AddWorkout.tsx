import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
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

export default function AddWorkoutPage() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';

    // Form State
    const [workoutType, setWorkoutType] = useState<'cardio' | 'strength'>('cardio');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<{ name: string, category: string }[]>([]);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [newCustomActivity, setNewCustomActivity] = useState('');

    // Date State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Metrics State
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
    const [weight, setWeight] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [intensity, setIntensity] = useState(5);

    const cardioStandards = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const strengthStandards = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    // Listen for custom equipment updates
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'users', user.uid, 'customEquipment'));
        return onSnapshot(q, (snapshot) => {
            setCustomList(snapshot.docs.map(d => ({ 
                name: d.data().name, 
                category: d.data().category 
            })));
        });
    }, [user]);

    const handleAddCustomActivity = async () => {
        if (!newCustomActivity.trim() || !user?.uid) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'customEquipment'), {
                name: newCustomActivity.trim(),
                category: workoutType,
                createdAt: serverTimestamp()
            });
            setActivity(newCustomActivity.trim());
            setNewCustomActivity('');
            setPickerVisible(false);
        } catch (e) {
            Alert.alert("Error", "Could not save custom exercise.");
        }
    };

    const handleSaveWorkout = async () => {
        if (!user?.uid || !activity) {
            Alert.alert("Error", "Please select an activity.");
            return;
        }

        try {
            let isGoalMet = false;
            let goalDocId = null;

            const goalsRef = collection(db, 'users', user.uid, 'activeGoals');
            const q = query(goalsRef, where('activity', '==', activity));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((goalDoc) => {
                const g = goalDoc.data();
                if (workoutType === 'cardio') {
                    const dHit = g.distGoal > 0 && Number(distance) >= g.distGoal;
                    const tHit = g.timeGoal > 0 && Number(duration) >= g.timeGoal;
                    if (dHit || tHit) { isGoalMet = true; goalDocId = goalDoc.id; }
                } else {
                    const wHit = g.loadGoal > 0 ? Number(weight) >= g.loadGoal : true;
                    const sHit = g.setsGoal > 0 ? Number(sets) >= g.setsGoal : true;
                    const rHit = g.repsGoal > 0 ? Number(reps) >= g.repsGoal : true;
                    if (wHit && sHit && rHit) { isGoalMet = true; goalDocId = goalDoc.id; }
                }
            });

            if (isGoalMet && goalDocId) {
                await deleteDoc(doc(db, 'users', user.uid, 'activeGoals', goalDocId));
                Alert.alert("🏆 Goal Smashed!", `${activity} hit!`);
            }

            await addDoc(collection(db, 'workouts'), {
                userId: user.uid,
                activity: activity,
                category: workoutType,
                distance: Number(distance) || 0,
                duration: Number(duration) || 0,
                durationUnit: 'm',
                weight: Number(weight) || 0,
                weightUnit: 'kg',
                sets: Number(sets) || 0,
                reps: Number(reps) || 0,
                intensity: intensity,
                goalMet: isGoalMet,
                date: date.toISOString().split('T')[0],
                loggedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });

            setDistance(''); setDuration(''); setWeight(''); setSets(''); setReps('');
            setActivity('');
            Alert.alert("Success", "Workout logged!");
        } catch (e) {
            Alert.alert("Error", "Save failed.");
        }
    };

    const dropdownOptions = [
        ...(workoutType === 'cardio' ? cardioStandards : strengthStandards),
        ...customList.filter(i => i.category === workoutType).map(i => i.name)
    ];

    const theme = {
        inputBg: isDark ? '#2c2c2e' : '#f2f2f7',
        textColor: isDark ? '#fff' : '#000',
        cardBg: isDark ? '#1c1c1e' : '#fff',
        accent: '#007AFF',
        success: '#34C759'
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container} style={{backgroundColor: isDark ? '#121212' : '#f9fafb'}}>
            
            <TouchableOpacity style={[styles.dateBtn, {backgroundColor: theme.cardBg}]} onPress={() => setShowDatePicker(true)}>
                <Text style={{color: theme.textColor, fontWeight: 'bold'}}>📅 {date.toDateString()}</Text>
                <Text style={{color: theme.accent}}>Change</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker 
                    value={date} 
                    mode="date" 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                    onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setDate(d); }} 
                />
            )}

            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <View style={[styles.toggleRow, { backgroundColor: theme.inputBg }]}>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, workoutType === 'strength' && { backgroundColor: theme.accent }]} 
                        onPress={() => {setWorkoutType('strength'); setActivity('');}}
                    >
                        <Text style={{ color: workoutType === 'strength' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>STRENGTH</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, workoutType === 'cardio' && { backgroundColor: theme.success }]} 
                        onPress={() => {setWorkoutType('cardio'); setActivity('');}}
                    >
                        <Text style={{ color: workoutType === 'cardio' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>CARDIO</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.picker, { backgroundColor: theme.inputBg }]} onPress={() => setPickerVisible(true)}>
                    <Text style={{ color: activity ? theme.textColor : '#8e8e93', fontWeight: 'bold' }}>{activity || "Select Exercise..."}</Text>
                    <Ionicons name="chevron-down" size={18} color="#8e8e93" />
                </TouchableOpacity>

                {workoutType === 'cardio' ? (
                    <View style={styles.row}>
                        <View style={styles.inputWrap}><Text style={styles.label}>Km</Text><TextInput style={[styles.input, { color: theme.textColor, backgroundColor: theme.inputBg }]} keyboardType="decimal-pad" value={distance} onChangeText={setDistance} placeholder="0" placeholderTextColor="#666" /></View>
                        <View style={styles.inputWrap}><Text style={styles.label}>Min</Text><TextInput style={[styles.input, { color: theme.textColor, backgroundColor: theme.inputBg }]} keyboardType="numeric" value={duration} onChangeText={setDuration} placeholder="0" placeholderTextColor="#666" /></View>
                    </View>
                ) : (
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.label}>Kg</Text><TextInput style={[styles.input, { color: theme.textColor, backgroundColor: theme.inputBg }]} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="0" placeholderTextColor="#666" /></View>
                        <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.label}>Sets</Text><TextInput style={[styles.input, { color: theme.textColor, backgroundColor: theme.inputBg }]} keyboardType="numeric" value={sets} onChangeText={setSets} placeholder="0" placeholderTextColor="#666" /></View>
                        <View style={{ flex: 1 }}><Text style={styles.label}>Reps</Text><TextInput style={[styles.input, { color: theme.textColor, backgroundColor: theme.inputBg }]} keyboardType="numeric" value={reps} onChangeText={setReps} placeholder="0" placeholderTextColor="#666" /></View>
                    </View>
                )}

                <Text style={styles.label}>Intensity (RPE: 1-10)</Text>
                <View style={styles.intensityContainer}>
                    {[...Array(10)].map((_, i) => (
                        <TouchableOpacity 
                            key={i + 1} 
                            style={[
                                styles.intensityBubble, 
                                intensity === i + 1 && { backgroundColor: theme.accent }
                            ]} 
                            onPress={() => setIntensity(i + 1)}
                        >
                            <Text style={[
                                styles.intensityText, 
                                intensity === i + 1 && { color: '#fff' }
                            ]}>
                                {i + 1}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.success }]} onPress={handleSaveWorkout}>
                    <Text style={styles.saveBtnText}>Log Workout</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: theme.cardBg }]}>
                        
                        <Text style={[styles.modalTitle, {color: theme.textColor}]}>Select or Add New</Text>
                        
                        <View style={styles.modalInputRow}>
                            <TextInput 
                                style={[styles.modalInput, {backgroundColor: theme.inputBg, color: theme.textColor}]}
                                placeholder="Add custom exercise..."
                                placeholderTextColor="#8e8e93"
                                value={newCustomActivity}
                                onChangeText={setNewCustomActivity}
                            />
                            <TouchableOpacity style={styles.modalAddBtn} onPress={handleAddCustomActivity}>
                                <Ionicons name="add" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{marginTop: 10}}>
                            {dropdownOptions.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { setActivity(opt); setPickerVisible(false); }}>
                                    <Text style={[styles.modalItemText, { color: theme.textColor }]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, flexGrow: 1 },
    dateBtn: { padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, elevation: 2 },
    card: { padding: 20, borderRadius: 25, elevation: 3 },
    toggleRow: { flexDirection: 'row', padding: 5, borderRadius: 12, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    picker: { padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    inputWrap: { flex: 0.48 },
    label: { fontSize: 10, fontWeight: 'bold', color: '#8e8e93', marginBottom: 5, textTransform: 'uppercase' },
    input: { padding: 15, borderRadius: 12, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    saveBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, elevation: 2 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '70%' },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15 },
    modalInputRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    modalInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 16 },
    modalAddBtn: { backgroundColor: '#007AFF', width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalItem: { paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333' },
    modalItemText: { fontSize: 17, fontWeight: '500' },
    intensityContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 10, 
        marginBottom: 20 
    },
    intensityBubble: { 
        width: 30, 
        height: 30, 
        borderRadius: 15, 
        backgroundColor: '#8e8e9322', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    intensityText: { 
        fontSize: 12, 
        fontWeight: 'bold', 
        color: '#8e8e93' 
    },
});