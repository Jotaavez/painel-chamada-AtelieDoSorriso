// Script para o painel de chamadas - com suporte Firebase/localStorage
import { saveData, loadData, onCallsChange } from './backend-helper.js';

let audioUnlocked = false; // Flag para rastrear se áudio foi desbloqueado

// Função para desbloquear áudio - chamada ao primeiro clique/toque
function unlockAudio() {
    const unlock = () => {
        console.log('🔓 Desbloqueando áudio após interação do usuário...');
        audioUnlocked = true;
        
        // Resume AudioContext if needed
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            console.log('✓ Áudio desbloqueado');
        } catch (e) {
            console.log('  AudioContext:', e.message);
        }
        
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
    };
    
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
}

// Função auxiliar: gera beeps com Web Audio API (fallback)
function playWebAudioBeeps() {
    console.log('🎼 Reproduzindo toque clínico...');
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Padrão "tiiiiin doooon" - profissional e elegante
        const playTone = (frequency, delay, duration, volume = 0.7) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.frequency.value = frequency;
            osc.type = 'sine';
            
            // Envelope suave: ataque rápido, sustain, decay exponencial
            const now = audioContext.currentTime + delay;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.05); // Ataque suave
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + duration);
        };
        
        // "Tiiiiin" - tom agudo e prolongado (850Hz por 0.8s)
        playTone(850, 0, 3, 2);
        
        // "Doooon" - tom grave e prolongado (450Hz por 1.0s)
        playTone(450, 0.9, 3, 2);
        
        console.log('✓ Toque "tiiiiin doooon" gerado (850Hz → 450Hz)');
    } catch (e) {
        console.error('❌ Erro ao gerar som:', e.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const patientNameEl = document.getElementById('call-patient-name');
    const consultorioEl = document.getElementById('call-consultorio');
    const doctorEl = document.getElementById('call-doctor');
    const recentCallsList = document.getElementById('recent-calls-list');
    const notificationSound = document.getElementById('notification-sound');
    const clockEl = document.getElementById('call-clock');
    const callVideo = document.getElementById('call-video');
    const callModalAlert = document.getElementById('call-modal-alert');
    const modalPatientName = document.getElementById('modal-patient-name');
    const modalConsultorioValue = document.getElementById('modal-consultorio-value');
    const modalDoctorValue = document.getElementById('modal-doctor-value');
    
    // Desbloqueia áudio ao primeiro toque/clique do usuário
    unlockAudio();
    
    let lastCallId = null;
    let previousCalls = []; // Array para guardar últimas 2 chamadas
    let blinkTimeout = null;
    let modalTimeout = null;
    let videoOriginalVolume = 0.5; // Volume padrão do vídeo

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

    // Mostra modal de chamada por 8 segundos
    function showCallModal(call) {
        if (!callModalAlert || !modalPatientName) return;
        
        modalPatientName.textContent = call.patientName;
        modalConsultorioValue.textContent = call.consultorio;
        modalDoctorValue.textContent = call.doctorName;
        callModalAlert.style.display = 'flex';
        
        // Aguarda o modal renderizar antes de tocar o som (importante na TV)
        setTimeout(() => {
            playNotificationSound();
        }, 300);
        
        // Limpa timeout anterior se existir
        if (modalTimeout) {
            clearTimeout(modalTimeout);
        }
        
        // Auto-close após 8 segundos
        modalTimeout = setTimeout(() => {
            callModalAlert.style.display = 'none';
        }, 8000);
    }

    // Função para tocar som de notificação
    function playNotificationSound() {
        console.log('🔊 Tocando notificação...');
        playWebAudioBeeps(); // Usa Web Audio direto (mais confiável em TV)
    }
    
    // Função auxiliar: gera beeps com Web Audio API (fallback)
    function playWebAudioBeeps() {
        console.log('🎼 Usando Web Audio API...');
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // 2 beeps simples em 650Hz
            const playBeep = (delay) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.frequency.value = 650;
                osc.type = 'sine';
                gain.gain.setValueAtTime(1, audioContext.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.18);
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.start(audioContext.currentTime + delay);
                osc.stop(audioContext.currentTime + delay + 0.18);
            };
            
            playBeep(0);     // Beep 1
            playBeep(0.25);  // Beep 2
            
            console.log('✓ Beeps gerados');
        } catch (e) {
            console.error('❌ Web Audio falhou:', e.message);
        }
    }

    // Função para carregar chamadas recentes (apenas a anterior)
    function loadRecentCalls() {
        recentCallsList.innerHTML = '';
        
        if (!previousCalls || previousCalls.length === 0) {
            recentCallsList.innerHTML = '<p class="empty-message">Nenhuma chamada</p>';
            return;
        }

        // Mostra as últimas 2 chamadas
        previousCalls.forEach(call => {
            const date = new Date(call.timestamp);
            const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            const item = document.createElement('div');
            item.className = 'recent-item';
            item.innerHTML = `
                <strong>${call.patientName}</strong>
                <span class="recent-meta">${call.doctorName}</span>
                <span class="recent-time">${time}</span>
            `;

            recentCallsList.appendChild(item);
        });
    }

    // Função para verificar novas chamadas
    function checkForNewCalls(calls) {
        if (!Array.isArray(calls) || calls.length === 0) {
            displayCurrentCall(null);
            previousCalls = [];
            recentCallsList.innerHTML = '<p class="empty-message">Nenhuma chamada recente</p>';
            return;
        }

        // Ordena por timestamp mais recente
        calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Pega apenas a ÚLTIMA chamada
        const latestCall = calls[0];

        // Se for uma nova chamada, toca o som e exibe
        if (latestCall.id !== lastCallId) {
            // Adiciona a chamada anterior ao histórico de recentes
            if (lastCallId) {
                const previousCall = calls.find(c => c.id === lastCallId);
                if (previousCall) {
                    // Mantém apenas as 2 últimas chamadas
                    previousCalls = [previousCall, ...previousCalls].slice(0, 2);
                }
            }
            
            lastCallId = latestCall.id;
            
            // Exibe a chamada
            displayCurrentCall(latestCall);
            triggerBlink();
            
            // Mostra modal por 8 segundos (som toca dentro dela, após 200ms)
            showCallModal(latestCall);
        }

        // Atualiza lista de chamadas recentes
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
