<script lang="ts">
    import { onMount, onDestroy, tick, getContext } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { quintOut, backOut } from 'svelte/easing';
    import { fly, scale } from 'svelte/transition';
    import { browser } from '$app/environment';
    import UserInfo from '$lib/components/UserInfo.svelte';

    interface User {
        id: number;
        name: string;
        money: number;
    }

    // Get user from context
    let user = getContext('user');

    // --- Leaderboard data ---
    let users: User[] = [];

    // backgrounds…
    let backgrounds = ['/1.jpg', '/2.jpg'];
    let currentBackgroundIndex = 0;
    let backgroundVisible = backgrounds.map((_, i) => i === 0);
    let intervalId: ReturnType<typeof setInterval>;
    let backgroundsLoaded = false;

    // animation state
    let showTitle = false;
    let showLeaderboard = false;
    let showBackButton = false;
    let titleY = tweened(-50, { duration: 400, easing: quintOut });
    let leaderboardOpacity = tweened(0, { duration: 400, easing: quintOut });

    async function preloadImages(srcs: string[]) {
        await Promise.all(srcs.map(src =>
            new Promise<void>(resolve => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve();
                img.onerror = () => resolve();
            })
        ));
    }

    function toggleBackground() {
        backgroundVisible[currentBackgroundIndex] = false;
        currentBackgroundIndex = (currentBackgroundIndex + 1) % backgrounds.length;
        backgroundVisible[currentBackgroundIndex] = true;
    }

    onMount(async () => {
        if (!browser) return;
        // preload background images + logo
        await preloadImages([...backgrounds, '/logo.png']);
        backgroundsLoaded = true;
        await tick();

        // cycle backgrounds every 500ms
        intervalId = setInterval(toggleBackground, 500);
        
        // Load leaderboard
        loadLeaderboard();
        
        // Debug: Check if users array is populated
        setTimeout(() => {
            console.log('Users array after load:', users);
        }, 1000);

        // Animation sequence
        setTimeout(() => {
            showTitle = true;
            titleY.set(0);
        }, 200);

        setTimeout(() => {
            showLeaderboard = true;
            leaderboardOpacity.set(1);
        }, 600);

        setTimeout(() => {
            showBackButton = true;
        }, 1000);
    });

    onDestroy(() => {
        if (!browser) return;
        clearInterval(intervalId);
    });


    async function loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            if (response.ok) {
                const data = await response.json();
                console.log('Leaderboard API response:', data); // Debug log
                users = data.map((item, index) => ({
                    id: item.id || index + 1,
                    name: item.username || 'Anonymous', // Use username from API
                    money: item.total_money || 0  // Use actual money from API
                }));
            } else {
                console.error('Leaderboard API error:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
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
        opacity: 0;
        transition: opacity 0s;
    }
    .background.visible {
        opacity: 1;
        transition: opacity 0s;
    }

    .top-left-container {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 2;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .top-right-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-weight: bold;
        z-index: 2;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .back-btn {
        all: unset;
        background: rgba(255,255,255,0.05);
        color: white;
        padding: 0.6rem 1rem;
        border-radius: 0.4rem;
        font-size: 1rem; 
        font-weight: 500;
        text-align: center; 
        cursor: pointer;
        margin: 3rem auto 2rem auto;
        border: 1px solid rgba(255,255,255,0.3);
        transition: all 0.4s ease;
        align-self: center;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        opacity: 0.8;
        max-width: 200px;
    }
    .back-btn:hover {
        background: rgba(255,255,255,0.15);
        color: white;
        transform: translateY(-2px);
        opacity: 1;
        border-color: rgba(255,255,255,0.5);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .logo-link {
        display: block;
    }

    .logo {
        width: 75px;
        height: auto;
        pointer-events: none;
    }


    .content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 5rem; /* leave room for logo */
        min-height: 100vh;
        overflow-x: hidden;
    }

    /* Leaderboard styling */
    .leaderboard {
        background: rgba(255,255,255,0.08);
        padding: 2rem;
        border-radius: 0.5rem;
        color: white;
        width: 90%;
        max-width: 500px;
        border: 2px dashed white;
        backdrop-filter: blur(10px);
        transition: opacity 0.4s ease;
    }

    .leaderboard-title {
        text-align: center;
        margin-bottom: 2rem;
        font-size: 2.5rem;
        font-weight: bold;
        color: white;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        transition: all 0.4s ease;
    }


    .leaderboard ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .leaderboard li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 0.4rem;
        font-size: 1.1rem;
        transition: all 0.3s ease;
    }

    .leaderboard li:hover {
        background: rgba(255,255,255,0.1);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .leaderboard li:first-child {
        background: rgba(255,0,0,0.1);
        border-color: rgba(255,0,0,0.3);
    }

    .leaderboard li:first-child .user-name {
        color: #ff0033;
    }

    .user-name {
        font-weight: 600;
        font-size: 1.2rem;
        color: white;
    }

    .user-money {
        font-weight: bold;
        font-size: 1.3rem;
        color: white;
    }

    .rank {
        font-size: 1.1rem;
        font-weight: bold;
        margin-right: 1rem;
        opacity: 0.7;
        color: white;
    }

    .leaderboard li:first-child .rank {
        color: #ff0033;
    }
</style>

{#if backgroundsLoaded}
    {#each backgrounds as bg, index}
        <div
            class="background {backgroundVisible[index] ? 'visible' : ''}"
            style="background-image: url({bg});"
        ></div>
    {/each}

    <!-- logo in top-left -->
    <div class="top-left-container">
        <a href="/" class="logo-link" aria-label="Home">
            <img src="/logo.png" alt="Logo" class="logo" />
        </a>
    </div>

    <!-- user info in top-right -->
    <div class="top-right-container">
        <UserInfo />
    </div>

    <div class="content">
        <h1 
            class="leaderboard-title"
            style="transform: translateY({$titleY}px); opacity: {showTitle ? 1 : 0};"
        >
            Leaderboard
        </h1>

        <div 
            class="leaderboard"
            style="opacity: {$leaderboardOpacity};"
        >
            <ul>
                {#each users as user, index (user.id)}
                    <li>
                        <div style="display: flex; align-items: center;">
                            <span class="rank">#{index + 1}</span>
                            <span class="user-name">{user.name}</span>
                        </div>
                        <span class="user-money">${user.money}</span>
                    </li>
                {/each}
            </ul>
        </div>
        
        <a 
            href="/" 
            class="back-btn" 
            aria-label="Back to Home"
            style="opacity: {showBackButton ? 1 : 0}; transform: translateY({showBackButton ? 0 : 30}px);"
        >
            <i class="fas fa-arrow-left"></i>
            <span>Back to Home</span>
        </a>
    </div>
{/if}
