# Painel de Chamada — Ateliê do Sorriso

Este repositório contém um painel simples de chamada para clínica odontológica com três telas sincronizadas:
- Recepção: cadastro de pacientes e fila de espera
- Painel do dentista: login simples, listar/chamar/finalizar pacientes
- Tela de chamada (TV): exibe paciente chamado e playlist do YouTube

Objetivo: funcionalidade primeiro; visual depois.

## Rodando localmente (rápido)
1. Abra um terminal na raiz do projeto.
2. Inicie servidor PHP embutido:

```bash
php -S localhost:8000 -t .
```

3. Páginas principais:
- Recepção: `http://localhost:8000/pages/painel-recepcao.html`
- Login dentista: `http://localhost:8000/pages/dentist-login.html`
- Painel dentista: `http://localhost:8000/pages/painel-dentista.html`
- Tela de chamada (TV): `http://localhost:8000/pages/chamada-paciente.html`

## Endpoints PHP (JSON)
Todos estão em `php/` e usam `data/patients.json` como armazenamento.

- `php/create_patient.php` (POST)
  - Campos: `name`, `doctor`, `service`, optional `other`, optional `urgency` (1)
  - Retorna `{ ok: true, patient: { ... } }`

- `php/list_patients.php` (GET)
  - Retorna `{ ok: true, patients: [...] }` ordenados (urgência primeiro)

- `php/call_patient.php` (POST)
  - Campos: `id`, optional `by` (dentista), optional `room`
  - Marca `status='called'`, incrementa `calls`, define `last_called`

- `php/finish_patient.php` (POST)
  - Campos: `id`
  - Marca `status='done'`, define `finished_at`

- `php/remove_patient.php` (POST)
  - Campos: `id` — remove registro

- `php/clear_queue.php` (POST)
  - Remove pacientes com `status === 'waiting'` (preserva histórico)

Exemplo (criar paciente):
```bash
curl -X POST -d "name=Joao&doctor=Dr%20Ana&service=Avalia%C3%A7%C3%A3o" http://localhost:8000/php/create_patient.php
```

## Arquivos importantes
- `data/patients.json` — armazenamento JSON. formato de cada paciente:

```json
{
  "id": "...",
  "name": "João",
  "doctor": "Dr Ana",
  "service": "Avaliação",
  "status": "waiting|called|done",
  "timestamp": 167..., 
  "urgency": true|false,
  "calls": 0,
  "last_called": 167...,
  "finished_at": 167...
}
```

- `php/db.php` — helper de leitura/gravação com locking (flock).
- `css/*.css` — estilos separados por tela.
- `js/*.js` — lógica do cliente e polling (2s).

## Configurações e assets
- Playlist do YouTube: em `pages/chamada-paciente.html`, no elemento `#player-container` defina `data-playlist="SEU_PLAYLIST_ID"`.
- Som de notificação: `assets/sounds/notify.mp3` (substitua pelo áudio desejado).
- Logo e ícones: `assets/images/`.

## Segurança e observações
- Implementação atual é simples e projetada para uso local/interno. Não exponha em produção sem reforços.
- Autenticação do dentista é por `localStorage` (sem segurança). Para produção, implemente login com servidor e sessões.
- A senha do projeto (login principal) estava sendo usada em JS/PHP em versões anteriores; removemos fluxo inseguro e usamos login do dentista via `localStorage`.

## Teste do fluxo
1. Abra a página da recepção e adicione alguns pacientes (use o mesmo nome do dentista no cadastro que usará no login).
2. No login do dentista, insira o nome exato do campo `doctor` usado na recepção e a sala.
3. No painel do dentista, clique em `Chamar` — a tela de chamada deverá atualizar, tocar som e exibir o paciente.

## Teste de tempo real (SSE)
1. Inicie o servidor PHP local na raiz do projeto:

```bash
php -S localhost:8000 -t .
```

2. Abra as três páginas em abas/janelas diferentes:
- Recepção: `http://localhost:8000/pages/painel-recepcao.html`
- Painel dentista: `http://localhost:8000/pages/painel-dentista.html`
- Tela de chamada: `http://localhost:8000/pages/chamada-paciente.html`

3. Verifique o indicador de conexão no canto superior (deve mostrar `Conectado` quando SSE estiver funcionando). Caso o navegador bloqueie SSE, as páginas fazem fallback para polling a cada 2s.

4. Fluxo manual de verificação:
- Cadastre um paciente na recepção (preencha `doctor` com o nome do dentista que você usará).
- No painel do dentista, clique em `Chamar` para esse paciente. A tela de chamada deverá atualizar automaticamente e tocar o som `assets/sounds/notify.mp3`.
- Se quiser testar reconexão: pare o servidor (`Ctrl+C`), aguarde alguns segundos e reinicie-o; a página tentará reconectar automaticamente.

## WebSocket server (opcional, recomendado para mais robustez)
Um servidor Node.js observa `data/patients.json` e envia atualizações em tempo real via WebSocket. Isso reduz latência e torna a atualização instantânea.

1. Instale dependências (na raiz do projeto):

```bash
npm install
```

2. Inicie o servidor WS:

```bash
npm start
```

3. O servidor padrão escuta em `ws://localhost:8080`. As páginas tentam usar WebSocket primeiro; se WS não estiver disponível, usam SSE e, em seguida, polling.

Observação: o servidor WS é opcional — o projeto funciona apenas com PHP+SSE+polling. Use o WS para uma experiência mais responsiva.

## Personalização rápida
- Mudar som: substitua `assets/sounds/notify.mp3`.
- Playlist: em `pages/chamada-paciente.html`, defina o atributo `data-playlist` no elemento `#player-container`.
- Se preferir WebSocket, posso adicionar um servidor Node.js com `ws` e uma pequena ponte para os endpoints PHP.

## Próximos passos sugeridos
- Melhorar autenticação (server-side + sessions).
- Tornar a playlist configurável via UI.
- Adicionar WebSocket para atualizações em tempo real (remover polling).
- Melhorias de UI e responsividade.

Se quiser, eu gero um `docker-compose` simples para rodar via contêiner, ou configuro autenticação por hash no PHP.
# Painel de Chamada de Pacientes – Ateliê do Sorriso Castanhal

Sistema web de **chamada de pacientes em tempo real**, desenvolvido para uso em **clínicas odontológicas**, com foco em **clareza visual**, **organização do fluxo de atendimento** e **experiência do paciente**.

O painel foi projetado para ser exibido em **TVs ou monitores na recepção**, mostrando de forma objetiva qual paciente está sendo chamado, o consultório e o status do atendimento.

---

## 🎯 Objetivo do Projeto

Otimizar o fluxo de atendimento da clínica **Ateliê do Sorriso Castanhal**, reduzindo ruídos na comunicação entre recepção, profissionais e pacientes, além de servir como **projeto prático para aprendizado e portfólio em desenvolvimento web**.

---

## 🧩 Funcionalidades (MVP)

- 📺 Painel visual para exibição em tela grande  
- 🔢 Chamada de pacientes por **código** (ex: P-014), respeitando boas práticas de privacidade  
- 🦷 Exibição do consultório de atendimento  
- 🔄 Atualização em tempo real  
- 🎨 Interface simples, limpa e de fácil leitura  

---

## 🛠️ Tecnologias Utilizadas

### Front-end
- **HTML5**
- **CSS3**
- **JavaScript (Vanilla JS)**

### Back-end / Realtime
- **Supabase** (PostgreSQL + Realtime)

### Hospedagem
- **Vercel** (Frontend)