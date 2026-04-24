export interface ICSEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  date: string;        // yyyy-MM-dd
  endDate?: string;    // yyyy-MM-dd
  time?: string;       // HH:mm
  allDay: boolean;
  organizer?: string;
  categories?: string[];
}

// RFC 5545 line unfolding
function unfold(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// value is ONLY the date/datetime string (after the colon)
function parseDtValue(value: string): { date: string; time?: string; allDay: boolean } {
  const clean = value.replace(/Z$/, '').trim();
  // All-day: just 8 digits
  if (/^\d{8}$/.test(clean)) {
    return {
      date: `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`,
      allDay: true,
    };
  }
  // DateTime: 20260420T140000
  const d = clean.slice(0, 8);
  const t = clean.slice(9, 15);
  return {
    date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
    time: `${t.slice(0, 2)}:${t.slice(2, 4)}`,
    allDay: false,
  };
}

function extractOrganizer(fullKeyValue: string): string | undefined {
  const cnMatch = fullKeyValue.match(/CN=([^:;]+)/i);
  if (cnMatch) return cnMatch[1].replace(/^"(.*)"$/, '$1').trim();
  const mailMatch = fullKeyValue.match(/mailto:(.+)/i);
  if (mailMatch) return mailMatch[1].trim();
  return undefined;
}

function unescape(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

export function parseICS(raw: string): ICSEvent[] {
  const text = unfold(raw);
  const lines = text.split(/\r?\n/);

  const events: ICSEvent[] = [];
  let inEvent = false;
  // Store: baseKey (e.g. 'DTSTART') → { fullKey, value }
  const props: Record<string, { fullKey: string; value: string }[]> = {};

  const get = (base: string) => props[base]?.[0];

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      for (const k of Object.keys(props)) delete props[k];
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;

      const dtStartEntry = get('DTSTART');
      if (!dtStartEntry) continue;

      const start = parseDtValue(dtStartEntry.value);
      const dtEndEntry = get('DTEND');
      const end = dtEndEntry ? parseDtValue(dtEndEntry.value) : undefined;

      const orgEntry = get('ORGANIZER');
      const organizer = orgEntry
        ? extractOrganizer(`${orgEntry.fullKey}:${orgEntry.value}`)
        : undefined;

      const catEntry = get('CATEGORIES');
      const categories = catEntry
        ? catEntry.value.split(',').map(c => c.trim()).filter(Boolean)
        : undefined;

      const summary = unescape(get('SUMMARY')?.value ?? '(sem título)');
      const description = get('DESCRIPTION')?.value ? unescape(get('DESCRIPTION')!.value) : undefined;
      const location = get('LOCATION')?.value ? unescape(get('LOCATION')!.value) : undefined;
      const uid = get('UID')?.value ?? Math.random().toString(36).slice(2);

      events.push({
        uid,
        summary,
        description,
        location,
        date: start.date,
        endDate: end && end.date !== start.date ? end.date : undefined,
        time: start.time,
        allDay: start.allDay,
        organizer,
        categories,
      });
      continue;
    }
    if (!inEvent || !line) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const fullKey = line.slice(0, colonIdx);
    const value   = line.slice(colonIdx + 1);
    // Base key = everything before first ';' or ':'
    const baseKey = fullKey.split(';')[0];
    if (!props[baseKey]) props[baseKey] = [];
    props[baseKey].push({ fullKey, value });
  }

  return events;
}

// ─── Smart company detection ──────────────────────────────────────────────────

export function detectCompanyFromTitle(title: string): string | null {
  const t = title.trim();

  // [CompanyName] Rest of title
  const bracket = t.match(/^\[([^\]]+)\]/);
  if (bracket) return bracket[1].trim();

  // ALL CAPS prefix before dash: "ACME - Reunião"
  const caps = t.match(/^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s&.]{2,}?)\s*[-–|]/);
  if (caps && caps[1].trim().length >= 3) return caps[1].trim();

  // "com X" / "with X" / "para X" / "c/ X"
  const com = t.match(/\b(?:com|with|para|for|c\/)\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-Za-záéíóúâêîôûãõç\s&.]+?)(?:\s*[-–|,]|$)/i);
  if (com) return com[1].trim();

  return null;
}

export function groupEventsByCompany(events: ICSEvent[]): Map<string, ICSEvent[]> {
  const map = new Map<string, ICSEvent[]>();
  for (const ev of events) {
    const key = detectCompanyFromTitle(ev.summary) ?? ev.organizer ?? 'Sem empresa';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}
