import { db } from '@/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { addDoc, collection, getDocs, query, serverTimestamp } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function AddWorkoutScreen() {
    const { user } = useContext(UserContext);
    
    // Form State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [type, setType] = useState<'cardio' | 'strength' | 'stretch' | ''>('');
    const [subType, setSubType] = useState(''); // Used for Area of Focus (Strength) or Activity (Cardio)
    
    // Stats State
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState(''); 
    const [time, setTime] = useState('');
    const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
    const [cardioUnit, setCardioUnit] = useState<'mins' | 'hrs'>('mins');

    // Equipment / Custom Activity State
    const [equipment, setEquipment] = useState('');
    const [customEquipmentList, setCustomEquipmentList] = useState<string[]>(['Dumbbells', 'Barbell', 'Calf press']);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');

    const workoutOptions: Record<string, string[]> = {
        strength: ['Arms', 'Legs', 'Back', 'Core', 'Upper Body', 'Lower Body', 'Shoulders', 'Neck'],
        cardio: ['Running', 'Rowing', 'Cycling', 'SkiERG'],
        stretch: ['Full Body', 'Yoga', 'Mobility', 'Custom'],
    };

    useEffect(() => {
        const loadEquipment = async () => {
            if (!user?.uid) return;
            const q = query(collection(db, 'users', user.uid, 'customEquipment'));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => doc.data().name);
            setCustomEquipmentList(prev => Array.from(new Set([...prev, ...fetched])));
        };
        loadEquipment();
    }, [user]);

    const handleSave = async () => {
        if (!user?.uid) {
            Alert.alert("Error", "User not authenticated");
            return;
        }

        let finalItemName = "";
        
        // Handle custom names if "Add New" was toggled
        if (isAddingNew && newName.trim()) {
            finalItemName = newName.trim();
            try {
                await addDoc(collection(db, 'users', user.uid, 'customEquipment'), {
                    name: finalItemName,
                    type: type,
                    createdAt: serverTimestamp()
                });
            } catch (e) { console.error(e); }
        }

        const workoutData: any = {
            userId: user.uid,
            userEmail: user.email,
            date: date.toISOString().split('T')[0],
            timestamp: serverTimestamp(),
            category: type,
        };

        if (type === 'strength') {
            workoutData.areaOfFocus = subType;
            workoutData.equipment = isAddingNew ? finalItemName : equipment;
            workoutData.sets = Number(sets) || 0;
            workoutData.reps = Number(reps) || 0;
            workoutData.weight = Number(weight) || 0;
            workoutData.weightUnit = unit;
        } else if (type === 'cardio') {
            workoutData.activity = isAddingNew ? finalItemName : subType;
            workoutData.duration = Number(time) || 0;
            workoutData.durationUnit = cardioUnit;
        }

        try {
            await addDoc(collection(db, 'workouts'), workoutData);
            Alert.alert("Success", "Workout logged!");
            
            // Reset Form
            setSets(''); setReps(''); setWeight(''); setTime('');
            setSubType(''); setEquipment(''); setIsAddingNew(false);
            setNewName('');
        } catch (error) {
            Alert.alert("Error", "Save failed");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Add Workout</Text>

            {/* Date Section */}
            <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>{date.toDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDate(selectedDate);
                        }}
                    />
                )}
            </View>

            {/* Workout Type Section */}
            <View style={styles.section}>
                <Text style={styles.label}>Type of Workout</Text>
                <View style={styles.pickerContainer}>
                    <Picker 
                        selectedValue={type} 
                        onValueChange={(value) => { 
                            setType(value as any); 
                            setSubType(''); 
                            setIsAddingNew(false); 
                        }}
                    >
                        <Picker.Item label="-- Select Type --" value="" />
                        <Picker.Item label="Strength" value="strength" />
                        <Picker.Item label="Cardio" value="cardio" />
                    </Picker>
                </View>
            </View>

            {/* Strength UI */}
            {type === 'strength' && (
                <View>
                    <View style={styles.section}>
                        <Text style={styles.label}>Area of Focus</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={subType} onValueChange={(v) => setSubType(v)}>
                                <Picker.Item label="-- Select Area --" value="" />
                                {workoutOptions.strength.map((opt) => (
                                    <Picker.Item key={opt} label={opt} value={opt} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Equipment / Machine</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={isAddingNew ? "ADD_NEW" : equipment}
                                onValueChange={(val) => {
                                    if (val === "ADD_NEW") setIsAddingNew(true);
                                    else { setIsAddingNew(false); setEquipment(val); }
                                }}
                            >
                                <Picker.Item label="-- Select Equipment --" value="" />
                                {customEquipmentList.map(item => (
                                    <Picker.Item key={item} label={item} value={item} />
                                ))}
                                <Picker.Item label="+ Add New..." value="ADD_NEW" color="blue" />
                            </Picker>
                        </View>
                        {isAddingNew && (
                            <TextInput
                                style={[styles.input, styles.extraMargin]}
                                placeholder="Enter machine name"
                                value={newName}
                                onChangeText={setNewName}
                            />
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Sets & Reps</Text>
                        <View style={styles.row}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} keyboardType="numeric" value={sets} onChangeText={setSets} placeholder="Sets" />
                            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={reps} onChangeText={setReps} placeholder="Reps" />
                        </View>

                        <View style={styles.unitHeader}>
                            <Text style={styles.label}>Weight / Load</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity style={[styles.unitBtn, unit === 'kg' && styles.activeUnit]} onPress={() => setUnit('kg')}>
                                    <Text style={[styles.unitText, unit === 'kg' && styles.activeText]}>kg</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.unitBtn, unit === 'lbs' && styles.activeUnit]} onPress={() => setUnit('lbs')}>
                                    <Text style={[styles.unitText, unit === 'lbs' && styles.activeText]}>lbs</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder={`Weight in ${unit}`} />
                    </View>
                </View>
            )}

            {/* Cardio UI */}
            {type === 'cardio' && (
                <View>
                    <View style={styles.section}>
                        <Text style={styles.label}>Activity</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={isAddingNew ? "ADD_NEW" : subType}
                                onValueChange={(val) => {
                                    if (val === "ADD_NEW") setIsAddingNew(true);
                                    else { setIsAddingNew(false); setSubType(val); }
                                }}
                            >
                                <Picker.Item label="-- Select Activity --" value="" />
                                {workoutOptions.cardio.map((opt) => (
                                    <Picker.Item key={opt} label={opt} value={opt} />
                                ))}
                                <Picker.Item label="+ Add New..." value="ADD_NEW" color="blue" />
                            </Picker>
                        </View>
                        {isAddingNew && (
                            <TextInput
                                style={[styles.input, styles.extraMargin]}
                                placeholder="Enter custom activity"
                                value={newName}
                                onChangeText={setNewName}
                            />
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.unitHeader}>
                            <Text style={styles.label}>Duration</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity style={[styles.unitBtn, cardioUnit === 'mins' && styles.activeUnit]} onPress={() => setCardioUnit('mins')}>
                                    <Text style={[styles.unitText, cardioUnit === 'mins' && styles.activeText]}>mins</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.unitBtn, cardioUnit === 'hrs' && styles.activeUnit]} onPress={() => setCardioUnit('hrs')}>
                                    <Text style={[styles.unitText, cardioUnit === 'hrs' && styles.activeText]}>hrs</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TextInput style={styles.input} keyboardType="numeric" value={time} onChangeText={setTime} placeholder={`Enter time in ${cardioUnit}`} />
                    </View>
                </View>
            )}

            <View style={styles.saveSection}>
                <Button 
                    title="Save Workout" 
                    onPress={handleSave} 
                    disabled={!type || (!subType && !newName)} 
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
    section: { marginBottom: 25 }, // Increased spacing between blocks
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, backgroundColor: '#fff' },
    extraMargin: { marginTop: 12 },
    row: { flexDirection: 'row' },
    dateBtn: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center' },
    dateText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
    pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
    unitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 5 },
    toggleRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
    unitBtn: { paddingHorizontal: 15, paddingVertical: 6, backgroundColor: '#eee' },
    activeUnit: { backgroundColor: '#2196F3' },
    unitText: { fontSize: 13, color: '#333' },
    activeText: { color: '#fff', fontWeight: 'bold' },
    saveSection: { marginTop: 10, marginBottom: 50 }
});