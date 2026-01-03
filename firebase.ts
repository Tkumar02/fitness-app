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