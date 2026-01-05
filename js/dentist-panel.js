// Script para o painel do dentista - com suporte Firebase/localStorage
import { saveData, loadData, onDataChange, pushToArray, removeFromArray, unshiftToArray } from './backend-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
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

    // Elementos do modal de confirmação de exclusão
    const deleteHistoryModal = document.getElementById('delete-history-modal');
    const confirmDeleteHistoryBtn = document.getElementById('confirm-delete-history-btn');
    const cancelDeleteHistoryBtn = document.getElementById('cancel-delete-history-btn');

    let currentPatientForModal = null;

    // Botão para limpar histórico (apenas oculta para o dentista)
    clearHistoryBtn.addEventListener('click', () => {
        deleteHistoryModal.style.display = 'flex';
    });

    // Confirmar exclusão do histórico
    confirmDeleteHistoryBtn.addEventListener('click', async () => {
        const history = await loadData('call-history') || [];

        // Pega IDs das entradas deste dentista para ocultar
        const myHistoryIds = history
            .filter(p => p.doctorName === dentist.name)
            .map(p => p.id);

        // Armazena IDs ocultos para este dentista
        const hiddenKey = `hidden-history-${dentist.name}`;
        const hidden = await loadData(hiddenKey) || [];
        const updatedHidden = [...new Set([...hidden, ...myHistoryIds])];
        await saveData(hiddenKey, updatedHidden);
        
        await loadPatientHistory();

        // Mostrar mensagem de sucesso no próprio modal
        const modalContent = document.getElementById('delete-modal-content');
        const modalTitle = document.getElementById('delete-modal-title');
        const modalMessage = document.getElementById('delete-modal-message');
        const modalSubmessage = document.getElementById('delete-modal-submessage');
        const modalButtons = document.getElementById('delete-modal-buttons');

        modalTitle.textContent = '✓ Histórico Ocultado';
        modalTitle.style.color = '#4CAF50';
        modalMessage.textContent = 'Seu histórico foi ocultado com sucesso!';
        modalSubmessage.style.display = 'none';
        modalButtons.style.display = 'none';

        // Fecha o modal após 1.5 segundos
        setTimeout(() => {
            deleteHistoryModal.style.display = 'none';
            // Restaura o modal para o estado original
            modalTitle.textContent = '⚠️ Confirmar Exclusão';
            modalTitle.style.color = '#8B0000';
            modalMessage.textContent = 'Deseja ocultar seu histórico de chamadas?';
            modalSubmessage.textContent = '(O histórico continuará visível na recepção)';
            modalSubmessage.style.display = 'block';
            modalButtons.style.display = 'flex';
        }, 1500);
    });

    // Cancelar exclusão do histórico
    cancelDeleteHistoryBtn.addEventListener('click', () => {
        deleteHistoryModal.style.display = 'none';
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
    async function loadWaitingPatients(patients) {
        if (!patients) {
            patients = await loadData('pending-patients') || [];
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
    async function loadPatientHistory(history) {
        if (!history) {
            history = await loadData('call-history') || [];
        }

        // Carrega IDs ocultos para este dentista
        const hiddenKey = `hidden-history-${dentist.name}`;
        const hidden = await loadData(hiddenKey) || [];

        // Filtra histórico deste dentista e remove entradas ocultas
        const myHistory = history
            .filter(p => p.doctorName === dentist.name)
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

            div.innerHTML = `
                <strong>${patient.patientName}</strong><br>
                Consultório: ${patient.consultorio}<br>
                <small>Chamado em: ${formatDateTime(patient.timestamp)}</small>
            `;

            patientsHistoryDiv.appendChild(div);
        });
    }

    // Função para chamar paciente
    async function callPatient(patient) {
        currentPatientForModal = patient;
        
        // Preenche a modal com informações do paciente
        modalPatientName.textContent = patient.name;
        const serviceName = patient.service === 'Outro' 
            ? patient.otherServiceDetail 
            : patient.service;
        modalPatientInfo.textContent = `Serviço: ${serviceName}`;
        
        // Registra chamada no painel de chamadas (call-notifications)
        const callNotification = {
            id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientName: patient.name,
            doctorName: dentist.name,
            consultorio: dentist.consultorio,
            service: patient.service,
            otherServiceDetail: patient.otherServiceDetail || '',
            timestamp: new Date().toISOString()
        };

        await unshiftToArray('call-notifications', callNotification);

        // Exibe a modal
        callModal.style.display = 'flex';
    }

    // Função para confirmar que o paciente saiu
    async function confirmPatientDone(patient) {
        // Remove paciente da lista de espera
        await removeFromArray('pending-patients', (p) => 
            !(p.name === patient.name && p.doctor === patient.doctor && p.service === patient.service)
        );

        // Adiciona ao histórico com data e hora
        const historyEntry = {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientName: patient.name,
            doctorName: dentist.name,
            consultorio: dentist.consultorio,
            service: patient.service,
            otherServiceDetail: patient.otherServiceDetail || '',
            timestamp: new Date().toISOString()
        };
        await unshiftToArray('call-history', historyEntry);

        // Recarrega as listas
        await loadWaitingPatients();
        await loadPatientHistory();
        
        currentPatientForModal = null;
    }

    // Configura listeners em tempo real
    await onDataChange('pending-patients', (patients) => {
        loadWaitingPatients(patients);
    });

    await onDataChange('call-history', (history) => {
        loadPatientHistory(history);
    });

    // Carrega dados iniciais
    await loadWaitingPatients();
    await loadPatientHistory();
});
