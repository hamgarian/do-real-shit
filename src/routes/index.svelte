<script>
    import { auth } from '$lib/firebaseClient';
    import { onMount, getContext } from 'svelte';
    import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
  
    // user from layout
    const user = getContext('user');
  
    let tasks = [];
    let leaderboard = [];
    let label = '';
    let money = 0;
    let description = '';
    let input = '';
    let output = '';
  
    onMount(() => {
      if (user) {
        fetchTasks();
        fetchLeaderboard();
      }
    });
  
    async function signIn() {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Error signing in:', error);
      }
    }

    async function signOutUser() {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  
    async function generate() {
      output = 'Loading...';
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      if (res.ok) output = await res.text();
      else output = `Error: ${res.status}`;
    }
  
    async function addTask() {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch('/api/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ label, money, description })
      });
      if (res.ok) {
        label = '';
        money = 0;
        description = '';
        fetchTasks();
        fetchLeaderboard();
      }
    }
  
    async function fetchTasks() {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch('/api/generate/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      tasks = (await res.json()) || [];
    }
  
    async function fetchLeaderboard() {
      const res = await fetch('/api/leaderboard');
      leaderboard = (await res.json()) || [];
    }
  </script>
  
  <main class="p-4">
    {#if !user}
      <button on:click={signIn} class="px-4 py-2 bg-red-600 text-white rounded">
        Sign in with Google
      </button>
    {:else}
      <div class="mb-4 flex justify-between items-center">
        <p>Welcome, {user.email}</p>
        <button on:click={signOutUser} class="px-4 py-2 bg-gray-600 text-white rounded">
          Sign Out
        </button>
      </div>
  
      <section class="mb-6">
        <h1 class="text-xl font-bold mb-2">Task Pricer</h1>
        <textarea bind:value={input} placeholder="Describe your task..." class="w-full h-24 p-2 border rounded"></textarea>
        <button on:click={generate} class="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Get Price</button>
        <pre class="mt-4 whitespace-pre-wrap">{output}</pre>
      </section>
  
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-2">Save Task</h2>
        <input bind:value={label} placeholder="Label" class="border p-1 rounded mr-2" />
        <input type="number" bind:value={money} placeholder="Money" class="border p-1 rounded mr-2 w-24" />
        <textarea bind:value={description} placeholder="Description" class="w-full h-16 p-2 border rounded mt-2"></textarea>
        <button on:click={addTask} class="mt-2 px-4 py-2 bg-green-600 text-white rounded">Save</button>
      </section>
  
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-2">Your Tasks</h2>
        <ul class="list-disc pl-5">
          {#each tasks as t}
            <li>{t.label} - {t.money} ({t.description})</li>
          {/each}
        </ul>
      </section>
  
      <section>
        <h2 class="text-lg font-semibold mb-2">Leaderboard</h2>
        <ol class="list-decimal pl-5">
          {#each leaderboard as lb}
            <li>{lb.email}: {lb.total_money}</li>
          {/each}
        </ol>
      </section>
    {/if}
  </main>