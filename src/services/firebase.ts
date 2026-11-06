/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let googleAuthProvider: GoogleAuthProvider;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);

  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  db = dbId ? getFirestore(app, dbId) : getFirestore(app);

  googleAuthProvider = new GoogleAuthProvider();
  googleAuthProvider.setCustomParameters({
    prompt: 'select_account',
  });

  // Validate connection to Firestore as mandated by Firebase architecture skill
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('NewsPress: Firestore client is offline. Please check your network and Firebase configuration.');
      }
    }
  };

  testConnection();
} else {
  console.warn('NewsPress: Firebase is not fully configured in environment. Operating in mock seed mode.');
}

export { app, auth, db, googleAuthProvider };
