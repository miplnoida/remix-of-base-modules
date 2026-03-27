import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import type { PaymentDetailData } from '@/hooks/usePaymentEntry';

interface MOPDetailModalProps {
  open: boolean;
  onClose: () => void;
  detailRow: PaymentDetailData | null;
  onSave: (updates: Partial<PaymentDetailData>) => void;
}

export function MOPDetailModal({ open, onClose, detailRow, onSave }: MOPDetailModalProps) {
  const [mopNumber, setMopNumber] = useState('');
  const [chequeDate, setChequeDate] = useState<Date | undefined>();
  const [bankCode, setBankCode] = useState('');
  const [bankLodgement, setBankLodgement] = useState('');
  const [creditCardCode, setCreditCardCode] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [transitNumber, setTransitNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (detailRow) {
      setMopNumber(detailRow.mop_number || '');
      setChequeDate(detailRow.cheque_date ? new Date(detailRow.cheque_date) : undefined);
      setBankCode(detailRow.bank_code || '');
      setBankLodgement(detailRow.bank_lodgement_code || '');
      setCreditCardCode(detailRow.credit_card_code || '');
      setExpirationDate(detailRow.expiration_date || '');
      setAccountNumber(detailRow.mop_account_number || '');
      setTransitNumber(detailRow.mop_transit_number || '');
      setNotes(detailRow.mop_notes1 || '');
    }
  }, [detailRow]);

  if (!detailRow) return null;

  const isCheque = detailRow.mop_code === 'CHQ';
  const isCard = detailRow.mop_code === 'CRD' || detailRow.mop_code === 'DRD';
  const isEFT = detailRow.mop_code === 'EFT';

  const handleSave = () => {
    onSave({
      mop_number: mopNumber || null,
      cheque_date: chequeDate?.toISOString() || null,
      bank_code: bankCode || null,
      bank_lodgement_code: bankLodgement || null,
      credit_card_code: creditCardCode || null,
      expiration_date: expirationDate || null,
      mop_account_number: accountNumber || null,
      mop_transit_number: transitNumber || null,
      mop_notes1: notes || null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Method of Payment Details</DialogTitle>
          <DialogDescription>
            MOP: {detailRow.mop_code} — Line #{detailRow.payment_sequence_no}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {(isCheque || isEFT) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isCheque ? 'Cheque Number' : 'Reference Number'}</Label>
                  <Input value={mopNumber} onChange={e => setMopNumber(e.target.value)} />
                </div>
                {isCheque && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cheque Date</Label>
                    <DatePicker date={chequeDate} onDateChange={setChequeDate} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Code</Label>
                  <Input value={bankCode} onChange={e => setBankCode(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lodgement Code</Label>
                  <Input value={bankLodgement} onChange={e => setBankLodgement(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {isCard && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Card Code</Label>
                  <Input value={creditCardCode} onChange={e => setCreditCardCode(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiration</Label>
                  <Input value={expirationDate} onChange={e => setExpirationDate(e.target.value)} placeholder="MM/YY" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Transaction Number</Label>
                <Input value={mopNumber} onChange={e => setMopNumber(e.target.value)} />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Number</Label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transit Number</Label>
              <Input value={transitNumber} onChange={e => setTransitNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save MOP Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
