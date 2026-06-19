import { Event } from '@/types/event';
import EventCard from './EventCard';

interface Props {
  title: string;
  events: Event[];
  emptyMessage?: string;
  showDateBadge?: boolean;
}

export default function EventSection({ title, events, emptyMessage, showDateBadge = true }: Props) {
  if (events.length === 0 && !emptyMessage) return null;

  return (
    <section>
      <h2 className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-3">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-stone-400 italic">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map(event => (
            <EventCard key={event.id} event={event} showDateBadge={showDateBadge} />
          ))}
        </div>
      )}
    </section>
  );
}
