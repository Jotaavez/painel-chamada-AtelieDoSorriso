// Script para o painel de chamadas
document.addEventListener('DOMContentLoaded', () => {
    const patientNameEl = document.getElementById('call-patient-name');
    const consultorioEl = document.getElementById('call-consultorio');
    const doctorEl = document.getElementById('call-doctor');
    const recentCallsList = document.getElementById('recent-calls-list');
    const notificationSound = document.getElementById('notification-sound');
    const clockEl = document.getElementById('call-clock');
    
    let lastCallId = null;
    let previousCall = null;
    let blinkTimeout = null;

    function updateClock() {
        if (!clockEl) return;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Exibe chamada atual
    function displayCurrentCall(call) {
        if (!call) {
            patientNameEl.textContent = 'Aguardando chamada...';
            consultorioEl.textContent = '';
            doctorEl.textContent = '';
            return;
        }
        patientNameEl.textContent = call.patientName;
        consultorioEl.textContent = `Consultório ${call.consultorio}`;
        doctorEl.textContent = call.doctorName;
    }

    function triggerBlink() {
        if (!patientNameEl) return;
        patientNameEl.classList.remove('call-blink');
        if (blinkTimeout) {
            clearTimeout(blinkTimeout);
        }
        // Força reflow para reiniciar a animação
        void patientNameEl.offsetWidth;
        patientNameEl.classList.add('call-blink');
        blinkTimeout = setTimeout(() => {
            patientNameEl.classList.remove('call-blink');
        }, 3000);
    }

    // Função para tocar som com múltiplas tentativas
    function playNotificationSound() {
        if (!notificationSound) {
            console.log('Elemento de áudio não encontrado');
            return;
        }
        
        try {
            notificationSound.volume = 1.0;
            notificationSound.currentTime = 0;
            
            // Tenta tocar
            const playPromise = notificationSound.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✓ Som tocando com sucesso');
                    })
                    .catch(error => {
                        console.log('✗ Erro ao tocar:', error.message);
                        // Tentativa 2
                        setTimeout(() => {
                            notificationSound.play()
                                .then(() => console.log('✓ Som tocando (tentativa 2)'))
                                .catch(e => {
                                    console.log('✗ Tentativa 2 falhou:', e.message);
                                    // Tentativa 3
                                    setTimeout(() => {
                                        notificationSound.play()
                                            .then(() => console.log('✓ Som tocando (tentativa 3)'))
                                            .catch(e3 => console.log('✗ Tentativa 3 falhou:', e3.message));
                                    }, 500);
                                });
                        }, 200);
                    });
            }
        } catch (e) {
            console.log('Erro ao tentar tocar som:', e);
        }
    }

    // Função para carregar chamadas recentes (apenas a anterior)
    function loadRecentCalls() {
        recentCallsList.innerHTML = '';
        
        if (!previousCall) {
            recentCallsList.innerHTML = '<p class="empty-message">Nenhuma chamada recente</p>';
            return;
        }

        const date = new Date(previousCall.timestamp);
        const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <strong>${previousCall.patientName}</strong>
            <span class="recent-meta">Consultório ${previousCall.consultorio} · ${previousCall.doctorName}</span>
            <span class="recent-time">${time}</span>
        `;

        recentCallsList.appendChild(item);
    }

    // Função para verificar novas chamadas
    function checkForNewCalls() {
        const rawCalls = localStorage.getItem('call-notifications');
        let calls = [];
        
        if (rawCalls) {
            try {
                calls = JSON.parse(rawCalls);
            } catch (e) {
                console.error('Erro ao carregar chamadas:', e);
                return;
            }
        }

        if (calls.length === 0) {
            displayCurrentCall(null);
            previousCall = null;
            recentCallsList.innerHTML = '<p class="empty-message">Nenhuma chamada recente</p>';
            return;
        }

        // Ordena por timestamp mais recente
        calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Pega apenas a ÚLTIMA chamada
        const latestCall = calls[0];

        // Se for uma nova chamada, toca o som e exibe
        if (latestCall.id !== lastCallId) {
            // A chamada atual vira a anterior
            previousCall = lastCallId ? calls.find(c => c.id === lastCallId) : null;
            lastCallId = latestCall.id;
            
            // Toca o som
            playNotificationSound();

            // Exibe a chamada
            displayCurrentCall(latestCall);
            triggerBlink();
        }

        // Atualiza lista de chamadas recentes (mostra a anterior)
        loadRecentCalls();
    }

    checkForNewCalls();
    setInterval(checkForNewCalls, 1000);
});
