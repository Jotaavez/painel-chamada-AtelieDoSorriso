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
        
        // Limpa timeout anterior se existir
        if (modalTimeout) {
            clearTimeout(modalTimeout);
        }
        
        // Auto-close após 8 segundos
        modalTimeout = setTimeout(() => {
            callModalAlert.style.display = 'none';
        }, 8000);
    }

    // Função para tocar som - SIMPLES E UNIVERSAL
    async function playNotificationSound() {
        try {
            console.log('Tocando notificação...');
            
            // Muta o vídeo durante o toque
            if (callVideo) {
                callVideo.style.opacity = '0.5';
            }
            
            // Usa Web Audio API para gerar um beep CLÍNICO E SOFISTICADO
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Cria beeps em frequências mais baixas e sofisticadas
            const beep = (frequency, duration, delay, volume = 0.5) => {
                setTimeout(() => {
                    try {
                        const osc = audioContext.createOscillator();
                        const gain = audioContext.createGain();
                        
                        osc.frequency.value = frequency;
                        osc.type = 'sine';
                        
                        gain.gain.setValueAtTime(volume, audioContext.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                        
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        
                        osc.start();
                        osc.stop(audioContext.currentTime + duration);
                    } catch (e) {
                        console.warn('Erro ao criar beep:', e.message);
                    }
                }, delay);
            };
            
            // Padrão de som clínico e sofisticado: 3 beeps em frequências mais baixas
            // Beep 1: 600Hz (tom baixo, profissional)
            beep(600, 0.2, 0, 1.8);
            // Pausa
            // Beep 2: 750Hz (tom médio-baixo)
            beep(750, 0.2, 300, 1.8);
            // Pausa
            // Beep 3: 600Hz (volta ao tom inicial para simetria)
            beep(600, 0.2, 600, 1.8);
            
            console.log('✓ Notificação sonora ativada (duração: ~1s, tom clínico)');
            
            // Volta o vídeo ao normal após o toque terminar
            setTimeout(() => {
                if (callVideo) {
                    callVideo.style.opacity = '1';
                }
            }, 1000);
            
        } catch (e) {
            console.log('⚠️ Não conseguiu tocar som:', e.message);
            // Volta o vídeo ao normal em caso de erro
            if (callVideo) {
                callVideo.style.opacity = '1';
            }
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
            
            // Toca o som
            playNotificationSound();

            // Exibe a chamada
            displayCurrentCall(latestCall);
            triggerBlink();
            
            // Mostra modal por 8 segundos
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
