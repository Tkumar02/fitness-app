import { db } from '@/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { addDoc, collection, getDocs, query, serverTimestamp } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
// ADDED: TouchableOpacity and Platform to the imports
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function AddWorkoutScreen() {
    const { user } = useContext(UserContext);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [type, setType] = useState<'cardio' | 'strength' | 'stretch' | ''>('');
    const [subType, setSubType] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState(''); 
    const [time, setTime] = useState('');

    const [equipment, setEquipment] = useState('');
    const [customEquipmentList, setCustomEquipmentList] = useState<string[]>(['Dumbbells', 'Barbell', 'Calf press']);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newEquipmentName, setNewEquipmentName] = useState('');
    const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

    const workoutOptions: Record<string, string[]> = {
        strength: ['Arms', 'Legs', 'Back', 'Core', 'Upper Body', 'Lower Body', 'Shoulders', 'Neck'],
        cardio: ['Running', 'Rowing', 'Cycling', 'SkiERG'],
        stretch: ['Full Body', 'Yoga', 'Mobility', 'Custom'],
    };

    const [cardioUnit, setCardioUnit] = useState<'mins' | 'hrs'>('mins');

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

        let finalEquipment = equipment;

        if (isAddingNew && newEquipmentName.trim()) {
            finalEquipment = newEquipmentName.trim();
            try {
                await addDoc(collection(db, 'users', user.uid, 'customEquipment'), {
                    name: finalEquipment,
                    createdAt: serverTimestamp()
                });
            } catch (e) {
                console.error("Error saving new equipment:", e);
            }
        }

        const workoutData = {
            userId: user.uid,
            userEmail: user.email,
            date: date.toISOString().split('T')[0],
            timestamp: serverTimestamp(),
            type: type,
            areaOfFocus: subType,
            equipment: finalEquipment,
            ...(type === 'strength' && { 
                sets: Number(sets) || 0, 
                reps: Number(reps) || 0, 
                weight: Number(weight) || 0,
                unit: unit,
            }),
            ...(type === 'cardio' && { 
                timeMinutes: Number(time) || 0 
            }),
        };

        try {
            await addDoc(collection(db, 'workouts'), workoutData);
            Alert.alert("Success", "Workout logged successfully!");
            setSets('');
            setReps('');
            setWeight('');
            setTime('');
            setSubType('');
            setEquipment('');
            setIsAddingNew(false);
            setNewEquipmentName('');
        } catch (error) {
            console.error("Firebase Save Error:", error);
            Alert.alert("Error", "Could not save workout.");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Add Workout</Text>

            <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <Button title={date.toDateString()} onPress={() => setShowDatePicker(true)} />
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

            <View style={styles.section}>
                <Text style={styles.label}>Type of Workout</Text>
                {/* This View acts as the "box" for the picker */}
                <View style={styles.pickerContainer}>
                    <Picker 
                        selectedValue={type} 
                        onValueChange={(value) => { setType(value as any); setSubType(''); }}
                        mode="dropdown" // Forces a cleaner dropdown menu on Android
                    >
                        <Picker.Item label="-- Select --" value="" />
                        <Picker.Item label="Strength" value="strength" />
                        <Picker.Item label="Cardio" value="cardio" />
                    </Picker>
                </View>
            </View>

            {type && (
                <View style={styles.section}>
                    <Text style={styles.label}>{type === 'strength' ? 'Area of Focus' : 'Activity'}</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={subType} onValueChange={(value) => setSubType(value)}>
                            <Picker.Item label="-- Select --" value="" />
                            {workoutOptions[type].map((opt) => (
                                <Picker.Item key={opt} label={opt} value={opt} />
                            ))}
                        </Picker>
                    </View>
                </View>
            )}

            {type === 'strength' && (
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
                            <Picker.Item label="-- Select --" value="" />
                            {customEquipmentList.map(item => (
                                <Picker.Item key={item} label={item} value={item} />
                            ))}
                            <Picker.Item label="+ Add New..." value="ADD_NEW" color="blue" />
                        </Picker>
                    </View>
                    {isAddingNew && (
                        <TextInput
                            style={[styles.input, { marginTop: 10, borderColor: 'blue' }]}
                            placeholder="e.g. Leg Press"
                            value={newEquipmentName}
                            onChangeText={setNewEquipmentName}
                        />
                    )}
                </View>
            )}

            {type === 'strength' && (
                <View style={styles.section}>
                    <Text style={styles.label}>Sets</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={sets} onChangeText={setSets} placeholder="0" />
                    
                    <Text style={styles.label}>Reps</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={reps} onChangeText={setReps} placeholder="0" />
                    
                    <View style={styles.unitHeader}>
                        <Text style={styles.label}>Weight / Load</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity 
                                style={[styles.unitBtn, unit === 'kg' && styles.activeUnit]} 
                                onPress={() => setUnit('kg')}
                            >
                                <Text style={[styles.unitText, unit === 'kg' && styles.activeText]}>kg</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.unitBtn, unit === 'lbs' && styles.activeUnit]} 
                                onPress={() => setUnit('lbs')}
                            >
                                <Text style={[styles.unitText, unit === 'lbs' && styles.activeText]}>lbs</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={weight} 
                        onChangeText={setWeight} 
                        placeholder={`Enter weight in ${unit}`} 
                    />
                </View>
            )}

            {type === 'cardio' && (
                <View style={styles.section}>
                    <Text style={styles.label}>Time (minutes)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={time} onChangeText={setTime} placeholder="0" />
                </View>
            )}

            <View style={{ marginBottom: 40 }}>
                <Button 
                    title="Save Workout" 
                    onPress={handleSave} 
                    disabled={!type || !subType || (type === 'strength' && !equipment && !isAddingNew)} 
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    section: { marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10 },
    // Missing Styles Added Below:
    unitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    toggleRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
    unitBtn: { paddingHorizontal: 15, paddingVertical: 5, backgroundColor: '#eee' },
    activeUnit: { backgroundColor: '#2196F3' },
    unitText: { fontSize: 14, color: '#333' },
    activeText: { color: '#fff', fontWeight: 'bold' },
    label: { 
        fontSize: 16, 
        fontWeight: '600', 
        marginBottom: 5,
        color: '#333' 
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc', // This provides the outline you're missing
        borderRadius: 8,
        backgroundColor: '#ffffff',
        overflow: 'hidden', // Ensures the picker doesn't "leak" out of the rounded corners
        justifyContent: 'center',
    },
});