import { db } from '@/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { addDoc, collection, getDocs, query, serverTimestamp } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { UserContext } from '../context/UserContext';

// Placeholder Assets - Update these with your local paths
const STRENGTH_BG = require('../../assets/images/bg-weights.png'); 
const CARDIO_BG = require('../../assets/images/bg-multicolour.png');
const DEFAULT_BG = require('../../assets/images/bg-combo.png');

export default function AddWorkoutScreen() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.92)', // Added slight transparency for BG effect
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        inputBg: isDark ? '#2c2c2e' : '#f2f2f7',
        border: isDark ? '#38383a' : '#e5e5ea',
        accent: '#007AFF',
        success: '#34C759'
    };

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [type, setType] = useState<'cardio' | 'strength' | ''>('');
    const [focusArea, setFocusArea] = useState('');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<string[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');

    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState(''); 
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [time, setTime] = useState('');
    const [distance, setDistance] = useState('');
    const [trackDistance, setTrackDistance] = useState(false);

    const focusOptions = ['Arms', 'Legs', 'Back', 'Core', 'Upper Body', 'Lower Body', 'Shoulders'];
    const cardioOptions = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const defaultEquipment = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    // Determine which image to show
    const getBackgroundImage = () => {
        if (type === 'strength') return STRENGTH_BG;
        if (type === 'cardio') return CARDIO_BG;
        return DEFAULT_BG;
    };

    useEffect(() => {
        const loadCustom = async () => {
            if (!user?.uid) return;
            const q = query(collection(db, 'users', user.uid, 'customEquipment'));
            const snapshot = await getDocs(q);
            setCustomList(snapshot.docs.map(doc => doc.data().name));
        };
        loadCustom();
    }, [user]);

    const handleNumericInput = (text: string, setter: (val: string) => void, allowDecimal: boolean = true) => {
        let cleaned = text.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
        if (allowDecimal) {
            const parts = cleaned.split('.');
            if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        setter(cleaned);
    };

    const handleSave = async () => {
        const finalActivity = isAddingNew ? newName : activity;
        if (!user?.uid || !type || !finalActivity) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        try {
            if (isAddingNew) {
                await addDoc(collection(db, 'users', user.uid, 'customEquipment'), { name: newName, type });
            }

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
                duration: Number(time) || 0,
                distance: trackDistance ? Number(distance) : 0,
                loggedAt: serverTimestamp(),
            });

            Alert.alert("Success", "Workout saved!");
            setActivity(''); setFocusArea(''); setNewName(''); setIsAddingNew(false);
            setSets(''); setReps(''); setWeight(''); setTime(''); setDistance('');
        } catch (e) { Alert.alert("Error", "Save failed"); }
    };

    return (
        <View style={{ flex: 1 }}>
            <ImageBackground source={getBackgroundImage()} style={styles.backgroundImage}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                    {Platform.OS === 'web' && (
                        <style dangerouslySetInnerHTML={{ __html: `
                            input[type="date"] { box-sizing: border-box; width: 100% !important; border: none !important; background: transparent !important; color: ${theme.text} !important; font-size: 16px; outline: none; }
                            select { background-color: transparent !important; color: ${theme.text} !important; border: none !important; width: 100% !important; outline: none !important; height: 100%; font-size: 16px; cursor: pointer; }
                            option { background-color: ${isDark ? '#1c1c1e' : '#ffffff'} !important; color: ${theme.text} !important; }
                        `}} />
                    )}

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.cardWrapper}>
                            <View style={[styles.card, { backgroundColor: theme.card }]}>
                                <Text style={[styles.title, { color: theme.text }]}>Log Workout</Text>

                                {/* DATE SECTION */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>Workout Date</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                                        {Platform.OS === 'web' ? (
                                            <input type="date" value={date.toISOString().split('T')[0]} onChange={(e) => setDate(new Date(e.target.value))} />
                                        ) : (
                                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerInner}>
                                                <Text style={{ color: theme.text }}>📅 {date.toDateString()}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {/* TYPE TOGGLE */}
                                <View style={[styles.toggleRow, { backgroundColor: theme.inputBg }]}>
                                    {['strength', 'cardio'].map((t) => (
                                        <TouchableOpacity 
                                            key={t}
                                            style={[styles.toggleBtn, type === t && { backgroundColor: isDark ? '#444' : '#fff', elevation: 2 }]}
                                            onPress={() => { setType(t as any); setActivity(''); setFocusArea(''); setIsAddingNew(false); }}
                                        >
                                            <Text style={[styles.toggleText, { color: type === t ? theme.text : theme.subtext }]}>{t.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* STRENGTH SELECTION */}
                                {type === 'strength' && (
                                    <View>
                                        <Text style={styles.label}>Area of Focus</Text>
                                        <View style={[styles.pickerContainer, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                                            <Picker selectedValue={focusArea} onValueChange={setFocusArea} style={{ color: theme.text }} dropdownIconColor={theme.text}>
                                                <Picker.Item label="Select Area" value="" color={theme.subtext} />
                                                {focusOptions.map(o => <Picker.Item key={o} label={o} value={o} color={isDark ? '#fff' : '#000'} />)}
                                            </Picker>
                                        </View>

                                        <Text style={styles.label}>Equipment / Activity</Text>
                                        <View style={[styles.pickerContainer, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                                            <Picker 
                                                selectedValue={isAddingNew ? "NEW" : activity} 
                                                onValueChange={(val) => val === "NEW" ? setIsAddingNew(true) : (setIsAddingNew(false), setActivity(val))} 
                                                style={{ color: theme.text }} dropdownIconColor={theme.text}
                                            >
                                                <Picker.Item label="Select Equipment" value="" color={theme.subtext} />
                                                {[...defaultEquipment, ...customList].map(o => <Picker.Item key={o} label={o} value={o} color={isDark ? '#fff' : '#000'} />)}
                                                <Picker.Item label="+ Add Custom" value="NEW" color={theme.accent} />
                                            </Picker>
                                        </View>
                                    </View>
                                )}

                                {/* CARDIO SELECTION */}
                                {type === 'cardio' && (
                                    <View>
                                        <Text style={styles.label}>Cardio Activity</Text>
                                        <View style={[styles.pickerContainer, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                                            <Picker selectedValue={activity} onValueChange={setActivity} style={{ color: theme.text }} dropdownIconColor={theme.text}>
                                                <Picker.Item label="Select Activity" value="" color={theme.subtext} />
                                                {cardioOptions.map(o => <Picker.Item key={o} label={o} value={o} color={isDark ? '#fff' : '#000'} />)}
                                            </Picker>
                                        </View>
                                    </View>
                                )}

                                {isAddingNew && (
                                    <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, marginBottom: 15 }]} placeholder="Equipment Name" placeholderTextColor={theme.subtext} value={newName} onChangeText={setNewName} />
                                )}

                                {/* STATS INPUTS */}
                                {type !== '' && (
                                    <View>
                                        {type === 'strength' ? (
                                            <View>
                                                <View style={styles.row}>
                                                    <View style={{flex: 1, marginRight: 10}}>
                                                        <Text style={styles.label}>Sets</Text>
                                                        <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} keyboardType="number-pad" value={sets} onChangeText={(t) => handleNumericInput(t, setSets, false)} placeholder="0" placeholderTextColor={theme.subtext} />
                                                    </View>
                                                    <View style={{flex: 1}}>
                                                        <Text style={styles.label}>Reps</Text>
                                                        <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} keyboardType="number-pad" value={reps} onChangeText={(t) => handleNumericInput(t, setReps, false)} placeholder="0" placeholderTextColor={theme.subtext} />
                                                    </View>
                                                </View>
                                                <View style={{marginTop: 15}}>
                                                    <View style={styles.labelRow}>
                                                        <Text style={styles.label}>Weight</Text>
                                                        <TouchableOpacity onPress={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}>
                                                            <Text style={{color: theme.accent, fontSize: 12, fontWeight: '800'}}>USE {weightUnit === 'kg' ? 'LBS' : 'KG'}</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} keyboardType="decimal-pad" value={weight} onChangeText={(t) => handleNumericInput(t, setWeight, true)} placeholder={`0.0 ${weightUnit}`} placeholderTextColor={theme.subtext} />
                                                </View>
                                            </View>
                                        ) : (
                                            <View>
                                                <Text style={styles.label}>Duration</Text>
                                                <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} keyboardType="number-pad" value={time} onChangeText={(t) => handleNumericInput(t, setTime, false)} placeholder="0 mins" placeholderTextColor={theme.subtext} />
                                                <TouchableOpacity style={[styles.distanceToggle, { borderColor: trackDistance ? theme.success : theme.border, backgroundColor: trackDistance ? 'rgba(52,199,89,0.1)' : 'transparent' }]} onPress={() => setTrackDistance(!trackDistance)}>
                                                    <Text style={{ color: trackDistance ? theme.success : theme.subtext, fontWeight: '700' }}>{trackDistance ? '✓ Tracking Distance' : '+ Add Distance'}</Text>
                                                </TouchableOpacity>
                                                {trackDistance && <TextInput style={[styles.inputBase, { backgroundColor: theme.inputBg, borderColor: theme.success, color: theme.text }]} keyboardType="decimal-pad" value={distance} onChangeText={(t) => handleNumericInput(t, setDistance, true)} placeholder="0.0 km" placeholderTextColor={theme.subtext} />}
                                            </View>
                                        )}

                                        <TouchableOpacity style={[styles.saveBtn, { opacity: (!activity && !newName) ? 0.6 : 1 }]} onPress={handleSave} disabled={!activity && !newName}>
                                            <Text style={styles.saveBtnText}>Save Workout</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        {showDatePicker && Platform.OS !== 'web' && (
                            <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} />
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, resizeMode: 'cover' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    cardWrapper: { padding: 20, alignItems: 'center', marginVertical: 40 },
    card: { width: '100%', maxWidth: 500, borderRadius: 28, padding: 25, elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 25 },
    title: { fontSize: 28, fontWeight: '900', marginBottom: 25, textAlign: 'center' },
    section: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '800', color: '#8e8e93', marginBottom: 8, textTransform: 'uppercase' },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    inputContainer: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, height: 60, justifyContent: 'center' },
    pickerInner: { width: '100%', height: '100%', justifyContent: 'center' },
    inputBase: { borderWidth: 1, borderRadius: 15, padding: 16, fontSize: 16, height: 60 },
    pickerContainer: { borderWidth: 1, borderRadius: 15, marginBottom: 20, height: 60, justifyContent: 'center', overflow: 'hidden' },
    toggleRow: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 25 },
    toggleBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
    toggleText: { fontSize: 14, fontWeight: 'bold' },
    distanceToggle: { padding: 18, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginVertical: 15 },
    saveBtn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 25 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    row: { flexDirection: 'row' }
});