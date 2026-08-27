# SPECIFICATION: Sistema de Controle de Ponto (PWA Offline-First)

## 1. INSTRUÇÕES GLOBAIS PARA O AGENTE DE IA (Google Jules)
* **Critério de Dúvida:** NÃO CODIFIQUE se houver ambiguidade, dependências não resolvidas ou dúvidas sobre a regra de negócio. Pare e solicite esclarecimentos ao usuário.
* **Divisão de Tarefas:** Sempre divida programações extensas em tarefas e subtarefas lógicas antes de iniciar a escrita do código.
* **Registro de Backlog:** OBRIGATÓRIO gerar e manter atualizado um arquivo `backlog.md` na raiz do repositório, registrando todas as funcionalidades implementadas, ajustadas, alteradas ou pendentes.
* **Paradigma:** Código limpo, componentização lógica em Vanilla JS (Módulos ES6), sem frameworks de UI (React/Vue/Angular).

## 2. ARQUITETURA E STACK TECNOLÓGICA
* **Hospedagem/Controle de Versão:** GitHub (GitHub Pages para deploy do front-end).
* **Backend/BaaS:** Supabase (Database PostgreSQL e Storage via REST API).
* **Front-end:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules).
* **Abordagem:** SPA (Single Page Application) e PWA (Progressive Web App).

### 2.1 Bibliotecas Permitidas (Via CDN)
Para reduzir código boilerplate e mitigar erros, utilize exclusivamente as seguintes bibliotecas via CDN:
* `@supabase/supabase-js`: Cliente oficial para comunicação com o banco e storage.
* `idb` (Jake Archibald): Wrapper leve para trabalhar com IndexedDB usando Promises/Async-Await de forma segura.
* `qrious` ou `qrcode.js`: Para geração do QR Code de contingência no canvas.
* `lucide` (Lucide Icons): Biblioteca de ícones SVG. PROIBIDO O USO DE EMOJIS na UI.

## 3. DIRETRIZES DE UI / UX
* **Dispositivos Alvo:** Exclusivo para Tablets (modo paisagem/retrato) e Desktop.
* **Design System:** Interface limpa, minimalista, fundo branco (`#FFFFFF` ou `#F9F9F9`). Tipografia sem serifa de alta legibilidade (ex: Inter ou Roboto).
* **Ícones:** Utilizar a biblioteca `Lucide` para botões, alertas e feedbacks visuais.
* **Semântica:** Uso adequado de tags HTML5 (main, section, dialog, etc).

## 4. RECURSOS DO SISTEMA E FLUXOS

### 4.1. Registro de Ponto (Caminho Feliz)
* **Entradas:** Campo de texto para `matrícula` (numérico) e captura de foto.
* **API Nativa JS:** Utilizar `navigator.mediaDevices.getUserMedia` para ativar a câmera e extrair um frame (foto) no momento exato do clique em "Registrar".
* **Regra de Tempo:** Capturar o `timestamp` local da máquina no momento do evento (A sincronia do relógio será garantida pelo software de infraestrutura do cliente, ex: NetTimer).
* **Processamento:** 
  1. Validar preenchimento da matrícula.
  2. Capturar foto (Base64).
  3. Gerar Hash SHA-256 (matrícula + timestamp + salt) para validação de segurança.
  4. Salvar registro e definir tipo (Entrada/Saída).

### 4.2. Emissão de Comprovante (Fallback/Contingência)
* **Ação Primária:** Acionar API de impressão do navegador (`window.print()`) formatando um ticket via CSS (`@media print`).
* **Ação Secundária (Fallback):** Caso o usuário cancele a impressão ou o sistema não tenha impressora configurada, exibir um Modal contendo um QR Code gerado em tela com os dados: `Matricula | Data | Hora | Tipo | Hash`.

### 4.3. Resiliência e Offline (PWA)
* **Service Worker:** Implementar cache estático (HTML, CSS, JS, CDNs) para que a interface carregue sem internet.
* **Armazenamento Local:** Usar `idb` (IndexedDB) para criar o banco local `TimeTrackerDB`, tabela `sync_queue`.
* **Fluxo Offline:** 
  1. Se `navigator.onLine` for false, salvar o payload (Matrícula, Timestamp, Foto em Base64, Hash) no IndexedDB.
  2. Emitir aviso visual discreto na UI de "Salvo localmente. Aguardando conexão".
* **Fluxo de Sincronização:** 
  1. Escutar evento `window.addEventListener('online')`.
  2. Ao voltar a rede, ler fila do IndexedDB.
  3. Fazer upload da foto Base64 para Supabase Storage, obter a URL pública.
  4. Inserir registro na tabela `time_records` no Supabase.
  5. Remover item da fila do IndexedDB após sucesso.

### 4.4. Regras de Negócio (Jornada e Relatório Diário)
As validações abaixo ocorrem na camada de visualização/relatório (Portal do RH, que pode ser uma rota isolada no SPA):
* **Jornada:** O sistema deve verificar `employee_schedules` (exceção). Se não existir, usar a regra do `departments` do funcionário.
* **Tolerância e Compensação:**
  * Permitir até 15 minutos de atraso na entrada sem flag de infração.
  * O tempo exato de atraso (ex: 12 min) deve ser matematicamente somado ao horário exigido de saída para compensação no mesmo turno.
* **Status Gerados:**
  * `Normal`: Dentro do horário ou compensado.
  * `Atraso`: Entrada superior a 15 min do previsto.
  * `Saída Antecipada`: Saída registrada antes do cumprimento total do turno + compensação.
  * `Falta`: Ausência de registro ao virar o dia civil (00:00).

## 5. REQUISITOS TÉCNICOS DE SEGURANÇA
* Não expor a chave Service Role do Supabase no Front-end. Usar apenas a chave pública (Anon Key).
* A validação visual anti-fraude (foto do rosto x foto impressa) é responsabilidade do RH, o sistema deve garantir apenas o salvamento íntegro da imagem associada à matrícula e horário precisos.