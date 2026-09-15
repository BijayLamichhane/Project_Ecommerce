import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useSocket() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return;
    }

    const nextSocket = io(SOCKET_URL, {
      withCredentials: true,
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket((current) => (current === nextSocket ? null : current));
    };
  }, [user?.id]);

  return socket;
}
