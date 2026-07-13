import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAh4-CCwCwEq0srWGpZFJhEOYZf7wVVChA",
  authDomain: "states-bounced-on.firebaseapp.com",
  projectId: "states-bounced-on",
  storageBucket: "states-bounced-on.firebasestorage.app",
  messagingSenderId: "464374532700",
  appId: "1:464374532700:web:891004fe32bfdd8db17499",
  measurementId: "G-B57CTVMRDG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const mapDocument = doc(db, "maps", "public-usa-map");

export async function saveStates(states) {
  await setDoc(
    mapDocument,
    {
      states,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export function watchStates(callback) {
  return onSnapshot(
    mapDocument,
    snapshot => {
      callback(snapshot.exists() ? snapshot.data().states || {} : {});
    },
    error => {
      console.error("Firebase live-sync error:", error);
      callback({});
    }
  );
}