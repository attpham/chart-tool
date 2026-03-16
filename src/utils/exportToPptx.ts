import pptxgen from 'pptxgenjs';

export async function exportToPptx(
  canvas: HTMLCanvasElement | null,
  title: string
): Promise<void> {
  if (!canvas) {
    throw new Error('Chart canvas not found');
  }

  const imageData = canvas.toDataURL('image/png');

  const pptx = new pptxgen();
  const slide = pptx.addSlide();

  slide.addText(title, {
    x: 0.5,
    y: 0.25,
    w: 9,
    h: 0.75,
    fontSize: 24,
    bold: true,
    color: '363636',
    align: 'center',
  });

  slide.addImage({
    data: imageData,
    x: 0.5,
    y: 1.25,
    w: 9,
    h: 5.5,
  });

  await pptx.writeFile({ fileName: `${title || 'chart'}.pptx` });
}
