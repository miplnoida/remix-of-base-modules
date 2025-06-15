
import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, PenTool } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoSignatureTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

export const PhotoSignatureTab = ({ formData, handleInputChange }: PhotoSignatureTabProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCapturing(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        handleInputChange('photo', photoData);
        
        // Stop camera
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setIsCapturing(false);
        
        toast({
          title: "Photo Captured",
          description: "Photo has been successfully captured and saved.",
        });
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
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
    const canvas = signatureCanvasRef.current;
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
    if (isDrawing && signatureCanvasRef.current) {
      setIsDrawing(false);
      const signatureData = signatureCanvasRef.current.toDataURL('image/png');
      handleInputChange('signature', signatureData);
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        handleInputChange('signature', null);
      }
    }
  };

  React.useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.lineCap = 'round';
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Photo Capture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photo Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            {!isCapturing && !formData.photo && (
              <Button onClick={startCamera} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            )}
            
            {isCapturing && (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-w-md border rounded-lg"
                />
                <div className="flex gap-2">
                  <Button onClick={capturePhoto}>Capture Photo</Button>
                  <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                </div>
              </div>
            )}
            
            {formData.photo && (
              <div className="space-y-4">
                <img 
                  src={formData.photo} 
                  alt="Captured" 
                  className="w-full max-w-md border rounded-lg"
                />
                <Button variant="outline" onClick={() => {
                  handleInputChange('photo', null);
                  setIsCapturing(false);
                }}>
                  Retake Photo
                </Button>
              </div>
            )}
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </CardContent>
      </Card>

      {/* Signature Capture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Digital Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 w-full max-w-md">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={200}
                className="w-full cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearSignature}>
                Clear Signature
              </Button>
            </div>
            {formData.signature && (
              <p className="text-sm text-green-600">✓ Signature captured successfully</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
