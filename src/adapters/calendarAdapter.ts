import { legalConfig } from "@/config/legalConfig";

export interface Hearing {
  hearingId: string;
  caseId: string;
  type: string;
  venue: string;
  startAt: string;
  endAt: string;
  panel?: string[];
  attendees?: any[];
  outcome?: string;
}

export const calendarAdapter = {
  async icsForHearing(hearing: Hearing): Promise<{ icsUrl: string }> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate ICS content
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SSB Legal//EN
BEGIN:VEVENT
UID:hearing-${hearing.hearingId}@ssb.legal
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${new Date(hearing.startAt).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(hearing.endAt).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:Hearing - ${hearing.type}
LOCATION:${hearing.venue}
DESCRIPTION:Case: ${hearing.caseId}\\nType: ${hearing.type}
END:VEVENT
END:VCALENDAR`;
      
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      
      return { icsUrl: url };
    }
    
    const response = await fetch(`/api/calendar/hearing/${hearing.hearingId}/ics`);
    if (!response.ok) throw new Error('Failed to generate ICS');
    const blob = await response.blob();
    return { icsUrl: URL.createObjectURL(blob) };
  }
};
