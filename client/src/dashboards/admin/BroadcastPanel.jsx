import { useForm } from 'react-hook-form';
import { Send } from 'lucide-react';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/Field';
import { notificationsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { ROLES } from '../../constants/roles';
import { useI18n } from '../../i18n';
import { plural } from '../../utils/format';

/** Sends an in-app notification to every active user, or to one role. */
const BroadcastPanel = () => {
  const { t } = useI18n();
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
      toast.success(t('broadcast.sent', '', { users: plural(r.sent, 'user') }));
      reset({ role: v.role, title: '', message: '', link: '' });
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Section title={t('broadcast.title')} description={t('broadcast.intro')} className="mb-6">
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 md:grid-cols-[200px_1fr]" noValidate>
        <Select label={t('broadcast.sendTo')} options={[{ value: '', label: t('broadcast.everyone') }, ...Object.values(ROLES).map((r) => ({ value: r.key, label: t(`broadcast.audience.${r.key}`) }))]} {...register('role')} />
        <Input label={t('broadcast.titleLabel')} required error={errors.title?.message} {...register('title', { required: t('validation.required', '', { label: t('broadcast.titleLabel') }), minLength: { value: 3, message: t('validation.tooShort') } })} />
        <Textarea className="md:col-span-2" label={t('broadcast.message')} required rows={3} error={errors.message?.message} {...register('message', { required: t('validation.required', '', { label: t('broadcast.message') }), minLength: { value: 3, message: t('validation.tooShort') } })} />
        <Input className="md:col-span-2" label={t('broadcast.link')} placeholder="/farmer/listings" hint={t('broadcast.linkHint')} {...register('link')} />
        <div className="md:col-span-2">
          <Button type="submit" icon={Send} loading={isSubmitting}>
            {t('broadcast.send')}
          </Button>
        </div>
      </form>
    </Section>
  );
};

export default BroadcastPanel;
