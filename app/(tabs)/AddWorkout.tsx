import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function AddWorkoutPage() {
    const navigation = useNavigation<any>();
    const { user } = useContext(UserContext);

    // --- State ---
    const [workoutType, setWorkoutType] = useState<'cardio' | 'strength'>('cardio');
    const [logMethod, setLogMethod] = useState<'distance' | 'speed'>('distance');
    const [unit, setUnit] = useState<'km' | 'mi'>('km');
    const [pickerVisible, setPickerVisible] = useState(false);
    
    // --- Form Inputs ---
    const [activity, setActivity] = useState('');
    const [newActivityName, setNewActivityName] = useState(''); // Added for custom adding
    const [isAddingNew, setIsAddingNew] = useState(false);       // Track if we need to save to DB
    const [customList, setCustomList] = useState<{ name: string, category: string }[]>([]);
    const [duration, setDuration] = useState('');
    const [distance, setDistance] = useState('');
    const [speed, setSpeed] = useState('');
    const [weight, setWeight] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');

    // --- Sync Custom Exercises from Firebase ---
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

    // --- Calculations ---
    const calculatedPace = useMemo(() => {
        const d = parseFloat(distance);
        const t = parseFloat(duration);
        if (d > 0 && t > 0) {
            const paceDecimal = t / d;
            const mins = Math.floor(paceDecimal);
            const secs = Math.round((paceDecimal - mins) * 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return '0:00';
    }, [distance, duration]);

    const distFromSpeed = useMemo(() => {
        const s = parseFloat(speed);
        const t = parseFloat(duration);
        return (s > 0 && t > 0) ? ((s * t) / 60).toFixed(2) : '0.00';
    }, [speed, duration]);

    // --- GOAL CHECK LOGIC ---
    const checkForGoalMet = async (workoutData: any) => {
        try {
            const q = query(collection(db, 'users', user!.uid, 'activeGoals'), where('activity', '==', workoutData.activity));
            const querySnapshot = await getDocs(q);
            
            let goalMet = false;
            
            querySnapshot.forEach((goalDoc) => {
                const goal = goalDoc.data();
                
                if (workoutData.category === 'strength') {
                    if (workoutData.weight >= goal.loadGoal && workoutData.reps >= goal.repsGoal) {
                        goalMet = true;
                    }
                } else {
                    if (goal.logMethod === 'speed') {
                        if (workoutData.speed >= goal.speedGoal && workoutData.duration >= goal.timeGoal) {
                            goalMet = true;
                        }
                    } else {
                        if (workoutData.distance >= goal.distGoal && workoutData.duration <= goal.timeGoal) {
                            goalMet = true;
                        }
                    }
                }

                if (goalMet) {
                    Alert.alert("🏆 TROPHY UNLOCKED!", `You smashed your goal for ${workoutData.activity}!`);
                    workoutData.goalMet = true;
                }
            });
            
            return goalMet;
        } catch (e) {
            console.error("Goal check error: ", e);
            return false;
        }
    };

    const handleSaveWorkout = async () => {
        if (!user?.uid || !activity) return Alert.alert("Error", "Select an activity");
        
        const finalDist = logMethod === 'speed' ? parseFloat(distFromSpeed) : parseFloat(distance);
        
        const workoutData: any = {
            userId: user.uid,
            activity,
            category: workoutType,
            distance: finalDist || 0,
            duration: parseFloat(duration) || 0,
            speed: parseFloat(speed) || 0,
            unit,
            weight: parseFloat(weight) || 0,
            sets: parseInt(sets) || 0,
            reps: parseInt(reps) || 0,
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
            goalMet: false
        };

        const met = await checkForGoalMet(workoutData);
        workoutData.goalMet = met;

        try {
            // Save to custom list if this was a new one-off entry
            if (isAddingNew) {
                await addDoc(collection(db, 'users', user.uid, 'customEquipment'), { 
                    name: activity, 
                    category: workoutType 
                });
            }
            await addDoc(collection(db, 'workouts'), workoutData);
            navigation.navigate('ReviewWorkout');
        } catch (e) { 
            Alert.alert("Error", "Save failed"); 
        }
    };

    const dropdownOptions = [
        ...(workoutType === 'cardio' ? ['Running', 'Cycling', 'Treadmill', 'Stairs'] : ['Bench Press', 'Squats', 'Deadlift']),
        ...customList.filter(i => i.category === workoutType).map(i => i.name)
    ];

    return (
        <LinearGradient 
            colors={workoutType === 'strength' ? ['#000', '#0a0f1a', '#1a2333'] : ['#000', '#0a0f0d', '#0f241a']} 
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.container}>
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.unitToggle} onPress={() => setUnit(unit === 'km' ? 'mi' : 'km')}>
                                <Text style={styles.unitToggleText}>{unit.toUpperCase()}</Text>
                            </TouchableOpacity>
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
                                <Text style={styles.pickerTriggerText}>{activity || "Select Exercise..."}</Text>
                                <Ionicons name="chevron-down" size={20} color="#fff" />
                            </TouchableOpacity>

                            {workoutType === 'cardio' ? (
                                <View>
                                    <View style={styles.methodToggleRow}>
                                        <TouchableOpacity style={[styles.methodBtn, logMethod === 'distance' && styles.activeMethod]} onPress={() => setLogMethod('distance')}>
                                            <Text style={styles.methodText}>By Distance</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.methodBtn, logMethod === 'speed' && styles.activeMethod]} onPress={() => setLogMethod('speed')}>
                                            <Text style={styles.methodText}>By Speed</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.label}>TIME (MINS)</Text>
                                    <TextInput style={styles.input} placeholder="0" placeholderTextColor="#333" keyboardType="numeric" value={duration} onChangeText={setDuration} />

                                    {logMethod === 'distance' ? (
                                        <View style={{marginTop: 15}}>
                                            <Text style={styles.label}>DISTANCE ({unit.toUpperCase()})</Text>
                                            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#333" keyboardType="numeric" value={distance} onChangeText={setDistance} />
                                            <View style={styles.resBox}><Text style={styles.resVal}>Pace: {calculatedPace} /{unit}</Text></View>
                                        </View>
                                    ) : (
                                        <View style={{marginTop: 15}}>
                                            <Text style={styles.label}>MACHINE SPEED ({unit}/H)</Text>
                                            <TextInput style={styles.input} placeholder="0.0" placeholderTextColor="#333" keyboardType="numeric" value={speed} onChangeText={setSpeed} />
                                            <View style={styles.resBox}><Text style={styles.resVal}>Dist: {distFromSpeed} {unit}</Text></View>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.strengthRow}>
                                    <View style={{flex: 1}}><Text style={styles.label}>KG</Text><TextInput style={styles.input} placeholder="0" placeholderTextColor="#333" keyboardType="numeric" value={weight} onChangeText={setWeight} /></View>
                                    <View style={{flex: 1}}><Text style={styles.label}>SETS</Text><TextInput style={styles.input} placeholder="0" placeholderTextColor="#333" keyboardType="numeric" value={sets} onChangeText={setSets} /></View>
                                    <View style={{flex: 1}}><Text style={styles.label}>REPS</Text><TextInput style={styles.input} placeholder="0" placeholderTextColor="#333" keyboardType="numeric" value={reps} onChangeText={setReps} /></View>
                                </View>
                            )}

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkout}>
                                <Text style={styles.saveBtnText}>LOG WORKOUT</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>SELECT OR ADD ACTIVITY</Text>
                        
                        {/* QUICK ADD ROW */}
                        <View style={styles.modalAddRow}>
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="Add New Activity..." 
                                placeholderTextColor="#444" 
                                value={newActivityName} 
                                onChangeText={setNewActivityName} 
                            />
                            <TouchableOpacity onPress={() => { 
                                if(!newActivityName) return; 
                                setActivity(newActivityName); 
                                setIsAddingNew(true); 
                                setPickerVisible(false); 
                                setNewActivityName('');
                            }}>
                                <Ionicons name="add-circle" size={42} color={workoutType === 'strength' ? '#2b6cb0' : '#276749'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{marginTop: 10}}>
                            {dropdownOptions.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.optionItem} onPress={() => { 
                                    setActivity(opt); 
                                    setIsAddingNew(false);
                                    setPickerVisible(false); 
                                }}>
                                    <Text style={styles.optionText}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setPickerVisible(false)}>
                            <Text style={{color: '#fff', fontWeight: 'bold', letterSpacing: 1}}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { alignItems: 'flex-end', marginBottom: 10 },
    unitToggle: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    unitToggleText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
    card: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    mainTabRow: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 16, padding: 4, marginBottom: 25 },
    mainTab: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
    activeStrength: { backgroundColor: '#2b6cb0' },
    activeCardio: { backgroundColor: '#276749' },
    tabLabel: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    pickerTrigger: { backgroundColor: '#000', padding: 20, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#333' },
    pickerTriggerText: { color: '#fff', fontWeight: 'bold' },
    methodToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    methodBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    activeMethod: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#666' },
    methodText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    label: { color: '#555', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    input: { backgroundColor: '#000', padding: 18, borderRadius: 15, color: '#fff', fontSize: 20, fontWeight: 'bold', borderWidth: 1, borderColor: '#222' },
    resBox: { marginTop: 15, padding: 15, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
    resVal: { color: '#888', fontWeight: 'bold', fontSize: 12 },
    strengthRow: { flexDirection: 'row', gap: 12 },
    saveBtn: { backgroundColor: '#fff', padding: 22, borderRadius: 18, marginTop: 35, alignItems: 'center', shadowColor: '#fff', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.2, shadowRadius: 10 },
    saveBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%', borderWidth: 1, borderColor: '#222' },
    modalTitle: { color: '#444', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
    modalAddRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
    modalInput: { flex: 1, backgroundColor: '#111', padding: 15, borderRadius: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333' },
    optionItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
    optionText: { color: '#fff', fontSize: 18, fontWeight: '500', textAlign: 'center' },
    closeBtn: { marginTop: 20, padding: 18, backgroundColor: '#111', borderRadius: 15, alignItems: 'center' }
});