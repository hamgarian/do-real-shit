<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/firebaseClient';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  let { children } = $props();
  let user = $state(null);
  let loading = $state(true);

  onMount(() => {
    if (!browser) return;

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      user = firebaseUser;
      loading = false;

      // If no user and not on login page, redirect to login
      if (!firebaseUser && window.location.pathname !== '/login') {
        goto('/login');
      }
    });

    return () => unsubscribe();
  });
</script>

<style>
  .loading-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
    position: relative;
  }

  .loading-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('/1.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.3;
    z-index: -1;
  }

  .loading-content {
    text-align: center;
    z-index: 1;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255,255,255,0.3);
    border-top: 3px solid #ff0033;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  .loading-text {
    margin-top: 1rem;
    color: white;
    font-size: 1.1rem;
    font-weight: 500;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>

{#if loading}
  <!-- Loading spinner -->
  <div class="loading-container">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading...</p>
    </div>
  </div>
{:else if user}
  <!-- User is authenticated, render protected content -->
  {@render children()}
{:else}
  <!-- User is not authenticated, show login prompt -->
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="text-center">
      <div class="mx-auto h-20 w-20 flex items-center justify-center mb-4">
        <img src="/logo.png" alt="Logo" class="h-20 w-auto" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
      <p class="text-gray-600 mb-6">Please sign in to access this page.</p>
      <a
        href="/login"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Go to Login
      </a>
    </div>
  </div>
{/if}
