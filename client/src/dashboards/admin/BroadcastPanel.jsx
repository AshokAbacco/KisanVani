import { useForm } from 'react-hook-form';
import { Send } from 'lucide-react';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/Field';
import { notificationsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { ROLES } from '../../constants/roles';

/** Sends an in-app notification to every active user, or to one role. */
const BroadcastPanel = () => {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: '' } });
  const submit = async (v) => {
    try {
      const r = await notificationsApi.broadcast({ role: v.role || null, title: v.title, message: v.message, link: v.link || null });
      toast.success(`Sent to ${r.sent} user${r.sent === 1 ? '' : 's'}`);
      reset({ role: v.role, title: '', message: '', link: '' });
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Section title="Send a notification" description="Delivered instantly to signed-in users and kept in their notification list." className="mb-6">
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 md:grid-cols-[200px_1fr]" noValidate>
        <Select label="Send to" options={[{ value: '', label: 'Everyone' }, ...Object.values(ROLES).map((r) => ({ value: r.key, label: `${r.label}s` }))]} {...register('role')} />
        <Input label="Title" required error={errors.title?.message} {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Too short' } })} />
        <Textarea className="md:col-span-2" label="Message" required rows={3} error={errors.message?.message} {...register('message', { required: 'Message is required', minLength: { value: 3, message: 'Too short' } })} />
        <Input className="md:col-span-2" label="Link (optional)" placeholder="/farmer/listings" hint="An in-app path users go to when they tap it" {...register('link')} />
        <div className="md:col-span-2">
          <Button type="submit" icon={Send} loading={isSubmitting}>
            Send notification
          </Button>
        </div>
      </form>
    </Section>
  );
};

export default BroadcastPanel;
