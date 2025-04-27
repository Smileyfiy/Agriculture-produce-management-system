import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyA5iW2aHDvok5fMLb0Ec-0MQ_9omdGxdGc",
    authDomain: "apms-c03ed.firebaseapp.com",
    databaseURL: "https://apms-c03ed-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "apms-c03ed",
    storageBucket: "apms-c03ed.firebasestorage.app",
    messagingSenderId: "936195937210",
    appId: "1:936195937210:web:d6ff1aec188a5c2b828383",
    measurementId: "G-E06M8E71FM"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
export { app };
export const auth = getAuth(app);