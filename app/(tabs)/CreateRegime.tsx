import { UserContext } from '@/context/UserContext';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
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
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [customExercises, setCustomExercises] = useState<any[]>([]);
  
  // Trainer features
  const [clients, setClients] = useState<any[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  // 1. Handle Pre-population and Reset
  useEffect(() => {
    if (editingTemplate) {
      setRegimeName(editingTemplate.name || '');
      setDescription(editingTemplate.description || '');
      setExercises(editingTemplate.exercises || []);
      setSharedWith(editingTemplate.sharedWith || []);
    } else {
      setRegimeName('');
      setDescription('');
      setExercises([]);
      setSharedWith([]);
    }
  }, [editingTemplate, route.params]);

  // 2. Fetch Custom Exercises and Clients
  useEffect(() => {
    if (!user?.uid) return;
    
    // Fetch custom equipment
    const qCustom = query(collection(db, 'users', user.uid, 'customEquipment'));
    const unsubCustom = onSnapshot(qCustom, (snap) => {
      setCustomExercises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch clients if user is a trainer
    if (user.role === 'trainer') {
        const qClients = query(collection(db, 'users'), where('trainerId', '==', user.uid));
        getDocs(qClients).then(snap => {
            setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }

    return () => unsubCustom();
  }, [user]);

  // 3. Logic to add exercise from Modal to List
  const handleAddExerciseToList = (exerciseData: any) => {
    setExercises((prev) => [...prev, exerciseData]);
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const toggleClientSelection = (clientId: string) => {
    setSharedWith(prev => 
        prev.includes(clientId) 
            ? prev.filter(id => id !== clientId) 
            : [...prev, clientId]
    );
  };

  const handleSave = async () => {
    if (!regimeName.trim() || exercises.length === 0) return;

    const data = {
      name: regimeName,
      description: description.trim(),
      exercises,
      userId: user?.uid,
      creatorName: user?.name || user?.username || user?.email || 'Trainer',
      sharedWith: user?.role === 'trainer' ? sharedWith : [],
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

      {user?.role === 'trainer' && (
        <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#aaa' : '#555' }]}>ASSIGN TO CLIENTS</Text>
            {clients.length === 0 ? (
                <Text style={{ color: '#888', fontSize: 13, fontStyle: 'italic' }}>No clients have selected you as their trainer yet.</Text>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {clients.map(client => (
                        <TouchableOpacity 
                            key={client.id}
                            style={{
                                paddingHorizontal: 15,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: sharedWith.includes(client.id) ? '#007AFF' : (isDark ? '#1c1c1e' : '#fff'),
                                borderWidth: 1,
                                borderColor: sharedWith.includes(client.id) ? '#007AFF' : (isDark ? '#333' : '#ddd'),
                            }}
                            onPress={() => toggleClientSelection(client.id)}
                        >
                            <Text style={{ 
                                color: sharedWith.includes(client.id) ? '#fff' : (isDark ? '#fff' : '#000'),
                                fontWeight: '600',
                                fontSize: 12
                            }}>
                                {client.name || client.username || client.email.split('@')[0]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
      )}

      {user?.role === 'trainer' && (
        <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#aaa' : '#555' }]}>REGIME NOTES / VIDEO LINKS</Text>
            <TextInput 
                style={[styles.input, { 
                    color: isDark ? '#fff' : '#000', 
                    backgroundColor: isDark ? '#1c1c1e' : '#fff',
                    borderColor: isDark ? '#333' : '#ddd',
                    borderWidth: 1,
                    height: 80,
                    textAlignVertical: 'top',
                    fontSize: 14,
                    padding: 15
                }]}
                placeholder="Add instructions, video links, etc. (Optional)"
                placeholderTextColor="#888"
                multiline
                value={description}
                onChangeText={setDescription}
            />
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: isDark ? '#aaa' : '#555' }]}>EXERCISES</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item, index) => item.id + index}
        renderItem={({ item }) => (
          <View style={[styles.exCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons 
                  name={item.category === 'strength' ? 'barbell-outline' : 'pedometer-outline'} 
                  size={16} 
                  color={item.category === 'strength' ? '#007AFF' : '#34C759'} 
                />
                <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
              </View>
              <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                {item.category === 'strength' 
                  ? `${item.sets} sets • ${item.reps} reps • ${item.weight}${item.unit || 'kg'}` 
                  : `${item.duration}m • ${item.metricValue}${item.unit || 'km'} (${item.focus})`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeExercise(item.id)} style={styles.deleteBtn}>
              <Ionicons name="close-circle" size={20} color="#ff453a" />
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