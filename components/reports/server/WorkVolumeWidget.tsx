import { getWorkVolumeSeries } from "@/app/actions/reports";
import ReportVolumeChart from "@/components/reports/client/ReportVolumeChart";

export default async function WorkVolumeWidget({ searchParams }: { searchParams: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month" } }) {
    const result = await getWorkVolumeSeries(searchParams);
    const data = result.success ? result.data : [];

    return (
        <div className="h-full">
            <ReportVolumeChart data={data} groupBy={searchParams.groupBy || "month"} />
        </div>
    );
}
