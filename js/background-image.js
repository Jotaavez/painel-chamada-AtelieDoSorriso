// Esse codigo seleciona aleatoriamente uma imagem de background para a página de login

// Array com as imagens disponíveis
        const backgroundImages = [
            'gradient-1.svg',
            'gradient-2.svg',
            'gradient-3.svg',
        ];

        // Função para carregar background aleatório
        function loadRandomBackground() {
            const randomIndex = Math.floor(Math.random() * backgroundImages.length);
            const randomImage = backgroundImages[randomIndex];
            document.body.style.backgroundImage = `url("../assets/images/gradient/${randomImage}")`;
        }

        // Executa quando a página carrega
        loadRandomBackground();