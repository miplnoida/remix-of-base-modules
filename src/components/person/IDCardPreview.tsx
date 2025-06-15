
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer } from 'lucide-react';

interface IDCardPreviewProps {
  person: any;
  onPrint: () => void;
}

export const IDCardPreview = ({ person, onPrint }: IDCardPreviewProps) => {
  const generateQRCode = (data: string) => {
    // Simple QR code placeholder - in a real app, you'd use a QR code library
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white"/>
        <rect x="10" y="10" width="80" height="80" fill="black"/>
        <rect x="20" y="20" width="60" height="60" fill="white"/>
        <text x="50" y="55" text-anchor="middle" font-size="8" fill="black">QR</text>
      </svg>
    `)}`;
  };

  return (
    <div className="space-y-4">
      {/* ID Card Preview */}
      <div className="flex justify-center">
        <Card className="w-96 h-60 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <CardContent className="p-4 h-full flex">
            {/* Left side - Photo and QR */}
            <div className="flex flex-col justify-between items-center w-1/3">
              <div className="w-20 h-24 bg-white rounded border overflow-hidden">
                {person.photo ? (
                  <img src={person.photo} alt="ID Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                    No Photo
                  </div>
                )}
              </div>
              <div className="w-16 h-16 bg-white rounded">
                <img 
                  src={generateQRCode(person.registrationNo)} 
                  alt="QR Code" 
                  className="w-full h-full"
                />
              </div>
            </div>
            
            {/* Right side - Information */}
            <div className="flex-1 ml-4 flex flex-col justify-between text-sm">
              <div>
                <h3 className="font-bold text-lg mb-1">SOCIAL SECURITY BOARD</h3>
                <p className="text-xs opacity-90 mb-3">St. Kitts & Nevis</p>
                
                <div className="space-y-1">
                  <p className="font-semibold text-base">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-xs">REG: {person.registrationNo}</p>
                  <p className="text-xs">DOB: {new Date(person.dateOfBirth).toLocaleDateString()}</p>
                  <p className="text-xs">ID: {person.nationalId}</p>
                </div>
              </div>
              
              {/* Signature area */}
              <div className="border-t border-white/30 pt-2">
                <div className="h-8 bg-white/10 rounded flex items-center justify-center">
                  {person.signature ? (
                    <img 
                      src={person.signature} 
                      alt="Signature" 
                      className="h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs opacity-70">Signature</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Card Back Preview */}
      <div className="flex justify-center">
        <Card className="w-96 h-60 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800">
          <CardContent className="p-4 h-full">
            <div className="text-center space-y-2">
              <h4 className="font-bold text-sm">SOCIAL SECURITY BOARD</h4>
              <p className="text-xs">St. Kitts & Nevis</p>
              
              <div className="text-xs space-y-1 mt-4">
                <p><strong>Address:</strong> {person.address}</p>
                <p><strong>Email:</strong> {person.email}</p>
                <p><strong>Mobile:</strong> {person.mobileNumber}</p>
                <p><strong>Status:</strong> {person.status}</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-400 text-xs">
                <p>This card is the property of the Social Security Board</p>
                <p>If found, please return to nearest SSB office</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Print Button */}
      <div className="flex justify-center">
        <Button onClick={onPrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print ID Card
        </Button>
      </div>
    </div>
  );
};
