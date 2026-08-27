import { supabase } from './supabase.js';
import { getOfflineQueue, removeOfflineRecord } from './db.js';

// Convert Base64 Data URL to Blob for Supabase Storage Upload
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function uploadPhotoAndSaveRecord(recordData) {
  // If no Supabase connection or offline, throw error so caller handles local DB saving
  if (!navigator.onLine || !supabase) {
    throw new Error('Dispositivo offline');
  }

  let photoUrl = recordData.photo_url || '';

  // If photo is in Base64 format, upload to Supabase Storage
  if (recordData.photoBase64 && recordData.photoBase64.startsWith('data:image')) {
    const blob = dataURLtoBlob(recordData.photoBase64);
    const fileName = `ponto_${recordData.matricula}_${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ponto-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      // If bucket does not exist or upload fails, fallback to Data URL string or placeholder
      console.warn('Upload de foto para Supabase Storage falhou:', uploadError);
      photoUrl = recordData.photoBase64;
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('ponto-photos')
        .getPublicUrl(fileName);
      photoUrl = publicUrlData ? publicUrlData.publicUrl : recordData.photoBase64;
    }
  }

  // Find employee_id by matricula
  let employeeId = recordData.employee_id;
  if (!employeeId) {
    const { data: empData, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('matricula', String(recordData.matricula))
      .maybeSingle();

    if (empData) {
      employeeId = empData.id;
    }
  }

  // Save to time_records table
  const insertPayload = {
    employee_id: employeeId || null,
    record_type: recordData.record_type,
    record_timestamp: recordData.record_timestamp,
    photo_url: photoUrl,
    validation_hash: recordData.validation_hash
  };

  const { data, error } = await supabase
    .from('time_records')
    .insert([insertPayload])
    .select();

  if (error) {
    throw error;
  }

  return data[0];
}

export async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  try {
    const queue = await getOfflineQueue();
    if (!queue || queue.length === 0) return;

    console.log(`Sincronizando ${queue.length} registros offline...`);
    for (const item of queue) {
      try {
        await uploadPhotoAndSaveRecord(item);
        await removeOfflineRecord(item.id);
        console.log(`Item ${item.id} sincronizado com sucesso.`);
      } catch (err) {
        console.error(`Erro ao sincronizar item ${item.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Erro ao acessar fila offline:', err);
  }
}
