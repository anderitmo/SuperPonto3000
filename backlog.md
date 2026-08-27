# Backlog de Desenvolvimento - SuperPonto3000

Este documento registra todas as tarefas, subtarefas e o status de implementação das funcionalidades do sistema de controle de ponto (PWA Offline-First) **SuperPonto3000**, em conformidade com as especificações do projeto.

---

## ⚙️ Configurações do Ambiente e Credenciais

* **Endpoint Supabase:** `https://yhrabfdapveuscfjqkpv.supabase.co/rest/v1/`
* **Supabase Publishable/Anon Key:** `sb_publishable_vI6eeiF4LTzhcIop4hyxwA_xyYzZjZ8`
* **Stack Principal:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
* **Bibliotecas (via CDN):**
  * `@supabase/supabase-js` (Cliente Supabase)
  * `idb` (IndexedDB Wrapper)
  * `qrious` / `qrcode.js` (Gerador de QR Code)
  * `lucide` (Ícones SVG)

---

## 📋 Rotina de Tarefas e Backlog

### Tarefa 1: Infraestrutura de Banco de Dados e Storage (Supabase)
- [ ] **1.1 Execute/Validação do Script DDL**
  - Executar o arquivo `SPEC/Schema.sql` no banco PostgreSQL do Supabase.
  - Criar tabelas: `departments`, `employees`, `employee_schedules`, `time_records`.
  - Configurar UUIDs e políticas de segurança Row Level Security (RLS).
- [ ] **1.2 Configuração do Supabase Storage**
  - Criar bucket público de armazenamento para fotos dos registros de ponto (ex: `ponto-photos`).
  - Definir políticas de acesso para upload e leitura pública das fotos.

---

### Tarefa 2: Estrutura Base do Projeto Front-End (SPA & Estilização)
- [ ] **2.1 Estrutura de Diretórios e Modulos ES6**
  - Configurar arquivo `index.html` (com meta tags PWA, viewport tablet/desktop e import de CDNs).
  - Estruturar diretório `src/` (`js/`, `css/`, `assets/`).
- [ ] **2.2 Design System e CSS**
  - Implementar estilos responsivos limpos e minimalistas (fundo `#FFFFFF` / `#F9F9F9`, tipografia Inter/Roboto).
  - Integrar biblioteca de ícones `Lucide`.
  - Configurar CSS `@media print` para formatação de tickets de comprovante de ponto.
- [ ] **2.3 Navegação e Roteador SPA**
  - Criar roteamento simples em Vanilla JS para alternar entre:
    - Tela de Registro de Ponto (Totem/Relógio).
    - Portal do RH (Gestão e Relatórios de Jornada).

---

### Tarefa 3: Módulo de Registro de Ponto (Totem)
- [ ] **3.1 Captura de Mídia (Câmera Nativa)**
  - Implementar integração com `navigator.mediaDevices.getUserMedia`.
  - Exibir preview em vídeo e realizar captura de frame (foto) em Base64 no momento do clique.
- [ ] **3.2 Formulário de Registro e Validação**
  - Campo de entrada para matrícula (numérico).
  - Seleção/distinção de tipo de registro (`ENTRADA` / `SAÍDA`).
  - Geração de Hash SHA-256 de validação de segurança (`matrícula + timestamp + salt`).
- [ ] **3.3 Emissão de Comprovante & QR Code Fallback**
  - Acionar impressão via `window.print()`.
  - Desenvolver Modal de contingência com QR Code gerado em Canvas (`Matricula | Data | Hora | Tipo | Hash`) usando a biblioteca QR Code CDN caso a impressão falhe ou seja cancelada.

---

### Tarefa 4: Resiliência, Offline-First e Service Worker (PWA)
- [ ] **4.1 Configuração do Service Worker**
  - Registrar Service Worker para cache estático dos arquivos da aplicação (HTML, CSS, JS, bibliotecas CDN).
  - Criar arquivo `manifest.json` para instalação do PWA.
- [ ] **4.2 Camada de Armazenamento Local (IndexedDB)**
  - Configurar banco local `TimeTrackerDB` utilizando a biblioteca `idb`.
  - Criar store `sync_queue` para armazenar registros offline (Matrícula, Timestamp, Foto Base64, Hash, Tipo).
- [ ] **4.3 Fluxo de Registro Offline & Feedback Visual**
  - Detectar estado da rede com `navigator.onLine`.
  - Armazenar payload no IndexedDB em caso de falta de conexão.
  - Exibir alerta visual discreto na UI ("Salvo localmente. Aguardando conexão").
- [ ] **4.4 Sincronização Automática (Sync Queue)**
  - Escutar evento `window.addEventListener('online')` e gatilhos periódicos.
  - Ler registros pendentes do `sync_queue`.
  - Fazer upload da imagem em Base64 para o Supabase Storage e obter URL pública.
  - Inserir registro na tabela `time_records` via API do Supabase.
  - Remover itens da fila local após confirmação de persistência no Supabase.

---

### Tarefa 5: Portal do RH e Regras de Negócio de Jornada
- [ ] **5.1 Gestão de Funcionários e Departamentos**
  - Interface visual para visualizar departamentos e regras de horário padrão (`default_entry_time`, `default_exit_time`).
  - Visualização de exceções de jornada individual (`employee_schedules`).
- [ ] **5.2 Cálculo de Jornada e Relatório Diário**
  - Cruzar registros de `time_records` com a jornada exigida (exceção em `employee_schedules` ou padrão em `departments`).
  - Implementar regra de tolerância de 15 minutos na entrada sem penalidade.
  - Calcular compensação matemática automática (tempo de atraso até 15 min somado ao horário de saída).
  - Classificar status de cada registro/dia:
    - `Normal` (No horário ou compensado)
    - `Atraso` (Entrada superior a 15 min de tolerância)
    - `Saída Antecipada` (Saída antes de cumprir jornada + compensação)
    - `Falta` (Ausência de batida no dia civil)
- [ ] **5.3 Visualização dos Registros e Fotos de Validação**
  - Exibir tabela de marcações com filtros (por data, departamento, funcionário).
  - Permitir visualização da foto capturada em cada registro para auditoria visual anti-fraude.

---

### Tarefa 6: Testes, Validação e Deploy
- [ ] **6.1 Testes de Fluxo Completo**
  - Testar registro online e impressão de comprovante.
  - Testar registro offline (simulação de corte de rede no DevTools), verificação de salva no IndexedDB e sincronização automática ao reestabelecer a conexão.
  - Testar cálculo das regras de jornada (tolerância, compensação, faltas e atrasos).
- [ ] **6.2 Deploy no GitHub Pages**
  - Configurar publicação do front-end SPA no GitHub Pages.
