import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Baby, 
  Shield, 
  Flower, 
  Calendar, 
  Users, 
  DollarSign,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';

const benefitTypes = [
  {
    id: 'sickness',
    title: 'Sickness Benefit',
    description: 'Weekly payments when unable to work due to illness or injury (non-work related)',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    eligibility: '8 weeks of contributions in last 12 months',
    amount: '65% of average weekly wage (max $500)',
    duration: 'Up to 26 weeks per year',
    requirements: ['Medical certificate', 'Last day worked', 'Expected return date']
  },
  {
    id: 'maternity',
    title: 'Maternity Benefit',
    description: 'Weekly payments for mothers before and after childbirth',
    icon: Baby,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    eligibility: '20 weeks of contributions',
    amount: '65% of average weekly wage (max $500)',
    duration: '13 weeks (6 before, 7 after delivery)',
    requirements: ['Medical proof of pregnancy', 'Expected delivery date', 'Confinement certificate']
  },
  {
    id: 'employment-injury',
    title: 'Employment Injury Benefits',
    description: 'Compensation for work-related injuries, disabilities, or medical expenses',
    icon: Shield,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    eligibility: '1 week of contributions',
    amount: '75% of average weekly wage (varies by type)',
    duration: 'Varies by injury type and severity',
    requirements: ['Incident report', 'Medical certificates', 'Employer verification'],
    subTypes: ['Temporary Injury', 'Permanent Disablement', 'Death Benefits', 'Medical Expenses']
  },
  {
    id: 'funeral-grant',
    title: 'Funeral Grant',
    description: 'Lump sum payment to help with funeral expenses',
    icon: Flower,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    eligibility: 'Deceased must have 26 weeks of contributions',
    amount: '$2,000 (fixed amount)',
    duration: 'One-time payment',
    requirements: ['Death certificate', 'Funeral invoice', 'Proof of relationship']
  },
  {
    id: 'age-pension',
    title: 'Age Pension',
    description: 'Monthly pension for retirement (age 62+)',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    eligibility: 'Age 62+ and 500+ weeks of contributions',
    amount: '30% of average monthly wage (max $1,200)',
    duration: 'Lifetime monthly payments',
    requirements: ['Proof of age', 'Contribution history', 'Residence confirmation']
  },
  {
    id: 'age-grant',
    title: 'Age Grant',
    description: 'One-time payment for those not qualifying for Age Pension',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    eligibility: 'Age 62+ and 50-499 weeks of contributions',
    amount: '$5,000 (fixed amount)',
    duration: 'One-time payment',
    requirements: ['Proof of age', 'Contribution history']
  },
  {
    id: 'invalidity',
    title: 'Invalidity Benefit',
    description: 'Monthly pension for permanent disability',
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    eligibility: '150 weeks of contributions and medical board certification',
    amount: 'Varies based on degree of incapacity',
    duration: 'Monthly payments while incapacitated',
    requirements: ['Medical board certificate', 'Doctor reports', 'Disability assessment']
  },
  {
    id: 'survivors',
    title: 'Survivors Benefits',
    description: 'Benefits for surviving spouses and children',
    icon: Heart,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    eligibility: 'Deceased had 150+ weeks or was receiving pension',
    amount: 'Percentage of deceased pension/wage',
    duration: 'Ongoing (subject to conditions)',
    requirements: ['Death certificate', 'Marriage/birth certificates', 'Dependency proof'],
    subTypes: ['Survivors Pension', 'Survivors Grant', 'Orphan Benefits']
  },
  {
    id: 'assistance',
    title: 'Non-Contributory Pension',
    description: 'Assistance for elderly persons without sufficient contributions',
    icon: Users,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    eligibility: 'Age 62+, resident of St. Kitts & Nevis, means tested',
    amount: 'Fixed monthly amount',
    duration: 'Monthly payments',
    requirements: ['Proof of income', 'Proof of residence', 'Unemployment declaration']
  }
];

export const ApplyForBenefits: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apply for Benefits</h1>
          <p className="text-muted-foreground">Choose the benefit type you would like to apply for</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Benefits Catalog
        </Badge>
      </div>

      {/* Important Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Important Information</p>
              <p className="text-sm text-blue-700 mt-1">
                Please ensure you have all required documents ready before starting your application. 
                Applications can be saved as drafts and completed later. Processing times vary by benefit type.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {benefitTypes.map((benefit) => {
          const IconComponent = benefit.icon;
          return (
            <Card key={benefit.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${benefit.bgColor}`}>
                      <IconComponent className={`h-6 w-6 ${benefit.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{benefit.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {benefit.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Benefit Details */}
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Eligibility</p>
                    <p>{benefit.eligibility}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Benefit Amount</p>
                    <p>{benefit.amount}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Duration</p>
                    <p>{benefit.duration}</p>
                  </div>
                </div>

                {/* Sub-types (if any) */}
                {benefit.subTypes && (
                  <div>
                    <p className="font-medium text-muted-foreground text-sm mb-2">Types Available</p>
                    <div className="flex flex-wrap gap-1">
                      {benefit.subTypes.map((subType) => (
                        <Badge key={subType} variant="secondary" className="text-xs">
                          {subType}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                <div>
                  <p className="font-medium text-muted-foreground text-sm mb-2">Required Documents</p>
                  <ul className="text-sm space-y-1">
                    {benefit.requirements.map((req, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button asChild className="flex-1">
                    <Link to={`/newbenefit/apply/${benefit.id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Apply Now
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/newbenefit/eligibility-check/${benefit.id}`}>
                      <Clock className="h-4 w-4 mr-2" />
                      Check Eligibility
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Get assistance with your benefit application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-medium">Application Guide</p>
              <p className="text-sm text-muted-foreground">Step-by-step instructions</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium">Processing Times</p>
              <p className="text-sm text-muted-foreground">Estimated processing periods</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="font-medium">Contact Support</p>
              <p className="text-sm text-muted-foreground">Speak with a representative</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};