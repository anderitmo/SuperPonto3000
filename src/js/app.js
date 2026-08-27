import { initRouter } from './router.js';
import { supabase } from './supabase.js';
import { CameraManager, generateHash } from './totem.js';
import { renderTicketAndQR } from './ticketModal.js';
import { saveOfflineRecord } from './db.js';
import { uploadPhotoAndSaveRecord, syncOfflineQueue } from './syncManager.js';
import { calculateJourneyStatus } from './rhEngine.js';

let cameraManager = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initialize Router
  initRouter();

  // Setup Offline / Online Badge & Sync Listeners
  const offlineBadge = document.getElementById('offline-badge');
  function updateOnlineStatus() {
    if (navigator.onLine) {
      offlineBadge.classList.add('hidden');
      syncOfflineQueue();
    } else {
      offlineBadge.classList.remove('hidden');
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registrado com sucesso.');
    } catch (err) {
      console.warn('Falha ao registrar ServiceWorker:', err);
    }
  }

  // Setup Camera for Totem
  const videoElem = document.getElementById('webcam-preview');
  const canvasElem = document.getElementById('photo-canvas');
  const placeholderElem = document.getElementById('camera-placeholder');

  cameraManager = new CameraManager(videoElem, canvasElem);
  const cameraStarted = await cameraManager.start();
  if (cameraStarted) {
    placeholderElem.style.display = 'none';
  } else {
    placeholderElem.querySelector('p').textContent = 'Câmera indisponível (Usando captura estática)';
  }

  // Setup Totem Form Event
  const btnRegister = document.getElementById('btn-register');
  const inputMatricula = document.getElementById('matricula-input');
  const feedbackMsg = document.getElementById('totem-feedback');

  btnRegister.addEventListener('click', async () => {
    const matricula = inputMatricula.value.trim();
    if (!matricula) {
      showFeedback('Por favor, insira a matrícula.', 'error');
      return;
    }

    const recordType = document.querySelector('input[name="record-type"]:checked')?.value || 'ENTRADA';
    const timestamp = new Date().toISOString();
    showFeedback('Processando registro...', 'info');

    try {
      // 1. Capture Photo
      const photoBase64 = cameraManager.captureFrame();

      // 2. Generate Hash SHA-256
      const hash = await generateHash(matricula, timestamp);

      const recordPayload = {
        matricula,
        record_type: recordType,
        record_timestamp: timestamp,
        photoBase64,
        validation_hash: hash
      };

      // 3. Try Online Save or Offline Fallback
      let savedRecord = null;
      if (navigator.onLine) {
        try {
          savedRecord = await uploadPhotoAndSaveRecord(recordPayload);
          showFeedback('Ponto registrado com sucesso!', 'success');
        } catch (err) {
          console.warn('Erro ao salvar online, salvando no IndexedDB:', err);
          await saveOfflineRecord(recordPayload);
          showFeedback('Salvo localmente. Aguardando conexão para sincronizar.', 'success');
        }
      } else {
        await saveOfflineRecord(recordPayload);
        showFeedback('Salvo localmente. Aguardando conexão para sincronizar.', 'success');
      }

      // 4. Trigger Ticket / QR Code Fallback Modal
      renderTicketAndQR({
        matricula,
        employeeName: `Funcionário (${matricula})`,
        record_type: recordType,
        record_timestamp: timestamp,
        validation_hash: hash
      });

      // Clear input
      inputMatricula.value = '';
    } catch (err) {
      console.error('Erro ao registrar ponto:', err);
      showFeedback('Erro ao processar registro: ' + err.message, 'error');
    }
  });

  function showFeedback(msg, type) {
    feedbackMsg.textContent = msg;
    feedbackMsg.className = `feedback-msg ${type}`;
    if (type !== 'info') {
      setTimeout(() => {
        feedbackMsg.className = 'feedback-msg';
      }, 5000);
    }
  }

  // Setup RH View & Data Loading
  window.addEventListener('rh-view-active', loadRHData);
  document.getElementById('btn-refresh-rh').addEventListener('click', loadRHData);
  document.getElementById('filter-date').addEventListener('change', filterRHTable);
  document.getElementById('filter-department').addEventListener('change', filterRHTable);

  let rawRHRecords = [];
  let departmentsMap = {};
  let employeesMap = {};

  async function loadRHData() {
    const tbody = document.getElementById('rh-records-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando registros...</td></tr>';

    if (!supabase || !navigator.onLine) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-warning">Supabase indisponível ou dispositivo offline.</td></tr>';
      return;
    }

    try {
      // Fetch departments, employees, and time_records
      const [{ data: depts }, { data: emps }, { data: records }] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase.from('employees').select('*, departments(*)'),
        supabase.from('time_records').select('*, employees(*, departments(*))').order('record_timestamp', { ascending: false })
      ]);

      // Populate department dropdown filter
      const deptSelect = document.getElementById('filter-department');
      deptSelect.innerHTML = '<option value="">Todos</option>';
      if (depts) {
        depts.forEach(d => {
          departmentsMap[d.id] = d;
          deptSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
        });
      }

      if (emps) {
        emps.forEach(e => {
          employeesMap[e.id] = e;
        });
      }

      rawRHRecords = records || [];
      renderRHTable(rawRHRecords);
    } catch (err) {
      console.error('Erro ao carregar dados do RH:', err);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados: ' + err.message + '</td></tr>';
    }
  }

  function renderRHTable(records) {
    const tbody = document.getElementById('rh-records-tbody');
    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum registro encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(rec => {
      const emp = rec.employees || {};
      const dept = emp.departments || {};
      const statusObj = calculateJourneyStatus(rec, null, dept);
      const dateFormatted = new Date(rec.record_timestamp).toLocaleString('pt-BR');

      return `
        <tr>
          <td><strong>${emp.name || 'Desconhecido'}</strong></td>
          <td>${emp.matricula || '-'}</td>
          <td>${dept.name || 'Sem depto'}</td>
          <td><span class="badge ${rec.record_type === 'ENTRADA' ? 'badge-normal' : 'badge-atraso'}">${rec.record_type}</span></td>
          <td>${dateFormatted}</td>
          <td><span class="badge ${statusObj.badgeClass}">${statusObj.status}</span></td>
          <td>
            <button class="btn-secondary btn-sm view-photo-btn" data-photo="${rec.photo_url || ''}">
              <i data-lucide="image"></i> Ver Foto
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Attach click events for photo modal
    document.querySelectorAll('.view-photo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const photoUrl = e.currentTarget.getAttribute('data-photo');
        const photoModal = document.getElementById('modal-photo');
        const imgElem = document.getElementById('audit-photo-img');
        if (photoUrl) {
          imgElem.src = photoUrl;
          photoModal.showModal();
        }
      });
    });
  }

  document.getElementById('btn-close-photo-modal').addEventListener('click', () => {
    document.getElementById('modal-photo').close();
  });

  function filterRHTable() {
    const dateVal = document.getElementById('filter-date').value;
    const deptVal = document.getElementById('filter-department').value;

    let filtered = rawRHRecords;
    if (dateVal) {
      filtered = filtered.filter(r => r.record_timestamp.startsWith(dateVal));
    }
    if (deptVal) {
      filtered = filtered.filter(r => r.employees && r.employees.department_id === deptVal);
    }
    renderRHTable(filtered);
  }
});
