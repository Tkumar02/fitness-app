import { auth, db } from '@/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useEffect, useState } from 'react';

type UserType = {
    uid: string;
    email: string | null;
    [key: string]: any; // allow Firestore extra fields
};

type UserContextType = {
    user: UserType | null;
    setUser: (user: UserType | null) => void;
    loading: boolean;
};

export const UserContext = createContext<UserContextType>({
    user: null,
    setUser: () => { },
    loading: true,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const uid = await AsyncStorage.getItem('userUid');
                if (uid) {
                    const docRef = doc(db, 'users', uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setUser({ uid, ...docSnap.data() } as UserType);
                    } else {
                        // Fallback to Firebase Auth info
                        const currentUser = auth.currentUser;
                        setUser({
                            uid,
                            email: currentUser?.email ?? null,
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading user:', err);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, loading }}>
            {children}
        </UserContext.Provider>
    );
};
