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
      <CardContent className="flex flex-col items-center gap-0.5 px-4">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
