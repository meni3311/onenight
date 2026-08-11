import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dressApi } from '../features/dress-detail/api/dress.api';
import { useDressDetail } from '../features/dress-detail/hooks/useDressDetail';
import { useDressBooking } from '../features/dress-detail/hooks/useDressBooking';
import { useAvailability } from '../features/dress-detail/hooks/useAvailability';
import type {
  DateRange,
  UnavailableDateRange,
} from '../features/dress-detail/types/dress.types';
import { DressGallery } from '../features/dress-detail/components/DressGallery';
import {
  DressIdentity,
  type AvailabilityStatus,
} from '../features/dress-detail/components/DressIdentity';
import { SizeSelector } from '../features/dress-detail/components/SizeSelector';
import { DatePicker } from '../features/dress-detail/components/DatePicker';
import { DressAccordion } from '../features/dress-detail/components/DressAccordion';
import { ReviewList } from '../features/dress-detail/components/ReviewList';
import { SimilarDresses } from '../features/dress-detail/components/SimilarDresses';
import { StickyBookingBar } from '../features/dress-detail/components/StickyBookingBar';
import styles from '../features/dress-detail/dress-detail.module.css';

interface DressDetailPageProps {
  dressId: string;
  onBack: () => void;
  onOpenDress: (id: string) => void;
  onBook?: (selection: { size: string; dates: DateRange }) => void;
}

const FIVE_MINUTES = 1000 * 60 * 5;

export default function DressDetailPage({
  dressId,
  onBack,
  onOpenDress,
  onBook,
}: DressDetailPageProps): JSX.Element {
  const dressQuery = useDressDetail(dressId);
  const booking = useDressBooking();
  const [isFavorite, setIsFavorite] = useState(false);

  const unavailableQuery = useQuery<UnavailableDateRange[], Error>({
    queryKey: ['unavailable-dates', dressId],
    queryFn: () => dressApi.getUnavailableDates(dressId),
    staleTime: FIVE_MINUTES,
    enabled: dressId.length > 0,
  });

  // Only a fully-formed range drives the availability check.
  const completeDates = useMemo<DateRange | null>(() => {
    const d = booking.selectedDates;
    return d && d.startDate && d.endDate ? d : null;
  }, [booking.selectedDates]);

  const availabilityQuery = useAvailability(
    dressId,
    booking.selectedSize,
    completeDates,
  );

  const availabilityStatus = useMemo<AvailabilityStatus>(() => {
    if (!booking.selectedSize || !completeDates) return 'idle';
    if (availabilityQuery.isFetching) return 'checking';
    if (availabilityQuery.data?.available) return 'available';
    if (availabilityQuery.data) return 'unavailable';
    return 'checking';
  }, [
    booking.selectedSize,
    completeDates,
    availabilityQuery.isFetching,
    availabilityQuery.data,
  ]);

  const canBook = availabilityStatus === 'available';

  const handleBook = (): void => {
    if (!canBook || !booking.selectedSize || !completeDates) return;
    onBook?.({ size: booking.selectedSize, dates: completeDates });
  };

  if (dressQuery.isLoading) {
    return (
      <div className={styles.page} dir="rtl">
        <div className={styles.scroll}>
          <div className={`${styles.skeleton} ${styles.skelGallery}`} />
          <section className={styles.section}>
            <div className={`${styles.skeleton} ${styles.skelLine}`} />
            <div className={`${styles.skeleton} ${styles.skelLine}`} />
            <div className={`${styles.skeleton} ${styles.skelLine}`} />
          </section>
          <section className={styles.section}>
            <div className={styles.row}>
              <div className={`${styles.skeleton} ${styles.skelChip}`} />
              <div className={`${styles.skeleton} ${styles.skelChip}`} />
              <div className={`${styles.skeleton} ${styles.skelChip}`} />
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (dressQuery.isError || !dressQuery.data) {
    return (
      <div className={styles.page} dir="rtl">
        <div className={styles.centered}>
          <div>
            <p>לא הצלחנו לטעון את השמלה.</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => dressQuery.refetch()}
            >
              נסי שוב
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dress = dressQuery.data;

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.scroll}>
        <DressGallery
          images={dress.images}
          dressName={dress.name}
          isFavorite={isFavorite}
          onToggleFavorite={() => setIsFavorite((f) => !f)}
          onBack={onBack}
        />

        <DressIdentity
          name={dress.name}
          source={dress.source}
          price={dress.price}
          availability={availabilityStatus}
        />

        <SizeSelector
          sizes={dress.sizes}
          selectedSize={booking.selectedSize}
          onSelect={booking.setSelectedSize}
        />

        <DatePicker
          unavailableDates={unavailableQuery.data ?? []}
          value={booking.selectedDates}
          onChange={booking.setSelectedDates}
          isLoading={unavailableQuery.isLoading}
        />

        <DressAccordion dress={dress} />

        <ReviewList reviews={dress.reviews} />

        <SimilarDresses dressId={dressId} onOpenDress={onOpenDress} />

        <div className={styles.ctaSpacer} />
      </div>

      <StickyBookingBar
        price={dress.price}
        canBook={canBook}
        onBook={handleBook}
      />
    </div>
  );
}
