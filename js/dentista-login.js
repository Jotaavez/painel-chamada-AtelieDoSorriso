// Script para login do dentista
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.dentist-login-form');
    const dentistSelect = document.getElementById('dentist-select');
    const otherDentistGroup = document.getElementById('other-dentist-group');
    const pronounModal = document.getElementById('pronoun-modal');
    const btnDra = document.getElementById('btn-dra');
    const btnDr = document.getElementById('btn-dr');

    const fixedDoctors = ['Dra. Jessica Reis', 'Dra. Dani'];

    function loadDoctorsIntoSelect() {
        if (!dentistSelect) return;
        const raw = localStorage.getItem('doctors');
        let dynamicDoctors = [];
        if (raw) {
            try {
                dynamicDoctors = JSON.parse(raw);
            } catch (e) {
                dynamicDoctors = [];
            }
        }

        const allDoctors = [...new Set([...fixedDoctors, ...dynamicDoctors])];
        const currentValue = dentistSelect.value;

        dentistSelect.innerHTML = '<option value="">Escolha seu nome</option>';
        allDoctors.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            dentistSelect.appendChild(opt);
        });

        const otherOpt = document.createElement('option');
        otherOpt.value = 'Outro';
        otherOpt.textContent = 'Outro (informar nome)';
        dentistSelect.appendChild(otherOpt);

        if (currentValue) {
            dentistSelect.value = currentValue;
        }
    }
    
    if (!form) return;

    loadDoctorsIntoSelect();

    // Mostra/oculta campo de nome customizado
    dentistSelect.addEventListener('change', () => {
        if (dentistSelect.value === 'Outro') {
            otherDentistGroup.style.display = 'block';
            form.dentistName.required = true;
        } else {
            otherDentistGroup.style.display = 'none';
            form.dentistName.required = false;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let name = dentistSelect.value;
        
        if (!name) {
            alert('Por favor escolha ou informe um dentista.');
            dentistSelect.focus();
            return;
        }

        if (name === 'Outro') {
            name = (form.dentistName.value || '').trim();
            if (!name) {
                alert('Por favor informe seu nome.');
                form.dentistName.focus();
                return;
            }

            const pronoun = await new Promise(resolve => {
                if (!pronounModal) return resolve('Dr.');
                pronounModal.classList.add('active');
                const cleanup = (value) => {
                    pronounModal.classList.remove('active');
                    btnDra.onclick = null;
                    btnDr.onclick = null;
                    resolve(value);
                };
                btnDra.onclick = () => cleanup('Dra.');
                btnDr.onclick = () => cleanup('Dr.');
            });

            name = `${pronoun} ${name}`;
        }

        const consultorio = form.consultorio.value;

        if (!['1','2','3','4'].includes(consultorio)) {
            alert('Por favor selecione um consultório válido (1-4).');
            form.consultorio.focus();
            return;
        }

        // Adiciona dentista à lista de dentistas disponíveis
        const rawDoctors = localStorage.getItem('doctors');
        let doctors = [];
        if (rawDoctors) {
            try {
                doctors = JSON.parse(rawDoctors);
            } catch (e) {
                doctors = [];
            }
        }

        // Verifica se dentista já está na lista
        if (!doctors.includes(name)) {
            doctors.push(name);
            localStorage.setItem('doctors', JSON.stringify(doctors));
            loadDoctorsIntoSelect();
            dentistSelect.value = name;
        }

        // Salva dados do dentista logado
        const dentist = { name, consultorio };
        localStorage.setItem('dentist', JSON.stringify(dentist));
        
        // redireciona para o painel do dentista
        window.location.href = '../pages/painel-dentista.html';
    });
});

