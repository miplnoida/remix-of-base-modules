
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BusinessHistory() {
  const { control, watch } = useFormContext();
  const isAcquiredBusiness = watch('isAcquiredBusiness');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={control}
            name="isAcquiredBusiness"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    13. Is this business an Enterprise which was acquired from someone?
                  </FormLabel>
                  <p className="text-sm text-gray-600">
                    (If "Yes" complete numbers 14-16)
                  </p>
                </div>
              </FormItem>
            )}
          />

          {isAcquiredBusiness && (
            <div className="space-y-4 border-l-4 border-blue-200 pl-4 ml-6">
              <FormField
                control={control}
                name="previousBusinessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>14. Name of previous Business or Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter previous business/owner name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="previousOwnerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>15. Address of previous Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter previous owner's address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="acquisitionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>16. Date of Acquisition</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
