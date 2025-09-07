import { adminDb, adminAuth } from '$lib/firebaseAdmin';
import { auth } from '$lib/firebaseClient';

export async function GET({ request, locals }) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Environment Variables
  try {
    const envVars = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY_ID: !!process.env.FIREBASE_PRIVATE_KEY_ID,
      FIREBASE_CLIENT_ID: !!process.env.FIREBASE_CLIENT_ID,
      VITE_FIREBASE_API_KEY: !!process.env.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID
    };
    
    results.tests.environmentVariables = {
      status: 'success',
      data: envVars,
      message: 'Environment variables check'
    };
  } catch (error) {
    results.tests.environmentVariables = {
      status: 'error',
      error: error.message,
      message: 'Failed to check environment variables'
    };
  }

  // Test 2: Firebase Admin SDK
  try {
    const testCollection = adminDb.collection('test');
    await testCollection.doc('test').set({ test: true, timestamp: new Date() });
    const doc = await testCollection.doc('test').get();
    
    results.tests.firebaseAdmin = {
      status: 'success',
      data: {
        canWrite: true,
        canRead: true,
        documentExists: doc.exists,
        documentData: doc.data()
      },
      message: 'Firebase Admin SDK working'
    };
    
    // Clean up test document
    await testCollection.doc('test').delete();
  } catch (error) {
    results.tests.firebaseAdmin = {
      status: 'error',
      error: error.message,
      message: 'Firebase Admin SDK failed'
    };
  }

  // Test 3: Authentication Status
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (token) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        results.tests.authentication = {
          status: 'success',
          data: {
            hasToken: true,
            tokenValid: true,
            userId: decodedToken.uid,
            email: decodedToken.email
          },
          message: 'Authentication token valid'
        };
      } catch (tokenError) {
        results.tests.authentication = {
          status: 'error',
          data: { hasToken: true, tokenValid: false },
          error: tokenError.message,
          message: 'Authentication token invalid'
        };
      }
    } else {
      results.tests.authentication = {
        status: 'warning',
        data: { hasToken: false, tokenValid: false },
        message: 'No authentication token provided'
      };
    }
  } catch (error) {
    results.tests.authentication = {
      status: 'error',
      error: error.message,
      message: 'Authentication check failed'
    };
  }

  // Test 4: Firestore Collections
  try {
    const tasksRef = adminDb.collection('tasks');
    const leaderboardRef = adminDb.collection('leaderboard');
    
    // Try to read from collections
    const tasksSnapshot = await tasksRef.limit(1).get();
    const leaderboardSnapshot = await leaderboardRef.limit(1).get();
    
    results.tests.firestoreCollections = {
      status: 'success',
      data: {
        tasksCollection: {
          accessible: true,
          documentCount: tasksSnapshot.size
        },
        leaderboardCollection: {
          accessible: true,
          documentCount: leaderboardSnapshot.size
        }
      },
      message: 'Firestore collections accessible'
    };
  } catch (error) {
    results.tests.firestoreCollections = {
      status: 'error',
      error: error.message,
      message: 'Firestore collections check failed'
    };
  }

  // Test 5: Client-side Firebase (if available)
  try {
    // This will only work if we're in a browser context
    if (typeof window !== 'undefined') {
      results.tests.firebaseClient = {
        status: 'success',
        data: {
          authAvailable: !!auth,
          currentUser: auth?.currentUser ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email
          } : null
        },
        message: 'Firebase Client SDK available'
      };
    } else {
      results.tests.firebaseClient = {
        status: 'info',
        message: 'Firebase Client SDK check skipped (server-side)'
      };
    }
  } catch (error) {
    results.tests.firebaseClient = {
      status: 'error',
      error: error.message,
      message: 'Firebase Client SDK check failed'
    };
  }

  // Overall status
  const testResults = Object.values(results.tests);
  const hasErrors = testResults.some(test => test.status === 'error');
  const hasWarnings = testResults.some(test => test.status === 'warning');
  
  results.overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';
  results.summary = {
    totalTests: testResults.length,
    passed: testResults.filter(t => t.status === 'success').length,
    warnings: testResults.filter(t => t.status === 'warning').length,
    errors: testResults.filter(t => t.status === 'error').length
  };

  return new Response(JSON.stringify(results, null, 2), {
    status: results.overallStatus === 'error' ? 500 : 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
