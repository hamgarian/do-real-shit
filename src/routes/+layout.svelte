<script>
	import '../app.css';
	import { setContext } from 'svelte';
	import { auth } from '$lib/firebaseClient.js';
	import { onAuthStateChanged } from 'firebase/auth';
	import { onMount } from 'svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import { page } from '$app/stores';
	
	let { data, children } = $props();
	let user = data.user;
	
	onMount(() => {
		// Set up auth state listener
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
			user = firebaseUser;
		});
		
		return () => unsubscribe();
	});

	// Make user context reactive using $effect (Svelte Runes)
	$effect(() => {
		setContext('user', user);
	});
</script>

{#if $page.url.pathname === '/login'}
	<!-- Login page doesn't need auth guard -->
	{@render children()}
{:else}
	<!-- All other pages need authentication -->
	<AuthGuard>
		{@render children()}
	</AuthGuard>
{/if}
