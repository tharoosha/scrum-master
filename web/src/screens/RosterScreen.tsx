import { useEffect, useState } from 'react';
import type { NewTeamMember, Settings, TeamMember } from '@shared/types.js';
import { api } from '../api/client.js';
import { FormRow, NumberField, RoleTag, roleRowClass, useAsyncAction, useToast } from '../ui/kit.js';

const EMPTY: NewTeamMember = {
  name: '',
  role: 'Dev',
  locationGroup: 'SL',
  capacityPercent: 90,
  additionalDevBuffer: false,
};

export function RosterScreen() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<NewTeamMember>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const run = useAsyncAction();
  const { show } = useToast();

  const reload = () =>
    Promise.all([api.listMembers(), api.getSettings()]).then(([m, s]) => {
      setMembers(m);
      setSettings(s);
    });

  useEffect(() => {
    void reload();
  }, []);

  const validate = (f: NewTeamMember): string[] => {
    const e: string[] = [];
    if (!f.name.trim()) e.push('Name is required');
    if (f.capacityPercent !== undefined && (f.capacityPercent < 1 || f.capacityPercent > 100))
      e.push('Capacity % must be 1–100');
    return e;
  };

  const submit = async () => {
    const e = validate(form);
    setErrors(e);
    if (e.length) return;
    await run(async () => {
      await api.createMember(form);
      setForm(EMPTY);
      await reload();
    }, 'Member added');
  };

  const patchMember = (id: string, patch: Partial<TeamMember>) =>
    run(async () => {
      await api.updateMember(id, patch);
      await reload();
    });

  return (
    <div>
      <h2>Team &amp; Settings</h2>

      <div className="panel">
        <h3>Team members</h3>
        <table data-testid="roster-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Location</th>
              <th className="num">Capacity %</th>
              <th>Add&apos;l Dev Buffer</th>
              <th>Scrum Master</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} data-testid={`member-row-${m.name}`} className={roleRowClass(m.role)}>
                <td>{m.name}</td>
                <td>
                  <RoleTag role={m.role} />
                </td>
                <td>{m.locationGroup}</td>
                <td className="num">
                  <NumberField
                    value={m.capacityPercent}
                    min={1}
                    onCommit={(v) => patchMember(m.id, { capacityPercent: v })}
                    testId={`capacity-${m.name}`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={m.additionalDevBuffer}
                    onChange={(e) => patchMember(m.id, { additionalDevBuffer: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    name="sm"
                    checked={m.isScrumMaster}
                    data-testid={`sm-${m.name}`}
                    onChange={() =>
                      run(async () => {
                        await api.setScrumMaster(m.id);
                        await reload();
                      })
                    }
                  />
                </td>
                <td>
                  {m.active ? (
                    <button type="button"
                      className="ghost"
                      onClick={() =>
                        run(async () => {
                          await api.deactivateMember(m.id);
                          await reload();
                        }, 'Member deactivated')
                      }
                    >
                      Deactivate
                    </button>
                  ) : (
                    <span className="muted">inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4>Add member</h4>
        <FormRow label="Name">
          <input
            data-testid="new-member-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormRow>
        <FormRow label="Role">
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as 'Dev' | 'QA' })}
          >
            <option>Dev</option>
            <option>QA</option>
          </select>
        </FormRow>
        <FormRow label="Location">
          <select
            value={form.locationGroup}
            onChange={(e) => setForm({ ...form, locationGroup: e.target.value as 'SL' | 'MY' })}
          >
            <option value="SL">Sri Lanka</option>
            <option value="MY">Malaysia</option>
          </select>
        </FormRow>
        <FormRow label="Capacity %">
          <input
            type="number"
            value={form.capacityPercent}
            onChange={(e) => setForm({ ...form, capacityPercent: Number(e.target.value) })}
          />
        </FormRow>
        {errors.map((e) => (
          <div key={e} className="field-error">
            {e}
          </div>
        ))}
        <button type="button" className="primary" data-testid="add-member" onClick={submit}>
          Add member
        </button>
      </div>

      {settings && (
        <SettingsPanel
          settings={settings}
          onSave={(patch) =>
            run(async () => {
              setSettings(await api.updateSettings(patch));
              show('Settings saved');
            })
          }
        />
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => void;
}) {
  return (
    <div className="panel">
      <h3>Settings</h3>
      <FormRow label="Allocation tolerance (h)">
        <NumberField
          value={settings.defaultToleranceHours}
          onCommit={(v) => onSave({ defaultToleranceHours: v })}
          testId="tolerance-setting"
        />
      </FormRow>
      <FormRow label="SM Activity (h)">
        <NumberField value={settings.smActivityHours} onCommit={(v) => onSave({ smActivityHours: v })} />
      </FormRow>
      <FormRow label="Default MAUI Review (h)">
        <NumberField
          value={settings.defaultMauiReviewHours}
          onCommit={(v) => onSave({ defaultMauiReviewHours: v })}
        />
      </FormRow>
      <FormRow label="Additional Dev Buffer (%)">
        <NumberField
          value={settings.additionalDevBufferPercent}
          onCommit={(v) => onSave({ additionalDevBufferPercent: v })}
        />
      </FormRow>
      <p className="muted">
        Fixed constants — Working day 7h; Daily Scrum 0.25h/day; Planning 1h, Grooming 2h, Retro
        0.5h, Demo 1.5h. Buffers of gross hours: Dev 16.5% (11% Capex + 5.5% Opex), QA 19.5% (13%
        Capex + 6.5% Opex). Common Automation {settings.commonAutomation.capexHours}h Capex +{' '}
        {settings.commonAutomation.opexHours}h Opex.
      </p>
    </div>
  );
}
