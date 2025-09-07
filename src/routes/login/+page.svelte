<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { quintOut, backOut, linear } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { gsap } from 'gsap';
  import { browser } from '$app/environment';
  import { auth } from '$lib/firebaseClient';
  import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
  import { goto } from '$app/navigation';

  let loading = false;
  let error = '';

  // backgrounds…
  let backgrounds = ['/1.jpg', '/2.jpg'];
  let currentBackgroundIndex = 0;
  let backgroundVisible = [true, false];
  let intervalId;
  let backgroundsLoaded = false;

  // animation flags
  let showLogo = false;
  let showLoginBox = false;

  // logo tweened props
  let logoX     = tweened(0,   { duration: 100, easing: linear });
  let logoY     = tweened(-200,{ duration: 100, easing: quintOut });
  let logoScale = tweened(2,   { duration: 50,  easing: backOut });
  let logoRotate= tweened(45,  { duration: 50,  easing: backOut });

  async function preloadImages(srcs) {
    await Promise.all(srcs.map(src =>
      new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })
    ));
  }

  function moveLogoToCorner() {
    if (!browser) return;
    logoX.set(-window.innerWidth/2 + 75);
    logoY.set(-window.innerHeight/2 + 75);
    logoScale.set(0.5, { duration:100, easing: linear });
  }

  function toggleBackground() {
    backgroundVisible[currentBackgroundIndex] = false;
    currentBackgroundIndex = (currentBackgroundIndex + 1) % backgrounds.length;
    backgroundVisible[currentBackgroundIndex] = true;
  }

  onMount(async () => {
    if (!browser) return;
    
    // Preload images
    await preloadImages([...backgrounds, '/logo.png']);
    backgroundsLoaded = true;
    await tick();
    intervalId = setInterval(toggleBackground, 500);

    // Logo animation
    setTimeout(() => {
      showLogo = true;
      logoY.set(0);
      logoScale.set(1);
      logoRotate.set(0);
    }, 100);

    setTimeout(moveLogoToCorner, 600);

    // Show login box after logo animation completes
    setTimeout(() => {
      showLoginBox = true;
    }, 800);

    window.addEventListener('resize', moveLogoToCorner);

    // If user is already authenticated, refresh to home page
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        window.location.href = '/';
      }
    });

    return () => {
      unsubscribe();
      if (browser) {
        clearInterval(intervalId);
        window.removeEventListener('resize', moveLogoToCorner);
      }
    };
  });

  function handleHoverEnter(e) {
    const el = e.currentTarget;
    gsap.killTweensOf(el);
    gsap.to(el, { borderColor: "#ff0033", duration: 0.2 });
  }

  function handleHoverLeave(e) {
    const el = e.currentTarget;
    gsap.killTweensOf(el);
    gsap.to(el, { rotation: 0, borderColor: "white", duration: 0.2 });
  }

  async function signInWithGoogle() {
    loading = true;
    error = '';

    try {
      const googleProvider = new GoogleAuthProvider();
      await signInWithPopup(auth, googleProvider);
      // Refresh the page after successful login
      window.location.reload();
    } catch (err) {
      console.error('Sign in error:', err);
      error = err.message || 'Failed to sign in. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<style>
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');

  .background {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-size: cover;
    background-position: center;
    background-color: black;
    z-index: -1;
    opacity: 0; transition: opacity 0s;
  }
  .background.visible {
    opacity: 1; transition: opacity 0s;
  }

  .content {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 3rem;
    min-height: 100vh;
    overflow-x: hidden;
  }

  img.logo {
    width: 200px; height: auto;
    position: fixed; top: 50%; left: 50%;
    transform:
      translate(calc(-50% + var(--logo-x,0px)),
                calc(-50% + var(--logo-y,0px)))
      scale(var(--logo-scale,1))
      rotate(var(--logo-rotate,0deg));
    transition: transform 0.6s;
    pointer-events: none;
    z-index: 2;
  }

  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 600px;
    padding: 2rem;
  }

  .login-card {
    background: rgba(255,255,255,0.08);
    border: 2px dashed white;
    border-radius: 0.5rem;
    padding: 2rem;
    width: 100%;
    color: white;
    text-align: center;
    backdrop-filter: blur(10px);
  }

  .login-header {
    margin-bottom: 2rem;
  }

  .login-title {
    font-size: 2rem;
    font-weight: bold;
    margin: 0 0 0.5rem 0;
    color: white;
  }

  .login-subtitle {
    font-size: 1rem;
    margin: 0;
    opacity: 0.9;
    color: white;
  }

  .login-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .error-message {
    background: rgba(255,0,0,0.2);
    border: 1px solid rgba(255,0,0,0.5);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .error-icon {
    color: #ff6b6b;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .error-text h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: bold;
    color: #ff6b6b;
  }

  .error-text p {
    margin: 0;
    font-size: 0.9rem;
    color: #ffaaaa;
  }

  .google-signin-btn {
    all: unset;
    background: rgba(255,255,255,0.1);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
    cursor: pointer;
    border: 2px solid white;
    transition: background 0.3s, color 0.3s, transform 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    box-sizing: border-box;
  }

  .google-signin-btn:hover:not(:disabled) {
    background: white;
    color: black;
    transform: scale(1.05);
  }

  .google-signin-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .google-icon {
    width: 20px;
    height: 20px;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .login-footer {
    margin-top: 1rem;
  }

  .login-footer p {
    font-size: 0.85rem;
    margin: 0;
    opacity: 0.8;
    color: white;
  }

  @media (max-width: 500px) {
    .login-container {
      padding: 1rem;
    }
    
    .login-card {
      padding: 1.5rem;
    }
    
    .login-title {
      font-size: 1.5rem;
    }
  }
</style>

{#if backgroundsLoaded}
  {#each backgrounds as bg, index}
    <div
      class="background {backgroundVisible[index] ? 'visible':''}"
      style="background-image:url({bg});"
    ></div>
  {/each}

  <div class="content">
    {#if showLogo}
      <img
        src="/logo.png"
        alt="Logo"
        class="logo"
        style="
          --logo-x: {$logoX}px;
          --logo-y: {$logoY}px;
          --logo-scale: {$logoScale};
          --logo-rotate: {$logoRotate}deg;
        "
      />
    {/if}

    {#if showLoginBox}
      <div class="login-container" in:fly={{ y: 50, duration: 500 }}>
        <div class="login-card">
        <div class="login-header">
          <h2 class="login-title">
            Fuck You Boutta Do?
          </h2>
          <p class="login-subtitle">
            A to-do list where AI decides what your work is worth
          </p>
        </div>

        <div class="login-content">
          {#if error}
            <div class="error-message">
              <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="error-text">
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            </div>
          {/if}

          <button
            on:click={signInWithGoogle}
            disabled={loading}
            class="google-signin-btn"
            on:mouseenter={handleHoverEnter}
            on:mouseleave={handleHoverLeave}
          >
            {#if loading}
              <div class="spinner"></div>
              Signing in...
            {:else}
              <svg class="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            {/if}
          </button>

        </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
