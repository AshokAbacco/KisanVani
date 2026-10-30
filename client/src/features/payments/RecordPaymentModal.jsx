import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { Input, Select } from '../../components/forms/Field';
import { formatINR, modeLabel } from '../../utils/format';
import { rules } from '../../validators';
import { useToast } from '../../context/ToastContext';
import { applyFieldErrors } from '../../utils/errors';
import { useI18n } from '../../i18n';

/** Records a cash / UPI / bank payment, capped at the amount due (the server enforces the same cap). */
const RecordPaymentModal = ({ open, onClose, title, due, payeeName, onSubmit, modes = ['UPI', 'CASH', 'BANK_TRANSFER'] }) => {
  const { t } = useI18n();
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
      toast.success(t('recordPayment.recordedToast', '', { amount: formatINR(v.amount) }));
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t('orderDetail.recordPayment')}
      description={payeeName ? t('recordPayment.toBalance', '', { name: payeeName, amount: formatINR(due) }) : t('recordPayment.balance', '', { amount: formatINR(due) })}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {t('orderDetail.recordPayment')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input
          label={t('common.amount')}
          suffix="₹"
          inputMode="decimal"
          error={errors.amount?.message}
          {...register('amount', { ...rules.money(t('common.amount')), validate: (v) => (rules.money(t('common.amount')).validate(v) === true ? Number(v) <= Number(due) + 0.001 || t('recordPayment.cannotExceed', '', { amount: formatINR(due) }) : rules.money(t('common.amount')).validate(v)) })}
        />
        <Select
          label={t('payments.mode')}
          options={modes.map((m) => ({ value: m, label: m === 'UPI' ? t('pos.upiQr') : modeLabel(m) }))}
          {...register('mode')}
        />
        <Input label={t('common.reference')} hint={t('recordPayment.referenceHint')} {...register('reference')} />
      </form>
    </Modal>
  );
};

export default RecordPaymentModal;
