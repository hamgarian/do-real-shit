import { adminDb } from '$lib/firebaseAdmin';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Environment Variables Check
  try {
    const envCheck = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY_ID: !!process.env.FIREBASE_PRIVATE_KEY_ID,
      FIREBASE_CLIENT_ID: !!process.env.FIREBASE_CLIENT_ID
    };

    results.tests.environmentVariables = {
      status: Object.values(envCheck).every(Boolean) ? 'success' : 'error',
      data: envCheck,
      message: Object.values(envCheck).every(Boolean) 
        ? 'All required environment variables are present' 
        : 'Missing required environment variables'
    };
  } catch (error) {
    results.tests.environmentVariables = {
      status: 'error',
      error: error.message,
      message: 'Failed to check environment variables'
    };
  }

  // Test 2: Firestore Connection
  try {
    // Try to read from a test collection
    const testRef = adminDb.collection('test');
    const snapshot = await testRef.limit(1).get();
    
    results.tests.firestoreConnection = {
      status: 'success',
      data: {
        connected: true,
        testCollectionAccessible: true,
        documentCount: snapshot.size
      },
      message: 'Firestore connection successful'
    };
  } catch (error) {
    results.tests.firestoreConnection = {
      status: 'error',
      error: error.message,
      message: 'Firestore connection failed'
    };
  }

  // Test 3: Firestore Write Test
  try {
    const testRef = adminDb.collection('test');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Firestore write test'
    };
    
    // Write test document
    const docRef = await testRef.add(testDoc);
    
    // Read it back
    const doc = await docRef.get();
    const docData = doc.data();
    
    // Delete test document
    await docRef.delete();
    
    results.tests.firestoreWrite = {
      status: 'success',
      data: {
        writeSuccessful: true,
        readSuccessful: true,
        deleteSuccessful: true,
        documentId: doc.id,
        documentData: docData
      },
      message: 'Firestore write/read/delete operations successful'
    };
  } catch (error) {
    results.tests.firestoreWrite = {
      status: 'error',
      error: error.message,
      message: 'Firestore write operations failed'
    };
  }

  // Test 4: Required Collections Check
  try {
    const tasksRef = adminDb.collection('tasks');
    const leaderboardRef = adminDb.collection('leaderboard');
    
    // Check if collections exist and are accessible
    const tasksSnapshot = await tasksRef.limit(1).get();
    const leaderboardSnapshot = await leaderboardRef.limit(1).get();
    
    results.tests.requiredCollections = {
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
      message: 'Required collections (tasks, leaderboard) are accessible'
    };
  } catch (error) {
    results.tests.requiredCollections = {
      status: 'error',
      error: error.message,
      message: 'Required collections check failed'
    };
  }

  // Overall status
  const testResults = Object.values(results.tests);
  const hasErrors = testResults.some(test => test.status === 'error');
  
  results.overallStatus = hasErrors ? 'error' : 'success';
  results.summary = {
    totalTests: testResults.length,
    passed: testResults.filter(t => t.status === 'success').length,
    errors: testResults.filter(t => t.status === 'error').length
  };

  return new Response(JSON.stringify(results, null, 2), {
    status: results.overallStatus === 'error' ? 500 : 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
