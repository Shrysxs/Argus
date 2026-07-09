/** Thrown when a data source fails or returns unusable data. */
export class DataFetchError extends Error {
  constructor(
    public readonly source: string,
    public readonly reason: string,
    cause?: unknown
  ) {
    super(`[${source}] ${reason}`);
    this.name = "DataFetchError";
    if (cause) this.cause = cause;
  }
}
