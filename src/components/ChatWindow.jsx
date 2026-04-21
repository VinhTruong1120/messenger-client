import React, { useState, useEffect, useRef } from "react";

// 1. Nhận thêm prop onLoadMore từ thằng Cha truyền xuống
function ChatWindow({
    activeConversation,
    currentMessages,
    onSendMessage,
    myId,
    onLoadMore,
}) {
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const isFetching = useRef(false);
    const isFirstLoad = useRef(true);

    const getFriendName = () => {
        if (!activeConversation) return "";
        const friend = activeConversation.members.find((m) => m._id !== myId);
        return friend?.username || "Bạn bè";
    };

    useEffect(() => {
        // Chỉ tự động cuộn xuống đáy ở 2 trường hợp:
        // 1. Lần đầu tiên mở chat
        // 2. Chặn không cho cuộn nếu đang load lịch sử (isFetching = true)
        if (currentMessages.length > 0 && !isFetching.current) {
            messagesEndRef.current?.scrollIntoView({
                behavior: isFirstLoad.current ? "auto" : "smooth",
            });
            isFirstLoad.current = false;
        }
    }, [currentMessages]);

    const handleSend = async () => {
        if (!inputText.trim() || isSending) return;
        setIsSending(true);
        const contentToSend = inputText;
        setInputText("");
        await onSendMessage(contentToSend);
        setIsSending(false);
    };

    // 2. ĐẶT HÀM BẮT SỰ KIỆN CUỘN Ở ĐÂY
    const handleScroll = async (e) => {
        // Nếu chạm đỉnh VÀ không phải đang load dở API
        if (e.target.scrollTop === 0 && !isFetching.current) {
            isFetching.current = true; // Khóa lại

            const container = e.target;
            const prevScrollHeight = container.scrollHeight; // Lưu chiều cao CŨ trước khi load

            if (onLoadMore) {
                await onLoadMore(); // Đợi hàm Cha gọi API xong
            }

            // Đợi React render xong DOM mới (dùng setTimeout nhỏ) rồi bù lại vị trí cuộn
            setTimeout(() => {
                container.scrollTop = container.scrollHeight - prevScrollHeight;
                isFetching.current = false; // Mở khóa cho lần cuộn tiếp theo
            }, 50);
        }
    };

    return (
        <div className="chat-window">
            <div className="chat-header">{getFriendName()}</div>

            {/* 3. GẮN SỰ KIỆN onScroll VÀO KHU VỰC HIỂN THỊ TIN NHẮN */}
            <div
                className="chat-messages"
                onScroll={handleScroll}
                ref={scrollContainerRef}
            >
                {currentMessages.length === 0 ? (
                    <div
                        style={{
                            textAlign: "center",
                            color: "gray",
                            marginTop: "20px",
                        }}
                    >
                        Hãy bắt đầu cuộc trò chuyện
                    </div>
                ) : (
                    currentMessages.map((msg) => (
                        <div
                            key={msg._id}
                            className={`message ${msg.isMine ? "mine" : ""}`}
                        >
                            {msg.content}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                {/* ... (giữ nguyên phần input) ... */}
                <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Nhập tin nhắn..."
                />
                <button onClick={handleSend} disabled={isSending}>
                    {isSending ? "..." : "Gửi"}
                </button>
            </div>
        </div>
    );
}

export default ChatWindow;
