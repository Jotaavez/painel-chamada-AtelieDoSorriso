// Módulo para gerenciar notificações push
export async function initializeNotifications() {
    // Verifica se o navegador suporta notificações e service workers
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('⚠️ Navegador não suporta notificações push');
        return false;
    }

    try {
        // Calcula o caminho relativo do Service Worker
        const swPath = new URL('../sw.js', import.meta.url).href;
        console.log('📍 Registrando Service Worker em:', swPath);

        // Registra o Service Worker com caminho relativo
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('✓ Service Worker registrado:', registration);

        // Se o usuário já permitiu notificações, apenas retorna
        if (Notification.permission === 'granted') {
            console.log('✓ Notificações já permitidas');
            return true;
        }

        // Se a permissão não foi definida, solicita
        if (Notification.permission !== 'denied') {
            console.log('📢 Solicitando permissão de notificação...');
            const permission = await Notification.requestPermission();
            console.log('📢 Resultado da permissão:', permission);
            return permission === 'granted';
        }

        console.log('⚠️ Notificações foram bloqueadas pelo usuário');
        return false;
    } catch (error) {
        console.error('❌ Erro ao inicializar notificações:', error);
        return false;
    }
}

export async function sendLocalNotification(title, options = {}) {
    // Usa notificações locais (não requer backend)
    if (Notification.permission !== 'granted') {
        console.warn('⚠️ Permissão de notificação não foi concedida');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Caminho relativo para os ícones
        const iconPath = new URL('../assets/images/logo/logo-atelie-white-tooth.svg', import.meta.url).href;
        const badgePath = new URL('../assets/images/logo/logo-atelie-color-tooth.svg', import.meta.url).href;

        registration.showNotification(title, {
            icon: iconPath,
            badge: badgePath,
            tag: 'patient-notification',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            ...options
        });
        console.log('✓ Notificação enviada:', title);
    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error);
    }

export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
            console.log('📢 Permissão de notificação:', permission);
        });
    }
}
