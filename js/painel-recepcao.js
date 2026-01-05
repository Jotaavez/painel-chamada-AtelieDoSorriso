// JS mínimo para painel de recepção
const API = '../php';

async function api(path, method='GET', body=null) {
    const opts = { method, headers: {} };
    if (body && !(body instanceof FormData)) {
        opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        opts.body = new URLSearchParams(body).toString();
    } else if (body instanceof FormData) {
        opts.body = body;
    }
    const res = await fetch(`${API}/${path}`, opts);
    return res.json();
}

function render() {
    // polling every 2s
    fetchList();
}

async function fetchList() {
    try {
        const res = await api('list_patients.php');
        if (!res.ok) return;
        const patients = res.patients || [];

        const waitingEl = document.getElementById('waiting-list');
        const historyEl = document.getElementById('history-list');
        waitingEl.innerHTML = '';
        historyEl.innerHTML = '';

        patients.forEach(p => {
            const el = document.createElement('div');
            el.className = 'item';
            const left = document.createElement('div');
            left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> ${p.urgency?'<span class="urgency">(URG)</span>':''}</div><div class="meta">${escapeHtml(p.service)} — ${escapeHtml(p.doctor)}</div>`;
            const right = document.createElement('div');
            right.className = 'controls';

            if (p.status === 'waiting' || p.status === 'called') {
                const btnRemove = document.createElement('button');
                btnRemove.textContent = 'Remover';
                btnRemove.className = 'btn';
                btnRemove.addEventListener('click', () => removePatient(p.id));
                right.appendChild(btnRemove);
            }

            // always show info
            el.appendChild(left);
            el.appendChild(right);

            if (p.status === 'waiting' || p.status === 'called') {
                waitingEl.appendChild(el);
            } else {
                historyEl.appendChild(el);
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        setTimeout(fetchList, 2000);
    }
}

function initSSERecept(onData){
    if (typeof EventSource === 'undefined') return false;
    try{
        const sse = new EventSource('/php/stream.php');
        sse.onmessage = (e)=>{ try { const d = JSON.parse(e.data); if (d.ok) onData(d.patients||[]); } catch(err){} };
        sse.onerror = ()=>{};
        return true;
    } catch(err){ return false; }
}

async function removePatient(id) {
    if (!confirm('Remover paciente?')) return;
    await api('remove_patient.php', 'POST', { id });
}

async function clearQueue() {
    if (!confirm('Limpar fila de espera?')) return;
    await api('clear_queue.php', 'POST');
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-create');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try{
            const name = document.getElementById('name').value.trim();
            const doctor = document.getElementById('doctor').value.trim();
            const service = document.getElementById('service').value;
            const other = document.getElementById('other').value.trim();
            const urgency = document.getElementById('urgency').checked ? '1' : '0';
            if (!name || !doctor || !service) { alert('Preencha nome, doutor e serviço'); return; }
            const body = { name, doctor, service, other, urgency };
            console.log('Criando paciente', body);
            const res = await api('create_patient.php', 'POST', body);
            console.log('Resposta create:', res);
            if(!res || res.error){ alert('Erro ao criar paciente: ' + (res && res.error ? res.error : 'sem resposta')); return; }
            form.reset();
            fetchList();
        }catch(err){ console.error(err); alert('Erro na requisição: '+String(err)); }
    });

    document.getElementById('clear-waiting').addEventListener('click', clearQueue);

    // show/hide other field
    const serviceEl = document.getElementById('service');
    const otherEl = document.getElementById('other');
    function updateOther(){ otherEl.disabled = serviceEl.value !== 'Outro'; }
    serviceEl.addEventListener('change', updateOther);
    updateOther();

    // Prefer WebSocket if available, then SSE, otherwise polling
    if (window.WSClient){
        WSClient.init(null, (patients)=>{
            const waitingEl = document.getElementById('waiting-list');
            const historyEl = document.getElementById('history-list');
            waitingEl.innerHTML = '';
            historyEl.innerHTML = '';
            patients.forEach(p => {
                const el = document.createElement('div');
                el.className = 'item';
                const left = document.createElement('div');
                left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> ${p.urgency?'<span class="urgency">(URG)</span>':''}</div><div class="meta">${escapeHtml(p.service)} — ${escapeHtml(p.doctor)}</div>`;
                const right = document.createElement('div');
                right.className = 'controls';
                if (p.status === 'waiting' || p.status === 'called') {
                    const btnRemove = document.createElement('button');
                    btnRemove.textContent = 'Remover';
                    btnRemove.className = 'btn';
                    btnRemove.addEventListener('click', () => removePatient(p.id));
                    right.appendChild(btnRemove);
                }
                el.appendChild(left);
                el.appendChild(right);
                if (p.status === 'waiting' || p.status === 'called') {
                    waitingEl.appendChild(el);
                } else {
                    historyEl.appendChild(el);
                }
            });
        }, { status: s => { document.body.dataset.ws = s; } });
    } else if (window.SSEClient){
        SSEClient.init('/php/stream.php', (patients)=>{
            const waitingEl = document.getElementById('waiting-list');
            const historyEl = document.getElementById('history-list');
            waitingEl.innerHTML = '';
            historyEl.innerHTML = '';
            patients.forEach(p => {
                const el = document.createElement('div');
                el.className = 'item';
                const left = document.createElement('div');
                left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> ${p.urgency?'<span class="urgency">(URG)</span>':''}</div><div class="meta">${escapeHtml(p.service)} — ${escapeHtml(p.doctor)}</div>`;
                const right = document.createElement('div');
                right.className = 'controls';
                if (p.status === 'waiting' || p.status === 'called') {
                    const btnRemove = document.createElement('button');
                    btnRemove.textContent = 'Remover';
                    btnRemove.className = 'btn';
                    btnRemove.addEventListener('click', () => removePatient(p.id));
                    right.appendChild(btnRemove);
                }
                el.appendChild(left);
                el.appendChild(right);
                if (p.status === 'waiting' || p.status === 'called') {
                    waitingEl.appendChild(el);
                } else {
                    historyEl.appendChild(el);
                }
            });
        }, {pollInterval:2000, status: s => { document.body.dataset.sse = s; }});
    } else {
        render();
    }
});
