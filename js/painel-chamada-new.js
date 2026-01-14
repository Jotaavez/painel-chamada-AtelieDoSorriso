// Script para o painel de chamadas - com suporte Firebase/localStorage
import { saveData, loadData, onCallsChange } from './backend-helper.js';

let audioUnlocked = false; // Flag para rastrear se áudio foi desbloqueado
let speechUnlocked = false; // Flag para rastrear se TTS foi desbloqueado
let sharedAudioContext = null; // AudioContext compartilhado (iOS/Safari exige gesto)

// Função para desbloquear áudio - chamada ao primeiro clique/toque
function unlockAudio() {
    const unlock = () => {
        console.log('🔓 Desbloqueando áudio após interação do usuário...');
        audioUnlocked = true;
        
        // Cria/retoma AudioContext compartilhado (necessário no iOS Safari)
        try {
            if (!sharedAudioContext) {
                sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sharedAudioContext.state === 'suspended') {
                sharedAudioContext.resume();
            }
            console.log('✓ AudioContext compartilhado pronto:', sharedAudioContext.state);
        } catch (e) {
            console.log('  AudioContext erro:', e.message);
        }

        // Tenta desbloquear TTS (alguns navegadores exigem gesto do usuário)
        if ('speechSynthesis' in window && !speechUnlocked) {
            try {
                const u = new SpeechSynthesisUtterance(' ');
                u.volume = 0.0;
                u.rate = 1.0;
                u.pitch = 1.0;
                window.speechSynthesis.speak(u);
                // Pequeno cancel para limpar fila
                setTimeout(() => {
                    window.speechSynthesis.cancel();
                    speechUnlocked = true;
                    console.log('✓ TTS desbloqueado');
                }, 50);
            } catch (err) {
                console.warn('⚠️ Falha ao desbloquear TTS:', err?.message || err);
            }
        }
        
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
    };
    
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
}

// Função auxiliar: gera beeps com Web Audio API (fallback)
function playWebAudioBeeps() {
    console.log('🎼 Reproduzindo toque clínico...');
    
    try {
        const audioContext = sharedAudioContext || new (window.AudioContext || window.webkitAudioContext)();
        
        if (audioContext.state === 'suspended') {
            console.warn('⚠️ AudioContext suspenso, precisa gesto do usuário para retomar');
            try { audioContext.resume(); } catch(_){}
            if (audioContext !== sharedAudioContext) {
                console.warn('⚠️ Sem AudioContext compartilhado. Clique/tocar para habilitar áudio.');
                return; // Evita chamar sem gesto no iOS
            }
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
        
        // "Tiiiiin" - tom agudo e prolongado (650Hz por 2.0s)
        playTone(650, 0, 2, 2);
        
        // "Doooon" - tom grave e prolongado (550Hz por 2.0s)
        playTone(550, 1.5, 2, 2);
        
        console.log('✓ Toque "tiiiiin doooon" gerado (650Hz → 550Hz)');
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
            // Fala o nome após iniciar o toque (ajusta para ficar audível após o primeiro tom)
            setTimeout(() => speakCall(call), 3200);
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

    // Carrega voz preferencial em português (pt-BR se existir)
    let preferredPtVoice = null;
    const preferredVoiceName = 'microsoft maria';
    function loadPreferredVoice() {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        console.log('🗣️ loadPreferredVoice: total vozes =', voices.length);
        if (!voices || !voices.length) return null;
        const named = voices.find(v => v.name && v.name.toLowerCase().includes(preferredVoiceName));
        const ptBr = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('pt-br'));
        const ptGeneric = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('pt'));
        preferredPtVoice = named || ptBr || ptGeneric || null;
        if (preferredPtVoice) {
            console.log('✓ Voz preferida carregada:', preferredPtVoice.name, preferredPtVoice.lang);
        }
        return preferredPtVoice;
    }

    // Lê o nome do paciente e consultório
    function speakCall(call) {
        console.log('🗣️ speakCall iniciado para:', call?.patientName);
        
        if (!call || !('speechSynthesis' in window)) {
            console.warn('⚠️ speechSynthesis não disponível');
            return;
        }

        const synth = window.speechSynthesis;
        const patient = call.patientName || call.name || 'Paciente';
        const consultorio = call.consultorio || 'consultório';
        const phrase = `${patient}, consultório ${consultorio}`;
        
        console.log('🗣️ Frase a falar:', phrase);
        console.log('🗣️ Vozes disponíveis:', synth.getVoices().length);

        // Função para tentar falar
        let speakStarted = false;
        function trySpeak() {
            if (synth.speaking || speakStarted) {
                console.log('🗣️ Já falando, ignorando nova tentativa');
                return;
            }
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            utterance.pitch = 2.0;
            utterance.volume = 10.0;

            // Tenta carregar voz preferida
            const voices = synth.getVoices();
            if (voices.length > 0) {
                const maria = voices.find(v => v.name && v.name.toLowerCase().includes('maria'));
                const ptBr = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('pt-br'));
                const pt = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('pt'));
                const selectedVoice = maria || ptBr || pt || voices[0];
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log('🗣️ Voz selecionada:', selectedVoice.name, selectedVoice.lang);
                }
            }

            utterance.onstart = () => { speakStarted = true; console.log('✓ TTS começou a falar'); };
            utterance.onend = () => console.log('✓ TTS terminou');
            utterance.onerror = (e) => console.error('❌ TTS erro:', e.error, e.message);

            if (!speakStarted && synth.speaking) synth.cancel();
            synth.speak(utterance);
            console.log('🗣️ synth.speak() chamado');
        }

        // Tenta falar imediatamente
        trySpeak();
        
        // Se não funcionou, tenta novamente após 500ms (vozes podem não estar prontas)
        setTimeout(trySpeak, 500);
    }

    // Pré-carrega voz quando disponível
    if ('speechSynthesis' in window) {
        console.log('🗣️ speechSynthesis disponível, configurando...');
        window.speechSynthesis.onvoiceschanged = () => {
            console.log('🗣️ onvoiceschanged disparado');
            loadPreferredVoice();
        };
        // Carrega imediatamente também
        setTimeout(() => {
            loadPreferredVoice();
            console.log('🗣️ Tentativa inicial de carregar vozes');
        }, 100);
    } else {
        console.warn('⚠️ speechSynthesis não disponível neste navegador');
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

    // Não carrega manualmente os dados iniciais para evitar chamadas duplicadas.
    // O listener em tempo real já entrega o estado atual (Firebase) ou o polling (localStorage)
    
    speechSynthesis.getVoices().forEach((v,i)=>console.log(i, v.name, v.lang));
});
