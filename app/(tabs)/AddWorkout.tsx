import { db } from '@/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
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

    // Form State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [type, setType] = useState<'cardio' | 'strength' | ''>('');
    const [focusArea, setFocusArea] = useState('');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<string[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');

    // Custom Picker State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerData, setPickerData] = useState<{title: string, options: string[], onSelect: (v: string) => void, isFocus: boolean}>({
        title: '', options: [], onSelect: () => {}, isFocus: false
    });

    // Numeric Stats
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState(''); 
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [duration, setDuration] = useState('');
    const [durationUnit, setDurationUnit] = useState<'mins' | 'hrs'>('mins');
    const [distance, setDistance] = useState('');
    const [trackDistance, setTrackDistance] = useState(false);

    const focusOptions = ['Arms', 'Legs', 'Back', 'Core', 'Upper Body', 'Lower Body', 'Shoulders'];
    const cardioOptions = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const defaultEquipment = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    const getCardColor = () => {
        if (type === 'strength') return isDark ? '#1a212e' : '#f0f4ff'; 
        if (type === 'cardio') return isDark ? '#1a2e21' : '#f0fff4';   
        return theme.cardDefault;
    };

    const handleNumericInput = (text: string, setter: (val: string) => void, allowDecimal: boolean = true) => {
        let cleaned = text.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
        setter(cleaned);
    };

    const handleSave = async () => {
        const finalActivity = isAddingNew ? newName : activity;
        if (!user?.uid || !type || !finalActivity) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }
        try {
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
                distance: trackDistance ? Number(distance) : 0,
                loggedAt: serverTimestamp(),
            });
            Alert.alert("Success", "Workout saved!");
            setActivity(''); setFocusArea(''); setNewName(''); setIsAddingNew(false);
            setSets(''); setReps(''); setWeight(''); setDuration(''); setDistance('');
        } catch (e) { Alert.alert("Error", "Save failed"); }
    };

    const openPicker = (title: string, options: string[], onSelect: (v: string) => void, isFocus: boolean = false) => {
        setPickerData({ title, options, onSelect, isFocus });
        setPickerVisible(true);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.cardWrapper}>
                    <View style={[styles.card, { backgroundColor: getCardColor() }]}>
                        <Text style={[styles.title, { color: theme.text }]}>Log Workout</Text>

                        {/* DATE */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Workout Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                                <Text style={{ color: theme.text }}>📅 {date.toDateString()}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* TYPE TOGGLE */}
                        <View style={[styles.toggleRow, { backgroundColor: theme.inputBg }]}>
                            <TouchableOpacity style={[styles.toggleBtn, type === 'strength' && { backgroundColor: theme.accent }]} onPress={() => {setType('strength'); setActivity('');}}>
                                <Text style={[styles.toggleText, { color: type === 'strength' ? '#fff' : theme.subtext }]}>STRENGTH</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, type === 'cardio' && { backgroundColor: theme.success }]} onPress={() => {setType('cardio'); setActivity('');}}>
                                <Text style={[styles.toggleText, { color: type === 'cardio' ? '#fff' : theme.subtext }]}>CARDIO</Text>
                            </TouchableOpacity>
                        </View>

                        {/* SELECTION BOXES */}
                        {type === 'strength' && (
                            <>
                                <Text style={styles.label}>Area of Focus</Text>
                                <TouchableOpacity 
                                    style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 15 }]}
                                    onPress={() => openPicker("Focus Area", focusOptions, setFocusArea, true)}
                                >
                                    <Text style={{ color: focusArea ? theme.text : theme.subtext }}>{focusArea || "Select Area"}</Text>
                                </TouchableOpacity>

                                <Text style={styles.label}>Equipment</Text>
                                <TouchableOpacity 
                                    style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 15 }]}
                                    onPress={() => openPicker("Equipment", [...defaultEquipment, ...customList], setActivity)}
                                >
                                    <Text style={{ color: activity ? theme.text : theme.subtext }}>{activity || "Select Equipment"}</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {type === 'cardio' && (
                            <>
                                <Text style={styles.label}>Activity</Text>
                                <TouchableOpacity 
                                    style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 15 }]}
                                    onPress={() => openPicker("Cardio Activity", cardioOptions, setActivity)}
                                >
                                    <Text style={{ color: activity ? theme.text : theme.subtext }}>{activity || "Select Activity"}</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {isAddingNew && (
                            <TextInput 
                                style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 15 }]} 
                                placeholder="Custom Name" placeholderTextColor={theme.subtext} value={newName} onChangeText={setNewName} 
                            />
                        )}

                        {/* STATS INPUTS (Only show if type is selected) */}
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

            {/* CUSTOM THEMED DROPDOWN (BOTTOM SHEET) */}
            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: theme.cardDefault }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{pickerData.title}</Text>
                        <ScrollView style={{ maxHeight: 350 }}>
                            {pickerData.options.map((opt) => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={styles.modalItem} 
                                    onPress={() => { pickerData.onSelect(opt); setIsAddingNew(false); setPickerVisible(false); }}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text }]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                            {!pickerData.isFocus && (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { setIsAddingNew(true); setPickerVisible(false); }}>
                                    <Text style={[styles.modalItemText, { color: theme.accent, fontWeight: 'bold' }]}>+ Add Custom</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeBtn}>
                            <Text style={{ color: theme.subtext, fontWeight: '700' }}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    cardWrapper: { padding: 20, alignItems: 'center', paddingTop: 40 },
    card: { width: '100%', maxWidth: 500, borderRadius: 28, padding: 25, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
    title: { fontSize: 26, fontWeight: '900', marginBottom: 25, textAlign: 'center' },
    section: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '800', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    inputContainer: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, height: 60, justifyContent: 'center' },
    inputBase: { borderWidth: 1, borderRadius: 15, padding: 16, fontSize: 16, height: 60 },
    toggleRow: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 25 },
    toggleBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
    toggleText: { fontSize: 13, fontWeight: 'bold' },
    saveBtn: { padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 25 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalHandle: { width: 40, height: 5, backgroundColor: '#38383a', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#38383a' },
    modalItemText: { fontSize: 18, textAlign: 'center' },
    closeBtn: { marginTop: 20, alignItems: 'center' }
});