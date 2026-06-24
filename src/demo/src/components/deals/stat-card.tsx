import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col items-center gap-0.5 px-2 sm:px-4">
        <span className="text-base font-semibold tabular-nums sm:text-xl">{value}</span>
        <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
      </CardContent>
    </Card>
  );
}
