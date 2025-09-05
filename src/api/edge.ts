export function unwrapFunction<T>(res: { data: any; error: any }): T {
  const { data, error } = res;
  if (!error) return data as T;

  const ctx = (error as any)?.context;
  const ctxErr = ctx?.error;
  const status =
    ctx?.response?.status ??
    (error as any)?.status;

  const messageFromCtx =
    (typeof ctxErr === "string" ? ctxErr : null) ||
    ctxErr?.error ||
    ctxErr?.message ||
    null;

  const messageFromData =
    (data && (data.error || data.message || (typeof data === "string" ? data : null))) || null;

  const finalMessage = messageFromCtx || messageFromData || error?.message || "Edge function error";
  throw new Error(status ? `${status}: ${finalMessage}` : finalMessage);
}