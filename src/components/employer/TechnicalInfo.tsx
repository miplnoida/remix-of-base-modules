
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TechnicalInfo() {
  const { control, watch } = useFormContext();
  const payrollOnComputer = watch('payrollOnComputer');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={control}
            name="payrollOnComputer"
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
                    18. Is your payroll on computer?
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          {payrollOnComputer && (
            <FormField
              control={control}
              name="computerMakeModel"
              render={({ field }) => (
                <FormItem className="ml-6">
                  <FormLabel>19. If "Yes" state: Make and Model No. of Computer</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter computer make and model" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={control}
            name="emailAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>20. E-mail address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
