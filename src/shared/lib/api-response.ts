import { NextResponse } from "next/server";

// The one response shape every API route uses (CODING_STANDARDS.md §5).
export function apiData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
