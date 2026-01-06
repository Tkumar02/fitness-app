import { db } from '@/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
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
import { UserContext } from '../context/UserContext';

export default function AddWorkoutScreen() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        cardDefault: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        inputBg: isDark ? '#2c2c2e' : '#f2f2f7',
        border: isDark ? '#38383a' : '#e5e5ea',
        accent: '#007AFF',
        success: '#34C759'
    };

    // States
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [type, setType] = useState<'cardio' | 'strength' | ''>('');
    const [focusArea, setFocusArea] = useState('');
    const [activity, setActivity] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [customLibrary, setCustomLibrary] = useState<{name: string, category: string}[]>([]);

    // Picker Modal States
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerData, setPickerData] = useState<{title: string, options: string[], onSelect: (v: string) => void, isFocus: boolean}>({
        title: '', options: [], onSelect: () => {}, isFocus: false
    });

    // Metric States
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState(''); 
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [duration, setDuration] = useState('');
    const [durationUnit, setDurationUnit] = useState<'mins' | 'hrs'>('mins');
    const [distance, setDistance] = useState('');
    const [trackDistance, setTrackDistance] = useState(false);

    // Hardcoded Standards
    const focusOptions = ['Arms', 'Legs', 'Back', 'Core', 'Upper Body', 'Lower Body', 'Shoulders'];
    const cardioOptions = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const defaultEquipment = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    // 1. LISTEN TO CUSTOM LIBRARY (Syncs with Goals Page)
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'users', user.uid, 'customEquipment'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                name: doc.data().name,
                category: doc.data().category
            }));
            setCustomLibrary(list);
        });
        return () => unsubscribe();
    }, [user]);

    // 2. DYNAMIC OPTIONS LOGIC
    const getDynamicOptions = (currentType: 'cardio' | 'strength') => {
        const hardcoded = currentType === 'cardio' ? cardioOptions : defaultEquipment;
        const customs = customLibrary
            .filter(item => item.category === currentType)
            .map(item => item.name);
        
        // Remove duplicates if a custom name matches a hardcoded one
        return Array.from(new Set([...hardcoded, ...customs]));
    };

    const handleNumericInput = (text: string, setter: (val: string) => void, allowDecimal: boolean = true) => {
        let cleaned = text.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
        setter(cleaned);
    };

const handleSave = async () => {
    const finalActivity = isAddingNew ? newName.trim() : activity;

    if (!user?.uid || !type || !finalActivity) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
    }

    try {
        // 1. FETCH CURRENT GOALS FOR COMPARISON
        const goalRef = doc(db, 'users', user.uid, 'settings', 'goals');
        const goalSnap = await getDoc(goalRef);
        let isGoalMet = false;

        if (goalSnap.exists()) {
            const g = goalSnap.data();
            const targetAct = String(g.activity || '').toLowerCase().trim();
            const currentAct = finalActivity.toLowerCase().trim();

            // Only check goals if the activity matches
            if (targetAct === currentAct) {
                const wDist = Number(distance) || 0;
                const wTime = Number(duration) || 0;
                const gDist = Number(g.distGoal) || 0;
                const gTime = Number(g.timeGoal) || 0;

                // Check if workout exceeds distance OR duration goals
                const distMet = gDist > 0 && wDist >= gDist;
                const timeMet = gTime > 0 && wTime >= gTime;

                if (distMet || timeMet) {
                    isGoalMet = true;
                }
            }
        }

        // 2. LOG THE WORKOUT WITH THE 'goalMet' TAG
        await addDoc(collection(db, 'workouts'), {
            userId: user.uid,
            date: date.toISOString().split('T')[0],
            category: type,
            activity: finalActivity,
            focusArea: type === 'strength' ? focusArea : null,
            sets: Number(sets) || 0,
            reps: Number(reps) || 0,
            weight: Number(weight) || 0,
            weightUnit: type === 'strength' ? weightUnit : null,
            duration: Number(duration) || 0,
            durationUnit: type === 'cardio' ? durationUnit : null,
            distance: type === 'cardio' && trackDistance ? Number(distance) : 0,
            goalMet: isGoalMet, // This "stamps" the achievement forever
            loggedAt: serverTimestamp(),
        });

        // 3. UPDATE CUSTOM LIBRARY
        if (isAddingNew) {
            await setDoc(doc(db, 'users', user.uid, 'customEquipment', finalActivity), {
                name: finalActivity,
                category: type,
                createdAt: serverTimestamp()
            });
        }

        // Feedback and Reset
        if (isGoalMet) {
            Alert.alert("GOAL MET! 🏆", `Incredible work! You hit your goal for ${finalActivity}.`);
        } else {
            Alert.alert("Success", "Workout logged!");
        }

        setActivity(''); 
        setFocusArea(''); 
        setNewName(''); 
        setIsAddingNew(false);
        setSets(''); 
        setReps(''); 
        setWeight(''); 
        setDuration(''); 
        setDistance('');

    } catch (e) {
        console.error("Save Error:", e);
        Alert.alert("Error", "Save failed. Please check your connection.");
    }
};

    const openPicker = (title: string, options: string[], onSelect: (v: string) => void, isFocus: boolean = false) => {
        setPickerData({ title, options, onSelect, isFocus });
        setPickerVisible(true);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.cardWrapper}>
                    <View style={[styles.card, { backgroundColor: type === 'strength' ? (isDark ? '#1a212e' : '#f0f4ff') : type === 'cardio' ? (isDark ? '#1a2e21' : '#f0fff4') : theme.cardDefault }]}>
                        <Text style={[styles.title, { color: theme.text }]}>Log Workout</Text>

                        {/* Date Picker */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Workout Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                                <Text style={{ color: theme.text }}>📅 {date.toDateString()}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Category Toggle */}
                        <View style={[styles.toggleRow, { backgroundColor: theme.inputBg }]}>
                            <TouchableOpacity style={[styles.toggleBtn, type === 'strength' && { backgroundColor: theme.accent }]} onPress={() => {setType('strength'); setActivity(''); setIsAddingNew(false);}}>
                                <Text style={[styles.toggleText, { color: type === 'strength' ? '#fff' : theme.subtext }]}>STRENGTH</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, type === 'cardio' && { backgroundColor: theme.success }]} onPress={() => {setType('cardio'); setActivity(''); setIsAddingNew(false);}}>
                                <Text style={[styles.toggleText, { color: type === 'cardio' ? '#fff' : theme.subtext }]}>CARDIO</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Strength Fields */}
                        {type === 'strength' && (
                            <>
                                <Text style={styles.label}>Area of Focus</Text>
                                <TouchableOpacity style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 15 }]} onPress={() => openPicker("Focus Area", focusOptions, setFocusArea, true)}>
                                    <Text style={{ color: focusArea ? theme.text : theme.subtext }}>{focusArea || "Select Area"}</Text>
                                </TouchableOpacity>
                                
                                <Text style={styles.label}>Equipment</Text>
                                <TouchableOpacity style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 15 }]} onPress={() => openPicker("Equipment", getDynamicOptions('strength'), setActivity)}>
                                    <Text style={{ color: activity ? theme.text : theme.subtext }}>{activity || "Select Equipment"}</Text>
                                </TouchableOpacity>
                                
                                <View style={styles.statsGrid}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Sets</Text>
                                        <TextInput style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" value={sets} onChangeText={(t) => handleNumericInput(t, setSets, false)} placeholder="0" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Reps</Text>
                                        <TextInput style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" value={reps} onChangeText={(t) => handleNumericInput(t, setReps, false)} placeholder="0" />
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={styles.label}>Weight</Text>
                                        <View style={styles.weightInputRow}>
                                            <TextInput style={[styles.smallInput, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} keyboardType="numeric" value={weight} onChangeText={(t) => handleNumericInput(t, setWeight)} placeholder="0" />
                                            <TouchableOpacity onPress={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')} style={[styles.unitToggle, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                                                <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 10 }}>{weightUnit.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Cardio Fields */}
                        {type === 'cardio' && (
                            <>
                                <Text style={styles.label}>Activity</Text>
                                <TouchableOpacity style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 15 }]} onPress={() => openPicker("Cardio Activity", getDynamicOptions('cardio'), setActivity)}>
                                    <Text style={{ color: activity ? theme.text : theme.subtext }}>{activity || "Select Activity"}</Text>
                                </TouchableOpacity>
                                
                                <View style={styles.statsGrid}>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={styles.label}>Duration</Text>
                                        <TextInput style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" value={duration} onChangeText={(t) => handleNumericInput(t, setDuration)} placeholder="0" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Unit</Text>
                                        <TouchableOpacity onPress={() => setDurationUnit(durationUnit === 'mins' ? 'hrs' : 'mins')} style={[styles.smallInput, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ color: theme.text }}>{durationUnit}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity onPress={() => setTrackDistance(!trackDistance)} style={styles.distanceCheck}>
                                    <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: trackDistance ? theme.success : 'transparent' }]}>{trackDistance && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}</View>
                                    <Text style={[styles.label, { marginBottom: 0, marginLeft: 10 }]}>Track Distance (km)</Text>
                                </TouchableOpacity>
                                {trackDistance && (
                                    <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginTop: 10 }]} keyboardType="numeric" placeholder="km" value={distance} onChangeText={(t) => handleNumericInput(t, setDistance)} />
                                )}
                            </>
                        )}

                        {/* Custom Input Field */}
                        {isAddingNew && (
                            <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.accent, color: theme.text, marginBottom: 15, marginTop: 10, borderWidth: 2 }]} placeholder="Type Custom Name..." placeholderTextColor={theme.subtext} value={newName} onChangeText={setNewName} />
                        )}

                        {type !== '' && (
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: type === 'strength' ? theme.accent : theme.success }]} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>Save {type.toUpperCase()} Workout</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} />
                )}
            </ScrollView>

            {/* Custom Picker Modal */}
            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: theme.cardDefault }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{pickerData.title}</Text>
                        <ScrollView style={{ maxHeight: 350 }}>
                            {pickerData.options.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { pickerData.onSelect(opt); setIsAddingNew(false); setPickerVisible(false); }}>
                                    <Text style={[styles.modalItemText, { color: theme.text }]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                            {!pickerData.isFocus && (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { setIsAddingNew(true); setPickerVisible(false); }}>
                                    <Text style={[styles.modalItemText, { color: theme.accent, fontWeight: 'bold' }]}>+ Add Custom</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    cardWrapper: { padding: 20, alignItems: 'center', paddingTop: 40 },
    card: { width: '100%', maxWidth: 500, borderRadius: 28, padding: 25, elevation: 10 },
    title: { fontSize: 26, fontWeight: '900', marginBottom: 25, textAlign: 'center' },
    section: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '800', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase' },
    inputContainer: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, height: 60, justifyContent: 'center' },
    inputBase: { borderWidth: 1, borderRadius: 15, padding: 16, fontSize: 16, height: 60 },
    // Find these specific styles in your StyleSheet at the bottom:

    statsGrid: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 5, 
        marginBottom: 15,
        width: '100%', // Explicitly set width
        gap: 8, // Use gap instead of manual margins for better web compatibility
    },
    weightInputRow: { 
        flexDirection: 'row', 
        alignItems: 'center',
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden', // Keeps the toggle from "leaking" out
    },
    unitToggle: { 
        height: 50, 
        paddingHorizontal: 8, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderTopRightRadius: 12, 
        borderBottomRightRadius: 12, 
        borderWidth: 1,
        minWidth: 45, // Ensures the button doesn't shrink too much
    },
    smallInput: { 
        borderWidth: 1, 
        borderRadius: 12, 
        padding: 10, 
        fontSize: 14, // Slightly smaller font helps web inputs stay contained
        height: 50, 
        textAlign: 'center' 
    },
    distanceCheck: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    checkbox: { width: 22, height: 22, borderWidth: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    toggleRow: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 25 },
    toggleBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
    toggleText: { fontSize: 13, fontWeight: 'bold' },
    saveBtn: { padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 25 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalHandle: { width: 40, height: 5, backgroundColor: '#38383a', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#38383a' },
    modalItemText: { fontSize: 18, textAlign: 'center' }
});