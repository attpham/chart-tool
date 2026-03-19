export function exportChartAsImage(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg',
  title: string = 'chart',
): void {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  let dataUrl: string;
  if (format === 'jpeg') {
    // JPEG does not support transparency — composite onto a white background first.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for JPEG export');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    dataUrl = tempCanvas.toDataURL(mimeType, 0.95);
  } else {
    dataUrl = canvas.toDataURL(mimeType);
  }

  const link = document.createElement('a');
  link.download = `${title}.${extension}`;
  link.href = dataUrl;
  link.click();
}
