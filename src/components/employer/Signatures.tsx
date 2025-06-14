
import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Info } from 'lucide-react';

export function Signatures() {
  const { control } = useFormContext();
  const { fields: signatureFields, append: appendSignature, remove: removeSignature } = useFieldArray({
    control,
    name: 'signatures',
  });
  const { fields: nameFields, append: appendName, remove: removeName } = useFieldArray({
    control,
    name: 'printNames',
  });
  const { fields: positionFields, append: appendPosition, remove: removePosition } = useFieldArray({
    control,
    name: 'positions',
  });
  const { fields: dateFields, append: appendDate, remove: removeDate } = useFieldArray({
    control,
    name: 'dates',
  });

  const addSignatureSet = () => {
    appendSignature('');
    appendName('');
    appendPosition('');
    appendDate('');
  };

  const removeSignatureSet = (index: number) => {
    removeSignature(index);
    removeName(index);
    removePosition(index);
    removeDate(index);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signatures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Additional signatures, etc for 21-24 may be submitted on a blank sheet marked "Additional particulars Nos. 21-24".
            (See additional notes on the back of this form)
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {signatureFields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Signature Set #{index + 1}</h4>
                {signatureFields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSignatureSet(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name={`signatures.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>21. Signature(s)</FormLabel>
                      <FormControl>
                        <Input placeholder="Digital signature or 'Will sign physically'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`printNames.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>22. Print Name(s)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter printed name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`positions.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>23. Position/Post</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position or post" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`dates.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>24. Date(s)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addSignatureSet}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Signature Set
        </Button>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 italic">
            Form RS (revised 2018) (2000)
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Notes:</h4>
            <p className="text-xs text-gray-600">
              1. Every employer must, as soon as he/she engages any employed person, ensure that such employed person 
              completes an application form (R3) for registration with the Social Security Office unless the employed person 
              produces evidence that he/she is already registered.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
