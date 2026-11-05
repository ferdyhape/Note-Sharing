export type ShareRole = "EDITOR" | "VIEWER";

export type ShareDTO = {
  id: string;
  userId: string;
  role: ShareRole;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

export type ShareOwnerDTO = { name: string | null; email: string };
