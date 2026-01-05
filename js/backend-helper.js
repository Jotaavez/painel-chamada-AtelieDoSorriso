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

// Tenta carregar Firebase
async function initializeBackend() {
    try {
        const { database: db, ref: r, set: s, get: g, update: u, remove: rm, onValue: ov } = await import('./firebase-config.js');
        database = db;
        ref = r;
        set = s;
        get = g;
        update = u;
        remove = rm;
        onValue = ov;
        useFirebase = true;
        console.log('✓ Firebase inicializado com sucesso');
    } catch (e) {
        console.log('⚠️ Firebase não configurado, usando localStorage como fallback');
        useFirebase = false;
    }
}

// Salva dados
async function saveData(key, value) {
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

// Listener em tempo real para chamadas
function onCallsChange(callback) {
    if (useFirebase && database && ref && onValue) {
        try {
            const refPath = ref(database, 'call-notifications');
            onValue(refPath, (snapshot) => {
                const data = snapshot.val();
                callback(data || []);
            });
            return;
        } catch (e) {
            console.error('Erro ao listenar mudanças no Firebase:', e);
        }
    }
    
    // Fallback: polling localStorage a cada segundo
    setInterval(() => {
        const data = localStorage.getItem('call-notifications');
        callback(data ? JSON.parse(data) : []);
    }, 1000);
}

// Inicializa ao carregar
initializeBackend();

export { saveData, loadData, onCallsChange, useFirebase };
