
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PenTool, RotateCcw } from 'lucide-react';

interface SignatureCaptureProps {
  onCapture: (signatureData: string) => void;
}

export const SignatureCapture = ({ onCapture }: SignatureCaptureProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const context = canvas.getContext('2d');
      if (context) {
        context.beginPath();
        context.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const context = canvas.getContext('2d');
      if (context) {
        context.lineTo(x, y);
        context.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
      }
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signatureData = canvas.toDataURL('image/png');
      onCapture(signatureData);
    }
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        
        // Set canvas background to white
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-4 bg-card">
        <p className="text-sm text-muted-foreground mb-2 text-center">Sign in the area below</p>
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="cursor-crosshair border border-border rounded bg-background"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={clearSignature}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button onClick={saveSignature} disabled={!hasSignature}>
          <PenTool className="h-4 w-4 mr-2" />
          Save Signature
        </Button>
      </div>
    </div>
  );
};
