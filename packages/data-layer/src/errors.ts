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

/** Thrown when a fetcher's provider hasn't been selected/implemented yet. */
export class NotImplementedError extends DataFetchError {
  constructor(source: string) {
    super(source, "provider not yet implemented");
    this.name = "NotImplementedError";
  }
}
