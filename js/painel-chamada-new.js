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

    // Função para tocar som - SIMPLES E UNIVERSAL
    async function playNotificationSound() {
        try {
            console.log('Tocando notificação...');
            
            // Usa Web Audio API para gerar um beep MUITO simples
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Cria 2 beeps agudos e rápidos
            const beep = (frequency, duration, delay) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.frequency.value = frequency;
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                    
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    osc.start();
                    osc.stop(audioContext.currentTime + duration);
                }, delay);
            };
            
            // 2 beeps: 1000Hz (100ms) depois 1200Hz (100ms)
            beep(1000, 0.1, 0);
            beep(1200, 0.1, 150);
            
            console.log('✓ Notificação sonora ativada');
        } catch (e) {
            console.log('⚠️ Não conseguiu tocar som:', e.message);
            // Fallback: tenta o arquivo de áudio
            if (notificationSound) {
                try {
                    notificationSound.muted = false;
                    notificationSound.volume = 1.0;
                    notificationSound.currentTime = 0;
                    await notificationSound.play();
                } catch (e2) {
                    console.log('⚠️ Também falhou com arquivo:', e2.message);
                }
            }
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
