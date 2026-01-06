import { db } from '@/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    addDoc,
    collection,
    deleteDoc, doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert,
    Modal, Platform,
    ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, useColorScheme, View
} from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function AddWorkoutPage() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';

    // Form State
    const [workoutType, setWorkoutType] = useState<'cardio' | 'strength'>('cardio');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<{name: string, category: string}[]>([]);
    const [pickerVisible, setPickerVisible] = useState(false);

    // Date State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Metrics State
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
    const [weight, setWeight] = useState(''); // Mapped to 'weight' for Review page
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');

    const cardioStandards = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const strengthStandards = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'users', user.uid, 'customEquipment'));
        return onSnapshot(q, (snapshot) => {
            setCustomList(snapshot.docs.map(d => ({ name: d.data().name, category: d.data().category })));
        });
    }, [user]);

    const handleSaveWorkout = async () => {
        if (!user?.uid || !activity) {
            Alert.alert("Error", "Please select an activity.");
            return;
        }

        try {
            let isGoalMet = false;
            let goalDocId = null;

            // Goal Matching Logic
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

            // MAPPING TO REVIEW PAGE FIELDS
            await addDoc(collection(db, 'workouts'), {
                userId: user.uid,
                activity: activity,
                category: workoutType,
                distance: Number(distance) || 0,
                duration: Number(duration) || 0,
                durationUnit: 'm',
                weight: Number(weight) || 0, // Review page looks for 'weight'
                weightUnit: 'kg',
                sets: Number(sets) || 0,
                reps: Number(reps) || 0,
                goalMet: isGoalMet,
                date: date.toISOString().split('T')[0], // YYYY-MM-DD
                loggedAt: serverTimestamp(), // Review page sorts by 'loggedAt'
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

    const inputBg = isDark ? '#2c2c2e' : '#f2f2f7';
    const textColor = isDark ? '#fff' : '#000';
    const cardBg = isDark ? '#1c1c1e' : '#fff';

    return (
        <ScrollView contentContainerStyle={styles.container} style={{backgroundColor: isDark ? '#121212' : '#f9fafb'}}>
            
            <TouchableOpacity style={[styles.dateBtn, {backgroundColor: cardBg}]} onPress={() => setShowDatePicker(true)}>
                <Text style={{color: textColor, fontWeight: 'bold'}}>📅 {date.toDateString()}</Text>
                <Text style={{color: '#007AFF'}}>Change</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker value={date} mode="date" display="default" 
                    onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setDate(d); }} 
                />
            )}

            <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={[styles.toggleRow, { backgroundColor: inputBg }]}>
                    <TouchableOpacity style={[styles.toggleBtn, workoutType === 'strength' && { backgroundColor: '#007AFF' }]} onPress={() => {setWorkoutType('strength'); setActivity('');}}>
                        <Text style={{ color: workoutType === 'strength' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>STRENGTH</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, workoutType === 'cardio' && { backgroundColor: '#34C759' }]} onPress={() => {setWorkoutType('cardio'); setActivity('');}}>
                        <Text style={{ color: workoutType === 'cardio' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>CARDIO</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg }]} onPress={() => setPickerVisible(true)}>
                    <Text style={{ color: activity ? textColor : '#8e8e93', fontWeight: 'bold' }}>{activity || "Select Exercise..."}</Text>
                    <Text style={{ color: '#8e8e93' }}>▼</Text>
                </TouchableOpacity>

                {workoutType === 'cardio' ? (
                    <View style={styles.row}>
                        <View style={styles.inputWrap}><Text style={styles.label}>Km</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="decimal-pad" value={distance} onChangeText={setDistance} placeholder="0" /></View>
                        <View style={styles.inputWrap}><Text style={styles.label}>Min</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={duration} onChangeText={setDuration} placeholder="0" /></View>
                    </View>
                ) : (
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.label}>Kg</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="0" /></View>
                        <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.label}>Sets</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={sets} onChangeText={setSets} placeholder="0" /></View>
                        <View style={{ flex: 1 }}><Text style={styles.label}>Reps</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={reps} onChangeText={setReps} placeholder="0" /></View>
                    </View>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkout}>
                    <Text style={styles.saveBtnText}>Log Workout</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
                        <ScrollView>{dropdownOptions.map((opt) => (
                            <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { setActivity(opt); setPickerVisible(false); }}>
                                <Text style={[styles.modalItemText, { color: textColor }]}>{opt}</Text>
                            </TouchableOpacity>
                        ))}</ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, flexGrow: 1 },
    dateBtn: { padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    card: { padding: 20, borderRadius: 25 },
    toggleRow: { flexDirection: 'row', padding: 5, borderRadius: 12, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    picker: { padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    inputWrap: { flex: 0.48 },
    label: { fontSize: 10, fontWeight: 'bold', color: '#8e8e93', marginBottom: 5 },
    input: { padding: 15, borderRadius: 12, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    saveBtn: { backgroundColor: '#34C759', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '50%' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
    modalItemText: { fontSize: 18, textAlign: 'center' }
});