import { UserContext } from '@/context/UserContext';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
// Import your modal component
import AddExerciseModal from '../screens/AddExerciseModal';

export default function CreateRegime() {
  const { user } = useContext(UserContext);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  
  const editingTemplate = route.params?.template;

  // State
  const [regimeName, setRegimeName] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [customExercises, setCustomExercises] = useState<any[]>([]);

  // 1. Handle Pre-population and Reset
  useEffect(() => {
    if (editingTemplate) {
      setRegimeName(editingTemplate.name || '');
      setExercises(editingTemplate.exercises || []);
    } else {
      setRegimeName('');
      setExercises([]);
    }
  }, [editingTemplate, route.params]);

  // 2. Fetch Custom Exercises (for the Modal)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'customEquipment'));
    return onSnapshot(q, (snap) => {
      setCustomExercises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // 3. Logic to add exercise from Modal to List
  const handleAddExerciseToList = (exerciseData: any) => {
    setExercises((prev) => [...prev, exerciseData]);
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handleSave = async () => {
    if (!regimeName.trim() || exercises.length === 0) return;

    const data = {
      name: regimeName,
      exercises,
      userId: user?.uid,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingTemplate?.id) {
        await updateDoc(doc(db, 'templates', editingTemplate.id), data);
      } else {
        await addDoc(collection(db, 'templates'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      navigation.navigate('TemplateList');
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f2f2f7' }]}>
      {/* Header Info */}
      <TextInput
        style={[styles.input, { 
          color: isDark ? '#fff' : '#000', 
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
          borderColor: isDark ? '#333' : '#ddd',
          borderWidth: 1
        }]}
        placeholder="Regime Name (e.g. Push Day)"
        placeholderTextColor="#888"
        value={regimeName}
        onChangeText={setRegimeName}
      />

      <Text style={[styles.sectionTitle, { color: isDark ? '#aaa' : '#555' }]}>EXERCISES</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item, index) => item.id + index}
        renderItem={({ item }) => (
          <View style={[styles.exCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                {item.category === 'strength' 
                  ? `${item.sets} sets • ${item.reps} reps • ${item.weight}${item.unit || 'kg'}` 
                  : `${item.duration}m • ${item.metricValue}${item.unit || 'km'} (${item.focus})`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeExercise(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff453a" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={48} color="#888" />
            <Text style={{ color: '#888', marginTop: 10 }}>No exercises added yet.</Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]} 
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={[styles.addBtnText, { color: '#007AFF' }]}>Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{editingTemplate ? 'Update Regime' : 'Save Regime'}</Text>
        </TouchableOpacity>
      </View>

      {/* RESTORED MODAL */}
      <AddExerciseModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onAdd={handleAddExerciseToList}
        customList={customExercises}
        user={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  input: { padding: 18, borderRadius: 15, fontSize: 18, fontWeight: '700', marginBottom: 25 },
  exCard: { flexDirection: 'row', padding: 18, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
  deleteBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  footer: { marginTop: 20, gap: 10 },
  addBtn: { flexDirection: 'row', padding: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { fontWeight: '700', fontSize: 16 },
  saveBtn: { padding: 20, borderRadius: 15, backgroundColor: '#007AFF', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});