import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/api/errors";

/**
 * Standard API envelope, per PRD §30. Every /api/v1/* route returns this shape so the
 * Android client can consume responses without ever branching on route-specific formats.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface PaginationMeta {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export function ok<T>(data: T, pagination?: PaginationMeta, status = 200) {
  const body: ApiSuccess<T> = { success: true, data, ...(pagination ? { pagination } : {}) };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T) {
  return ok(data, undefined, 201);
}

export function fail(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() },
      },
      { status: 400 }
    );
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 }
  );
}

/** Wraps a route handler so any thrown error (AppError, ZodError, or unexpected) becomes a clean response. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return fail(error);
    }
  };
}
