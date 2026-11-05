import { describe, expect, it } from "vitest";
import { toNotificationDTO } from "./notification-view";

describe("toNotificationDTO", () => {
  it("projects safe notification copy and an internal Note link", () => {
    const notification = toNotificationDTO({
      id: "notification-1",
      type: "REMINDER",
      payloadJson: {
        title: "A reminder",
        message: "Review the shared note.",
        noteId: "cmw2e8k3o000hdsq2dqyjxef4",
        externalUrl: "https://example.com",
      },
      readAt: null,
      createdAt: new Date("2026-11-04T12:00:00.000Z"),
    });

    expect(notification).toEqual({
      id: "notification-1",
      type: "REMINDER",
      title: "A reminder",
      message: "Review the shared note.",
      noteId: "cmw2e8k3o000hdsq2dqyjxef4",
      readAt: null,
      createdAt: "2026-11-04T12:00:00.000Z",
    });
  });

  it("falls back safely when the stored payload is not an object", () => {
    const notification = toNotificationDTO({
      id: "notification-2",
      type: "SHARE_REVOKED",
      payloadJson: "unexpected",
      readAt: null,
      createdAt: new Date("2026-11-04T12:00:00.000Z"),
    });

    expect(notification.title).toBe("Note access updated");
    expect(notification.message).toBeNull();
    expect(notification.noteId).toBeNull();
  });
});
