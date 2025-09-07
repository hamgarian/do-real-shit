    <script>
        let input = '';
        let output = '';
    
        async function generate() {
        output = 'Loading...';
        const res = await fetch('./api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input })
        });
    
        if (res.ok) {
            output = await res.text();
        } else {
            output = `Error: ${res.status} ${res.statusText}`;
        }
        }
    </script>
    
    <main class="p-4">
        <h1 class="text-xl font-bold mb-2">Task Pricer</h1>
        <textarea bind:value={input} placeholder="Describe your task..." class="w-full h-24 p-2 border rounded" />
        <button on:click={generate} class="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Get Price</button>
        <pre class="mt-4 whitespace-pre-wrap">{output}</pre>
    </main>