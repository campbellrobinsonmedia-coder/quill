import { getSeriesOrNotFound } from "@/lib/get-series";
import { SeriesTabNav } from "@/components/series-tab-nav";

export default async function SeriesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesOrNotFound(id);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="px-6 py-4">
        <p className="text-xs text-neutral-500">
          {series.format ? series.format : "Series"}
        </p>
        <h1 className="text-xl font-semibold">{series.title}</h1>
        {series.premise && (
          <p className="mt-1 text-sm text-neutral-500">{series.premise}</p>
        )}
      </div>
      <SeriesTabNav seriesId={id} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
