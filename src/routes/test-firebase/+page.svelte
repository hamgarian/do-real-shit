<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/firebaseClient';
  import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

  let testResults = null;
  let loading = false;
  let user = null;
  let idToken = null;

  onMount(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      user = firebaseUser;
      if (firebaseUser) {
        // Get the ID token
        firebaseUser.getIdToken().then(token => {
          idToken = token;
        });
      }
    });

    return () => unsubscribe();
  });

  async function runFirebaseTest() {
    loading = true;
    testResults = null;

    try {
      const response = await fetch('/api/test-firebase', {
        headers: user && idToken ? {
          'Authorization': `Bearer ${idToken}`
        } : {}
      });

      const results = await response.json();
      testResults = results;
    } catch (error) {
      testResults = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      loading = false;
    }
  }

  async function signInWithGoogle() {
    try {
      const googleProvider = new GoogleAuthProvider();
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  async function signOut() {
    try {
      await auth.signOut();
      user = null;
      idToken = null;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }
</script>

<div class="min-h-screen bg-gray-100 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Firebase Integration Test</h1>
    
    <!-- Authentication Status -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Authentication Status</h2>
      {#if user}
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-600 font-medium">✅ Signed In</p>
            <p class="text-sm text-gray-600">Email: {user.email}</p>
            <p class="text-sm text-gray-600">UID: {user.uid}</p>
            {#if idToken}
              <p class="text-sm text-green-600">ID Token: Available</p>
            {:else}
              <p class="text-sm text-yellow-600">ID Token: Loading...</p>
            {/if}
          </div>
          <button
            on:click={signOut}
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      {:else}
        <div class="flex items-center justify-between">
          <p class="text-red-600 font-medium">❌ Not Signed In</p>
          <button
            on:click={signInWithGoogle}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In with Google
          </button>
        </div>
      {/if}
    </div>

    <!-- Test Controls -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Run Tests</h2>
      <button
        on:click={runFirebaseTest}
        disabled={loading}
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Running Tests...' : 'Run Firebase Tests'}
      </button>
      <p class="text-sm text-gray-600 mt-2">
        {user ? 'Tests will run with authentication' : 'Tests will run without authentication'}
      </p>
    </div>

    <!-- Test Results -->
    {#if testResults}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Test Results</h2>
        
        <!-- Overall Status -->
        <div class="mb-6 p-4 rounded-lg {testResults.overallStatus === 'success' ? 'bg-green-50 border border-green-200' : testResults.overallStatus === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">{getStatusIcon(testResults.overallStatus)}</span>
            <div>
              <h3 class="font-semibold text-lg">Overall Status: {testResults.overallStatus.toUpperCase()}</h3>
              {#if testResults.summary}
                <p class="text-sm">
                  {testResults.summary.passed} passed, 
                  {testResults.summary.warnings} warnings, 
                  {testResults.summary.errors} errors
                </p>
              {/if}
            </div>
          </div>
        </div>

        <!-- Individual Test Results -->
        <div class="space-y-4">
          {#each Object.entries(testResults.tests || {}) as [testName, testResult]}
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1').trim()}</h3>
                <span class="text-lg">{getStatusIcon(testResult.status)}</span>
              </div>
              <p class="text-sm {getStatusColor(testResult.status)} mb-2">{testResult.message}</p>
              
              {#if testResult.data}
                <details class="mt-2">
                  <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">View Details</summary>
                  <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(testResult.data, null, 2)}</pre>
                </details>
              {/if}
              
              {#if testResult.error}
                <div class="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p class="text-sm text-red-600 font-medium">Error:</p>
                  <p class="text-sm text-red-600">{testResult.error}</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Raw Results -->
        <details class="mt-6">
          <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">View Raw Results</summary>
          <pre class="mt-2 text-xs bg-gray-100 p-4 rounded overflow-x-auto">{JSON.stringify(testResults, null, 2)}</pre>
        </details>
      </div>
    {/if}
  </div>
</div>
