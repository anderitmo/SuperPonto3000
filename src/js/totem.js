// Security Hash calculation helper using SubtleCrypto SHA-256
export async function generateHash(matricula, timestamp, salt = 'SuperPonto3000Salt') {
  const dataString = `${matricula}_${timestamp}_${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Camera Helper
export class CameraManager {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.stream = null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      this.video.srcObject = this.stream;
      return true;
    } catch (err) {
      console.warn('Câmera não acessível ou sem permissão:', err);
      return false;
    }
  }

  captureFrame() {
    if (!this.video || !this.video.videoWidth) {
      // Return dummy placeholder frame if webcam unavailable
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 300;
      dummyCanvas.height = 300;
      const ctx = dummyCanvas.getContext('2d');
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Foto Ponto', 100, 150);
      return dummyCanvas.toDataURL('image/jpeg', 0.8);
    }

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    return this.canvas.toDataURL('image/jpeg', 0.85);
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
