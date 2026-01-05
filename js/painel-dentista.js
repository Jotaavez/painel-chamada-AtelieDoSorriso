const API = '../php';

function api(path, method='GET', body=null){
    const opts = {method, headers:{}};
    if(body && !(body instanceof FormData)){
        opts.headers['Content-Type']='application/x-www-form-urlencoded';
        opts.body = new URLSearchParams(body).toString();
    } else if(body instanceof FormData){ opts.body = body; }
    return fetch(`${API}/${path}`, opts).then(r=>r.json());
}

// EventSource (SSE) support for realtime updates
let useSSE = false;
let sse;
function initSSE(onData){
    if (typeof EventSource === 'undefined') return false;
    try {
        sse = new EventSource('/php/stream.php');
        sse.onmessage = (e) => {
            try { const d = JSON.parse(e.data); if (d.ok) onData(d.patients || []); } catch(err){}
        };
        sse.onerror = () => { /* fallback to polling if needed */ };
        useSSE = true;
        return true;
    } catch (err) {
        return false;
    }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderList(patients, dentistName){
    const el = document.getElementById('patients-list');
    el.innerHTML = '';
    // filter relevant patients and sort: urgencies first, then timestamp
    const filtered = (patients || []).filter(p=> String(p.doctor).trim().toLowerCase() === String(dentistName).trim().toLowerCase());
    filtered.sort((a,b)=>{
        if (!!a.urgency && !b.urgency) return -1;
        if (!a.urgency && !!b.urgency) return 1;
        return (a.timestamp || 0) - (b.timestamp || 0);
    });
    filtered.forEach(p=>{
        const row = document.createElement('div'); row.className='patient';
        const left = document.createElement('div');
        left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> ${p.urgency?'<span style="color:#a00">(URG)</span>':''}</div><div class="meta">${escapeHtml(p.service)}</div>`;
        const right = document.createElement('div');
        const btnCall = document.createElement('button'); btnCall.textContent='Chamar'; btnCall.className='btn';
        btnCall.addEventListener('click', ()=>onCall(p));
        const btnFinish = document.createElement('button'); btnFinish.textContent='Finalizar'; btnFinish.className='btn';
        btnFinish.style.marginLeft='8px';
        btnFinish.addEventListener('click', ()=>onFinish(p.id));
        right.appendChild(btnCall);
        right.appendChild(btnFinish);
        row.appendChild(left); row.appendChild(right); el.appendChild(row);
    });
}

async function onCall(patient){
    const ok = await showModal(`Chamar ${patient.name}?`);
    if(!ok) return;
    const dentist = localStorage.getItem('dentistName') || '';
    const room = localStorage.getItem('dentistRoom') || '';
    await api('call_patient.php','POST',{ id: patient.id, by: dentist, room });
    // tocar som - simples beep
    try{ new Audio('/assets/sounds/notify.mp3').play().catch(()=>{}); }catch(e){}
    // perguntar se já entrou
    const entered = await showModal('Paciente já entrou na sala? (OK=Sim)');
    if (entered){ await api('finish_patient.php','POST',{ id: patient.id }); }
}

async function onFinish(id){
    if(!confirm('Marcar como finalizado?')) return;
    await api('finish_patient.php','POST',{ id });
}

async function fetchAndRender(){
    const dentistName = localStorage.getItem('dentistName');
    const room = localStorage.getItem('dentistRoom');
    if(!dentistName || !room){ window.location.href='./dentist-login.html'; return; }
    document.getElementById('dentist-name').textContent = dentistName;
    document.getElementById('dentist-room').textContent = room;
    const res = await api('list_patients.php');
    if(!res.ok) return;
    renderList(res.patients || [], dentistName);
    // last called for this dentist
    const last = (res.patients||[]).filter(p=>p.status==='called' && p.called_by && String(p.called_by).trim().toLowerCase()===String(dentistName).trim().toLowerCase()).sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];
    const lastEl = document.getElementById('last-called');
    if(last){ lastEl.textContent = `Último chamado: ${last.name} — ${last.service} (${last.room||''})`; }
    else { lastEl.textContent = 'Último chamado: —'; }
}

// Simple modal utility
function showModal(message){
    return new Promise(resolve => {
        let modal = document.getElementById('simple-modal');
        if(!modal){
            modal = document.createElement('div'); modal.id='simple-modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-box">
                    <div class="modal-msg"></div>
                    <div class="modal-actions"><button class="btn modal-ok">OK</button><button class="btn modal-cancel">Cancelar</button></div>
                </div>`;
            document.body.appendChild(modal);
            // modal styles are provided in CSS (`css/painel-dentista.css`)
        }
        modal.querySelector('.modal-msg').textContent = message;
        modal.style.display = 'flex';
        const okBtn = modal.querySelector('.modal-ok');
        const cancelBtn = modal.querySelector('.modal-cancel');
        function cleanup(val){ modal.style.display='none'; okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', onCancel); resolve(val); }
        function onOk(){ cleanup(true); }
        function onCancel(){ cleanup(false); }
        okBtn.addEventListener('click', onOk); cancelBtn.addEventListener('click', onCancel);
    });
}

document.addEventListener('DOMContentLoaded', ()=>{
    const logout = document.getElementById('logout');
    logout.addEventListener('click', ()=>{ localStorage.removeItem('dentistName'); localStorage.removeItem('dentistRoom'); window.location.href='./dentist-login.html'; });
    // try SSEClient first (reconnect/backoff + polling fallback)
    // Prefer WebSocket if available, then SSE, otherwise polling
    if (window.WSClient){
        WSClient.init(null, (patients)=>{
            const dentistName = localStorage.getItem('dentistName');
            renderList(patients, dentistName || '');
            const last = (patients||[]).filter(p=>p.status==='called' && p.called_by && String(p.called_by).trim().toLowerCase()===String(localStorage.getItem('dentistName')||'').trim().toLowerCase()).sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];
            const lastEl = document.getElementById('last-called'); if(last){ lastEl.textContent = `Último chamado: ${last.name} — ${last.service} (${last.room||''})`; } else { lastEl.textContent='Último chamado: —'; }
        }, { status: s => { document.body.dataset.ws = s; } });
    } else if (window.SSEClient){
        SSEClient.init('/php/stream.php', (patients)=>{
            const dentistName = localStorage.getItem('dentistName');
            renderList(patients, dentistName || '');
            const last = (patients||[]).filter(p=>p.status==='called' && p.called_by && String(p.called_by).trim().toLowerCase()===String(localStorage.getItem('dentistName')||'').trim().toLowerCase()).sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];
            const lastEl = document.getElementById('last-called'); if(last){ lastEl.textContent = `Último chamado: ${last.name} — ${last.service} (${last.room||''})`; } else { lastEl.textContent='Último chamado: —'; }
        }, {pollInterval:2000, status: s => { document.body.dataset.sse = s; }});
    } else {
        fetchAndRender(); setInterval(fetchAndRender, 2000);
    }
});
