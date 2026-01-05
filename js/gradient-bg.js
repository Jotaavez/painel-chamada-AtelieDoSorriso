// Script para aplicar fundo gradiente aleatório
document.addEventListener('DOMContentLoaded', () => {
    const gradients = [
        '../assets/images/gradient/gradient-1.svg',
        '../assets/images/gradient/gradient-2.svg',
        '../assets/images/gradient/gradient-3.svg'
    ];

    // Escolhe um gradiente aleatório
    const randomIndex = Math.floor(Math.random() * gradients.length);
    const selectedGradient = gradients[randomIndex];

    // Aplica ao fundo
    document.body.style.backgroundImage = `url('${selectedGradient}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.minHeight = '100vh';
});
