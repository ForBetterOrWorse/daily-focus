import { useState } from 'react';
import { Container } from '@/components/base/container/container';
import { ActivityGrid } from '@/components/features/activity-grid';
import { DayBreakdown } from '@/components/features/day-breakdown';
import { WeekStats } from '@/components/features/week-stats';
import { useSeoMeta } from '@/hooks/use-seo-meta';
import type { DayKey } from '@/domain/types';
import { seoConfig } from '@/utils/seo.config';
import styles from './stats.module.css';

export function Stats() {
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);
  useSeoMeta({ title: `Stats | ${seoConfig.siteTitle}`, path: '/stats' });

  return (
    <Container as="section" size="xl" className={styles.page}>
      <WeekStats />
      <div className={styles.activity}>
        <ActivityGrid selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <DayBreakdown selectedDay={selectedDay} />
      </div>
    </Container>
  );
}
