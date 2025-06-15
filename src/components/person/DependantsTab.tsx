
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users } from 'lucide-react';

interface DependantsTabProps {
  dependants: any[];
  setDependants: (dependants: any[]) => void;
}

export const DependantsTab = ({ dependants, setDependants }: DependantsTabProps) => {
  const addDependant = () => {
    setDependants([...dependants, { socialSecurityNo: '', name: '', dateOfBirth: '', gender: '', relationship: '' }]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Dependants
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Social Security No.</TableHead>
              <TableHead>Name of Dependant</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Relationship to Insured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dependants.map((dependant, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={dependant.socialSecurityNo}
                    onChange={(e) => {
                      const newDependants = [...dependants];
                      newDependants[index].socialSecurityNo = e.target.value;
                      setDependants(newDependants);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={dependant.name}
                    onChange={(e) => {
                      const newDependants = [...dependants];
                      newDependants[index].name = e.target.value;
                      setDependants(newDependants);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={dependant.dateOfBirth}
                    onChange={(e) => {
                      const newDependants = [...dependants];
                      newDependants[index].dateOfBirth = e.target.value;
                      setDependants(newDependants);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={dependant.gender}
                    onValueChange={(value) => {
                      const newDependants = [...dependants];
                      newDependants[index].gender = value;
                      setDependants(newDependants);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={dependant.relationship}
                    onChange={(e) => {
                      const newDependants = [...dependants];
                      newDependants[index].relationship = e.target.value;
                      setDependants(newDependants);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button type="button" onClick={addDependant} className="mt-2">
          Add Dependant
        </Button>
      </CardContent>
    </Card>
  );
};
