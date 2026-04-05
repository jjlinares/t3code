export function createHandledAsyncCallback(
  run: () => Promise<void>,
  onError: (error: unknown) => void,
): () => void {
  return () => {
    void run().catch(onError);
  };
}
