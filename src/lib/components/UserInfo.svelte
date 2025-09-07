<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import { auth } from '$lib/firebaseClient';
    import { signOut } from 'firebase/auth';
    import { goto } from '$app/navigation';

    // Get user from context
    let user = getContext('user');
    
    // Username and money balance
    let username = '';
    let moneyBalance = 0;

    async function loadUsername() {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        try {
            const response = await fetch('/api/user/username', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                username = data.username || '';
            }
        } catch (error) {
            console.error('Error loading username:', error);
        }
    }

    async function loadMoneyBalance() {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        try {
            const response = await fetch('/api/user/money', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                moneyBalance = data.balance || 0;
            }
        } catch (error) {
            console.error('Error loading money balance:', error);
        }
    }

    async function handleLogout() {
        try {
            await signOut(auth);
            goto('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    onMount(() => {
        if (user) {
            loadUsername();
            loadMoneyBalance();
        }
    });

    // Export function to refresh balance
    export function refreshBalance() {
        loadMoneyBalance();
    }
</script>

<div class="user-info">
    <span class="user-email">{username || 'User'}</span>
    <div class="balance-logout-container">
        <span class="money-balance">{moneyBalance}$</span>
        <button 
            on:click={handleLogout}
            class="logout-btn"
            aria-label="Logout"
            title="Logout"
        >
            <i class="fas fa-sign-out-alt"></i>
        </button>
    </div>
</div>

<style>
    .user-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: bold;
        font-size: 0.9rem;
    }

    .user-email {
        opacity: 0.9;
    }

    .balance-logout-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .money-balance {
        font-weight: bold;
        color: #4ade80;
        font-size: 1rem;
    }

    .logout-btn {
        all: unset;
        background: rgba(255,255,255,0.2);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        font-size: 0.8rem;
    }

    .logout-btn:hover {
        background: rgba(255,255,255,0.3);
    }
</style>
