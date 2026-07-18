import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// کانفیگ کاملاً صحیح و یکدست پروژه Binatrade
const firebaseConfig = {
  apiKey: "AIzaSyA9lK5XlBgbMqz4O1Bg5LRB54H-9BY19fU",
  authDomain: "binatrade-a2bb8.firebaseapp.com",
  projectId: "binatrade-a2bb8",
  storageBucket: "binatrade-a2bb8.firebasestorage.app",
  messagingSenderId: "239775854567",
  appId: "1:239775854567:web:27910bbf9c99927ac71742",
  measurementId: "G-KY28BM2VEC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore (دیتابیس پیش‌فرض پروژه خودتان)
export const db = getFirestore(app);