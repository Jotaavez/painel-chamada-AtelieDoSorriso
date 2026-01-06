// Script para o painel de chamadas - com suporte Firebase/localStorage
import { saveData, loadData, onCallsChange } from './backend-helper.js';

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
        
        console.log('📍 Modal aberto, agendando áudio após 200ms...');
        
        // Toca o som DEPOIS de abrir o modal (melhora performance)
        setTimeout(() => {
            console.log('▶️ Iniciando som após modal estar visível');
            playNotificationSound();
        }, 200);
        
        // Limpa timeout anterior se existir
        if (modalTimeout) {
            clearTimeout(modalTimeout);
        }
        
        // Auto-close após 8 segundos
        modalTimeout = setTimeout(() => {
            callModalAlert.style.display = 'none';
        }, 8000);
    }

    // Função para tocar som - USANDO ARQUIVO DE ÁUDIO COM FALLBACK
    async function playNotificationSound() {
        try {
            console.log('📢 Iniciando notificação sonora...');
            
            // Muta o vídeo durante o toque
            if (callVideo) {
                callVideo.style.opacity = '0.5';
            }
            
            // Tenta usar o arquivo de áudio primeiro (melhor qualidade na TV)
            if (notificationSound) {
                try {
                    console.log('🔊 Tentando reproduzir arquivo de áudio...');
                    
                    // Force reset do elemento
                    notificationSound.pause();
                    notificationSound.currentTime = 0;
                    notificationSound.muted = false;
                    notificationSound.volume = 1.0;
                    
                    // Remove atributo autoplay para permitir controle manual
                    if (notificationSound.hasAttribute('autoplay')) {
                        notificationSound.removeAttribute('autoplay');
                    }
                    
                    console.log('  Preparando áudio (duração:', notificationSound.duration, 's)');
                    
                    const playPromise = notificationSound.play();
                    
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('✓ Arquivo de áudio tocando com sucesso');
                                
                                // Volta o vídeo ao normal após terminar
                                const audioDuration = notificationSound.duration || 1.5;
                                setTimeout(() => {
                                    if (callVideo) {
                                        callVideo.style.opacity = '1';
                                    }
                                    console.log('✓ Vídeo restaurado');
                                }, (audioDuration + 0.2) * 1000);
                            })
                            .catch((error) => {
                                console.warn('⚠️ Erro ao reproduzir arquivo:', error.message);
                                console.log('↪️ Caindo para Web Audio API...');
                                playWebAudioBeeps();
                            });
                        
                        return; // Sucesso ou tentando!
                    } else {
                        console.warn('⚠️ playPromise não retornou promise');
                        console.log('↪️ Caindo para Web Audio API...');
                        await playWebAudioBeeps();
                    }
                } catch (audioError) {
                    console.warn('⚠️ Exceção ao reproduzir arquivo:', audioError.message);
                    console.log('↪️ Caindo para Web Audio API...');
                    await playWebAudioBeeps();
                }
            } else {
                console.warn('⚠️ Elemento de áudio não encontrado');
                await playWebAudioBeeps();
            }
            
        } catch (e) {
            console.error('❌ Erro geral ao tocar som:', e.message);
            // Volta o vídeo ao normal em caso de erro
            if (callVideo) {
                callVideo.style.opacity = '1';
            }
        }
    }
    
    // Função auxiliar: gera beeps com Web Audio API
    async function playWebAudioBeeps() {
        try {
            console.log('🎼 Gerando beeps com Web Audio API...');
            
            let audioContext;
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('✓ AudioContext criado, estado:', audioContext.state);
            } catch (e) {
                console.error('❌ Erro ao criar AudioContext:', e.message);
                return;
            }
            
            // Garante que o audioContext está ativo
            if (audioContext.state === 'suspended') {
                console.log('⏸️ AudioContext suspendido, resumindo...');
                try {
                    await audioContext.resume();
                    console.log('✓ AudioContext retomado');
                } catch (e) {
                    console.error('❌ Erro ao resumir AudioContext:', e.message);
                    return;
                }
            }
            
            // Padrão simples e robusto: 2 beeps em frequência média
            const playBeep = (freq, duration, startTime) => {
                try {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    
                    // Envelope de som: ataque rápido, decay suave
                    gain.gain.setValueAtTime(1.2, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                    
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    const startTimeAbs = audioContext.currentTime + startTime / 1000;
                    osc.start(startTimeAbs);
                    osc.stop(startTimeAbs + duration);
                    
                    console.log(`  Beep: ${freq}Hz para ${(duration*1000).toFixed(0)}ms`);
                } catch (e) {
                    console.error('  ❌ Erro ao criar beep:', e.message);
                }
            };
            
            // 2 beeps simples em 650Hz (frequência média, profissional)
            console.log('🔊 Padrão: 2 beeps em 650Hz');
            playBeep(650, 0.18, 0);      // Beep 1: imediato
            playBeep(650, 0.18, 250);    // Beep 2: após 250ms
            
            console.log('✓ Beeps agendados');
            
            // Volta o vídeo ao normal após os beeps terminarem
            setTimeout(() => {
                if (callVideo) {
                    callVideo.style.opacity = '1';
                }
                console.log('✓ Vídeo restaurado');
            }, 650);
            
        } catch (e) {
            console.error('❌ Erro ao gerar Web Audio beeps:', e.message);
        }
    }

    // Função para desbloquear áudio ao primeiro clique do usuário (necessário em alguns navegadores)
    function unlockAudio() {
        const unlock = () => {
            console.log('🔓 Desbloqueando áudio...');
            
            // Tenta desbloquear com o arquivo de áudio
            if (notificationSound) {
                notificationSound.volume = 0.001;
                notificationSound.play().then(() => {
                    notificationSound.pause();
                    notificationSound.currentTime = 0;
                    console.log('✓ Áudio (arquivo) desbloqueado');
                }).catch(err => {
                    console.warn('⚠️ Erro ao desbloquear áudio:', err.message);
                });
            }
            
            // Também desbloqueia Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('✓ AudioContext desbloqueado');
                    });
                }
            } catch (e) {
                console.log('ℹ️ AudioContext não disponível ainda');
            }
            
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
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
