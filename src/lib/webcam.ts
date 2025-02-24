export async function startWebcam(videoElement: HTMLVideoElement) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (err) {
    console.error("Error accessing webcam:", err);
    alert('เอ้ โบร๋ คุณไม่อนุญาตให้ผมใช้กล้อง แล้วผมจะตรวจยังไงอะโบร๋')
  }
}
