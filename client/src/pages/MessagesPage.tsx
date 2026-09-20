import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { Conversation, Message } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { formatDate, getEntityId, getErrorMessage } from "../lib/utils";
import { MessageSquare, Send, User, AlertCircle } from "lucide-react";

type ConversationProduct = NonNullable<Conversation["product"]>;
type ConversationRecord = Omit<Conversation, "productId"> & {
  productId?: string | ConversationProduct;
};

type ActiveThread = {
  messages: Message[];
};

const getConversationProduct = (conversation?: ConversationRecord): ConversationProduct | undefined => {
  if (conversation?.product) return conversation.product;
  if (conversation?.productId && typeof conversation.productId === "object") {
    return conversation.productId;
  }
  return undefined;
};

export function MessagesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialRecipient = searchParams.get("recipient");
  const initialProductId = searchParams.get("product");
  const initialConversationId = searchParams.get("conversation");
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: conversations,
    isLoading: loadingConversations,
    isError: conversationsError,
  } = useQuery<ConversationRecord[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await api.get("/messages/conversations");
      return data.data as ConversationRecord[];
    },
  });

  const { data: activeThread } = useQuery<ActiveThread>({
    queryKey: ["conversation-messages", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const { data } = await api.get(`/messages/conversations/${encodeURIComponent(activeConversationId)}`);
      return data.data;
    },
    enabled: !!activeConversationId,
  });

  const currentUserId = getEntityId(user);

  useEffect(() => {
    if (loadingConversations || activeConversationId) return;

    if (initialConversationId) {
      const matchingConversation = conversations?.find(
        (conversation) => getEntityId(conversation) === initialConversationId
      );
      if (matchingConversation) {
        setActiveConversationId(getEntityId(matchingConversation) || null);
        return;
      }
    }

    if (initialRecipient) {
      const matchingConversation = conversations?.find((conversation) => {
        const customerId = getEntityId(conversation.customerId);
        const sellerId = getEntityId(conversation.sellerId);
        const participantMatches = customerId === initialRecipient || sellerId === initialRecipient;
        if (!participantMatches) return false;
        if (!initialProductId) return true;
        return getEntityId(getConversationProduct(conversation)) === initialProductId;
      });

      if (matchingConversation) {
        setActiveConversationId(getEntityId(matchingConversation) || null);
      }
      return;
    }

    const firstConversation = conversations?.[0];
    if (firstConversation) {
      setActiveConversationId(getEntityId(firstConversation) || null);
    }
  }, [activeConversationId, conversations, initialConversationId, initialProductId, initialRecipient, loadingConversations]);

  useEffect(() => {
    if (!socket || !activeConversationId) return;

    socket.emit("join_conversation", activeConversationId);
    const handleNewMessage = (newMsg: Message) => {
      queryClient.setQueryData<ActiveThread | undefined>(["conversation-messages", activeConversationId], (old) =>
        old ? { ...old, messages: [...(old.messages || []), newMsg] } : old
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("new_message", handleNewMessage);
    return () => {
      socket.emit("leave_conversation", activeConversationId);
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, activeConversationId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const content = messageContent.trim();
      if (!content) throw new Error("Please enter a message.");

      setMessageError(null);
      const activeConv = conversations?.find(
        (conversation) => getEntityId(conversation) === activeConversationId
      );

      let recipientId: string | undefined;
      if (activeConv) {
        recipientId =
          String(activeConv.customerId) === String(currentUserId)
            ? getEntityId(activeConv.sellerId)
            : getEntityId(activeConv.customerId);
      } else {
        recipientId = initialRecipient || undefined;
      }

      if (!recipientId) throw new Error("The recipient for this conversation could not be found.");

      const payload: Record<string, string> = {
        recipientId,
        content,
      };

      if (activeConversationId) {
        payload.conversationId = activeConversationId;
      }

      if (initialProductId) {
        payload.productId = initialProductId;
      }

      const { data } = await api.post("/messages/send", payload);
      return data.data;
    },
    onSuccess: (result) => {
      const newConversationId = getEntityId(result?.conversationId || result?.conversation);
      setMessageContent("");
      setMessageError(null);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      if (newConversationId) {
        setActiveConversationId(newConversationId);
        navigate(`/messages?conversation=${encodeURIComponent(newConversationId)}`, { replace: true });
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", newConversationId] });
      }
    },
    onError: (err: unknown) => {
      setMessageError(getErrorMessage(err, "Failed to send message."));
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageMutation.mutate();
  };

  const messages: Message[] = activeThread?.messages || [];
  const currentConv = conversations?.find(
    (conversation) => getEntityId(conversation) === activeConversationId
  );
  const currentProduct = getConversationProduct(currentConv);
  const otherParty =
    String(currentConv?.customerId) === String(currentUserId)
      ? currentConv?.seller
      : currentConv?.customer;
  const isStartingConversation =
    !activeConversationId &&
    !!initialRecipient &&
    !loadingConversations &&
    !conversationsError;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-md border border-[#C8C0B3] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[750px]">
        <div className="md:col-span-4 border-r border-[#C8C0B3] flex flex-col">
          <div className="p-4 border-b border-[#E6DED1]">
            <h2 className="text-base font-bold text-[#211E1B]">Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E6DED1]">
            {loadingConversations ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#E8E1D5] rounded-md animate-pulse" />
                ))}
              </div>
            ) : conversationsError ? (
              <div className="p-6 text-center text-xs text-[#A23B2E]">
                <AlertCircle className="w-7 h-7 mx-auto mb-2" />
                Unable to load conversations.
              </div>
            ) : !conversations?.length ? (
              <div className="p-8 text-center text-xs text-[#A39A8D]">
                <MessageSquare className="w-8 h-8 mx-auto text-[#B8B0A3]" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const convId = getEntityId(conv);
                const partner = String(conv.customerId) === String(currentUserId) ? conv.seller : conv.customer;
                const product = getConversationProduct(conv);

                return (
                  <button
                    key={convId}
                    type="button"
                    onClick={() => {
                      setMessageError(null);
                      setActiveConversationId(convId || null);
                    }}
                    className={`w-full text-left p-4 hover:bg-[#F1ECE1] transition flex items-start gap-3 ${
                      convId === activeConversationId ? "bg-[#F1ECE1]/70 border-l-4 border-[#C17817]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#DDD5C7] overflow-hidden flex-shrink-0">
                      {partner?.avatarUrl ? (
                        <img src={partner.avatarUrl} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 m-2.5 text-[#8B8377]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#211E1B] truncate">
                        {partner?.name || "Lender / Renter"}
                      </h4>
                      {product && (
                        <div className="text-[11px] font-medium text-[#C17817] truncate">
                          {product.name}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col h-full bg-[#F1ECE1]/50">
          {activeConversationId && currentConv ? (
            <>
              <div className="p-4 bg-white border-b border-[#C8C0B3] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#DDD5C7] overflow-hidden">
                  {otherParty?.avatarUrl ? (
                    <img src={otherParty.avatarUrl} alt={otherParty.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 m-2 text-[#8B8377]" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#211E1B]">{otherParty?.name || "Conversation"}</h3>
                  {currentProduct && (
                    <Link
                      to={`/products/${getEntityId(currentProduct)}`}
                      className="text-[11px] text-[#C17817] hover:underline"
                    >
                      Listing: {currentProduct.name}
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length ? (
                  messages.map((msg) => {
                    const msgId = getEntityId(msg);
                    const isMine = String(msg.senderId) === String(currentUserId);
                    return (
                      <div key={msgId} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-md text-xs leading-relaxed shadow-sm ${
                            isMine
                              ? "bg-[#C17817] text-white rounded-br-none"
                              : "bg-white text-[#211E1B] border border-[#C8C0B3] rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-[#A39A8D] mt-1 px-1">
                          {formatDate(msg.createdAt, "h:mm a")}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 text-[#A39A8D]">
                    <div>
                      <MessageSquare className="w-10 h-10 mx-auto text-[#B8B0A3] mb-2" />
                      <p className="text-xs">No messages yet. Start the conversation below.</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messageError && (
                <div className="mx-4 mb-2 p-3 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{messageError}</span>
                </div>
              )}

              <form onSubmit={handleSend} className="p-4 bg-white border-t border-[#C8C0B3] flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  maxLength={3000}
                  className="flex-1 px-4 py-2.5 text-xs bg-[#E8E1D5] border border-transparent rounded-md outline-none focus:bg-white focus:border-[#C17817]"
                />
                <button
                  type="submit"
                  disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#211E1B] disabled:opacity-40 text-white transition flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : isStartingConversation ? (
            <>
              <div className="p-4 bg-white border-b border-[#C8C0B3] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8E1D5] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#C17817]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#211E1B]">Ask the seller a question</h3>
                  <p className="text-[11px] text-[#8B8377]">Your message will create a new conversation.</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#A39A8D]">
                <MessageSquare className="w-12 h-12 text-[#C8C0B3] mb-3" />
                <h4 className="text-sm font-bold text-[#514B44]">Start a conversation</h4>
                <p className="text-xs mt-1 max-w-sm">
                  Ask about availability, pickup, condition, pricing, or any other rental detail.
                </p>
              </div>

              {messageError && (
                <div className="mx-4 mb-2 p-3 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{messageError}</span>
                </div>
              )}

              <form onSubmit={handleSend} className="p-4 bg-white border-t border-[#C8C0B3] flex gap-2">
                <input
                  type="text"
                  placeholder="Type your question..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  maxLength={3000}
                  autoFocus
                  className="flex-1 px-4 py-2.5 text-xs bg-[#E8E1D5] border border-transparent rounded-md outline-none focus:bg-white focus:border-[#C17817]"
                />
                <button
                  type="submit"
                  disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#211E1B] disabled:opacity-40 text-white transition flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#A39A8D] space-y-2">
              <MessageSquare className="w-12 h-12 text-[#B8B0A3]" />
              <h4 className="text-sm font-bold text-[#514B44]">Select a conversation</h4>
              <p className="text-xs">Chat directly with equipment lenders about availability and pickup details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
