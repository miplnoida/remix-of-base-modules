
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDCardPreview } from '@/components/person/IDCardPreview';
import { Search, User, CreditCard } from 'lucide-react';

const IDCardGeneration = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // Mock data for demonstration
  const mockPersons = [
    {
      id: '1',
      registrationNo: 'SSB001234',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1985-05-15',
      nationalId: 'ID123456789',
      address: '123 Main Street, Basseterre, St. Kitts',
      email: 'john.doe@email.com',
      mobileNumber: '+1-869-555-0123',
      status: 'Active',
      photo: null,
      signature: null
    },
    {
      id: '2',
      registrationNo: 'SSB001235',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1990-08-22',
      nationalId: 'ID987654321',
      address: '456 Ocean View, Charlestown, Nevis',
      email: 'jane.smith@email.com',
      mobileNumber: '+1-869-555-0456',
      status: 'Active',
      photo: null,
      signature: null
    }
  ];

  const filteredPersons = mockPersons.filter(person => 
    person.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.nationalId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ID Card Generation</h1>
        <p className="text-gray-600 mt-2">Generate and print Social Security ID cards</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search and Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Insured Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search by Registration No, Name, or National ID</Label>
              <Input
                id="search"
                placeholder="Enter search criteria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {searchQuery && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-gray-700">Search Results:</h3>
                {filteredPersons.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredPersons.map((person) => (
                      <div
                        key={person.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPerson?.id === person.id
                            ? 'border-government-500 bg-government-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPerson(person)}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">
                              {person.firstName} {person.lastName}
                            </p>
                            <p className="text-xs text-gray-600">
                              Reg: {person.registrationNo} | ID: {person.nationalId}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No persons found matching your search.</p>
                )}
              </div>
            )}

            {selectedPerson && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Selected Person:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedPerson.firstName} {selectedPerson.lastName}</p>
                  <p><strong>Registration No:</strong> {selectedPerson.registrationNo}</p>
                  <p><strong>National ID:</strong> {selectedPerson.nationalId}</p>
                  <p><strong>Date of Birth:</strong> {new Date(selectedPerson.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ID Card Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              ID Card Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPerson ? (
              <IDCardPreview person={selectedPerson} onPrint={handlePrint} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a person to preview their ID card</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Generation Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Generate by Department
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Generate by Date Range
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Generate Renewals
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IDCardGeneration;
