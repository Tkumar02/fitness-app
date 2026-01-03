import { auth, db } from '@/firebase';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Button, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { UserContext } from '../context/UserContext';

export default function HomePage() {
    //const { user } = useContext(UserContext);
    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { user, setUser } = useContext(UserContext);
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            router.replace('/'); // go back to landing page
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            if (!user?.uid) {
                // No user logged in → go back to landing
                router.replace('/');
                return;
            }

            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUsername(data.username || 'User');
                } else {
                    // No profile doc → force them to profile setup
                    router.replace('/(auth)/Profile');
                }
            } catch (err) {
                console.log('Error fetching user profile:', err);
                router.replace('/');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [user]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (!username) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 18 }}>No profile found. Redirecting...</Text>
            </View>
        );
    }

    const today = new Date().toISOString().split('T')[0];

    return (
        <ImageBackground
            source={require('../../assets/images/bg-weights.png')}
            style={styles.background}
            resizeMode="cover"
        >
            <View style={styles.container}>
                {/* Banner */}
                <Text style={styles.banner}>Welcome, {username}!</Text>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <Button title="Add Workout" onPress={() => router.push('/AddWorkout')} />
                </View>
                <View style={styles.buttonContainer}>
                    <Button title="Review Progression" onPress={() => console.log('Navigate to Progression')} />
                </View>

                {/* Calendar */}
                <View style={styles.calendarContainer}>
                    <Calendar
                        markedDates={{
                            [today]: { selected: true, marked: true, selectedColor: '#3b82f6' },
                        }}
                        theme={{
                            todayTextColor: '#3b82f6',
                            arrowColor: '#3b82f6',
                        }}
                    />
                </View>

                <View style={styles.logoutContainer}>
                    <Button title="Logout" color="red" onPress={handleLogout} />
                </View>
            </View>
        </ImageBackground>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    banner: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#111',
    },
    buttonContainer: {
        marginBottom: 15,
    },
    calendarContainer: {
        marginTop: 20,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        opacity: 0.8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutContainer: { marginTop: 20 },
    background: {
        flex: 1,
        justifyContent: 'center',
    }
});

