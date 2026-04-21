import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import '../App.css';

function Chat() {
  const socket = useRef(null);

  const [myId] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])).id : null;
  });

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});

  const getToken = () => localStorage.getItem('token');

  // ================= HELPER: CẬP NHẬT TOP SIDEBAR =================
  const updateConversationOnNewMessage = (convId, messageContent, senderId) => {
    setConversations(prevConvs => {
      const convIndex = prevConvs.findIndex(c => c._id === convId);
      if (convIndex > -1) {
        const updatedConvs = [...prevConvs];
        const [movedConv] = updatedConvs.splice(convIndex, 1);
        
        movedConv.lastMessage = {
          text: messageContent,
          senderId: senderId,
          createdAt: new Date()
        };
        
        updatedConvs.unshift(movedConv);
        return updatedConvs;
      }
      return prevConvs;
    });
  };

  // Thêm hàm load thêm tin nhắn
  const loadMoreMessages = async () => {
    console.log("Đã cuộn lên top! Bắt đầu gọi API load thêm tin nhắn ở đây...");
    const convId = activeConversation._id;
    // Giả sử mỗi chat ta lưu trữ số page đã load
    const nextPage = (messages[convId]?.currentPage || 1) + 1;

    try {
        const res = await axios.get(
        `http://localhost:8000/api/messages/${convId}?page=${nextPage}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
        );

        if (res.data.length > 0) {
        const formatted = res.data.map(msg => ({
            _id: msg._id,
            content: msg.content,
            isMine: msg.senderId._id === myId,
            createdAt: msg.createdAt
        }));

        setMessages(prev => {
            const currentList = prev[convId] || [];
            const newUniqueMessages = formatted.filter(
            newMsg => !currentList.some(oldMsg => oldMsg._id === newMsg._id)
          );
          return {
            ...prev,
            [convId]: [...newUniqueMessages, ...currentList] // Tin cũ nối vào ĐẦU mảng
          };
        });
        }
    } catch (error) {
        console.error("Lỗi load thêm tin nhắn:", error);
    }
  };

  // ================= 1. SOCKET =================
  useEffect(() => {
    if (!myId) return;

    socket.current = io('http://localhost:8000');
    socket.current.on('connect', () => {
      socket.current.emit('addUser', myId);
    });

    socket.current.on('getMessage', (msg) => {

      console.log("⚡ Nhận được tin nhắn từ Socket:", msg);
        
      if (msg.senderId === myId) return; // Chặn tiếng vọng
       
      const convId = msg.conversationId;

      updateConversationOnNewMessage(convId, msg.content, msg.senderId);

      setMessages(prev => {
        const exists = prev[convId]?.some(m => m._id === msg._id);
        if (exists) return prev;

        // Cập nhật nhảy Top ở Sidebar
       
        return {
          ...prev,
          [convId]: [
            ...(prev[convId] || []),
            { _id: msg._id, content: msg.content, isMine: false, createdAt: msg.createdAt }
          ]
        };
      });
    });

    return () => socket.current.disconnect();
  }, [myId]);

  // ================= 2. LOAD CONVERSATIONS =================
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/conversations', { 
          headers: { Authorization: `Bearer ${getToken()}` } 
        });
        setConversations(res.data);
      } catch (error) { console.error(error); }
    };
    if (myId) fetchConversations();
  }, [myId]);

  // ================= 3. LOAD MESSAGES =================
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversation) return;
      try {
        const res = await axios.get(`http://localhost:8000/api/messages/${activeConversation._id}`, { 
          headers: { Authorization: `Bearer ${getToken()}` } 
        });
        const formatted = res.data.map(msg => ({
          _id: msg._id, content: msg.content, isMine: msg.senderId._id === myId, createdAt: msg.createdAt
        }));
        setMessages(prev => ({ ...prev, [activeConversation._id]: formatted }));
      } catch (error) { console.error(error); }
    };
    fetchMessages();
  }, [activeConversation, myId]);

  // ================= 4. GỬI TIN NHẮN =================
  const handleSendMessage = async (contentToSend) => {
    const tempId = Date.now().toString();
    const convId = activeConversation._id;

    // Optimistic Update UI
    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), { _id: tempId, content: contentToSend, isMine: true }]
    }));

    // Cập nhật nhảy Top Sidebar
    updateConversationOnNewMessage(convId, contentToSend, myId);

    try {
      await axios.post('http://localhost:8000/api/messages',
        { conversationId: convId, content: contentToSend },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
    } catch (err) { console.error(err); }
  };

  // ================= RENDER =================
  return (
    <div className="app-container">
      <Sidebar 
        conversations={conversations} 
        activeConversation={activeConversation} 
        setActiveConversation={setActiveConversation} 
        myId={myId} 
      />
      
      {activeConversation ? (
        <ChatWindow 
          activeConversation={activeConversation} 
          currentMessages={messages[activeConversation._id] || []} 
          onSendMessage={handleSendMessage} 
          myId={myId} 
          onLoadMore={loadMoreMessages}
        />
      ) : (
        <div className="chat-window" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h3 style={{ color: 'gray' }}>Hãy chọn một cuộc trò chuyện để bắt đầu</h3>
        </div>
      )}
    </div>
  );
}

export default Chat;