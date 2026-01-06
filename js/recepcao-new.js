// Script para o painel da recepção - com suporte Firebase/localStorage
import { saveData, loadData, onDataChange, pushToArray, removeFromArray, unshiftToArray } from './backend-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
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
    async function loadDoctorsList() {
        // Dentistas fixos
        const fixedDoctors = ['Dra. Jessica Reis', 'Dra. Dani'];
        
        // Carrega dentistas dinâmicos
        const dynamicDoctors = await loadData('doctors') || [];

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
                removeBtn.textContent = 'Remover';
                removeBtn.type = 'button';
                removeBtn.style.padding = '5px 10px';
                removeBtn.style.backgroundColor = '#8B0000';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '4px';
                removeBtn.style.cursor = 'pointer';
                
                removeBtn.onclick = async () => {
                    const confirmed = await showConfirm(`Remover ${doctor}?`);
                    if (confirmed) {
                        const dynamicDoctors = await loadData('doctors') || [];
                        const updated = dynamicDoctors.filter(d => d !== doctor);
                        await saveData('doctors', updated);
                        loadDoctorsList();
                    }
                };
                
                div.appendChild(removeBtn);
            }
            
            doctorsList.appendChild(div);
        });
    }

    // Carrega pacientes do localStorage
    async function loadPatientsList(patients) {
        if (!patients) {
            patients = (await loadData('pending-patients')) || [];
        }
        
        patientList.innerHTML = '';

        if (patients.length === 0) {
            patientList.innerHTML = '<p class="empty-message">Nenhum paciente registrado</p>';
            return;
        }

        patients.forEach(patient => {
            const div = document.createElement('div');
            div.className = 'patient-item';

            const badge = patient.urgente ? '<span class="urgent-badge">URGENTE</span>' : '';

            div.innerHTML = `
                <div class="patient-info">
                    <div class="patient-header">
                        <strong>${patient.name}</strong>
                        ${badge}
                    </div>
                    <p><strong>Dr(a):</strong> ${patient.doctor}</p>
                    <p><strong>Serviço:</strong> ${patient.service}${patient.otherServiceDetail ? ' - ' + patient.otherServiceDetail : ''}</p>
                </div>
                <div class="patient-actions">
                    <button class="patient-button" data-patient='${JSON.stringify(patient)}'>Chamar</button>
                    <button class="patient-button" data-name="${patient.name}" style="background-color: #666;">Remover</button>
                </div>
            `;

            patientList.appendChild(div);
        });

        // Eventos dos botões
        document.querySelectorAll('.patient-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const patientData = e.target.dataset.patient;
                const name = e.target.dataset.name;
                
                if (patientData) {
                    // Botão Chamar
                    const patient = JSON.parse(patientData);
                    const confirmed = await showConfirm(`Chamar ${patient.name}?`);
                    if (confirmed) {
                        await callPatient(patient);
                    }
                } else if (name) {
                    // Botão Remover
                    const confirmed = await showConfirm(`Remover ${name}?`);
                    if (confirmed) {
                        await removeFromArray('pending-patients', p => p.name !== name);
                    }
                }
            });
        });
    }

    // Chama paciente (envia para a TV)
    async function callPatient(patient) {
        const consultorio = patient.doctor.includes('Jessica') ? '01' : patient.doctor.includes('Dani') ? '02' : '03';
        
        const newCall = {
            id: crypto.randomUUID(),
            patientName: patient.name,
            consultorio: consultorio,
            doctorName: patient.doctor,
            timestamp: new Date().toISOString()
        };

        // Adiciona chamada atomicamente
        await unshiftToArray('call-notifications', newCall);

        // Remove da fila de espera atomicamente
        await removeFromArray('pending-patients', p => p.name !== patient.name);

        // Adiciona ao histórico atomicamente
        await unshiftToArray('call-history', newCall);

        await showInfo(`${patient.name} chamado para o consultório ${consultorio}`);
    }

    // Submete formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('patient-name').value;
        const doctor = doctorSelect.value;
        const service = serviceSelect.value;
        const otherServiceDetail = document.getElementById('other-service-detail').value;
        const urgente = document.getElementById('urgente').checked;

        if (!name || !doctor || !service) {
            await showInfo('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        const newPatient = {
            name,
            doctor,
            service,
            otherServiceDetail,
            urgente,
            timestamp: new Date().toISOString()
        };

        await pushToArray('pending-patients', newPatient);

        form.reset();
        await showInfo('Paciente registrado com sucesso!');
    });

    // Alternância de serviço "Outro"
    serviceSelect.addEventListener('change', () => {
        otherServiceGroup.style.display = serviceSelect.value === 'Outro' ? 'block' : 'none';
    });

    // Limpar histórico
    const resetHistoryBtn = document.getElementById('reset-history-btn');
    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', async () => {
            const confirmed = await showConfirm('Limpar todo o histórico de chamadas?');
            if (confirmed) {
                await saveData('call-history', []);
            }
        });
    }

    // Carrega histórico
    async function loadHistoryList(history) {
        if (!history) {
            history = (await loadData('call-history')) || [];
        }
        
        const historyList = document.getElementById('history-list');
        
        if (!historyList) return;

        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-message">Nenhum paciente no histórico</p>';
            return;
        }

        history.forEach(call => {
            const div = document.createElement('div');
            div.className = 'patient-item';
            div.style.cursor = 'pointer';

            const date = new Date(call.timestamp);
            const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            div.innerHTML = `
                <div class="patient-info">
                    <div class="patient-header">
                        <strong>${call.patientName}</strong>
                    </div>
                    <p><strong>Consultório:</strong> ${call.consultorio}</p>
                    <p><strong>Dr(a):</strong> ${call.doctorName}</p>
                    <p style="margin-top: 5px; color: #888; font-size: 0.9em;"><strong>Hora:</strong> ${time}</p>
                </div>
            `;

            // Adiciona clique para mostrar modal com detalhes
            div.addEventListener('click', () => {
                showHistoryModal(call, time);
            });

            historyList.appendChild(div);
        });
    }

    // Mostra modal com detalhes do histórico
    function showHistoryModal(call, time) {
        if (!confirmModal) return;
        
        const service = call.service || 'Não especificado';
        const detail = call.otherServiceDetail ? ` - ${call.otherServiceDetail}` : '';
        
        confirmMessage.innerHTML = `
            <div style="text-align: left;">
                <p><strong>Paciente:</strong> ${call.patientName}</p>
                <p><strong>Consultório:</strong> ${call.consultorio}</p>
                <p><strong>Dr(a):</strong> ${call.doctorName}</p>
                <p><strong>Serviço:</strong> ${service}${detail}</p>
                <p><strong>Hora da Chamada:</strong> ${time}</p>
            </div>
        `;
        
        confirmModal.classList.add('active');
        const confirmYesLocal = confirmModal.querySelector('#confirm-yes');
        const confirmNoLocal = confirmModal.querySelector('#confirm-no');
        
        if (confirmNoLocal) {
            confirmNoLocal.style.display = 'none';
        }
        
        if (confirmYesLocal) {
            confirmYesLocal.textContent = 'Fechar';
            confirmYesLocal.onclick = () => {
                confirmModal.classList.remove('active');
                if (confirmNoLocal) {
                    confirmNoLocal.style.display = '';
                }
                confirmYesLocal.textContent = 'Sim';
            };
        }
    }

    // Configura listeners em tempo real
    onDataChange('pending-patients', (patients) => {
        loadPatientsList(patients);
    });

    onDataChange('call-history', (history) => {
        loadHistoryList(history);
    });

    // Inicializa com dados atuais
    await loadDoctorsList();
    await loadPatientsList();
    await loadHistoryList();
});
