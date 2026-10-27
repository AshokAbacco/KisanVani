import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { Input, Select } from '../../components/forms/Field';
import { formatINR } from '../../utils/format';
import { rules } from '../../validators';
import { useToast } from '../../context/ToastContext';
import { applyFieldErrors } from '../../utils/errors';

/** Records a cash / UPI / bank payment, capped at the amount due (the server enforces the same cap). */
const RecordPaymentModal = ({ open, onClose, title = 'Record payment', due, payeeName, onSubmit, modes = ['UPI', 'CASH', 'BANK_TRANSFER'] }) => {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();
  useEffect(() => {
    if (open) reset({ amount: due ? String(Number(due).toFixed(2)) : '', mode: modes[0], reference: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, due]);

  const submit = async (v) => {
    try {
      await onSubmit({ amount: v.amount, mode: v.mode, reference: v.reference || null });
      toast.success(`Payment of ${formatINR(v.amount)} recorded`);
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={payeeName ? `To ${payeeName}. Balance due ${formatINR(due)}.` : `Balance due ${formatINR(due)}.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            Record payment
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input
          label="Amount"
          suffix="₹"
          inputMode="decimal"
          error={errors.amount?.message}
          {...register('amount', { ...rules.money('Amount'), validate: (v) => (rules.money('Amount').validate(v) === true ? (Number(v) <= Number(due) + 0.001 || `Cannot exceed ${formatINR(due)}`) : rules.money('Amount').validate(v)) })}
        />
        <Select
          label="Mode"
          options={modes.map((m) => ({ value: m, label: { UPI: 'UPI / QR', CASH: 'Cash', BANK_TRANSFER: 'Bank transfer' }[m] }))}
          {...register('mode')}
        />
        <Input label="Reference" hint="UPI transaction id, cheque or NEFT reference" {...register('reference')} />
      </form>
    </Modal>
  );
};

export default RecordPaymentModal;
