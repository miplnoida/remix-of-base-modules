
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Download, Trash2, Edit } from 'lucide-react';

export const PhotoTab = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignature(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = (type: 'photo' | 'signature') => {
    // This would integrate with camera/signature capture functionality
    console.log(`Capturing ${type}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {photo ? (
                <div className="space-y-4">
                  <img 
                    src={photo} 
                    alt="Person photo" 
                    className="max-w-full max-h-64 mx-auto rounded"
                  />
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Replace
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setPhoto(null)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">Upload passport-style photo</p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="mx-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCapture('photo')}
                      className="mx-auto"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Photo Requirements */}
            <div className="bg-blue-50 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">Photo Requirements:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Passport-style photo (2x2 inches)</li>
                <li>• Clear, high-resolution image</li>
                <li>• Plain background (white or light blue)</li>
                <li>• Face should occupy 70-80% of the image</li>
                <li>• No sunglasses or headwear (unless religious)</li>
                <li>• Recent photo (taken within last 6 months)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {signature ? (
                <div className="space-y-4">
                  <img 
                    src={signature} 
                    alt="Person signature" 
                    className="max-w-full max-h-32 mx-auto rounded bg-white border"
                  />
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Replace
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setSignature(null)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Edit className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">Upload or capture signature</p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => document.getElementById('signature-upload')?.click()}
                      className="mx-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Signature
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCapture('signature')}
                      className="mx-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Capture Signature
                    </Button>
                  </div>
                  <input
                    id="signature-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Signature Requirements */}
            <div className="bg-green-50 p-4 rounded">
              <h4 className="font-semibold text-green-900 mb-2">Signature Requirements:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Clear, legible signature</li>
                <li>• Black or blue ink (if scanned)</li>
                <li>• Consistent with official documents</li>
                <li>• No background distractions</li>
                <li>• Actual signature of the person</li>
                <li>• High contrast for digital processing</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Status */}
      <Card>
        <CardHeader>
          <CardTitle>Document Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-blue-500" />
                <span>Photo</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                photo 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {photo ? 'Uploaded' : 'Required'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Edit className="h-5 w-5 text-purple-500" />
                <span>Signature</span>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                signature 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {signature ? 'Uploaded' : 'Required'}
              </span>
            </div>
          </div>

          {photo && signature && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 font-medium">✓ All required documents have been uploaded</p>
              <p className="text-sm text-green-600">Ready for ID card generation</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
