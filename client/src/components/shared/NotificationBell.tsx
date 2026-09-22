import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Clock3 } from "lucide-react";
import { api } from "../../lib/axios";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import type { Notification } from "../../types";
import { formatDate, getEntityId } from "../../lib/utils";

type NotificationResponse = {
  items: Notification[];
  unreadCount: number;
};

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<NotificationResponse>({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data.data,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!socket) return;

    const handleNotificationCreated = (notification: Notification) => {
      queryClient.setQueryData<NotificationResponse | undefined>(
        ["notifications"],
        (current) => {
          if (!current) {
            return { items: [notification], unreadCount: 1 };
          }

          const notificationId = getEntityId(notification);
          const exists = current.items.some(
            (item) => getEntityId(item) === notificationId
          );

          if (exists) return current;

          return {
            items: [notification, ...current.items].slice(0, 50),
            unreadCount: current.unreadCount + 1,
          };
        }
      );
    };

    socket.on("notification_created", handleNotificationCreated);
    return () => {
      socket.off("notification_created", handleNotificationCreated);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch("/notifications/" + encodeURIComponent(notificationId) + "/read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleNotificationClick = (notification: Notification) => {
    const notificationId = getEntityId(notification);
    if (!notification.isRead && notificationId) {
      markAsReadMutation.mutate(notificationId);
    }

    setOpen(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const unreadCount = data?.unreadCount ?? 0;
  const recentNotifications = (data?.items ?? []).slice(0, 6);

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative p-2 text-[#514B44] hover:text-[#C17817] hover:bg-[#E8E1D5] rounded-full transition"
        title="Notifications"
        aria-label={unreadCount ? "Notifications: " + unreadCount + " unread" : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#A23B2E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[#F7F3EA] border border-[#B8B0A3] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDD5C7] flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#211E1B]">Notifications</p>
              <p className="text-[11px] text-[#8B8377] mt-0.5">
                {unreadCount
                  ? unreadCount + " unread update" + (unreadCount === 1 ? "" : "s")
                  : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C17817] hover:text-[#A66314]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Manage
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#E6DED1]">
            {recentNotifications.length ? (
              recentNotifications.map((notification) => {
                const notificationId = getEntityId(notification);
                return (
                  <button
                    key={notificationId}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={"w-full text-left px-4 py-3 hover:bg-[#EFE8DB] transition " + (notification.isRead ? "" : "bg-[#F1E0C8]/35")}
                  >
                    <div className="flex items-start gap-3">
                      <div className={"w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 " + (notification.isRead ? "bg-[#E8E1D5] text-[#8B8377]" : "bg-[#E9D5B8] text-[#C17817]")}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-[#211E1B]">{notification.title}</p>
                          {!notification.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#A23B2E] mt-1 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[#6F685F] mt-1 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#A39A8D]">
                          <Clock3 className="w-3 h-3" />
                          {formatDate(notification.createdAt, "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center text-xs text-[#A39A8D]">
                No notifications yet.
              </div>
            )}
          </div>

          <div className="p-2 border-t border-[#DDD5C7]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full py-2 rounded-md text-xs font-bold text-[#C17817] hover:bg-[#E8E1D5] transition"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
