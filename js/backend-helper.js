// Arquivo com funções auxiliares Firebase/localStorage
// Usa Firebase se configurado, senão volta para localStorage

let useFirebase = false;
let database = null;
let ref = null;
let set = null;
let get = null;
let update = null;
let remove = null;
let onValue = null;
let runTransaction = null;
let initPromise = null;

// Tenta carregar Firebase
async function initializeBackend() {
    try {
        const { database: db, ref: r, set: s, get: g, update: u, remove: rm, onValue: ov, runTransaction: rt } = await import('./firebase-config.js');
        database = db;
        ref = r;
        set = s;
        get = g;
        update = u;
        remove = rm;
        onValue = ov;
        runTransaction = rt;
        useFirebase = true;
        console.log('✓ Firebase inicializado com sucesso');
    } catch (e) {
        console.log('⚠️ Firebase não configurado, usando localStorage como fallback');
        useFirebase = false;
    }
}

// Função auxiliar para garantir inicialização antes de usar
async function ensureInitialized() {
    if (!initPromise) {
        initPromise = initializeBackend();
    }
    await initPromise;
}

// Salva dados
async function saveData(key, value) {
    await ensureInitialized();
    if (useFirebase && database && ref && set) {
        try {
            const refPath = ref(database, key);
            await set(refPath, value);
            return;
        } catch (e) {
            console.error('Erro ao salvar no Firebase:', e);
        }
    }
    // Fallback localStorage
    localStorage.setItem(key, JSON.stringify(value));
}

// Carrega dados
async function loadData(key) {
    await ensureInitialized();
    if (useFirebase && database && ref && get) {
        try {
            const snapshot = await get(ref(database, key));
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (e) {
            console.error('Erro ao carregar do Firebase:', e);
        }
    }
    // Fallback localStorage
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Listener em tempo real para qualquer chave
async function onDataChange(key, callback) {
    await ensureInitialized();
    if (useFirebase && database && ref && onValue) {
        try {
            const refPath = ref(database, key);
            onValue(refPath, (snapshot) => {
                const data = snapshot.val();
                callback(data || (key.includes('patients') || key.includes('history') || key.includes('notifications') ? [] : null));
            });
            return;
        } catch (e) {
            console.error('Erro ao listenar mudanças no Firebase:', e);
        }
    }
    
    // Fallback: polling localStorage a cada segundo
    setInterval(() => {
        const data = localStorage.getItem(key);
        callback(data ? JSON.parse(data) : (key.includes('patients') || key.includes('history') || key.includes('notifications') ? [] : null));
    }, 1000);
}

// Listener em tempo real para chamadas (retrocompatibilidade)
function onCallsChange(callback) {
    return onDataChange('call-notifications', callback);
}

// Adiciona item a um array de forma atômica (evita race conditions)
async function pushToArray(key, newItem) {
    await ensureInitialized();
    if (useFirebase && database && ref && runTransaction) {
        try {
            const refPath = ref(database, key);
            await runTransaction(refPath, (currentData) => {
                const arr = Array.isArray(currentData) ? currentData : [];
                arr.push(newItem);
                return arr;
            });
            return;
        } catch (e) {
            console.error('Erro ao adicionar item no Firebase:', e);
        }
    }
    
    // Fallback localStorage
    const data = localStorage.getItem(key);
    const arr = data ? JSON.parse(data) : [];
    arr.push(newItem);
    localStorage.setItem(key, JSON.stringify(arr));
}

// Remove item de um array de forma atômica
async function removeFromArray(key, filterFn) {
    await ensureInitialized();
    if (useFirebase && database && ref && runTransaction) {
        try {
            const refPath = ref(database, key);
            await runTransaction(refPath, (currentData) => {
                const arr = Array.isArray(currentData) ? currentData : [];
                return arr.filter(filterFn);
            });
            return;
        } catch (e) {
            console.error('Erro ao remover item no Firebase:', e);
        }
    }
    
    // Fallback localStorage
    const data = localStorage.getItem(key);
    const arr = data ? JSON.parse(data) : [];
    const updated = arr.filter(filterFn);
    localStorage.setItem(key, JSON.stringify(updated));
}

// Adiciona item no início de um array de forma atômica
async function unshiftToArray(key, newItem) {
    await ensureInitialized();
    if (useFirebase && database && ref && runTransaction) {
        try {
            const refPath = ref(database, key);
            await runTransaction(refPath, (currentData) => {
                const arr = Array.isArray(currentData) ? currentData : [];
                arr.unshift(newItem);
                return arr;
            });
            return;
        } catch (e) {
            console.error('Erro ao adicionar item no início no Firebase:', e);
        }
    }
    
    // Fallback localStorage
    const data = localStorage.getItem(key);
    const arr = data ? JSON.parse(data) : [];
    arr.unshift(newItem);
    localStorage.setItem(key, JSON.stringify(arr));
}

// Inicializa ao carregar
initPromise = initializeBackend();

export { saveData, loadData, onDataChange, onCallsChange, pushToArray, removeFromArray, unshiftToArray, useFirebase };
