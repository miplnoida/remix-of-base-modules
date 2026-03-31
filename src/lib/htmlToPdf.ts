/**
 * Utility to convert HTML string to PDF base64 using jspdf + html2canvas.
 * Renders the HTML in a hidden iframe, captures it, and produces a PDF.
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function htmlToPdfBase64(htmlString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a hidden iframe to render the HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '1200px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    };

    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          cleanup();
          return reject(new Error('Cannot access iframe document'));
        }

        // Wait for images and fonts to load
        await new Promise(r => setTimeout(r, 500));

        const body = iframeDoc.body;

        // Capture the rendered HTML as a canvas
        const canvas = await html2canvas(body, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: 780,
          windowWidth: 800,
        });

        // Calculate PDF dimensions (A4)
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        const pdf = new jsPDF('p', 'mm', 'a4');

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Additional pages if content overflows
        while (heightLeft > 0) {
          position = -(pageHeight * (Math.ceil(imgHeight / pageHeight) - Math.ceil(heightLeft / pageHeight)));
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Get base64 without the data URI prefix
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        cleanup();
        resolve(pdfBase64);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error('Failed to load iframe'));
    };

    // Write the HTML content to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlString);
      iframeDoc.close();
    } else {
      cleanup();
      reject(new Error('Cannot access iframe document'));
    }
  });
}
