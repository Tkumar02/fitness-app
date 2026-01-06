import { auth } from '@/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { Button } from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function LogoutButton() {
    const { setUser } = useContext(UserContext);
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            await AsyncStorage.removeItem('userUid');
            setUser(null);
            router.replace('/'); // back to landing page
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    return <Button title="Logout" onPress={handleLogout} color="#ef4444" />;
}
