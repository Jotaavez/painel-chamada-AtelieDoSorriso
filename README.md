## Painel de Chamada — Ateliê do Sorriso

Painel web para gestão de chamadas em consultório odontológico, com telas de recepção, dentista e exibição em TV. Stack simples (HTML/CSS/JS + localStorage) para funcionar offline ou em rede local sem backend.

### Principais telas
- Login e redirecionamento: [pages/index.html](pages/index.html) e [pages/home.html](pages/home.html)
- Painel de exibição (TV): [pages/painel-chamada.html](pages/painel-chamada.html)
- Painel da recepção: [pages/painel-recepcao.html](pages/painel-recepcao.html)
- Painel do dentista: [pages/painel-dentista.html](pages/painel-dentista.html)

### Funcionalidades
- Chamada de pacientes com destaque visual e aviso sonoro no painel da TV.
- Lista de chamadas recentes e histórico em tempo real via `localStorage` (sem servidor).
- Painéis de recepção e dentista com modais, confirmações e estilização premium (bordô/dourado, Montserrat).
- Player YouTube embutido no painel de TV para playlist institucional.

### Estrutura de pastas (resumo)
- assets/ — fontes Montserrat, imagens (logo, gradientes), sons.
- css/ — estilos por página (ex.: [css/painel-chamada.css](css/painel-chamada.css)).
- js/ — scripts de cada tela (ex.: [js/painel-chamada.js](js/painel-chamada.js), [js/recepcao.js](js/recepcao.js)).
- pages/ — HTML das telas.

### Como rodar
1) Use uma extensão de servidor estático (ex.: Live Server) ou abra os HTMLs diretamente no navegador.
2) Para simular o fluxo completo, abra em abas diferentes: recepção, dentista e painel de TV.
3) Dispare chamadas pela recepção/dentista; o painel de TV reage lendo `localStorage`.

### Ajustes rápidos
- **Dentistas fixos**: em [js/recepcao.js](js/recepcao.js#L55), edite o array `fixedDoctors`:
  ```javascript
  const fixedDoctors = ['Dra. Jessica Reis', 'Dra. Dani', 'Dr. Novo Dentista'];
  ```
- **Playlist do painel**: em [pages/painel-chamada.html](pages/painel-chamada.html), troque `PLAYLIST_ID` na URL do `iframe` pelo ID da playlist do YouTube.
- **Som de notificação**: arquivo em assets/sounds (pode substituir mantendo o nome ou ajustar a fonte em [js/painel-chamada.js](js/painel-chamada.js)).
- **Branding**: logos em assets/images/logo; cores principais em cada CSS (bordô `#8B0000` e dourado `#D4AF37`).

### Dados e sincronização
- Armazenamento: `localStorage` com a chave `call-notifications` guarda as chamadas em array JSON.
- Atualização: o painel de TV checa novas chamadas a cada segundo; toca som e pisca o nome do paciente por ~3s.

### Testes rápidos
- Chamada fake: adicione manualmente no console do navegador algo como:
	```js
	const calls = JSON.parse(localStorage.getItem('call-notifications') || '[]');
	calls.unshift({ id: crypto.randomUUID(), patientName: 'Paciente Demo', consultorio: '02', doctorName: 'Dr. Demo', timestamp: new Date().toISOString() });
	localStorage.setItem('call-notifications', JSON.stringify(calls));
	```
- Em seguida, recarregue o painel de TV para ver a nova chamada.

### Observações
- Sem dependências externas além de fontes/iframe; funciona offline (exceto YouTube se usado).
- Evite limpar `localStorage` se quiser manter histórico de chamadas recentes.
