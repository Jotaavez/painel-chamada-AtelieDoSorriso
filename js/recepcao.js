// Script para o painel da recepção
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('patient-form');
    const doctorSelect = document.getElementById('doctor');
    const serviceSelect = document.getElementById('service');
    const otherServiceGroup = document.getElementById('other-service-group');
    const patientList = document.getElementById('patient-list');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');

    // Modal genérico de confirmação/aviso
    function showConfirm(message) {
        return new Promise(resolve => {
            if (!confirmModal) return resolve(true);
            confirmMessage.textContent = message;
            confirmModal.classList.add('active');

            const cleanup = (result) => {
                confirmModal.classList.remove('active');
                confirmYes.onclick = null;
                confirmNo.onclick = null;
                resolve(result);
            };

            confirmYes.onclick = () => cleanup(true);
            confirmNo.onclick = () => cleanup(false);
        });
    }

    function showInfo(message) {
        return new Promise(resolve => {
            if (!confirmModal) {
                alert(message);
                return resolve(true);
            }
            confirmMessage.textContent = message;
            confirmModal.classList.add('active');
            confirmNo.style.display = 'none';

            const cleanup = () => {
                confirmModal.classList.remove('active');
                confirmYes.onclick = null;
                confirmNo.onclick = null;
                confirmNo.style.display = '';
                resolve(true);
            };

            confirmYes.onclick = cleanup;
        });
    }

    // Carrega lista de dentistas do localStorage
    function loadDoctorsList() {
        // Dentistas fixos
        const fixedDoctors = ['Dra. Jessica Reis', 'Dra. Dani'];
        
        // Carrega dentistas dinâmicos do localStorage
        const rawDoctors = localStorage.getItem('doctors');
        let dynamicDoctors = [];
        if (rawDoctors) {
            try {
                dynamicDoctors = JSON.parse(rawDoctors);
            } catch (e) {
                console.error('Erro ao carregar dentistas dinâmicos:', e);
            }
        }

        // Combina e remove duplicatas
        const allDoctors = [...new Set([...fixedDoctors, ...dynamicDoctors])];
        
        doctorSelect.innerHTML = '<option value="">Escolha o doutor</option>';
        allDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            doctorSelect.appendChild(option);
        });

        // Atualiza lista de gerenciamento de dentistas
        updateDoctorsList(allDoctors, fixedDoctors);
    }

    // Atualiza e exibe lista de dentistas para remover
    function updateDoctorsList(allDoctors, fixedDoctors) {
        const doctorsList = document.getElementById('doctors-list');
        doctorsList.innerHTML = '';
        
        allDoctors.forEach(doctor => {
            const isFixed = fixedDoctors.includes(doctor);
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            
            const label = document.createElement('span');
            label.textContent = doctor;
            label.style.marginRight = '10px';
            
            div.appendChild(label);
            
            if (!isFixed) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.textContent = 'Remover';
                removeBtn.style.padding = '5px 10px';
                removeBtn.addEventListener('click', async () => {
                    const ok = await showConfirm(`Remover ${doctor} da lista?`);
                    if (ok) removeDoctor(doctor);
                });
                div.appendChild(removeBtn);
            } else {
                const fixedLabel = document.createElement('span');
                fixedLabel.textContent = '(Fixo)';
                fixedLabel.style.color = '#999';
                fixedLabel.style.fontSize = '12px';
                div.appendChild(fixedLabel);
            }
            
            doctorsList.appendChild(div);
        });
    }

    // Remove dentista da lista
    function removeDoctor(doctorName) {
        const rawDoctors = localStorage.getItem('doctors');
        let doctors = [];
        if (rawDoctors) {
            try {
                doctors = JSON.parse(rawDoctors);
            } catch (e) {
                doctors = [];
            }
        }

        doctors = doctors.filter(d => d !== doctorName);
        localStorage.setItem('doctors', JSON.stringify(doctors));
        loadDoctorsList();
        showInfo(`${doctorName} removido da lista`);
    }

    // Mostra/oculta campo de especificação para "Outro"
    serviceSelect.addEventListener('change', () => {
        if (serviceSelect.value === 'Outro') {
            otherServiceGroup.style.display = 'flex';
        } else {
            otherServiceGroup.style.display = 'none';
        }
    });

    // Carrega e exibe pacientes na fila
    function loadPatients() {
        const raw = localStorage.getItem('patients');
        let patients = [];
        
        if (raw) {
            try {
                patients = JSON.parse(raw);
            } catch (e) {
                console.error('Erro ao carregar pacientes:', e);
            }
        }

        // Ordena por urgência (urgentes primeiro)
        patients.sort((a, b) => {
            if (a.urgente === b.urgente) return 0;
            return a.urgente ? -1 : 1;
        });

        patientList.innerHTML = '';
        
        if (patients.length === 0) {
            patientList.innerHTML = '<p class="empty-message">Nenhum paciente registrado</p>';
            return;
        }

        patients.forEach((patient, index) => {
            const div = document.createElement('div');
            div.className = patient.urgente ? 'patient-item urgente' : 'patient-item';
            
            const serviceName = patient.service === 'Outro' 
                ? patient.otherServiceDetail 
                : patient.service;
            
            div.innerHTML = `
                <div class="patient-info">
                    <p class="patient-name">${patient.name} ${patient.urgente ? '<span class="urgent-badge">URGENTE</span>' : ''}</p>
                    <p class="patient-doctor">Doutor: ${patient.doctor}</p>
                    <p class="patient-service">Serviço: ${serviceName}</p>
                </div>
                <div class="patient-actions">
                    <button class="patient-button" type="button" data-index="${index}">Cancelar/Remover</button>
                </div>
            `;

            const btn = div.querySelector('.patient-button');
            btn.addEventListener('click', () => removePatientFromQueue(index));

            patientList.appendChild(div);
        });
    }

    // Função global para remover paciente específico da fila
    window.removePatientFromQueue = (index) => {
        const raw = localStorage.getItem('patients');
        let patients = JSON.parse(raw);
        const patient = patients[index];

        showConfirm(`Remover ${patient.name} da fila de espera?`).then(ok => {
            if (!ok) return;
            patients.splice(index, 1);
            localStorage.setItem('patients', JSON.stringify(patients));
            loadPatients();
            showInfo(`${patient.name} removido da fila`);
        });
    };

    // Adiciona novo paciente
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = (form.patientName.value || '').trim();
        const doctor = form.doctor.value;
        const service = form.service.value;
        const otherServiceDetail = (form.otherServiceDetail.value || '').trim();
        const urgente = form.urgente.checked;

        if (!name) {
            await showInfo('Por favor insira o nome do paciente.');
            form.patientName.focus();
            return;
        }

        if (!doctor) {
            await showInfo('Por favor escolha um doutor.');
            form.doctor.focus();
            return;
        }

        if (!service) {
            await showInfo('Por favor escolha um serviço.');
            form.service.focus();
            return;
        }

        if (service === 'Outro' && !otherServiceDetail) {
            await showInfo('Por favor especifique o serviço.');
            form.otherServiceDetail.focus();
            return;
        }

        const confirmText = `Confirmar registro de ${name}\n${doctor}\nServiço: ${service === 'Outro' ? otherServiceDetail : service}${urgente ? '\n⚠️ Paciente URGENTE' : ''}`;
        const ok = await showConfirm(confirmText);
        if (!ok) return;

        // Carrega pacientes atuais
        const raw = localStorage.getItem('patients');
        let patients = [];
        if (raw) {
            try {
                patients = JSON.parse(raw);
            } catch (e) {
                patients = [];
            }
        }

        // Adiciona novo paciente
        patients.push({
            name,
            doctor,
            service,
            otherServiceDetail: service === 'Outro' ? otherServiceDetail : '',
            urgente,
            timestamp: new Date().toISOString()
        });

        // Salva na localStorage
        localStorage.setItem('patients', JSON.stringify(patients));

        // Limpa formulário
        form.reset();
        otherServiceGroup.style.display = 'none';

        // Recarrega lista
        loadPatients();

        await showInfo(`Paciente ${name} registrado com sucesso!`);
    });

    // Funções globais para chamar e remover pacientes
    window.callPatient = (index) => {
        const raw = localStorage.getItem('patients');
        let patients = JSON.parse(raw);
        const patient = patients[index];
        alert(`Chamando: ${patient.name}\nDoutor: ${patient.doctor}\n${patient.urgente ? '⚠️ URGENTE' : ''}`);
    };

    window.removePatient = (index) => {
        const raw = localStorage.getItem('patients');
        let patients = JSON.parse(raw);
        const patient = patients[index];
        
        if (confirm(`Remover ${patient.name} da fila?`)) {
            patients.splice(index, 1);
            localStorage.setItem('patients', JSON.stringify(patients));
            loadPatients();
        }
    };

    // Função para carregar histórico
    function loadHistory() {
        const historyList = document.getElementById('history-list');
        const rawHistory = localStorage.getItem('patients-history');
        let history = [];
        
        if (rawHistory) {
            try {
                history = JSON.parse(rawHistory);
            } catch (e) {
                console.error('Erro ao carregar histórico:', e);
            }
        }

        // Ordena por data mais recente primeiro
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-message">Nenhum paciente no histórico</p>';
            return;
        }

        history.forEach((patient, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            const serviceName = patient.service === 'Outro' 
                ? patient.otherServiceDetail 
                : patient.service;

            const date = new Date(patient.timestamp);
            const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            div.innerHTML = `
                <div class="history-info">
                    <p class="history-patient-name">${patient.name}</p>
                    <p class="history-doctor">Doutor: ${patient.doctor}</p>
                    <p class="history-service">Serviço: ${serviceName}</p>
                    <p class="history-timestamp">Chamado em: ${formattedDate}</p>
                </div>
                <div class="history-actions">
                    <button class="history-remove-btn" type="button">Remover</button>
                </div>
            `;

            div.querySelector('.history-remove-btn').addEventListener('click', () => removeHistoryEntry(index));
            historyList.appendChild(div);
        });
    }

    // Função para remover entrada específica do histórico
    function removeHistoryEntry(index) {
        const rawHistory = localStorage.getItem('patients-history');
        let history = JSON.parse(rawHistory);
        const patient = history[index];

        showConfirm(`Remover ${patient.name} do histórico?`).then(ok => {
            if (!ok) return;
            history.splice(index, 1);
            localStorage.setItem('patients-history', JSON.stringify(history));
            loadHistory();
        });
    }

    // Botão para limpar todo o histórico
    const resetHistoryBtn = document.getElementById('reset-history-btn');
    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', async () => {
            const ok = await showConfirm('Deseja limpar todo o histórico de chamadas?');
            if (!ok) return;
            localStorage.setItem('patients-history', JSON.stringify([]));
            localStorage.setItem('call-notifications', JSON.stringify([]));
            loadHistory();
            await showInfo('Histórico e chamadas limpas com sucesso!');
        });
    }

    // Inicializa
    loadDoctorsList();
    loadPatients();
    loadHistory();

    // Atualiza listas a cada 2 segundos para sincronizar com mudanças do dentista
    setInterval(() => {
        loadPatients();
        loadHistory();
    }, 2000);
});
