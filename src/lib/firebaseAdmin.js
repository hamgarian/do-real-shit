import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config'; // Load environment variables

// Initialize Firebase Admin SDK
let adminApp;

try {
  // Try to use environment variables first
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "do-real-shit",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  // Check if we have all required environment variables
  const hasRequiredVars = serviceAccount.private_key && 
                         serviceAccount.client_email && 
                         serviceAccount.private_key_id &&
                         serviceAccount.client_id;
  
  if (hasRequiredVars) {
    adminApp = getApps().length === 0 
      ? initializeApp({
          credential: cert(serviceAccount)
        })
      : getApps()[0];
  } else {
    // Fallback: Initialize without credentials (for development)
    // This will work for client-side operations but not server-side admin operations
    console.warn('Firebase Admin: Missing required environment variables:');
    console.warn('- FIREBASE_PRIVATE_KEY:', !!serviceAccount.private_key);
    console.warn('- FIREBASE_CLIENT_EMAIL:', !!serviceAccount.client_email);
    console.warn('- FIREBASE_PRIVATE_KEY_ID:', !!serviceAccount.private_key_id);
    console.warn('- FIREBASE_CLIENT_ID:', !!serviceAccount.client_id);
    console.warn('Some server-side operations may not work.');
    adminApp = getApps().length === 0 
      ? initializeApp({
          projectId: "do-real-shit"
        })
      : getApps()[0];
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  // Fallback initialization
  adminApp = getApps().length === 0 
    ? initializeApp({
        projectId: "do-real-shit"
      })
    : getApps()[0];
}

// Get Firebase Admin Auth
export const adminAuth = getAuth(adminApp);

// Get Firebase Admin Firestore
export const adminDb = getFirestore(adminApp);

export default adminApp;
