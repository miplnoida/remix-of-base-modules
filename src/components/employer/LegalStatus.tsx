
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LegalStatus() {
  const { control, watch } = useFormContext();
  const selectedStatus = watch('legalStatus');

  const legalStatusOptions = [
    'Singular Person',
    'Partnership', 
    'Company',
    'Government Ministry/Department',
    'Club',
    'Trade Union',
    'Committee',
    'Association',
    'State Functionary',
    'International Organisation',
    'Statutory Board',
    'Other Legal Entity'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal Status of Employer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <FormLabel className="text-base font-medium">11. a) Legal Status of Employer *</FormLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {legalStatusOptions.map((option) => (
              <FormField
                key={option}
                control={control}
                name="legalStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === option}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange(option);
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {option}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormMessage />
        </div>

        {selectedStatus === 'Other Legal Entity' && (
          <FormField
            control={control}
            name="otherLegalEntity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Other Legal Entity</FormLabel>
                <FormControl>
                  <Input placeholder="Please specify" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={control}
          name="documentationSubmitted"
          render={({ field }) => (
            <FormItem>
              <FormLabel>11. b) Documentation submitted in support of #9 (a) above</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="List documentation (e.g., appropriate ID, Certificate of incorporation, other documents, etc.)" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
