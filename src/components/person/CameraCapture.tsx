
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (photoData: string) => void;
}

export const CameraCapture = ({ onCapture }: CameraCaptureProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

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
        setCapturedPhoto(photoData);
        
        // Stop camera
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setIsCapturing(false);
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

  const savePhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      setCapturedPhoto(null);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {!isCapturing && !capturedPhoto && (
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
          <div className="flex gap-2 justify-center">
            <Button onClick={capturePhoto}>Capture Photo</Button>
            <Button variant="outline" onClick={stopCamera}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {capturedPhoto && (
        <div className="space-y-4">
          <img 
            src={capturedPhoto} 
            alt="Captured" 
            className="w-full max-w-md border rounded-lg"
          />
          <div className="flex gap-2 justify-center">
            <Button onClick={savePhoto}>Save Photo</Button>
            <Button variant="outline" onClick={retakePhoto}>Retake</Button>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
