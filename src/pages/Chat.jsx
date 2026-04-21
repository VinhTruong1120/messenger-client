import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../App.css';

function Chat() {
  const socket = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [inputText, setInputText] = useState('');

  const getToken = () => localStorage.getItem('token');

  const getMyId = () => {
    const token = getToken();
    return JSON.parse(atob(token.split('.')[1])).id;
  };

  // ================= SOCKET =================
  useEffect(() => {
    const myId = getMyId();

    socket.current = io('http://localhost:8000');

    socket.current.on('connect', () => {
      socket.current.emit('addUser', myId);
    });

    // 👇 ĐOẠN CẦN SỬA LÀ ĐOẠN NÀY ĐÂY 👇
    socket.current.on('getMessage', (msg) => {
      // 🛡️ LỚP BẢO VỆ 1: Chặn đứng tin nhắn của chính mình 
      if (msg.senderId === myId) return;

      setMessages(prev => {
        const convId = msg.conversationId;

        // 🛡️ LỚP BẢO VỆ 2: Chống trùng lặp
        const exists = prev[convId]?.some(m => m._id === msg._id);
        if (exists) return prev;

        return {
          ...prev,
          [convId]: [
            ...(prev[convId] || []),
            {
              _id: msg._id,
              content: msg.content,
              isMine: false, 
              createdAt: msg.createdAt
            }
          ]
        };
      });
    });

    return () => socket.current.disconnect();
  }, []);

  // ================= LOAD CONVERSATIONS =================
  useEffect(() => {
    const fetchConversations = async () => {
      const res = await axios.get(
        'http://localhost:8000/api/conversations',
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setConversations(res.data);
    };

    fetchConversations();
  }, []);

  // ================= LOAD MESSAGES =================
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversation) return;

      const res = await axios.get(
        `http://localhost:8000/api/messages/${activeConversation._id}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      const myId = getMyId();

      const formatted = res.data.map(msg => ({
        _id: msg._id,
        content: msg.content,
        isMine: msg.senderId._id === myId,
        createdAt: msg.createdAt
      }));

      setMessages(prev => ({
        ...prev,
        [activeConversation._id]: formatted
      }));
    };

    fetchMessages();
  }, [activeConversation]);

  // ================= SEND MESSAGE =================
  const handleSendMessage = async () => {
  if (!inputText.trim() || !activeConversation) return;

  const tempId = Date.now().toString();

  // ✅ HIỆN NGAY
  setMessages(prev => ({
    ...prev,
    [activeConversation._id]: [
      ...(prev[activeConversation._id] || []),
      {
        _id: tempId,
        content: inputText,
        isMine: true
      }
    ]
  }));

  const content = inputText;
  setInputText('');

  try {
    await axios.post(
      'http://localhost:8000/api/messages',
      {
        conversationId: activeConversation._id,
        content
      },
      {
        headers: { Authorization: `Bearer ${getToken()}` }
      }
    );
  } catch (err) {
    console.error(err);
  }
};;

  // ================= HELPER =================
  const getFriend = (conv) => {
    const myId = getMyId();
    return conv.members.find(m => m._id !== myId);
  };

  const currentMessages = activeConversation
    ? (messages[activeConversation._id] || [])
    : [];

  // ================= UI =================
  return (
    <div className="app-container">

      {/* ===== SIDEBAR ===== */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Messenger</h3>
        </div>

        <div className="friend-list">
          {conversations.map(conv => {
            const friend = getFriend(conv);

            return (
              <div
                key={conv._id}
                className={`friend-item ${
                  activeConversation?._id === conv._id ? 'active' : ''
                }`}
                onClick={() => setActiveConversation(conv)}
              >
                <div className="avatar">
                  {friend?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <strong>{friend?.username}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== CHAT WINDOW ===== */}
      <div className="chat-window">

        {/* HEADER */}
        <div className="chat-header">
          {activeConversation
            ? getFriend(activeConversation)?.username
            : 'Chọn một cuộc trò chuyện'}
        </div>

        {/* MESSAGES */}
        <div className="chat-messages">
          {currentMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'gray' }}>
              Hãy bắt đầu cuộc trò chuyện
            </div>
          ) : (
            currentMessages.map(msg => (
              <div
                key={msg._id}
                className={`message ${msg.isMine ? 'mine' : ''}`}
              >
                {msg.content}
              </div>
            ))
          )}
        </div>

        {/* INPUT */}
        <div className="chat-input-area">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSendMessage();
            }}}
            placeholder="Nhập tin nhắn..."
          />
          <button onClick={handleSendMessage}>Gửi</button>
        </div>
      </div>
    </div>
  );
}

export default Chat;