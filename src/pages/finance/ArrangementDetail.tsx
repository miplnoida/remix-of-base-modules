import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PaymentArrangementDetailView } from '@/components/payment/PaymentArrangementDetailView';

export default function ArrangementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div className="p-6">Arrangement ID not provided</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/finance/arrangements')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Payment Arrangement Details</h1>
      </div>

      <PaymentArrangementDetailView arrangementId={id} />
    </div>
  );
}
