import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from '../common/Button';
import { Textarea } from '../forms/Field';

/**
 * Confirmation for consequential actions. With `requireReason`, the action stays disabled until a reason
 * (min 3 chars) is entered and it is passed to onConfirm(reason).
 */
const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', requireReason = false, reasonLabel = 'Reason', busy = false }) => {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  const blocked = requireReason && reason.trim().length < 3;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Keep as is
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => onConfirm(reason.trim())} disabled={blocked} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-[15px] text-soil-600">{message}</p>}
      {requireReason && <Textarea className="mt-4" label={reasonLabel} required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="This is recorded in the history" />}
    </Modal>
  );
};

export default ConfirmDialog;
