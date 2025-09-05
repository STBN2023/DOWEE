export function unwrapFunction<T>(res: { data: any; error: any }): T {
  const { data, error } = res;
  if (!error) return data as T;

  // Préférence au message structurel côté Edge Function
  const message =
    (data && (data.error || data.message)) ||
    (typeof data === "string" ? data : null) ||
    error?.message ||
    "Edge function error";

  // Inclure le statut s’il est exposé (pas toujours)
  const status =
    (error && ((error as any).context?.response?.status || (error as any).status)) ||
    undefined;

  const finalMessage = status ? `${status}: ${message}` : message;
  throw new Error(finalMessage);
}