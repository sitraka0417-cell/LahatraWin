// Point d'entrée Firebase (empaqueté par esbuild -> renderer/vendor/firebase.bundle.js)
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, collection, doc,
  setDoc, updateDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';

window.FB = {
  initializeApp, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut,
  initializeFirestore, persistentLocalCache, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot
};
