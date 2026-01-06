// Script para o painel de chamadas - com suporte Firebase/localStorage
import { saveData, loadData, onCallsChange } from './backend-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
    const patientNameEl = document.getElementById('call-patient-name');
    const consultorioEl = document.getElementById('call-consultorio');
    const doctorEl = document.getElementById('call-doctor');
    const recentCallsList = document.getElementById('recent-calls-list');
    const notificationSound = document.getElementById('notification-sound');
    const clockEl = document.getElementById('call-clock');
    
    // Desbloqueia áudio ao primeiro toque/clique do usuário
    unlockAudio();
    
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

    // Função para tocar som com múltiplas estratégias
    async function playNotificationSound() {
        if (!notificationSound) {
            console.log('Elemento de áudio não encontrado');
            return;
        }
        
        try {
            // Estratégia 1: Tocar normalmente
            notificationSound.muted = false;
            notificationSound.volume = 1.0;
            notificationSound.currentTime = 0;
            
            console.log('Tentando tocar som (Estratégia 1)...');
            let played = false;
            
            try {
                await notificationSound.play();
                console.log('✓ Som tocando com sucesso');
                return;
            } catch (e1) {
                console.log('✗ Estratégia 1 falhou:', e1.message);
            }

            // Estratégia 2: Esperar um pouco e tentar novamente
            await new Promise(resolve => setTimeout(resolve, 300));
            notificationSound.currentTime = 0;
            
            try {
                console.log('Tentando tocar som (Estratégia 2 - após delay)...');
                await notificationSound.play();
                console.log('✓ Som tocando com sucesso (tentativa 2)');
                return;
            } catch (e2) {
                console.log('✗ Estratégia 2 falhou:', e2.message);
            }

            // Estratégia 3: Criar um novo elemento de áudio dinamicamente
            try {
                console.log('Tentando tocar som (Estratégia 3 - novo elemento)...');
                const audioClone = notificationSound.cloneNode();
                audioClone.play();
                console.log('✓ Som tocando com sucesso (clone)');
                return;
            } catch (e3) {
                console.log('✗ Estratégia 3 falhou:', e3.message);
            }

            // Estratégia 4: Usar Web Audio API
            try {
                console.log('Tentando tocar som (Estratégia 4 - Web Audio API)...');
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const response = await fetch(notificationSound.src);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start(0);
                console.log('✓ Som tocando com sucesso (Web Audio)');
                return;
            } catch (e4) {
                console.log('✗ Estratégia 4 falhou:', e4.message);
            }
            
            console.log('⚠️ Nenhuma estratégia de áudio funcionou');
            
        } catch (e) {
            console.log('Erro geral ao tentar tocar som:', e);
        }
    }

    // Função para desbloquear áudio ao primeiro clique do usuário (necessário em alguns navegadores)
    function unlockAudio() {
        if (!notificationSound) return;
        
        const unlock = () => {
            notificationSound.volume = 0.001;
            notificationSound.play().then(() => {
                notificationSound.pause();
                notificationSound.currentTime = 0;
                console.log('✓ Áudio desbloqueado');
            }).catch(() => {
                console.log('⚠️ Ainda não conseguiu desbloquear áudio');
            });
            
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
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
    function checkForNewCalls(calls) {
        if (!Array.isArray(calls) || calls.length === 0) {
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

    // Configura listener em tempo real
    onCallsChange((calls) => {
        checkForNewCalls(calls);
    });

    // Carrega dados iniciais
    const initialCalls = await loadData('call-notifications');
    checkForNewCalls(initialCalls || []);
});
