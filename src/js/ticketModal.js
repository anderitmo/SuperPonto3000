export function renderTicketAndQR(data) {
  const modal = document.getElementById('modal-comprovante');
  const btnClose = document.getElementById('btn-close-modal');
  const btnPrint = document.getElementById('btn-print-ticket');

  document.getElementById('t-matricula').textContent = data.matricula;
  document.getElementById('t-nome').textContent = data.employeeName || 'Funcionário';
  document.getElementById('t-tipo').textContent = data.record_type;
  document.getElementById('t-timestamp').textContent = new Date(data.record_timestamp).toLocaleString('pt-BR');
  document.getElementById('t-hash').textContent = data.validation_hash;

  // Generate QR Code using QRious (loaded via CDN)
  if (window.QRious) {
    const qrData = `${data.matricula}|${data.record_timestamp}|${data.record_type}|${data.validation_hash}`;
    new window.QRious({
      element: document.getElementById('qr-canvas'),
      value: qrData,
      size: 140
    });
  }

  modal.showModal();

  btnClose.onclick = () => modal.close();
  btnPrint.onclick = () => {
    window.print();
  };
}
