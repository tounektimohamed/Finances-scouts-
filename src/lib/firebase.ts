import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC5eTfwEKJBKyHANQikAkD93KVkE7nzHlA",
  authDomain: "taqyem-424ed.firebaseapp.com",
  projectId: "taqyem-424ed",
  storageBucket: "taqyem-424ed.firebasestorage.app",
  messagingSenderId: "209590958133",
  appId: "1:209590958133:web:25608adf0f6b65b1e7d97c",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
