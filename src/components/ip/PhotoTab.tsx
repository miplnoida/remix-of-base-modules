
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Download, Trash2, Edit, Eye } from 'lucide-react';

interface PhotoFile {
  id: string;
  title: string;
  filename: string;
  type: 'photo' | 'signature';
  uploadedAt: Date;
}

export const PhotoTab = () => {
  const location = useLocation();
  const isViewMode = location.pathname.includes('/person/view/');
  
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Mock data for preview
  const previewFiles: PhotoFile[] = [
    {
      id: '1',
      title: 'Passport Photo',
      filename: 'passport_photo.jpg',
      type: 'photo',
      uploadedAt: new Date('2024-03-15')
    },
    {
      id: '2',
      title: 'Digital Signature',
      filename: 'signature.png',
      type: 'signature',
      uploadedAt: new Date('2024-03-15')
    },
    {
      id: '3',
      title: 'ID Card Photo',
      filename: 'id_card_photo.jpg',
      type: 'photo',
      uploadedAt: new Date('2024-03-20')
    }
  ];

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

  const handleViewFile = (file: PhotoFile) => {
    console.log(`Viewing file: ${file.filename}`);
    // Implement file viewing logic
  };

  const handleDownloadFile = (file: PhotoFile) => {
    console.log(`Downloading file: ${file.filename}`);
    // Implement file download logic
  };

  // File Display Component matching the image design
  const FileDisplayCard = ({ file }: { file: PhotoFile }) => (
    <Card className="w-full max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          {/* Camera icon in top left */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Camera className="h-5 w-5 text-gray-600" />
          </div>
          {/* File information */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {file.title}
            </h3>
            <p className="text-gray-500 text-xs truncate">
              {file.filename}
            </p>
          </div>
        </div>
        {/* Action buttons at bottom */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleViewFile(file)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleDownloadFile(file)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // View Mode - Display files in card layout
  if (isViewMode) {
    return (
      <div className="space-y-6">
        <Card style={{backgroundColor:"#F9FAFB"}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo & Signature Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 m-5" style={{backgroundColor:"#fff"}}>
            {previewFiles.length === 0 ? (
              <p className="text-gray-500 text-center py-20">
                <svg className='mx-auto' width="46" height="52" viewBox="0 0 46 52" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M22.4689 32.5216L22.5697 32.5242L22.6523 32.5139C23.0192 32.4648 24.4916 32.1652 24.5071 30.5945C24.5072 30.522 24.5106 30.4496 24.5175 30.3775C25.569 30.0516 26.5218 29.4667 27.2883 28.6765C28.0548 27.8863 28.6104 26.9162 28.9041 25.8552C29.1978 24.7942 29.2202 23.6764 28.9691 22.6046C28.7181 21.5327 28.2017 20.5411 27.4674 19.7209C26.7332 18.9006 25.8045 18.2781 24.7669 17.9104C23.7292 17.5427 22.6158 17.4417 21.5289 17.6167C20.442 17.7916 19.4165 18.2369 18.5466 18.9116C17.6767 19.5863 16.9904 20.4688 16.5505 21.478C16.4425 21.712 16.3822 21.9652 16.3732 22.2228C16.3643 22.4804 16.4068 22.7371 16.4983 22.9781C16.5898 23.219 16.7284 23.4393 16.9061 23.626C17.0838 23.8127 17.297 23.962 17.5331 24.0653C17.7692 24.1686 18.0236 24.2238 18.2813 24.2275C18.539 24.2313 18.7949 24.1836 19.0339 24.0872C19.273 23.9908 19.4904 23.8478 19.6735 23.6663C19.8565 23.4849 20.0015 23.2687 20.1 23.0306C20.3484 22.4649 20.7836 22.0018 21.3327 21.7188C21.8818 21.4357 22.5115 21.35 23.1163 21.4759C23.7211 21.6019 24.2643 21.9318 24.6548 22.4105C25.0453 22.8891 25.2595 23.4875 25.2615 24.1052C25.2615 25.3504 24.4141 26.3992 23.2646 26.7066C22.5645 26.8508 21.9322 27.2237 21.4673 27.7667C21.0024 28.3097 20.7314 28.9919 20.6968 29.7058C20.6373 30.1243 20.6322 30.5583 20.6322 30.5583V30.5867C20.6322 31.0832 20.8227 31.5607 21.1645 31.9207C21.5062 32.2807 21.9732 32.4958 22.4689 32.5216Z" fill="#D6D6D6"/>
<path d="M22.5693 37.5605C23.0832 37.5605 23.576 37.3564 23.9393 36.993C24.3027 36.6297 24.5068 36.1369 24.5068 35.623C24.5068 35.1092 24.3027 34.6164 23.9393 34.253C23.576 33.8897 23.0832 33.6855 22.5693 33.6855C22.0555 33.6855 21.5627 33.8897 21.1993 34.253C20.836 34.6164 20.6318 35.1092 20.6318 35.623C20.6318 36.1369 20.836 36.6297 21.1993 36.993C21.5627 37.3564 22.0555 37.5605 22.5693 37.5605Z" fill="#D6D6D6"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M45.373 17.7411C45.373 15.8578 44.6238 14.0521 43.2934 12.7191L33.4019 2.82761C32.0694 1.49659 30.2633 0.748673 28.3799 0.748047H12.4358C9.18136 0.748047 6.06026 2.04085 3.75905 4.34206C1.45784 6.64326 0.165039 9.76437 0.165039 13.0188V38.8519C0.165039 42.1063 1.45784 45.2274 3.75905 47.5286C6.06026 49.8298 9.18136 51.1226 12.4358 51.1226H33.1022C36.3566 51.1226 39.4777 49.8298 41.7789 47.5286C44.0801 45.2274 45.373 42.1063 45.373 38.8519V17.7411ZM28.5814 4.62818L28.3799 4.62301H12.4358C11.3329 4.62199 10.2407 4.83846 9.22164 5.26002C8.20256 5.68159 7.27661 6.29998 6.49679 7.0798C5.71697 7.85962 5.09858 8.78556 4.67702 9.80464C4.25545 10.8237 4.03898 11.9159 4.04 13.0188V38.8519C4.04 41.0786 4.92455 43.214 6.49906 44.7886C8.07357 46.3631 10.2091 47.2476 12.4358 47.2476H33.1022C35.3289 47.2476 37.4644 46.3631 39.0389 44.7886C40.6134 43.214 41.498 41.0786 41.498 38.8519V17.7411L41.4928 17.5396H35.6855C33.8023 17.5396 31.994 16.7904 30.661 15.46C29.3301 14.1264 28.5822 12.3195 28.5814 10.4355V4.62818ZM38.7571 13.6646L32.4564 7.3639V10.4355C32.4578 11.2915 32.7984 12.112 33.4037 12.7173C34.009 13.3226 34.8295 13.6632 35.6855 13.6646H38.7571Z" fill="#D6D6D6"/>
</svg>
<br/>
                No files uploaded yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewFiles.map((file) => (
                  <FileDisplayCard key={file.id} file={file} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Mode - Original functionality
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Section */}
        <Card style={{backgroundColor:"#F9FAFB"}}>
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
        <Card style={{backgroundColor:"#F9FAFB"}}>
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
      <Card style={{backgroundColor:"#F9FAFB"}}>
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
