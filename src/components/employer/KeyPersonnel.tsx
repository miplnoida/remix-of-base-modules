
import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export function KeyPersonnel() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'keyPersonnel',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Personnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <FormLabel className="text-base font-medium mb-4 block">
            12. Listing of Partners, Senior Company Officers, Senior Officers of Other Bodies, Heads, and Senior Officials of Government Ministries or Departments, etc.
          </FormLabel>
          <p className="text-sm text-gray-600 mb-4">
            (NB: Other names may be written on a signed separate blank sheet.)
          </p>
          
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Person #{index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`keyPersonnel.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`keyPersonnel.${index}.address`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`keyPersonnel.${index}.position`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position/Post</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter position" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`keyPersonnel.${index}.telephoneNo`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telephone No.</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter telephone number" {...field} />
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
            onClick={() => append({ name: '', address: '', position: '', telephoneNo: '' })}
            className="mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Person
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
