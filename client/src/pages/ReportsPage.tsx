import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";
import { api } from "../lib/axios";
import type { Report } from "../types";
import { formatDate, getEntityId } from "../lib/utils";

const statusMeta: Record<Report["status"], { label: string; className: string }> = {
  pending: { label: "Pending review", className: "bg-[#F1E0C8] text-[#C17817]" },
  reviewed: { label: "Under review", className: "bg-[#E8E1D5] text-[#514B44]" },
  resolved: { label: "Resolved", className: "bg-[#E7EFE2] text-[#4B5D3A]" },
  dismissed: { label: "Dismissed", className: "bg-[#FBE9E5] text-[#A23B2E]" },
};

const targetLabel = (report: Report) => {
  if (report.targetType === "product") return report.reportedProductId?.name || "Listing";
  if (report.targetType === "user") return report.reportedUserId?.name || "User";
  return report.reportedReviewId?.title || "Review";
};

export function ReportsPage() {
  const { data: reports, isLoading, isError } = useQuery<Report[]>({
    queryKey: ["my-reports"],
    queryFn: async () => (await api.get("/reports")).data.data || [],
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-[#C8C0B3]">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#C17817]">Moderation History</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">My Reports</h1>
          <p className="text-xs text-[#8B8377] mt-2">
            Track every report you have submitted and the moderation outcome.
          </p>
        </div>
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#F1ECE1] border border-[#C8C0B3] text-xs font-bold text-[#514B44] hover:bg-[#E8E1D5]"
        >
          <Clock3 className="w-3.5 h-3.5" />
          Notifications
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 rounded-md bg-[#E8E1D5] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-[#FBE9E5] border border-[#A23B2E]/30 rounded-md p-6 text-center text-xs text-[#A23B2E]">
          Unable to load your report history.
        </div>
      ) : reports?.length ? (
        <div className="space-y-4">
          {reports.map((report) => {
            const reportId = getEntityId(report);
            const meta = statusMeta[report.status];
            const isFinal = ["resolved", "dismissed"].includes(report.status);

            return (
              <article key={reportId} className="bg-white border border-[#C8C0B3] rounded-md shadow-sm p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#211E1B]">{targetLabel(report)}</span>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-[#F1ECE1] text-[#C17817]">
                        {report.targetType}
                      </span>
                      <span className={"px-2 py-1 rounded-full text-[10px] font-bold uppercase " + meta.className}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8B8377] mt-1">
                      Submitted {formatDate(report.createdAt, "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  {isFinal && report.resolvedAt && (
                    <span className="text-[10px] text-[#A39A8D]">
                      Decided {formatDate(report.resolvedAt, "MMM d, yyyy h:mm a")}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Reason</p>
                    <p className="text-xs text-[#514B44] mt-1">{report.reason}</p>
                  </div>
                  <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Your details</p>
                    <p className="text-xs text-[#514B44] mt-1">{report.details || "No additional details provided."}</p>
                  </div>
                </div>

                {report.resolutionNotes ? (
                  <div className={"rounded-md border p-4 " + (report.status === "resolved" ? "border-[#4B5D3A]/30 bg-[#E7EFE2]/50" : "border-[#A23B2E]/30 bg-[#FBE9E5]/50")}>
                    <div className="flex items-center gap-2">
                      {report.status === "resolved" ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4B5D3A]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#A23B2E]" />
                      )}
                      <p className="text-xs font-bold text-[#211E1B]">
                        {report.status === "resolved" ? "Moderator decision" : "Moderation response"}
                      </p>
                    </div>
                    <p className="text-xs text-[#514B44] mt-2 leading-relaxed">{report.resolutionNotes}</p>
                  </div>
                ) : report.status === "pending" || report.status === "reviewed" ? (
                  <div className="rounded-md border border-[#C17817]/20 bg-[#F1E0C8]/30 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#C17817] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#6F685F]">
                      Your report is still being reviewed. You will receive a notification when the moderation outcome is recorded.
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#C8C0B3] rounded-md p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-[#B8B0A3]" />
          <h2 className="text-sm font-bold text-[#514B44] mt-3">No reports submitted</h2>
          <p className="text-xs text-[#8B8377] mt-1">
            Reports you submit about listings or other marketplace content will appear here.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 rounded-md bg-[#C17817] text-white text-xs font-bold hover:bg-[#211E1B]"
          >
            Browse marketplace
          </Link>
        </div>
      )}
    </div>
  );
}
