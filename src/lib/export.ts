import { jsPDF } from 'jspdf';

export const exportToTxt = (text: string, filename: string) => {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToPdfText = (text: string, filename: string) => {
  const doc = new jsPDF();
  
  // Basic markdown stripping for cleaner PDF text
  const cleanText = text
    .replace(/#{1,6}\s?/g, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic/bullets
    .replace(/`/g, ''); // Remove code ticks

  const splitText = doc.splitTextToSize(cleanText, 180);
  let y = 15;
  
  for (let i = 0; i < splitText.length; i++) {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    doc.text(splitText[i], 15, y);
    y += 7;
  }
  
  doc.save(`${filename}.pdf`);
};
