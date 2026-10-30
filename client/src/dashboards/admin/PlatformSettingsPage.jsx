import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import useAsync from '../../hooks/useAsync';
import { settingsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { useI18n } from '../../i18n';

const ROLES_EDITABLE = ['SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'DRIVER'];
/* Group titles come from platformSettings.groups.<id>. */
const GROUPS = [
  ['platform', ['platform.name', 'platform.supportEmail', 'platform.supportPhone']],
  ['accounts', ['auth.approvalRequiredRoles']],
  ['billing', ['billing.maxDiscountPercent', 'billing.weighingScale']],
  ['orders', ['orders.platformFeePercent']],
  ['tracking', ['tracking.locationIntervalSec', 'tracking.staleAfterSec', 'map.tileUrl', 'map.attribution']],
];
/** Setting keys contain dots, which the translator reads as nesting — so look them up with underscores. */
const descKey = (key) => `platformSettings.desc.${key.replace(/\./g, '_')}`;

/** Renders an editor suited to each setting's value type. */
const SettingEditor = ({ setting, onSave }) => {
  const { t } = useI18n();
  const [value, setValue] = useState(setting.value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(setting.value), [setting.value]);
  const changed = JSON.stringify(value) !== JSON.stringify(setting.value);

  let control;
  if (setting.key === 'auth.approvalRequiredRoles') {
    control = (
      <div className="flex flex-wrap gap-3">
        {ROLES_EDITABLE.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-slateblue-600" checked={value.includes(r)} onChange={(e) => setValue(e.target.checked ? [...value, r] : value.filter((x) => x !== r))} />
            {t(`roleNames.${r}`)}
          </label>
        ))}
      </div>
    );
  } else if (setting.key === 'billing.weighingScale') {
    control = (
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={value.enabled} onChange={(e) => setValue({ ...value, enabled: e.target.checked })} /> {t('platformSettings.allowScale')}
        </label>
        <label className="flex items-center gap-2">
          {t('platformSettings.baudRate')}
          <select className="input h-9 w-28 py-1" value={value.baudRate} onChange={(e) => setValue({ ...value, baudRate: Number(e.target.value) })}>
            {[1200, 2400, 4800, 9600, 19200, 38400].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  } else if (typeof setting.defaultValue === 'number') {
    control = <input className="input num w-40" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))} />;
  } else {
    control = <input className="input" value={value} onChange={(e) => setValue(e.target.value)} />;
  }

  return (
    <div className="grid gap-2 py-4 md:grid-cols-[1fr_1.4fr_auto] md:items-center">
      <div>
        <p className="font-medium">{t(descKey(setting.key), setting.description)}</p>
        <p className="text-xs text-soil-400">
          {setting.key}
          {setting.updatedBy ? ` — ${t('platformSettings.changedBy', '', { name: setting.updatedBy, at: formatDateTime(setting.updatedAt) })}` : ''}
        </p>
      </div>
      <div>{control}</div>
      <Button
        size="sm"
        disabled={!changed}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await onSave(setting.key, value);
          setBusy(false);
        }}
      >
        {t('common.save')}
      </Button>
    </div>
  );
};

const PlatformSettingsPage = () => {
  const { t } = useI18n();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => settingsApi.list(), []);
  const save = async (key, value) => {
    try {
      await settingsApi.update(key, value);
      toast.success(t('platformSettings.saved'));
      reload();
    } catch (e) {
      toast.error(e);
    }
  };
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const byKey = Object.fromEntries(data.map((s) => [s.key, s]));
  return (
    <>
      <PageHeader title={t('dnav.tabs.platformSettings')} description={t('platformSettings.intro')} />
      <div className="space-y-6">
        {GROUPS.map(([group, keys]) => (
          <Section key={group} title={t(`platformSettings.groups.${group}`)} bodyClass="divide-y divide-soil-100 px-5">
            {keys.filter((k) => byKey[k]).map((k) => (
              <SettingEditor key={k} setting={byKey[k]} onSave={save} />
            ))}
          </Section>
        ))}
      </div>
    </>
  );
};

export default PlatformSettingsPage;
