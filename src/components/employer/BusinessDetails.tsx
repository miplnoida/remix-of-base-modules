
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BusinessDetails() {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="activityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>6. Type of Activity or Product *</FormLabel>
              <FormControl>
                <Input placeholder="Specify type of activity or product" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="activityDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide additional details about your business activity" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="dateTradeCommenced"
            render={({ field }) => (
              <FormItem>
                <FormLabel>7. Date trade, business or works commenced *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="dateEmploymentCommenced"
            render={({ field }) => (
              <FormItem>
                <FormLabel>8. Date employment commenced *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="dateWagesFirstPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>9. Date wages were first paid *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">10. Approximate Number of employed persons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="employedPersonsMale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Male</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="employedPersonsFemale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Female</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
