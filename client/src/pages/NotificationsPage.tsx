import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Clock3, FileText } from "lucide-react";
import { api } from "../lib/axios";
import type { Notification } from "../types";
import { formatDate, getEntityId } from "../lib/utils";

type NotificationResponse = {
  items: Notification[];
  unreadCount: number;
};

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<NotificationResponse>({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data.data,
    refetchInterval: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch("/notifications/" + encodeURIComponent(notificationId) + "/read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/mark-all-read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.items ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#C8C0B3]">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#C17817]">Account Updates</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">Notifications</h1>
          <p className="text-xs text-[#8B8377] mt-2">
            Booking, moderation, payment, and account updates are kept here for your records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#F1ECE1] border border-[#C8C0B3] text-xs font-bold text-[#514B44] hover:bg-[#E8E1D5]"
          >
            <FileText className="w-3.5 h-3.5" />
            My Reports
          </Link>
          {data?.unreadCount ? (
            <button
              type="button"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#211E1B] text-white text-xs font-bold hover:bg-[#C17817] disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-md bg-[#E8E1D5] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-[#FBE9E5] border border-[#A23B2E]/30 rounded-md p-6 text-center text-xs text-[#A23B2E]">
          Unable to load your notifications right now.
        </div>
      ) : notifications.length ? (
        <div className="bg-white border border-[#C8C0B3] rounded-md overflow-hidden divide-y divide-[#E6DED1]">
          {notifications.map((notification) => {
            const notificationId = getEntityId(notification);
            return (
              <div
                key={notificationId}
                className={"p-5 transition " + (notification.isRead ? "" : "bg-[#F1E0C8]/25")}
              >
                <div className="flex items-start gap-4">
                  <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + (notification.isRead ? "bg-[#E8E1D5] text-[#8B8377]" : "bg-[#E9D5B8] text-[#C17817]")}>
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-[#211E1B]">{notification.title}</h2>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#A39A8D]">
                          <Clock3 className="w-3 h-3" />
                          {formatDate(notification.createdAt, "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F1E0C8] text-[#C17817] text-[10px] font-bold uppercase">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#514B44] mt-3 leading-relaxed">
                      {notification.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {notification.actionUrl && (
                        <Link
                          to={notification.actionUrl}
                          onClick={() => {
                            if (!notification.isRead && notificationId) {
                              markAsReadMutation.mutate(notificationId);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#C17817] text-white text-[11px] font-bold hover:bg-[#211E1B]"
                        >
                          {notification.type.startsWith("report_") ? "View report activity" : "Open update"}
                        </Link>
                      )}
                      {!notification.isRead && notificationId && (
                        <button
                          type="button"
                          onClick={() => markAsReadMutation.mutate(notificationId)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#C8C0B3] text-[#514B44] text-[11px] font-bold hover:bg-[#E8E1D5]"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#C8C0B3] rounded-md p-12 text-center">
          <Bell className="w-10 h-10 mx-auto text-[#B8B0A3]" />
          <h2 className="text-sm font-bold text-[#514B44] mt-3">No notifications yet</h2>
          <p className="text-xs text-[#8B8377] mt-1">Updates from your rentals and reports will appear here.</p>
        </div>
      )}
    </div>
  );
}
