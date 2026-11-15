import { z } from "zod";

export const collectionLanguages = [
  "en",
  "ja",
  "sv",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "ko",
  "zh",
  "other",
  "unknown",
] as const;
export type CollectionLanguage = (typeof collectionLanguages)[number];

export const collectionConditions = [
  "unknown",
  "mint",
  "near_mint",
  "lightly_played",
  "moderately_played",
  "heavily_played",
  "damaged",
] as const;
export type CollectionCondition = (typeof collectionConditions)[number];

/** A complete editable snapshot. Catalogue IDs remain opaque and edition-specific. */
export interface CollectionCardFields {
  name: string;
  setId: string | null;
  setName: string;
  cardNumber: string;
  catalogueCardId: string | null;
  language: CollectionLanguage;
  variant: string;
  condition: CollectionCondition;
  quantity: number;
  location: string;
  notes: string;
}

export interface CollectionCard extends CollectionCardFields {
  id: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
}

export interface CreateCollectionCard {
  /** Generated once by the caller, then retained through failed-save retries. */
  id: string;
  fields: CollectionCardFields;
}

export interface UpdateCollectionCard extends CreateCollectionCard {
  expectedRevision: number;
}

export interface RemoveCollectionCard {
  id: string;
  expectedRevision: number;
}

/** Implementations must persist before resolving and reject stale revisions. */
export interface CollectionRepository {
  list(): Promise<CollectionCard[]>;
  create(input: CreateCollectionCard): Promise<CollectionCard>;
  update(input: UpdateCollectionCard): Promise<CollectionCard>;
  remove(input: RemoveCollectionCard): Promise<void>;
}

export const collectionErrorCodes = [
  "VALIDATION",
  "CONFLICT",
  "NOT_FOUND",
  "STORAGE_UNAVAILABLE",
] as const;
export type CollectionErrorCode = (typeof collectionErrorCodes)[number];

const errorMessages: Record<CollectionErrorCode, string> = {
  VALIDATION: "Kontrollera kortets uppgifter och försök igen.",
  CONFLICT: "Kortet har ändrats. Läs in samlingen igen innan du sparar.",
  NOT_FOUND: "Kortet finns inte längre i samlingen. Läs in samlingen igen.",
  STORAGE_UNAVAILABLE:
    "Den lokala samlingen är inte tillgänglig. Öppna Androidappen eller försök läsa in samlingen igen.",
};

/** Only safe, user-facing messages cross the platform boundary. */
export class CollectionRepositoryError extends Error {
  readonly code: CollectionErrorCode;

  constructor(code: CollectionErrorCode) {
    super(errorMessages[code]);
    this.name = "CollectionRepositoryError";
    this.code = code;
  }
}

function hasControlCharacters(
  value: string,
  allowNoteWhitespace = false,
): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (allowNoteWhitespace && (code === 9 || code === 10 || code === 13))
      continue;
    if (code < 32 || (code >= 127 && code <= 159)) return true;
  }
  return false;
}

const noControls = (value: string) => !hasControlCharacters(value);
const text = (max: number) => z.string().trim().max(max).refine(noControls);
const opaqueId = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0 && noControls(value))
    .nullable();
const storedText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value === value.trim() && noControls(value));

export const collectionCardFieldsSchema = z
  .object({
    name: text(120).refine((value) => value.length > 0),
    setId: opaqueId(128),
    setName: text(120),
    cardNumber: text(40),
    catalogueCardId: opaqueId(160),
    language: z.enum(collectionLanguages),
    variant: text(80),
    condition: z.enum(collectionConditions),
    quantity: z.number().int().min(1).max(9999),
    location: text(120),
    notes: z
      .string()
      .max(2000)
      .refine((value) => !hasControlCharacters(value, true)),
  })
  .strict();

export const collectionCardIdSchema = z
  .string()
  .regex(
    /^(?:card-)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  )
  // JavaScript's $ also matches before a final line break; the identity must be exact.
  .refine((value) => value.length === 36 || value.length === 41);
export const collectionRevisionSchema = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER);
const timestampSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const collectionCardSchema = collectionCardFieldsSchema
  .extend({
    name: storedText(120).refine((value) => value.length > 0),
    setName: storedText(120),
    cardNumber: storedText(40),
    variant: storedText(80),
    location: storedText(120),
    id: collectionCardIdSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    revision: collectionRevisionSchema,
  })
  .refine((card) => card.updatedAt >= card.createdAt);

export const createCollectionCardSchema = z
  .object({
    id: collectionCardIdSchema,
    fields: collectionCardFieldsSchema,
  })
  .strict();

export const updateCollectionCardSchema = createCollectionCardSchema.extend({
  expectedRevision: collectionRevisionSchema,
});

export const removeCollectionCardSchema = z
  .object({
    id: collectionCardIdSchema,
    expectedRevision: collectionRevisionSchema,
  })
  .strict();
