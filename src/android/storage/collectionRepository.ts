import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
import {
  collectionCardSchema,
  collectionErrorCodes,
  CollectionRepositoryError,
  createCollectionCardSchema,
  removeCollectionCardSchema,
  updateCollectionCardSchema,
  type CollectionCard,
  type CollectionCardFields,
  type CollectionErrorCode,
  type CollectionRepository,
  type CreateCollectionCard,
  type RemoveCollectionCard,
  type UpdateCollectionCard,
} from "@/platform/collection";

/** Native responses stay unknown until validated at this trust boundary. */
export interface CardLensCollectionPlugin {
  listCards(): Promise<unknown>;
  createCard(input: CreateCollectionCard): Promise<unknown>;
  updateCard(input: UpdateCollectionCard): Promise<unknown>;
  deleteCard(input: RemoveCollectionCard): Promise<unknown>;
}

const nativeCollection =
  registerPlugin<CardLensCollectionPlugin>("CardLensCollection");

const isAvailableOnAndroid = () =>
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === "android" &&
  Capacitor.isPluginAvailable("CardLensCollection");

const listResponseSchema = z
  .object({ cards: z.array(collectionCardSchema) })
  .strict();
const cardResponseSchema = z.object({ card: collectionCardSchema }).strict();
const deleteResponseSchema = z.object({}).strict();

function parse<T>(
  schema: z.ZodType<T>,
  input: unknown,
  code: CollectionErrorCode,
): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new CollectionRepositoryError(code);
  return result.data;
}

function nativeError(error: unknown): CollectionRepositoryError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  return new CollectionRepositoryError(
    collectionErrorCodes.includes(code as CollectionErrorCode)
      ? (code as CollectionErrorCode)
      : "STORAGE_UNAVAILABLE",
  );
}

async function invoke(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    return await operation();
  } catch (error) {
    // Neither SQLite messages nor native diagnostics become user-visible errors.
    throw nativeError(error);
  }
}

function checkedCard(
  response: unknown,
  id: string,
  fields: CollectionCardFields,
): CollectionCard {
  const { card } = parse(cardResponseSchema, response, "STORAGE_UNAVAILABLE");
  if (
    card.id !== id ||
    Object.keys(fields).some((key) => card[key] !== fields[key])
  ) {
    throw new CollectionRepositoryError("STORAGE_UNAVAILABLE");
  }
  return card as CollectionCard;
}

export interface AndroidCollectionRepositoryDependencies {
  plugin?: CardLensCollectionPlugin;
  /** Dependency injection for contract tests; production checks the native runtime. */
  isAvailable?: () => boolean;
}

/** There is deliberately no browser, account, network or in-memory persistence fallback. */
export function createAndroidCollectionRepository({
  plugin = nativeCollection,
  isAvailable = isAvailableOnAndroid,
}: AndroidCollectionRepositoryDependencies = {}): CollectionRepository {
  const assertAvailable = () => {
    if (!isAvailable())
      throw new CollectionRepositoryError("STORAGE_UNAVAILABLE");
  };

  return {
    async list() {
      assertAvailable();
      const response = parse(
        listResponseSchema,
        await invoke(() => plugin.listCards()),
        "STORAGE_UNAVAILABLE",
      );
      const ids = new Set(response.cards.map((card) => card.id));
      if (ids.size !== response.cards.length)
        throw new CollectionRepositoryError("STORAGE_UNAVAILABLE");
      return response.cards as CollectionCard[];
    },
    async create(input) {
      assertAvailable();
      const validated = parse(
        createCollectionCardSchema,
        input,
        "VALIDATION",
      ) as CreateCollectionCard;
      return checkedCard(
        await invoke(() => plugin.createCard(validated)),
        validated.id,
        validated.fields,
      );
    },
    async update(input) {
      assertAvailable();
      const validated = parse(
        updateCollectionCardSchema,
        input,
        "VALIDATION",
      ) as UpdateCollectionCard;
      const card = checkedCard(
        await invoke(() => plugin.updateCard(validated)),
        validated.id,
        validated.fields,
      );
      if (card.revision !== validated.expectedRevision + 1)
        throw new CollectionRepositoryError("STORAGE_UNAVAILABLE");
      return card;
    },
    async remove(input) {
      assertAvailable();
      const validated = parse(
        removeCollectionCardSchema,
        input,
        "VALIDATION",
      ) as RemoveCollectionCard;
      parse(
        deleteResponseSchema,
        await invoke(() => plugin.deleteCard(validated)),
        "STORAGE_UNAVAILABLE",
      );
    },
  };
}

export const androidCollectionRepository = createAndroidCollectionRepository();
