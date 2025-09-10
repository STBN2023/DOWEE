export function unwrapFunction<T>(res: { data: unknown; error: unknown }): T {
  // Pas d'erreur → renvoyer la donnée typée
  if (res.error == null) {
    return res.data as T;
  }

  // Utilitaires pour lire des propriétés de manière sûre
  const readStringProp = (obj: unknown, key: string): string | undefined => {
    if (obj && typeof obj === "object" && key in obj) {
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === "string") return val;
    }
    return undefined;
  };

  // Essayer différents endroits courants où un message d’erreur peut exister
  const errorMessage =
    readStringProp(res.error, "message") ||
    readStringProp(res.error, "error") ||
    readStringProp(res.data, "error") ||
    readStringProp(res.data, "message") ||
    (typeof res.data === "string" ? (res.data as string) : undefined) ||
    "Edge function error";

  throw new Error(errorMessage);
}