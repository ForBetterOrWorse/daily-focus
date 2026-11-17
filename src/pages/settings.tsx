import { useEffect, useState, type ReactNode } from 'react';
import { Card } from '@/components/base/card/card';
import { Container } from '@/components/base/container/container';
import { Field } from '@/components/base/field/field';
import { Link } from '@/components/base/link/link';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Select } from '@/components/base/select/select';
import { TextInput } from '@/components/base/text-input/text-input';
import { AlertSettings } from '@/components/features/alert-settings';
import { BackupSettings } from '@/components/features/backup-settings';
import { MAX_SKIPS_PER_MONTH } from '@/domain/settings';
import type { Settings as AppSettings } from '@/domain/types';
import { useSeoMeta } from '@/hooks/use-seo-meta';
import { useTheme, type ThemePreference } from '@/hooks/use-theme';
import { useAppData, useDispatch } from '@/store/use-app-data';
import { seoConfig } from '@/utils/seo.config';
import styles from './settings.module.css';

const SECTIONS = [
  { id: 'settings-days', label: 'Days and streak' },
  { id: 'settings-alerts', label: 'Alerts' },
  { id: 'settings-appearance', label: 'Appearance' },
  { id: 'settings-backup', label: 'Backup' },
];

const DAY_START_OPTIONS = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM'].map(
  (label, hour) => ({ value: String(hour), label })
);

const WEEK_START_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
];

const THEME_OPTIONS = [
  { value: 'system', label: 'Match this device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function selectSettings(data: { settings: AppSettings }): AppSettings {
  return data.settings;
}

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

/** The id and `tabIndex` sit on the heading, so a section link moves focus to its card. */
function Section({ id, title, description, action, children }: SectionProps) {
  return (
    <Card
      as="section"
      className={styles.section}
      title={title}
      description={description}
      action={action}
      headingProps={{ id, tabIndex: -1 }}
    >
      {children}
    </Card>
  );
}

function SkipsPerMonthField({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const parsed = Number(draft);
  const outOfRange =
    draft !== '' && (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SKIPS_PER_MONTH);
  return (
    <Field
      label="Skips per month"
      hint={`0 to ${MAX_SKIPS_PER_MONTH}`}
      error={outOfRange ? `Use a whole number, 0 to ${MAX_SKIPS_PER_MONTH}` : undefined}
    >
      <TextInput
        type="number"
        min={0}
        max={MAX_SKIPS_PER_MONTH}
        step={1}
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          const next = event.currentTarget.value;
          const nextNumber = Number(next);
          setDraft(next);
          if (
            next !== '' &&
            Number.isInteger(nextNumber) &&
            nextNumber >= 0 &&
            nextNumber <= MAX_SKIPS_PER_MONTH
          ) {
            onCommit(nextNumber);
          }
        }}
        onBlur={() => setDraft(String(value))}
      />
    </Field>
  );
}

export function Settings() {
  useSeoMeta({ title: `Settings | ${seoConfig.siteTitle}`, path: '/settings' });
  const settings = useAppData(selectSettings);
  const dispatch = useDispatch();
  const { preference, setPreference } = useTheme();
  const [currentSection, setCurrentSection] = useState(() => {
    const id = window.location.hash.slice(1);
    return SECTIONS.some((section) => section.id === id) ? id : SECTIONS[0].id;
  });

  useEffect(() => {
    const updateFromScroll = () => {
      const base = window.innerHeight * 0.25;
      const headings = SECTIONS.map((section) => document.getElementById(section.id));
      const last = document.documentElement.scrollHeight - window.innerHeight;
      // Short sections near the page end never reach the base line, so the line moves down
      // the viewport as the page runs out of scroll. Each heading then activates in order.
      const remaining = Math.max(0, last - window.scrollY);
      const ramp = Math.min(window.innerHeight, last);
      const progress = ramp > 0 ? Math.min(1, Math.max(0, 1 - remaining / ramp)) : 0;
      const threshold = base + (window.innerHeight - base) * progress;
      const current = headings.reduce((id, heading) => {
        return heading && heading.getBoundingClientRect().top <= threshold ? heading.id : id;
      }, SECTIONS[0].id);
      setCurrentSection(current);
    };
    const updateFromHash = () => {
      const id = window.location.hash.slice(1);
      if (SECTIONS.some((section) => section.id === id)) {
        setCurrentSection(id);
      } else {
        updateFromScroll();
      }
    };
    window.addEventListener('hashchange', updateFromHash);
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    if (!window.location.hash && window.scrollY > 0) {
      updateFromScroll();
    }
    return () => {
      window.removeEventListener('hashchange', updateFromHash);
      window.removeEventListener('scroll', updateFromScroll);
    };
  }, []);

  return (
    <Container as="section" size="xl" className={styles.main}>
      <h1 className={styles.title}>Settings</h1>

      <nav aria-label="Settings sections" className={styles.toc}>
        <ul className={styles['toc-list']}>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <Link
                variant="unadorned"
                className={styles['toc-link']}
                href={`/settings#${section.id}`}
                aria-current={currentSection === section.id ? 'location' : undefined}
                onClick={(event) => {
                  if (
                    !event.defaultPrevented &&
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    setCurrentSection(section.id);
                  }
                }}
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.sections}>
        <Section id="settings-days" title="Days and streak">
          <div className={styles.fields}>
            <Field label="Day starts at">
              <Select
                options={DAY_START_OPTIONS}
                value={String(settings.dayStartHour)}
                onValueChange={(value) => {
                  dispatch({ type: 'updateSettings', patch: { dayStartHour: Number(value) } });
                }}
              />
            </Field>
            <Field label="Week starts on">
              <Select
                options={WEEK_START_OPTIONS}
                value={settings.weekStart}
                onValueChange={(value) => {
                  dispatch({
                    type: 'updateSettings',
                    patch: { weekStart: value === 'sunday' ? 'sunday' : 'monday' },
                  });
                }}
              />
            </Field>
            <SkipsPerMonthField
              value={settings.skipsPerMonth}
              onCommit={(skipsPerMonth) => {
                dispatch({ type: 'updateSettings', patch: { skipsPerMonth } });
              }}
            />
          </div>
        </Section>

        <Section id="settings-alerts" title="Alerts">
          <AlertSettings />
        </Section>

        <Section id="settings-appearance" title="Appearance">
          <RadioGroup
            legend="Theme"
            options={THEME_OPTIONS}
            value={preference}
            onChange={(value) => {
              setPreference(value as ThemePreference);
            }}
          />
        </Section>

        <Section
          id="settings-backup"
          title="Backup"
          description="Your data lives only in this browser. Back it up to prevent data loss."
        >
          <BackupSettings />
        </Section>
      </div>
    </Container>
  );
}
