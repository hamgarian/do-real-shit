<script>
  import { onMount } from 'svelte';

  let testResults = null;
  let loading = false;

  async function runFirestoreTest() {
    loading = true;
    testResults = null;

    try {
      const response = await fetch('/api/test-firestore');
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

  function getStatusColor(status) {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  onMount(() => {
    runFirestoreTest();
  });
</script>

<div class="min-h-screen bg-gray-100 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Firestore Database Test</h1>
    
    <!-- Test Controls -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Firestore Status Check</h2>
      <button
        on:click={runFirestoreTest}
        disabled={loading}
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Testing...' : 'Run Firestore Test'}
      </button>
    </div>

    <!-- Test Results -->
    {#if testResults}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Test Results</h2>
        
        <!-- Overall Status -->
        <div class="mb-6 p-4 rounded-lg {testResults.overallStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">{getStatusIcon(testResults.overallStatus)}</span>
            <div>
              <h3 class="font-semibold text-lg">Overall Status: {testResults.overallStatus.toUpperCase()}</h3>
              {#if testResults.summary}
                <p class="text-sm">
                  {testResults.summary.passed} passed, 
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

        <!-- Setup Instructions -->
        {#if testResults.overallStatus === 'error'}
          <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 class="font-semibold text-yellow-800 mb-2">Setup Required</h3>
            <div class="text-sm text-yellow-700 space-y-2">
              <p>To make Firestore work, you need to:</p>
              <ol class="list-decimal list-inside space-y-1 ml-4">
                <li>Create a Firebase project at <a href="https://console.firebase.google.com" class="text-blue-600 underline" target="_blank">console.firebase.google.com</a></li>
                <li>Enable Firestore Database in your Firebase project</li>
                <li>Create a service account and download the JSON key</li>
                <li>Create a <code class="bg-gray-200 px-1 rounded">.env</code> file in the <code class="bg-gray-200 px-1 rounded">my-app</code> directory</li>
                <li>Add your Firebase credentials to the <code class="bg-gray-200 px-1 rounded">.env</code> file</li>
              </ol>
            </div>
          </div>
        {/if}

        <!-- Raw Results -->
        <details class="mt-6">
          <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">View Raw Results</summary>
          <pre class="mt-2 text-xs bg-gray-100 p-4 rounded overflow-x-auto">{JSON.stringify(testResults, null, 2)}</pre>
        </details>
      </div>
    {/if}
  </div>
</div>
