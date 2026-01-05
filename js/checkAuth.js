// checkAuth.js — inclua este script nas páginas protegidas
if (typeof window !== 'undefined') {
    const authed = localStorage.getItem('authed');
    if (authed !== '1') {
        // não autenticado — volta para a tela de login (relativo)
        window.location.href = './index.html';
    }
}
