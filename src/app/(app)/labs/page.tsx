import { requireUser } from "@/lib/session";
import { listLabResults, summarizeMarkers } from "@/lib/repo/labs";
import { aiConfigured } from "@/lib/ai/client";
import { KEY_MARKERS, markerRank } from "@/lib/labs/markers";
import { chart } from "@/lib/charts/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { LabsUpload } from "@/components/labs/LabsUpload";
import { MarkerCards } from "@/components/labs/MarkerCards";

export const metadata = { title: "Labs" };
export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const user = await requireUser();
  const results = await listLabResults(user.id);
  const markers = summarizeMarkers(results).sort((a, b) => markerRank(a.marker) - markerRank(b.marker) || a.marker.localeCompare(b.marker));
  const a1c = markers.find((m) => m.marker === "HbA1c");
  const a1cSeries = a1c ? [...a1c.history].reverse().map((r) => ({ date: r.date, value: r.value })) : [];
  const key = markers.filter((m) => markerRank(m.marker) < KEY_MARKERS.length);
  const other = markers.filter((m) => !key.includes(m));

  return (
    <>
      <PageHeader title="Labs" subtitle="Blood work over time. HbA1c and fasting glucose are the headline; insulin and triglycerides often move first." />

      <Card title="Add results">
        <LabsUpload aiEnabled={aiConfigured()} />
      </Card>

      {results.length === 0 ? (
        <Card>
          <EmptyState icon="🧪" title="No lab results yet" description="Upload the PDF your doctor or lab sent you. We'll pull out HbA1c, fasting glucose, lipids and the rest, and track them across tests." />
        </Card>
      ) : (
        <>
          {a1cSeries.length >= 2 && (
            <Card title="HbA1c over time" subtitle="Under 5.7% is the normal range. 5.7–6.4% is prediabetes.">
              <TrendLineChart data={a1cSeries} unit="%" decimals={1} color={chart.series1} refLines={[{ y: 5.7, label: "5.7 normal", color: chart.good }, { y: 6.5, label: "6.5", color: chart.critical }]} height={200} yPad={0.3} />
            </Card>
          )}

          <div>
            <h2 className="card-title mb-3">Key markers</h2>
            <MarkerCards markers={key} />
          </div>
          {other.length > 0 && (
            <div>
              <h2 className="card-title mb-3">Everything else</h2>
              <MarkerCards markers={other} />
            </div>
          )}
        </>
      )}
    </>
  );
}
