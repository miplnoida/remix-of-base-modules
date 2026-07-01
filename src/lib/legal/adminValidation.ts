/**
 * Shared validation helpers for all Legal Admin forms.
 *
 * Provides reusable zod schemas + a `mapSupabaseError()` translator so that
 * scattered admin screens (routing, teams, courts, fees, waivers, sla, etc.)
 * can enforce the same field limits and surface the same friendly messages
 * for backend errors like unique_violation / value-too-long / out-of-range.
 */

import { z } from "zod";

/** Smallint range used by e.g. lg_sla_rule.priority (int2). */
export const INT16_MIN = -32768;
export const INT16_MAX = 32767;

/** Common column-length caps that mirror the DB (character varying(64)). */
export const LEN = {
  code: 64,
  name: 255,
  description: 1000,
  notes: 2000,
  shortText: 100,
} as const;

const placeholderValues = new Set(["", "-", "—", "__none__", "none", "NONE", null, undefined]);

export const codeSchema = (max = LEN.code) =>
  z.string({ required_error: "Code is required" })
    .trim()
    .min(1, "Code is required")
    .max(max, `Must be ${max} characters or fewer`)
    .regex(/^[A-Za-z0-9_\-.]+$/, "Only letters, digits, dash, dot and underscore are allowed");

export const nameSchema = (max = LEN.name) =>
  z.string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(max, `Must be ${max} characters or fewer`);

export const optionalText = (max: number) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer`).optional().or(z.literal(""));

export const positiveAmount = (opts: { allowZero?: boolean; max?: number } = {}) =>
  z.coerce.number({ invalid_type_error: "Enter a valid amount" })
    .refine((n) => Number.isFinite(n), "Enter a valid amount")
    .refine((n) => (opts.allowZero ? n >= 0 : n > 0), opts.allowZero ? "Must be zero or greater" : "Must be greater than zero")
    .refine((n) => n <= (opts.max ?? 9_999_999_999.99), "Amount is too large");

export const percentageSchema = (opts: { min?: number; max?: number } = {}) =>
  z.coerce.number({ invalid_type_error: "Enter a valid percentage" })
    .refine((n) => Number.isFinite(n), "Enter a valid percentage")
    .refine((n) => n >= (opts.min ?? 0), `Must be at least ${opts.min ?? 0}`)
    .refine((n) => n <= (opts.max ?? 100), `Must be at most ${opts.max ?? 100}`);

export const priorityInt16Schema = z.coerce
  .number({ invalid_type_error: "Enter a valid priority" })
  .int("Priority must be an integer")
  .min(INT16_MIN, `Priority must be between ${INT16_MIN} and ${INT16_MAX}`)
  .max(INT16_MAX, `Priority must be between ${INT16_MIN} and ${INT16_MAX}`);

export const nonNegativeInt = z.coerce
  .number({ invalid_type_error: "Enter a valid number" })
  .int("Must be a whole number")
  .min(0, "Must be zero or greater")
  .max(INT16_MAX, "Value is too large");

export const emailSchema = z.string().trim().email("Enter a valid email");
export const optionalEmailSchema = emailSchema.optional().or(z.literal(""));

/** Loose phone check — digits (+ optional +/spaces/dashes/parens), 7–20 chars. */
export const phoneSchema = z.string()
  .trim()
  .regex(/^[+()\-\s0-9]{7,20}$/, "Enter a valid phone number");
export const optionalPhoneSchema = phoneSchema.optional().or(z.literal(""));

export const countryCodeSchema = z.string()
  .trim()
  .regex(/^[A-Z]{2,3}$/, "Enter a valid ISO country code");

/**
 * Reject dash/placeholder submissions from Select components that use a
 * sentinel like "__none__" or "" for "no selection".
 */
export const requiredEnum = (label = "This field") =>
  z.string().trim().refine((v) => !placeholderValues.has(v), `${label} is required`);

export const isPlaceholder = (v: unknown) => placeholderValues.has(v as any);

/** From/To or Effective From/To — end must not be before start. */
export const dateRangeRefine = <T extends { from?: string | null; to?: string | null }>(
  labelFrom = "Start date",
  labelTo = "End date",
) =>
  (schema: z.ZodType<T>) =>
    schema.refine(
      (v) => !v.from || !v.to || new Date(v.from) <= new Date(v.to),
      { message: `${labelTo} must not be before ${labelFrom}`, path: ["to"] },
    );

/** Min/Max amount pair. */
export const amountRangeRefine = <T extends { min?: number | null; max?: number | null }>(
  labelMin = "Minimum",
  labelMax = "Maximum",
) =>
  (schema: z.ZodType<T>) =>
    schema.refine(
      (v) => v.min == null || v.max == null || v.min <= v.max,
      { message: `${labelMin} must not exceed ${labelMax}`, path: ["max"] },
    );

/**
 * Translate common Postgres / PostgREST errors to a user-friendly message.
 * Falls back to the original message.
 */
export function mapSupabaseError(err: any): string {
  const msg = err?.message || String(err ?? "");
  const code = err?.code as string | undefined;

  if (code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    return "A record with these values already exists.";
  }
  if (code === "22001" || /value too long for type/i.test(msg)) {
    const m = msg.match(/character varying\((\d+)\)/i);
    return m ? `One of the values is longer than the ${m[1]}-character limit.` : "One of the values is too long.";
  }
  if (code === "22003" || /out of range for type|is out of range/i.test(msg)) {
    return "One of the numeric values is outside the allowed range.";
  }
  if (code === "23502" || /null value in column/i.test(msg)) {
    const m = msg.match(/column "(.+?)"/);
    return m ? `Required field "${m[1]}" is missing.` : "A required field is missing.";
  }
  if (code === "23503" || /foreign key constraint/i.test(msg)) {
    return "This record is linked to other data and cannot be changed or removed.";
  }
  if (code === "PGRST204" || /Could not find the '(.+?)' column/i.test(msg)) {
    return "The form is out of sync with the database. Please refresh the page and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}
