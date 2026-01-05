// auth.js — autenticação simples no cliente
// ATENÇÃO: este método é puramente para conveniência local/testes.
// Não é seguro para produção: a senha fica visível no código.

const SITE_PASSWORD = 'trocar123'; // altere aqui para sua senha desejada

document.addEventListener('DOMContentLoaded', () => {
    // mostrar/ocultar senha
    const toggle = document.querySelector('.toggle-password');
    const pwdInput = document.getElementById('password');
    if (toggle && pwdInput) {
        const icon = toggle.querySelector('img');
        const showSrc = '../assets/images/password/smileclose-password.svg';
        const hideSrc = '../assets/images/password/smile-password.svg';
        toggle.addEventListener('click', () => {
            const isPassword = pwdInput.getAttribute('type') === 'password';
            pwdInput.setAttribute('type', isPassword ? 'text' : 'password');
            toggle.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
            if (icon) {
                icon.src = isPassword ? hideSrc : showSrc;
            }
        });
    }

    const form = document.querySelector('.login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pw = form.password.value || '';
        if (pw === SITE_PASSWORD) {
            localStorage.setItem('authed', '1');
            // redireciona para a página inicial do painel
            window.location.href = './home.html';
        } else {
            alert('Senha incorreta');
            form.password.value = '';
            form.password.focus();
        }
    });
});
