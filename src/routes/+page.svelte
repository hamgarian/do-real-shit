<script lang="ts">
    import { onMount, onDestroy, tick, getContext } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { quintOut, backOut, linear } from 'svelte/easing';
    import { fly } from 'svelte/transition';
    import { gsap } from 'gsap';
    import { browser } from '$app/environment';
    import { auth } from '$lib/firebaseClient';
    import { signOut, onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import UserInfo from '$lib/components/UserInfo.svelte';

    interface Todo {
        id: number;
        text: string;
        editText: string;
        value: number;
        tier: string;
        editing: boolean;
        show: boolean;
        edited: boolean;
    }

    // --- State ---
    let todos = $state<Todo[]>([
        {
            id: 1,
            text: 'Click me to change task',
            editText: 'Click me to change task',
            value: 10,
            tier: 'Basic',
            editing: false,
            show: false,
            edited: false
        }
    ]);
    let finishedTodos = $state<Todo[]>([]);
    let nextId = $state(2);
    
    // Tab system
    let activeTab = $state<'active' | 'finished'>('active');
    
    function switchTab(tab: 'active' | 'finished') {
        activeTab = tab;
    }

    // user balance
    let moneyBalance = $state<number>(0);

    // Get user from context
    let user = getContext('user');
    
    // Watch for user changes and check username when user becomes available
    $effect(() => {
        console.log('$effect triggered:', { 
            hasUser: !!user, 
            userType: typeof user, 
            hasUid: user && typeof user === 'object' && 'uid' in user,
            currentUsername: username,
            showModal: showUsernameModal
        });
        
        if (user && typeof user === 'object' && 'uid' in user && !usernameChecked) {
            console.log('$effect: About to check username');
            usernameChecked = true;
            checkUsername();
            loadMoneyBalanceFromFirestore();
            loadTasksFromFirestore();
        }
    });
    
    // Username system
    let username = $state('');
    let showUsernameModal = $state(false);
    let usernameInput = $state('');
    let usernameLoading = $state(false);
    let usernameChecked = $state(false);

    // backgrounds…
    let backgrounds = ['/1.jpg', '/2.jpg'];
    let currentBackgroundIndex = $state(0);
    let backgroundVisible = $state([true, false]);
    let intervalId: ReturnType<typeof setInterval>;
    let backgroundsLoaded = $state(false);

    // animation flags
    let showLogo = $state(false);
    let showShit = $state(false);

    // mobile profile menu
    let showProfileMenu = $state(false);
    
    // UserInfo component reference
    let userInfoComponent = $state();
    
    // Auth unsubscribe function
    let unsubscribeAuth: (() => void) | null = null;

    // logo tweened props
    let logoX     = tweened(0,   { duration: 100, easing: linear });
    let logoY     = tweened(-200,{ duration: 100, easing: quintOut });
    let logoScale = tweened(2,   { duration: 50,  easing: backOut });
    let logoRotate= tweened(45,  { duration: 50,  easing: backOut });
    let shitScale = tweened(0.5, { duration: 25,  easing: backOut });

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
        
        // Set up direct auth state listener as backup
        unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            console.log('Direct auth listener:', { 
                hasUser: !!firebaseUser, 
                uid: firebaseUser?.uid,
                email: firebaseUser?.email 
            });
            
            if (firebaseUser && !usernameChecked) {
                console.log('Direct auth listener: Checking username');
                usernameChecked = true;
                checkUsername();
            }
        });
        
        await preloadImages([...backgrounds, '/logo.png', '/shitt.png']);
        backgroundsLoaded = true;
        await tick();
        intervalId = setInterval(toggleBackground, 500);

        setTimeout(() => {
            showLogo = true;
            logoY.set(0);
            logoScale.set(1);
            logoRotate.set(0);
        }, 100);

        setTimeout(moveLogoToCorner, 600);

        setTimeout(() => {
            showShit = true;
            setTimeout(() => shitScale.set(0.8), 10);
            todos = todos.map(t =>
                t.id === 1 ? { ...t, show: true } : t
            );
        }, 1200);

        

        window.addEventListener('resize', moveLogoToCorner);
        window.addEventListener('click', handleOutsideClick);
    });

    onDestroy(() => {
        if (!browser) return;
        clearInterval(intervalId);
        window.removeEventListener('resize', moveLogoToCorner);
        window.removeEventListener('click', handleOutsideClick);
        if (unsubscribeAuth) {
            unsubscribeAuth();
        }
    });

    function handleEditMode(id: number) {
        todos = todos.map(t => {
            if (t.id === id) {
                // If it's placeholder text, clear it when entering edit mode
                const editText = t.text === 'Click me to change task' ? '' : t.text;
                return { ...t, editing: true, editText };
            }
            return t;
        });
        setTimeout(() => {
            const input = document.getElementById(`input-${id}`) as HTMLInputElement;
            input?.focus();
        }, 0);
    }

    async function handleAccept(id: number) {
        // 1) close editing & update text (do not mark edited yet)
        todos = todos.map(t =>
            t.id === id
                ? { ...t, text: t.editText, editing: false }
                : t
        );

        const t = todos.find(t => t.id === id);
        if (!t) return;

        try {
            // 2) call pricing endpoint
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: t.editText })
            });

            if (res.ok) {
                // 3) parse "price, label"
                const text = (await res.text()).trim();
                const [priceStr, label] = text.split(', ').map(s => s.trim());
                const price = parseInt(priceStr, 10) || 0;

                // 4) update that todo's value, tier, and mark as edited
                todos = todos.map(todo =>
                    todo.id === id
                        ? { ...todo, value: price, tier: label, edited: true }
                        : todo
                );

                // 5) save task to Firestore with AI-generated data
                await saveTaskToFirestore(t.editText, price, label);
            } else {
                console.error('Pricing API error', res.status, res.statusText);
            }
        } catch (err) {
            console.error('Error fetching pricing:', err);
        }
    }

    function handleClear(id: number) {
        todos = todos.map(t =>
            t.id === id
                ? { ...t, editText: '' }
                : t
        );
    }

    function handleOutsideClick(e: MouseEvent) {
        if (!(e.target as HTMLElement).closest('.todo-item')) {
            todos = todos.map(t => ({ ...t, editing: false }));
        }
        if (!(e.target as HTMLElement).closest('.profile-menu')) {
            showProfileMenu = false;
        }
    }

    function toggleProfileMenu(e: MouseEvent) {
        e.stopPropagation();
        showProfileMenu = !showProfileMenu;
    }

    function handleHoverEnter(e: MouseEvent) {
        const el = e.currentTarget as HTMLElement;
        gsap.killTweensOf(el);
        gsap.to(el, { borderColor: "#ff0033", duration: 0.2 });
    }

    function handleHoverLeave(e: MouseEvent) {
        const el = e.currentTarget as HTMLElement;
        gsap.killTweensOf(el);
        gsap.to(el, { rotation: 0, borderColor: "white", duration: 0.2 });
    }

    async function addTodo() {
        const newTodo: Todo = {
            id: nextId++,
            text: 'Click me to change task',
            editText: 'Click me to change task',
            value: 10,
            tier: 'Basic',
            editing: false,
            show: true,
            edited: false
        };
        todos = [...todos, newTodo];
        await tick();
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }

    async function deleteTodo(id: number) {
        const t = todos.find(t => t.id === id);
        if (!t) return;
        
        // If task was edited (has AI-generated data), remove from Firestore
        if (t.edited && t.text !== 'Click me to change task') {
            await removeTaskFromFirestore(t.text);
        }
        
        // Remove from local todos
        todos = todos.filter(t => t.id !== id);
    }

    async function finishTodo(id: number) {
        const t = todos.find(t => t.id === id);
        if (!t) return;
        
        console.log('Completing todo:', { id, text: t.text, value: t.value, tier: t.tier }); // Debug log
        
        // Add money to balance
        moneyBalance += t.value;
        
        // Save money balance to Firestore
        await saveMoneyBalanceToFirestore();
        
        // Update task status to finished in Firestore (instead of creating new one)
        await updateTaskStatusInFirestore(t.text, 'finished');
        
        // Refresh UserInfo component to show updated balance
        if (userInfoComponent && typeof (userInfoComponent as any).refreshBalance === 'function') {
            (userInfoComponent as any).refreshBalance();
        }
        
        // Move task to finished todos
        finishedTodos = [...finishedTodos, { ...t, show: true }];
        
        // Remove from active todos
        todos = todos.filter(t => t.id !== id);
    }

    async function checkUsername() {
        if (!user || typeof user !== 'object' || !('uid' in user)) {
            console.log('checkUsername: No valid user found');
            return;
        }
        
        console.log('checkUsername: Checking username for user:', user.uid);
        
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
                console.log('checkUsername: Username response:', { username, hasUsername: !!username });
                if (!username) {
                    console.log('checkUsername: No username found, showing modal');
                    showUsernameModal = true;
                }
            } else {
                console.log('checkUsername: API error, showing modal');
                showUsernameModal = true;
            }
        } catch (error) {
            console.error('Error checking username:', error);
            showUsernameModal = true;
        }
    }

    async function saveTaskToFirestore(text: string, value: number, tier: string, status: 'active' | 'finished' = 'active') {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        console.log('Saving task to Firestore:', { text, value, tier, status }); // Debug log
        
        try {
            const response = await fetch('/api/generate/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                },
                body: JSON.stringify({
                    label: text,
                    money: value,
                    description: `${tier} task: ${text}`,
                    status: status
                })
            });
            
            if (response.ok) {
                console.log('Task saved successfully to Firestore');
            } else {
                console.error('Error saving task to Firestore:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error saving task to Firestore:', error);
        }
    }

    async function removeTaskFromFirestore(taskText: string) {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        console.log('Removing task from Firestore:', taskText); // Debug log
        
        try {
            const response = await fetch('/api/generate/tasks', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                },
                body: JSON.stringify({
                    label: taskText
                })
            });
            
            if (response.ok) {
                console.log('Task removed successfully from Firestore');
            } else {
                console.error('Error removing task from Firestore:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error removing task from Firestore:', error);
        }
    }

    async function updateTaskStatusInFirestore(taskText: string, status: 'active' | 'finished') {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        console.log('Updating task status in Firestore:', { taskText, status }); // Debug log
        
        try {
            const response = await fetch('/api/generate/tasks', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                },
                body: JSON.stringify({
                    label: taskText,
                    status: status
                })
            });
            
            if (response.ok) {
                console.log('Task status updated successfully in Firestore');
            } else {
                console.error('Error updating task status in Firestore:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error updating task status in Firestore:', error);
        }
    }

    async function saveMoneyBalanceToFirestore() {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        try {
            const response = await fetch('/api/user/money', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                },
                body: JSON.stringify({
                    balance: moneyBalance
                })
            });
            
            if (!response.ok) {
                console.error('Error saving money balance to Firestore:', response.statusText);
            }
        } catch (error) {
            console.error('Error saving money balance to Firestore:', error);
        }
    }

    async function loadMoneyBalanceFromFirestore() {
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
            console.error('Error loading money balance from Firestore:', error);
        }
    }

    async function loadTasksFromFirestore() {
        if (!user || typeof user !== 'object' || !('uid' in user)) return;
        
        try {
            const response = await fetch('/api/generate/tasks', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded tasks from Firestore:', data); // Debug log
                
                // Separate active and finished tasks
                const activeTasks = data.filter(task => !task.status || task.status === 'active');
                const finishedTasks = data.filter(task => task.status === 'finished');
                
                // Convert active tasks to local todo format
                const activeTodos = activeTasks.map((task, index) => ({
                    id: nextId++,
                    text: task.label,
                    editText: task.label,
                    value: task.money,
                    tier: task.description?.split(':')[0]?.trim()?.replace(' task', '') || 'Completed',
                    editing: false,
                    show: true,
                    edited: true // Mark as edited since they came from AI
                }));
                
                // Convert finished tasks to local todo format
                const finishedTodosFromFirestore = finishedTasks.map((task, index) => ({
                    id: nextId++,
                    text: task.label,
                    editText: task.label,
                    value: task.money,
                    tier: task.description?.split(':')[0]?.trim()?.replace(' task', '') || 'Completed',
                    editing: false,
                    show: true,
                    edited: true // Mark as edited since they came from AI
                }));
                
                // Add to existing todos
                todos = [...todos, ...activeTodos];
                finishedTodos = [...finishedTodos, ...finishedTodosFromFirestore];
            }
        } catch (error) {
            console.error('Error loading tasks from Firestore:', error);
        }
    }

    async function saveUsername() {
        if (!usernameInput.trim() || !user || typeof user !== 'object' || !('uid' in user)) return;
        
        usernameLoading = true;
        try {
            const response = await fetch('/api/user/username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await (user as any).getIdToken()}`
                },
                body: JSON.stringify({ username: usernameInput.trim() })
            });
            
            if (response.ok) {
                username = usernameInput.trim();
                showUsernameModal = false;
                usernameInput = '';
                // Refresh the page after successful username submission
                window.location.reload();
            } else {
                console.error('Failed to save username');
            }
        } catch (error) {
            console.error('Error saving username:', error);
        } finally {
            usernameLoading = false;
        }
    }

    function closeUsernameModal() {
        if (username) {
            showUsernameModal = false;
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
</script>

<style>
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
    
    :global(body) {
        overflow-x: hidden;
    }

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
        padding-top: 3rem;
        min-height: 100vh;
        overflow-x: hidden;
        width: 100%;
        box-sizing: border-box;
    }

    /* balance indicator */
    .balance-indicator {
        position: fixed;
        top: 1rem; right: 1rem;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 3;
    }
    .balance-indicator a {
        color: inherit;
        text-decoration: none;
    }

    /* Tab system */
    .tabs {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        justify-content: center;
        width: 100%;
        max-width: 600px;
    }

    .tab {
        all: unset;
        background: rgba(255,255,255,0.1);
        color: white;
        padding: 0.4rem;
        border-radius: 0.3rem;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        border: 1px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
    }

    .tab:hover {
        background: rgba(255,255,255,0.2);
        transform: translateY(-2px);
    }

    .tab.active {
        background: rgba(255,255,255,0.25);
        border-color: rgba(255,255,255,0.4);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .tab i {
        font-size: 0.9rem;
    }

    .tab-content {
        min-height: 400px;
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-x: hidden;
        box-sizing: border-box;
    }


    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: rgba(255,255,255,0.6);
        font-style: italic;
    }

    .empty-state p {
        margin: 0;
        font-size: 1.1rem;
    }


    /* Mobile profile menu */
    .mobile-profile {
        position: relative;
        display: none;
    }

    .profile-icon-btn {
        all: unset;
        background: none;
        color: white;
        padding: 0.25rem;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        font-size: 1rem;
        width: 32px;
        height: 32px;
    }

    .profile-icon-btn:hover {
        color: #ff0033;
    }

    .profile-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: rgba(0,0,0,0.9);
        border: 2px solid white;
        border-radius: 0.5rem;
        padding: 0.5rem 0;
        min-width: 200px;
        z-index: 10;
        margin-top: 0.5rem;
    }

    .profile-menu-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        color: white;
        text-decoration: none;
        border: none;
        background: none;
        width: 100%;
        cursor: pointer;
        font-size: 1rem;
        transition: background 0.2s;
    }

    .profile-menu-item:hover {
        background: rgba(255,255,255,0.1);
    }

    .profile-menu-item:first-child {
        border-bottom: 1px solid rgba(255,255,255,0.2);
        font-weight: bold;
    }

    .profile-menu-item i {
        width: 16px;
        text-align: center;
    }

    /* Responsive classes */
    .desktop-only {
        display: flex;
    }

    @media (max-width: 1024px) {
        .desktop-only {
            display: none !important;
        }
        
        .mobile-profile {
            display: block;
        }
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

    .shit-header {
        margin-top: -2rem; margin-bottom: 1rem;
        width: 90%; max-width: 250px;
        display: flex; justify-content: center;
        transition: transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);
    }
    img.shitt {
        width: 100%; margin-top: 15vh; height: auto; pointer-events: none;
    }

    .todo-list {
        width: 100%; 
        max-width: 600px;
        display: flex; 
        flex-direction: column;
        gap: 1rem;
        padding: 0 1rem 3rem;
        box-sizing: border-box;
        overflow-x: hidden;
    }

    .todo-item {
        all: unset;
        display: flex; align-items: center;
        gap: 0.5rem;
        background: rgba(255,255,255,0.08);
        border: 2px dashed white;
        padding: 1rem;
        border-radius: 0.5rem;
        color: white; font-size: 1.3rem; font-weight: bold;
        cursor: pointer; user-select: none;
        width: 100%; box-sizing: border-box;
        position: relative;
    }

    .todo-item-content {
        flex: 1;
        display: flex; align-items: center;
        pointer-events: none;
    }

    .todo-text { 
        font-size: 1.1rem;
    }
    
    .placeholder-text {
        opacity: 0.5;
        font-style: italic;
        font-size: 0.9rem;
    }

    .right-group {
        font-style: italic;
        display: flex; align-items: center; gap: 0.5rem;
        margin-left: auto;
    }

    .todo-tier {
        font-size: 1rem;
        padding: 0.2rem 0.6rem;
        border: 1px solid white;
        border-radius: 0.3rem;
    }

    .todo-value {
        font-size: 1.2rem;
    }

    input.todo-input {
        all: unset; flex: 1;
        background: transparent;
        color: white; font-size: 1.1rem;
        text-align: left; max-width: 70%;
        pointer-events: auto;
    }

    .buttons-wrapper {
        display: flex; gap: 0.5rem;
        align-items: center; justify-content: center;
        pointer-events: auto;
    }

    .clear-btn,
    .accept-btn,
    .finish-btn,
    .delete-btn {
        all: unset; background: black;
        color: white; padding: 0.75rem;
        border-radius: 0.4rem; cursor: pointer;
        border: 2px solid white;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
        transition: background 0.3s, color 0.3s, transform 0.2s;
        pointer-events: auto;
    }
    .clear-btn:hover,
    .accept-btn:hover,
    .finish-btn:hover,
    .delete-btn:hover {
        background: white; color: black;
        transform: scale(1.1);
    }

    .add-btn {
        all: unset;
        background: rgba(255,255,255,0.2);
        color: white;
        padding: 0.8rem 1.2rem;
        border-radius: 0.5rem;
        font-size: 1.2rem; font-weight: bold;
        text-align: center; cursor: pointer;
        margin-bottom: 2rem;
        border: 2px solid white;
        transition: background 0.3s, color 0.3s, transform 0.2s;
        align-self: center;
    }
    .add-btn:hover {
        background: white; color: black;
        transform: scale(1.05);
    }

    .leaderboard-btn {
        all: unset;
        background: rgba(255,255,255,0.05);
        color: white;
        padding: 0.6rem 1rem;
        border-radius: 0.4rem;
        font-size: 1rem; 
        font-weight: 500;
        text-align: center; 
        cursor: pointer;
        margin: 1rem auto 2rem auto;
        border: 1px solid rgba(255,255,255,0.3);
        transition: all 0.3s ease;
        align-self: center;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        opacity: 0.8;
        max-width: 200px;
    }
    .leaderboard-btn:hover {
        background: rgba(255,255,255,0.15);
        color: white;
        transform: translateY(-2px);
        opacity: 1;
        border-color: rgba(255,255,255,0.5);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    @media (max-width: 500px) {
        .todo-item {
            flex-wrap: wrap; gap: 1rem; padding: 1rem;
        }
        .todo-item-content {
            width: 100%;
        }
        .buttons-wrapper,
        .finish-btn,
        .delete-btn {
            flex: 1 1 calc(50% - 0.5rem);
            margin-left: 0;
        }
        .delete-btn {
            position: static;
            margin-top: 0.5rem;
        }
        
    }

    @media (min-width: 501px) {
        .todo-item-content {
            margin-right: 1rem;
        }
    }

    /* Username Modal */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    }

    .username-modal {
        background: rgba(255,255,255,0.1);
        border: 2px dashed white;
        border-radius: 0.5rem;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        color: white;
        backdrop-filter: blur(10px);
    }

    .modal-header {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .modal-header h2 {
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0 0 0.5rem 0;
        color: white;
    }

    .modal-header p {
        font-size: 0.9rem;
        opacity: 0.8;
        margin: 0;
    }

    .modal-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .username-input {
        all: unset;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 0.4rem;
        padding: 0.75rem 1rem;
        color: white;
        font-size: 1rem;
        text-align: center;
    }

    .username-input::placeholder {
        color: rgba(255,255,255,0.6);
    }

    .username-input:focus {
        border-color: #ff0033;
        background: rgba(255,255,255,0.15);
    }

    .modal-buttons {
        display: flex;
        justify-content: center;
    }

    .save-username-btn {
        all: unset;
        background: rgba(255,255,255,0.1);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 0.4rem;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .save-username-btn:hover:not(:disabled) {
        background: white;
        color: black;
        transform: scale(1.05);
    }

    .save-username-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
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
        <!-- balance & user info -->
        <div class="balance-indicator">
            <div class="desktop-only">
                <UserInfo bind:this={userInfoComponent} />
            </div>
            <div class="mobile-profile">
                <button 
                    on:click={toggleProfileMenu}
                    class="profile-icon-btn"
                    aria-label="Profile Menu"
                    title="Profile Menu"
                >
                    <i class="fas fa-user"></i>
                </button>
                {#if showProfileMenu}
                    <div class="profile-menu">
                        <div class="profile-menu-item">
                            <UserInfo bind:this={userInfoComponent} />
                        </div>
                        <a href="/leaderboard" class="profile-menu-item" on:click={() => showProfileMenu = false}>
                            <i class="fas fa-trophy"></i>
                            <span>Leaderboards</span>
                        </a>
                    </div>
                {/if}
            </div>
        </div>

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

        {#if showShit}
            <div class="shit-header" style="transform:scale({$shitScale});">
                <img src="/shitt.png" alt="Shitt Header" class="shitt" />
            </div>

            <!-- Tabs -->
            <div class="tabs">
                <button 
                    class="tab {activeTab === 'active' ? 'active' : ''}"
                    on:click={() => switchTab('active')}
                    title="Active Tasks"
                >
                    <i class="fas fa-list-ul"></i>
                </button>
                <button 
                    class="tab {activeTab === 'finished' ? 'active' : ''}"
                    on:click={() => switchTab('finished')}
                    title="Finished Tasks"
                >
                    <i class="fas fa-check-circle"></i>
                </button>
            </div>

            <div class="tab-content">
                {#if activeTab === 'active'}
                    <div class="todo-list">
                {#each todos as todo (todo.id)}
                    {#if todo.show}
                        <div
                            class="todo-item"
                            role="button"
                            tabindex="0"
                            on:mouseenter={handleHoverEnter}
                            on:mouseleave={handleHoverLeave}
                            on:click={() => !todo.editing && handleEditMode(todo.id)}
                            on:keydown={(e) => e.key === 'Enter' && !todo.editing && handleEditMode(todo.id)}
                            in:fly={{ x:300, duration:500 }}
                        >
                            {#if todo.editing}
                                <div class="todo-item-content">
                                    <input
                                        id={"input-" + todo.id}
                                        class="todo-input"
                                        bind:value={todo.editText}
                                        on:keydown={(e) => e.key==='Enter' && handleAccept(todo.id)}
                                        on:click={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div class="buttons-wrapper">
                                    <button 
                                        class="clear-btn" 
                                        on:click={(e) => { 
                                            e.stopPropagation(); 
                                            handleClear(todo.id); 
                                        }}
                                        aria-label="Clear edit"
                                    >
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    <button 
                                        class="accept-btn" 
                                        on:click={(e) => { 
                                            e.stopPropagation(); 
                                            handleAccept(todo.id); 
                                        }}
                                        aria-label="Accept edit"
                                    >
                                        <i class="fas fa-check"></i>
                                    </button>
                                </div>
                            {:else}
                                <div class="todo-item-content">
                                    <div class="todo-text {todo.text === 'Click me to change task' ? 'placeholder-text' : ''}">{todo.text}</div>
                                    <div class="right-group">
                                        <div class="todo-tier">{todo.tier}</div>
                                        <div class="todo-value">${todo.value}</div>
                                    </div>
                                </div>
                                {#if todo.edited}
                                    <button
                                        class="finish-btn"
                                        on:click={(e) => {
                                            e.stopPropagation();
                                            finishTodo(todo.id);
                                        }}
                                        aria-label="Done todo"
                                    >
                                        Done
                                    </button>
                                {/if}
                                <button
                                    class="delete-btn"
                                    on:click={(e) => { 
                                        e.stopPropagation(); 
                                        deleteTodo(todo.id); 
                                    }}
                                    aria-label="Delete todo"
                                >
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            {/if}
                        </div>
                    {/if}
                {/each}

                        <button class="add-btn" on:click={addTodo}>
                            <i class="fas fa-plus"></i> Add Todo
                        </button>

                        <a href="/leaderboard" class="leaderboard-btn" aria-label="Leaderboard">
                            <i class="fas fa-trophy"></i> Leaderboards
                        </a>
                    </div>
                {:else if activeTab === 'finished'}
                    <div class="todo-list">
                        {#each finishedTodos as todo (todo.id)}
                            <div
                                class="todo-item"
                                role="button"
                                tabindex="0"
                                in:fly={{ x:300, duration:500 }}
                            >
                                <div class="todo-item-content">
                                    <span class="todo-text">{todo.text}</span>
                                </div>
                                <div class="right-group">
                                    <span class="todo-value">${todo.value}</span>
                                    <span class="todo-tier">{todo.tier}</span>
                                </div>
                                <div class="buttons-wrapper">
                                    <button class="check-btn" disabled>
                                        <i class="fas fa-check"></i>
                                    </button>
                                </div>
                            </div>
                        {/each}
                        
                        {#if finishedTodos.length === 0}
                            <div class="empty-state">
                                <p>No finished tasks yet. Complete some tasks to see them here!</p>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Username Modal -->
    {#if showUsernameModal}
        <div class="modal-overlay" on:click={closeUsernameModal}>
            <div class="username-modal" on:click={(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <h2>Choose Your Username</h2>
                    <p>Pick a username to display instead of your email</p>
                </div>
                <div class="modal-content">
                    <input
                        type="text"
                        bind:value={usernameInput}
                        placeholder="Enter username..."
                        class="username-input"
                        maxlength="20"
                        on:keydown={(e) => e.key === 'Enter' && saveUsername()}
                    />
                    <div class="modal-buttons">
                        <button 
                            class="save-username-btn"
                            on:click={saveUsername}
                            disabled={!usernameInput.trim() || usernameLoading}
                        >
                            {#if usernameLoading}
                                <div class="spinner"></div>
                                Saving...
                            {:else}
                                Save Username
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}
{/if}
