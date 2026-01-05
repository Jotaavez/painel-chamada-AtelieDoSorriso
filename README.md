## Painel de Chamada — Ateliê do Sorriso

Painel web para gestão de chamadas em consultório odontológico, com telas de recepção, dentista e exibição em TV. Suporta **Firebase para sincronização em tempo real** entre múltiplos dispositivos, ou **localStorage** como fallback.

### Principais telas
- Login e redirecionamento: [pages/index.html](pages/index.html) e [pages/home.html](pages/home.html)
- Painel de exibição (TV): [pages/painel-chamada.html](pages/painel-chamada.html)
- Painel da recepção: [pages/painel-recepcao.html](pages/painel-recepcao.html)
- Painel do dentista: [pages/painel-dentista.html](pages/painel-dentista.html)

### Funcionalidades
- Chamada de pacientes com destaque visual e aviso sonoro no painel da TV.
- **Sincronização em tempo real** via Firebase (ou localStorage como fallback).
- Lista de chamadas recentes e histórico em tempo real.
- Painéis de recepção e dentista com modais, confirmações e estilização premium (bordô/dourado, Montserrat).
- Player YouTube embutido no painel de TV para playlist institucional.

### Estrutura de pastas (resumo)
- assets/ — fontes Montserrat, imagens (logo, gradientes), sons.
- css/ — estilos por página (ex.: [css/painel-chamada.css](css/painel-chamada.css)).
- js/ — scripts de cada tela (ex.: [js/painel-chamada.js](js/painel-chamada.js), [js/recepcao.js](js/recepcao.js)).
- pages/ — HTML das telas.

### Como rodar

#### Versão com localStorage (local)
1) Use uma extensão de servidor estático (ex.: Live Server) ou abra os HTMLs diretamente no navegador.
2) Para simular o fluxo completo, abra em abas diferentes: recepção, dentista e painel de TV.
3) Dispare chamadas pela recepção/dentista; o painel de TV reage lendo `localStorage`.

⚠️ **Limitação**: Dados ficam isolados por dispositivo/navegador. Use apenas para testes.

#### Versão com Firebase (múltiplos dispositivos)
Para sincronizar em tempo real entre recepção, dentista e TV em dispositivos diferentes:

1. **Crie um projeto Firebase**:
   - Acesse [Firebase Console](https://console.firebase.google.com/)
   - Clique "Add Project" e siga os passos
   - Em "Realtime Database", clique "Create Database"
   - Escolha região (ex: `us-central1`) e inicie em modo de teste

2. **Configure as credenciais**:
   - Vá em "Project Settings" → "Your Apps" → clique o ícone `</>`
   - Copie o objeto `firebaseConfig`
   - Abra [js/firebase-config.js](js/firebase-config.js) e substitua os valores:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",           // ← Copie aqui
       authDomain: "YOUR_AUTH_DOMAIN",   // ← Copie aqui
       databaseURL: "YOUR_DATABASE_URL", // ← Copie aqui
       projectId: "YOUR_PROJECT_ID",     // ← Copie aqui
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

3. **Use os novos scripts**:
   - Em [pages/painel-chamada.html](pages/painel-chamada.html), troque:
     ```html
     <script src="../js/painel-chamada.js"></script>
     ```
     por:
     ```html
     <script type="module" src="../js/painel-chamada-new.js"></script>
     ```
   - Em [pages/painel-recepcao.html](pages/painel-recepcao.html), troque:
     ```html
     <script src="../js/recepcao.js"></script>
     ```
     por:
     ```html
     <script type="module" src="../js/recepcao-new.js"></script>
     ```

4. **Teste**:
   - Abra o site em múltiplos dispositivos/abas
   - Registre pacientes na recepção
   - O painel de TV verá as chamadas em tempo real! 🎉

### Ajustes rápidos
- **Dentistas fixos**: em [js/recepcao.js](js/recepcao.js#L55), edite o array `fixedDoctors`:
  ```javascript
  const fixedDoctors = ['Dra. Jessica Reis', 'Dra. Dani', 'Dr. Novo Dentista'];
  ```
- **Playlist do painel**: em [pages/painel-chamada.html](pages/painel-chamada.html), troque `PLAYLIST_ID` na URL do `iframe` pelo ID da playlist do YouTube.
- **Som de notificação**: arquivo em assets/sounds (pode substituir mantendo o nome ou ajustar a fonte em [js/painel-chamada.js](js/painel-chamada.js)).
- **Branding**: logos em assets/images/logo; cores principais em cada CSS (bordô `#8B0000` e dourado `#D4AF37`).

### Dados e sincronização
- **localStorage (fallback)**: `call-notifications` guarda as chamadas em array JSON.
- **Firebase**: sincronização em tempo real na raiz do banco em `/call-notifications`.
- **Atualização TV**: checa novas chamadas a cada segundo; toca som e pisca o nome do paciente por ~3s.

### Testes rápidos
- **Chamada fake via console**:
  ```js
  const calls = JSON.parse(localStorage.getItem('call-notifications') || '[]');
  calls.unshift({ id: crypto.randomUUID(), patientName: 'Paciente Demo', consultorio: '02', doctorName: 'Dr. Demo', timestamp: new Date().toISOString() });
  localStorage.setItem('call-notifications', JSON.stringify(calls));
  ```
- Em seguida, recarregue o painel de TV para ver a nova chamada.

### Observações
- **Sem dependências externas** além de fontes/iframe; Firebase é carregado via CDN.
- **Fallback automático**: se Firebase não estiver configurado, o sistema usa localStorage automaticamente.
- **Evite limpar dados** se quiser manter histórico de chamadas recentes.
- **Segurança Firebase**: modo de teste permite leitura/escrita. Para produção, configure regras de autenticação.
