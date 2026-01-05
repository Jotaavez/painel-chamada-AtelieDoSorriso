// Script para o painel do dentista
document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('dentist');
    if (!raw) {
        // não autenticado: volta ao login
        window.location.href = 'login-dentista.html';
        return;
    }

    let dentist;
    try {
        dentist = JSON.parse(raw);
    } catch (e) {
        localStorage.removeItem('dentist');
        window.location.href = 'login-dentista.html';
        return;
    }

    // Preenche dados do dentista
    document.getElementById('dentist-name-header').textContent = `${dentist.name} ❘ Consultório ${dentist.consultorio}`;
    document.getElementById('dentist-consultorio').style.display = 'none';

    // Botão de logout
    const logoutBtn = document.querySelector('header a');
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('dentist');
        window.location.href = 'login-dentista.html';
    });

    const patientsWaitingDiv = document.getElementById('patients-waiting');
    const patientsHistoryDiv = document.getElementById('patients-history');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Elementos da modal
    const callModal = document.getElementById('call-modal');
    const modalPatientName = document.getElementById('modal-patient-name');
    const modalPatientInfo = document.getElementById('modal-patient-info');
    const modalYesBtn = document.getElementById('modal-yes-btn');
    const modalNoBtn = document.getElementById('modal-no-btn');

    let currentPatientForModal = null;

    // Botão para limpar histórico (apenas oculta para o dentista)
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Deseja ocultar seu histórico de chamadas? (O histórico continuará visível na recepção)')) {
            const rawHistory = localStorage.getItem('patients-history');
            let history = [];
            
            if (rawHistory) {
                try {
                    history = JSON.parse(rawHistory);
                } catch (e) {
                    history = [];
                }
            }

            // Pega IDs das entradas deste dentista para ocultar
            const myHistoryIds = history
                .filter(p => p.doctor === dentist.name)
                .map(p => p.id);

            // Armazena IDs ocultos para este dentista
            const hiddenKey = `hidden-history-${dentist.name}`;
            const rawHidden = localStorage.getItem(hiddenKey);
            let hidden = [];
            if (rawHidden) {
                try {
                    hidden = JSON.parse(rawHidden);
                } catch (e) {
                    hidden = [];
                }
            }

            hidden = [...new Set([...hidden, ...myHistoryIds])];
            localStorage.setItem(hiddenKey, JSON.stringify(hidden));
            
            loadPatientHistory();
            alert('Histórico ocultado com sucesso!');
        }
    });

    // Handlers para botões da modal
    modalYesBtn.addEventListener('click', () => {
        callModal.style.display = 'none';
        if (currentPatientForModal) {
            confirmPatientDone(currentPatientForModal);
        }
    });

    modalNoBtn.addEventListener('click', () => {
        callModal.style.display = 'none';
        currentPatientForModal = null;
    });

    // Função para formatar data e hora
    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Função para carregar pacientes aguardando para este dentista
    function loadWaitingPatients() {
        const raw = localStorage.getItem('patients');
        let patients = [];
        
        if (raw) {
            try {
                patients = JSON.parse(raw);
            } catch (e) {
                console.error('Erro ao carregar pacientes:', e);
            }
        }

        // Filtra pacientes para este dentista
        const myPatients = patients.filter(p => p.doctor === dentist.name);

        // Ordena por urgência (urgentes primeiro)
        myPatients.sort((a, b) => {
            if (a.urgente === b.urgente) return 0;
            return a.urgente ? -1 : 1;
        });

        patientsWaitingDiv.innerHTML = '';
        
        if (myPatients.length === 0) {
            patientsWaitingDiv.innerHTML = '<p>Nenhum paciente aguardando</p>';
            return;
        }

        myPatients.forEach((patient, index) => {
            const div = document.createElement('div');
            div.className = 'patient-item';

            const serviceName = patient.service === 'Outro' 
                ? patient.otherServiceDetail 
                : patient.service;

            div.innerHTML = `
                <div class="patient-info">
                    <p class="patient-name">${patient.name}${patient.urgente ? '<span class="urgent-badge">URGENTE</span>' : ''}</p>
                    <p class="patient-service">Serviço: ${serviceName}</p>
                </div>
                <div class="patient-actions">
                    <button class="patient-button" type="button">Chamar</button>
                </div>
            `;

            const callBtn = div.querySelector('.patient-button');
            callBtn.addEventListener('click', () => {
                callPatient(patient);
            });

            patientsWaitingDiv.appendChild(div);
        });
    }

    // Função para carregar histórico de pacientes chamados
    function loadPatientHistory() {
        const rawHistory = localStorage.getItem('patients-history');
        let history = [];
        
        if (rawHistory) {
            try {
                history = JSON.parse(rawHistory);
            } catch (e) {
                console.error('Erro ao carregar histórico:', e);
            }
        }

        // Carrega IDs ocultos para este dentista
        const hiddenKey = `hidden-history-${dentist.name}`;
        const rawHidden = localStorage.getItem(hiddenKey);
        let hidden = [];
        if (rawHidden) {
            try {
                hidden = JSON.parse(rawHidden);
            } catch (e) {
                hidden = [];
            }
        }

        // Filtra histórico deste dentista e remove entradas ocultas
        const myHistory = history
            .filter(p => p.doctor === dentist.name)
            .filter(p => !hidden.includes(p.id));

        // Ordena por data mais recente primeiro
        myHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        patientsHistoryDiv.innerHTML = '';
        
        if (myHistory.length === 0) {
            patientsHistoryDiv.innerHTML = '<p>Nenhum paciente chamado ainda</p>';
            return;
        }

        myHistory.forEach((patient) => {
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.style.padding = '8px';
            div.style.backgroundColor = '#f0f0f0';
            div.style.borderRadius = '4px';
            
            const serviceName = patient.service === 'Outro' 
                ? patient.otherServiceDetail 
                : patient.service;

            div.innerHTML = `
                <strong>${patient.name}</strong><br>
                Serviço: ${serviceName}<br>
                <small>Chamado em: ${formatDateTime(patient.timestamp)}</small>
            `;

            patientsHistoryDiv.appendChild(div);
        });
    }

    // Função para chamar paciente
    function callPatient(patient) {
        currentPatientForModal = patient;
        
        // Preenche a modal com informações do paciente
        modalPatientName.textContent = patient.name;
        const serviceName = patient.service === 'Outro' 
            ? patient.otherServiceDetail 
            : patient.service;
        modalPatientInfo.textContent = `Serviço: ${serviceName}`;
        
        // Registra chamada no painel de chamadas
        const rawCalls = localStorage.getItem('call-notifications');
        let calls = [];
        if (rawCalls) {
            try {
                calls = JSON.parse(rawCalls);
            } catch (e) {
                calls = [];
            }
        }

        const callNotification = {
            id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientName: patient.name,
            doctorName: dentist.name,
            consultorio: dentist.consultorio,
            service: patient.service,
            otherServiceDetail: patient.otherServiceDetail || '',
            timestamp: new Date().toISOString()
        };

        calls.push(callNotification);
        localStorage.setItem('call-notifications', JSON.stringify(calls));

        // Exibe a modal
        callModal.style.display = 'flex';
    }

    window.callPatient = callPatient;

    // Função para confirmar que o paciente saiu
    function confirmPatientDone(patient) {
        // Remove paciente da lista de espera
        const raw = localStorage.getItem('patients');
        let patients = JSON.parse(raw);
        const patientIndex = patients.findIndex(p => p.name === patient.name && p.doctor === patient.doctor && p.service === patient.service);
        if (patientIndex !== -1) {
            patients.splice(patientIndex, 1);
            localStorage.setItem('patients', JSON.stringify(patients));
        }

        // Adiciona ao histórico com data e hora
        const rawHistory = localStorage.getItem('patients-history');
        let history = [];
        if (rawHistory) {
            try {
                history = JSON.parse(rawHistory);
            } catch (e) {
                history = [];
            }
        }

        const historyEntry = {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...patient,
            timestamp: new Date().toISOString()
        };
        history.push(historyEntry);
        localStorage.setItem('patients-history', JSON.stringify(history));

        // Recarrega as listas
        loadWaitingPatients();
        loadPatientHistory();
        
        currentPatientForModal = null;
    };

    // Carrega dados iniciais
    loadWaitingPatients();
    loadPatientHistory();
    
    // Recarrega pacientes a cada 2 segundos (para atualizar em tempo real)
    setInterval(() => {
        loadWaitingPatients();
        loadPatientHistory();
    }, 2000);
});
