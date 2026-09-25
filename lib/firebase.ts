import { getApp, getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAieCbwSCB69awDL3LtAaj-F0MY4DBfD2c",
  authDomain: "eumlantree.firebaseapp.com",
  projectId: "eumlantree",
  storageBucket: "eumlantree.firebasestorage.app",
  messagingSenderId: "419696269889",
  appId: "1:419696269889:web:ba6e3a38d2ca5376bec4c0",
  measurementId: "G-N6Q61WRLRS",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
