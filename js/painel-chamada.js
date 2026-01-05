// Tela de chamada: busca o último paciente chamado e atualiza a tela
const API = '../php';

async function api(path, method='GET', body=null){
    const opts = {method, headers:{}};
    if(body && !(body instanceof FormData)){
        opts.headers['Content-Type']='application/x-www-form-urlencoded';
        opts.body = new URLSearchParams(body).toString();
    } else if(body instanceof FormData){ opts.body = body; }
    const res = await fetch(`${API}/${path}`, opts);
    return res.json();
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let lastSeenTimestamp = 0;

function buildYouTubePlayer(container, playlistId){
    // If playlistId is empty, do nothing.
    if(!playlistId) return;
    // embed playlist with autoplay and loop
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(playlistId)}&autoplay=1&mute=0&controls=0&rel=0&loop=1&playlist=${encodeURIComponent(playlistId)}`;
    iframe.allow = 'autoplay; encrypted-media';
    container.innerHTML = '';
    container.appendChild(iframe);
}

async function update() {
    try{
        const res = await api('list_patients.php');
        if(!res.ok) return;
        const patients = res.patients || [];
        // find most recent called (last_called)
        const called = patients.filter(p=>p.status==='called' && p.last_called).sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];
        const lastCalled = patients.filter(p=>p.status==='called' || p.status==='done').sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];

        const currentNameEl = document.getElementById('current-name');
        const currentInfoEl = document.getElementById('current-info');
        const lastEl = document.getElementById('last-called');

        if(called){
            currentNameEl.textContent = called.name;
            currentInfoEl.textContent = `${called.room || ''} — ${called.called_by || ''}`.trim();
            // if new call, play sound
            if((called.last_called||0) > lastSeenTimestamp){
                lastSeenTimestamp = called.last_called;
                const audio = document.getElementById('notify-sound');
                if(audio){ audio.pause(); audio.currentTime = 0; audio.play().catch(()=>{}); }
            }
        } else {
            currentNameEl.textContent = '—';
            currentInfoEl.textContent = '—';
        }

        if(lastCalled){
            lastEl.textContent = `Último chamado: ${lastCalled.name} — ${lastCalled.service} (${lastCalled.called_by || ''})`;
        } else {
            lastEl.textContent = 'Último chamado: —';
        }

    }catch(e){ console.error(e); }
}

document.addEventListener('DOMContentLoaded', ()=>{
    const container = document.getElementById('player-container');
    const playlist = container && container.getAttribute('data-playlist');
    buildYouTubePlayer(container, playlist);

    // controls: toggle videos (hide/show iframe) and mute audio
    const toggleBtn = document.getElementById('toggle-videos');
    const muteBtn = document.getElementById('mute-audio');
    const audioEl = document.getElementById('notify-sound');
    let iframeSrc = container.querySelector('iframe') ? container.querySelector('iframe').src : null;
    if(toggleBtn){
        toggleBtn.addEventListener('click', ()=>{
            const iframe = container.querySelector('iframe');
            if(iframe && iframe.src){
                // hide
                iframeSrc = iframe.src;
                container.innerHTML = '';
                toggleBtn.textContent = 'Mostrar vídeos';
            } else {
                // restore
                if(iframeSrc) {
                    const f = document.createElement('iframe'); f.src = iframeSrc; f.allow = 'autoplay; encrypted-media'; f.setAttribute('allow','autoplay; encrypted-media'); f.style.width='100%'; f.style.height='100%';
                    container.appendChild(f);
                }
                toggleBtn.textContent = 'Ocultar vídeos';
            }
        });
    }
    if(muteBtn){
        muteBtn.addEventListener('click', ()=>{
            if(!audioEl) return;
            audioEl.muted = !audioEl.muted;
            muteBtn.textContent = audioEl.muted ? 'Desmutar' : 'Mudo';
        });
    }

    // click to replay sound
    const currentNameEl = document.getElementById('current-name');
    if(currentNameEl) currentNameEl.addEventListener('click', ()=>{ const a=document.getElementById('notify-sound'); if(a){ a.currentTime=0; a.play().catch(()=>{}); } });

    // realtime: prefer WebSocket, then SSE, then polling
    const connEl = document.getElementById('connection-status');
    function statusCb(s){ if(!connEl) return; const map = {connecting:'Conectando…', connected:'Conectado', polling:'Polling', error:'Erro — reconectando', unsupported:'Sem SSE — polling'}; connEl.textContent = map[s] || s; connEl.dataset.state = s; connEl.dataset.status = s; }
    if (window.WSClient){
        WSClient.init(null, (patients)=>{ handlePatients(patients||[]); }, { status: statusCb });
    } else if (window.SSEClient){
        SSEClient.init('/php/stream.php', (patients)=>{ handlePatients(patients||[]); }, { pollInterval:2000, status: statusCb });
    } else { update(); setInterval(update,2000); }
});

function handlePatients(patients){
    // similar logic to update(): find most recent called
    const called = (patients||[]).filter(p=>p.status==='called' && p.last_called).sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];
    const lastCalled = (patients||[]).filter(p=>p.status==='called' || p.status==='done').sort((a,b)=> (b.last_called||0)-(a.last_called||0))[0];
    const currentNameEl = document.getElementById('current-name');
    const currentInfoEl = document.getElementById('current-info');
    const lastEl = document.getElementById('last-called');
    if(called){
        currentNameEl.textContent = called.name;
        currentInfoEl.textContent = `${called.room || ''} — ${called.called_by || ''}`.trim();
        if((called.last_called||0) > lastSeenTimestamp){
            lastSeenTimestamp = called.last_called;
            const audio = document.getElementById('notify-sound'); if(audio){ audio.pause(); audio.currentTime=0; audio.play().catch(()=>{}); }
            // visual highlight
            currentNameEl.classList.remove('flash');
            void currentNameEl.offsetWidth;
            currentNameEl.classList.add('flash');
        }
    } else { currentNameEl.textContent='—'; currentInfoEl.textContent='—'; }
    if(lastCalled){ lastEl.textContent = `Último chamado: ${lastCalled.name} — ${lastCalled.service} (${lastCalled.called_by || ''})`; } else { lastEl.textContent='Último chamado: —'; }
}
