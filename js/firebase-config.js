// Firebase Configuration
// Inicialize com suas credenciais do Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Substitua com suas credenciais do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDWhjOpULjb0McQBQoy3k0eak0vd8-MVXc",
  authDomain: "ateliedosorrisocata.firebaseapp.com",
  databaseURL: "https://ateliedosorrisocata-default-rtdb.firebaseio.com",
  projectId: "ateliedosorrisocata",
  storageBucket: "ateliedosorrisocata.firebasestorage.app",
  messagingSenderId: "969267032510",
  appId: "1:969267032510:web:72809f4683fddf03ee89ef",
  measurementId: "G-FQ422MSN4K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Exporta para uso em outros arquivos
export { database, ref, set, get, update, remove, onValue };
