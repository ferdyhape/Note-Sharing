export type ReminderRecipientDTO = {
  id: string;
  userId: string;
  enabled: boolean;
};

export type ReminderDTO = {
  id: string;
  noteId: string;
  triggerMode: "FIXED" | "SCHEDULE_RELATIVE";
  scheduleId: string | null;
  offsetSeconds: number | null;
  fixedTriggerAt: string | null;
  enabled: boolean;
  createdAt: string;
  recipients: ReminderRecipientDTO[];
};

export type ReminderRecipientOption = {
  userId: string;
  name: string | null;
  role: "EDITOR" | "VIEWER";
};
