import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/*
 * Date + time as two controls instead of <input type="datetime-local">.
 *
 * Desktop Safari renders datetime-local as a calendar popover plus tiny hour/minute/AM-PM
 * segments you have to type into; until every segment is filled the field is invalid. People
 * pick a date, never find the time, and get "invalid" until they stumble on the segments.
 * A native date input (which has a calendar everywhere) plus a <select> of times gives every
 * browser an obvious picker for both halves.
 */

const TIME_STEP_MINUTES = 15;

const pad = (n: number) => String(n).padStart(2, '0');

const ALL_TIMES = Array.from({ length: (24 * 60) / TIME_STEP_MINUTES }, (_, i) => {
  const minutes = i * TIME_STEP_MINUTES;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});

/** "YYYY-MM-DDTHH:mm" → its date and time halves. */
function splitValue(value: string | null) {
  if (!value) return { date: '', time: '' };
  const [date = '', time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

interface DateTimeFieldProps {
  /** Local date-time as "YYYY-MM-DDTHH:mm", or null when unset. */
  value: string | null;
  /** Called with the combined value once both halves are set, and null while either is empty. */
  onChange: (value: string | null) => void;
  /** Earliest allowed moment, "YYYY-MM-DDTHH:mm": earlier dates and times are disabled. */
  min?: string;
  required?: boolean;
  /** Used for the controls' accessible names, e.g. "Start" → "Start date", "Start time". */
  label: string;
  className?: string;
}

export function DateTimeField({ value, onChange, min, required, label, className = '' }: DateTimeFieldProps) {
  const [parts, setParts] = useState(() => splitValue(value));

  /*
   * Follow values set from outside (an event loaded for editing), but never overwrite what the
   * user is typing: skip values that match what's already on screen, and don't clear on null,
   * since the parent holds null while only one half is filled.
   */
  useEffect(() => {
    if (!value) return;
    setParts((prev) => (value === `${prev.date}T${prev.time}` ? prev : splitValue(value)));
  }, [value]);

  const update = (next: { date: string; time: string }) => {
    setParts(next);
    /*
     * Typing a date by hand passes through partial years ("0002", "0020", "0202" on the way
     * to "2026"), each a valid date to the browser. Sending those up made the form reformat
     * and write back a broken date, which wiped or changed what the user typed. Only report
     * a date once its year is plausible.
     */
    const dateComplete = /^\d{4}-\d{2}-\d{2}$/.test(next.date) && Number(next.date.slice(0, 4)) >= 1900;
    onChange(dateComplete && next.time ? `${next.date}T${next.time}` : null);
  };

  const minDate = min?.slice(0, 10);
  const minTime = min && parts.date === minDate ? min.slice(11, 16) : null;

  // Keep an off-grid time (e.g. 14:37 on an older event) selectable rather than dropping it.
  const times = useMemo(
    () => (parts.time && !ALL_TIMES.includes(parts.time) ? [...ALL_TIMES, parts.time].sort() : ALL_TIMES),
    [parts.time]
  );

  return (
    <div className="flex gap-2">
      <input
        type="date"
        aria-label={`${label} date`}
        value={parts.date}
        min={minDate}
        required={required}
        onChange={(e) => update({ ...parts, date: e.target.value })}
        className={`${className} min-w-0 flex-1`}
      />
      <div className="relative w-[128px] shrink-0">
        <select
          aria-label={`${label} time`}
          value={parts.time}
          required={required}
          onChange={(e) => update({ ...parts, time: e.target.value })}
          className={`${className} appearance-none pr-8 ${parts.time ? '' : 'text-gray-400'}`}
        >
          <option value="" disabled>
            Time
          </option>
          {times.map((time) => (
            <option key={time} value={time} disabled={minTime !== null && time <= minTime}>
              {formatTime(time)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </div>
  );
}
