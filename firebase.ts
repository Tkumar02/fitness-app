import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDPoosMOlNfzhkieXVX2pKCAyYSE4e_KmE",
    authDomain: "activeme-lt3.firebaseapp.com",
    projectId: "activeme-lt3",
    storageBucket: "activeme-lt3.firebasestorage.app",
    messagingSenderId: "618736235893",
    appId: "1:618736235893:web:47fdd824adadd39e80cf3c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


// BELOW ARE THE SUGGESTED CHANGES TO FIX THE ERROR FOR LOGGING IN PERSISTENCE THING


// // firebase.ts
// import { initializeApp } from 'firebase/app';
// import { getFirestore } from "firebase/firestore";
// import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; // Back to standard path
// import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// const firebaseConfig = {
//   // ... your config
// };

// const app = initializeApp(firebaseConfig);

// // THIS IS THE COMPATIBILITY FIX:
// // Some versions of Firebase export it differently. 
// // If getReactNativePersistence is undefined, we fall back to standard memory.
// const persistence = getReactNativePersistence 
//     ? getReactNativePersistence(ReactNativeAsyncStorage) 
//     : undefined;

// export const auth = initializeAuth(app, {
//   persistence: persistence
// });

// export const db = getFirestore(app);