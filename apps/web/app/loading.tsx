import { Spinner } from "@workspace/ui/components/spinner";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="size-5" label="Loading page" />
    </div>
  );
}
