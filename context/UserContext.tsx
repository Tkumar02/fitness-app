import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useEffect, useState } from 'react';

type UserType = {
    uid: string;
    email: string | null;
    [key: string]: any; 
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

// ADDING "export default" HERE FIXES THE EXPO WARNING
export default function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to Firebase Auth state directly (Better than manual AsyncStorage)
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                const docRef = doc(db, 'users', firebaseUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setUser({ uid: firebaseUser.uid, ...docSnap.data() } as UserType);
                } else {
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, loading }}>
            {children}
        </UserContext.Provider>
    );
}