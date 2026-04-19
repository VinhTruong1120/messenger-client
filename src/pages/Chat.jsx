import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../App.css';

function Chat() {
  const navigate = useNavigate();
  const socket = useRef(null);
  // ================= STATE QUẢN LÝ GIAO DIỆN =================
  const [viewMode, setViewMode] = useState('welcome'); // 'welcome', 'chat', 'search', 'profile'
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  // ================= STATE DỮ LIỆU =================
  const [friends, setFriends] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // ================= EFFECT LẤY DỮ LIỆU BAN ĐẦU =================
  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, []);
  // ================= EFFECT KẾT NỐI SOCKET =================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socket.current = io('http://localhost:8000');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const myId = payload.id;

      // Vinh đang dùng 'addUser' ở Backend, nên phải khớp chữ A viết hoa
      socket.current.on('connect', () => {
        console.log("Đã kết nối Socket! Tiến hành đăng ký ID...");
        socket.current.emit('addUser', myId); 
      });
      // BẮT SỰ KIỆN TỪ BACKEND CỦA VINH ('getMessage')
      socket.current.on('getMessage', (incomingMsg) => {
        setMessages(prev => {
          const senderId = incomingMsg.senderId;
          const currentChatMessages = prev[senderId] || [];
          
          // Tạo format tin nhắn khớp với giao diện
          const newMessage = {
            _id: Date.now().toString(),
            content: incomingMsg.content, // Lấy content từ bạn bè gửi
            isMine: false 
          };

          return {
            ...prev,
            [senderId]: [...currentChatMessages, newMessage]
          };
        });
      });
    }

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);


  const fetchFriends = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const res = await axios.get('http://localhost:8000/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/friends/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(res.data);
    } catch (err) { console.error(err); }
  };

  // ================= CÁC HÀM XỬ LÝ (ACTIONS) =================
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/users/search?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data);
      setViewMode('search');
    } catch (err) { console.error(err); }
  };

  const handleViewProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(res.data);
      setViewMode('profile');
    } catch (err) { alert("Không thể lấy thông tin người dùng"); }
  };

  const handleSendRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/friends/request', { receiverId: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSentRequests([...sentRequests, id]);
      alert("Đã gửi lời mời kết bạn!");
    } catch (err) { alert(err.response?.data?.message || "Lỗi kết bạn"); }
  };

  const handleAcceptFriend = async (requesterId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/friends/accept', { requesterId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Hai bạn đã trở thành bạn bè!");
      fetchFriends();          // Cập nhật lại cột bạn bè
      fetchPendingRequests();  // Cập nhật lại chuông thông báo
      handleViewProfile(requesterId); // Cập nhật lại nút bấm ở trang profile
    } catch (err) { alert("Lỗi khi đồng ý kết bạn"); }
  };

  const handleRejectFriend = async (requesterId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/friends/reject', { requesterId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingRequests(); // Cập nhật lại chuông
      handleViewProfile(requesterId); // Đổi nút về lại "Kết bạn"
    } catch (err) { alert("Lỗi khi từ chối"); }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChatId) return;

    const token = localStorage.getItem('token');
    // 1. Lấy ID của mình từ token (Base64 decode)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const myId = payload.id;

    const messageContent = inputText; // Giữ lại nội dung để gửi API
    const receiverId = activeChatId;

    // 2. Tạo object tin nhắn tạm thời để hiển thị ngay lên màn hình
    const tempMessage = {
      _id: Date.now().toString(),
      content: messageContent, // Dùng 'content' cho giống file socket của Vinh
      isMine: true,
      createdAt: new Date()
    };

    // Cập nhật UI ngay lập tức cho "sướng" mắt
    setMessages(prev => ({
      ...prev,
      [receiverId]: [...(prev[receiverId] || []), tempMessage]
    }));
    setInputText('');

    // 3. Bắn Socket cho người kia thấy Realtime
    socket.current.emit('sendMessage', {
      senderId: myId,
      receiverId: receiverId,
      content: messageContent
    });

    // 4. GỌI API LƯU VÀO DATABASE
    try {
      await axios.post('http://localhost:8000/api/messages/send',
        {
          receiverId: receiverId,
          content: messageContent
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      console.log("✅ Đã lưu tin nhắn vào Database");
    } catch (error) {
      console.error("❌ Lỗi lưu tin nhắn:", error);
      // Option: Có thể hiện dấu chấm than đỏ cạnh tin nhắn nếu lỗi
    }
  };

  // ================= RENDER BIẾN PHỤ =================
  const activeFriend = friends.find(f => f._id === activeChatId);
  const currentMessages = activeChatId ? (messages[activeChatId] || []) : [];

  return (
    <div className="app-container">
      {/* ================= CỘT TRÁI (SIDEBAR) ================= */}
      <div className="sidebar">

        {/* Header đã fix layout */}
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', borderBottom: '1px solid #ddd' }}>
          {/* Hàng 1: Tiêu đề & Menu */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, cursor: 'pointer', color: '#0084ff' }} onClick={() => setViewMode('welcome')}>
              Messenger
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

              {/* Nút Chuông */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotiDropdown(!showNotiDropdown)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: 0, position: 'relative' }}
                >
                  🔔
                  {pendingRequests.length > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                {/* Dropdown thông báo */}
                {showNotiDropdown && (
                  <div className="noti-dropdown" style={{ position: 'absolute', top: '40px', right: '0', width: '250px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, border: '1px solid #ddd' }}>
                    <h4 style={{ padding: '10px', borderBottom: '1px solid #eee', margin: 0 }}>Lời mời kết bạn</h4>
                    {pendingRequests.length === 0 ? (
                      <p style={{ padding: '10px', fontSize: '13px', color: 'gray', margin: 0 }}>Không có thông báo mới</p>
                    ) : (
                      pendingRequests.map(req => (
                        <div
                          key={req._id}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                          onClick={() => {
                            handleViewProfile(req.from._id);
                            setShowNotiDropdown(false);
                          }}
                        >
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0084ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                            {req.from.username[0].toUpperCase()}
                          </div>
                          <div style={{ fontSize: '13px' }}>
                            <strong>{req.from.username}</strong> gửi lời mời
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Hàng 2: Thanh tìm kiếm */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tìm bạn mới..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none' }}
            />
            <button onClick={handleSearch} style={{ padding: '10px 20px', background: '#0084ff', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
              Tìm
            </button>
          </div>
        </div>

        {/* Danh sách bạn bè */}
        <div className="friend-list" style={{ overflowY: 'auto', flex: 1 }}>
          <p style={{ padding: '10px 15px', fontSize: '12px', color: '#65676b', fontWeight: 'bold', margin: 0 }}>DANH SÁCH BẠN BÈ</p>
          {friends.map(f => (
            <div
              key={f._id}
              className={`friend-item ${activeChatId === f._id && viewMode === 'chat' ? 'active' : ''}`}
              onClick={() => { setActiveChatId(f._id); setViewMode('chat'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            >
              <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                {f.avatar ? <img src={f.avatar} alt="avt" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : f.username[0].toUpperCase()}
              </div>
              <div>
                <strong style={{ display: 'block' }}>{f.username}</strong>
                <span style={{ fontSize: '12px', color: f.status === 'online' ? '#00a400' : 'gray' }}>
                  {f.status === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CỘT PHẢI (NỘI DUNG) ================= */}
      <div className="chat-window">

        {/* MÀN HÌNH CHỜ */}
        {viewMode === 'welcome' && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'gray' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>👋</div>
            <h2>Chào mừng trở lại!</h2>
            <p>Hãy chọn một đoạn chat hoặc tìm kiếm bạn bè mới.</p>
          </div>
        )}

        {/* MÀN HÌNH TÌM KIẾM */}
        {viewMode === 'search' && (
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, overflowY: 'auto' }}>
            <h3>Kết quả tìm kiếm cho: "{searchQuery}"</h3>
            <div style={{ marginTop: '20px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {searchResults.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'gray' }}>Không tìm thấy ai.</p>
              ) : (
                searchResults.map(user => (
                  <div key={user._id} className="search-item" onClick={() => handleViewProfile(user._id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                        {user.username[0].toUpperCase()}
                      </div>
                      <strong>{user.username}</strong>
                    </div>
                    <button style={{ background: 'transparent', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
                      Xem hồ sơ
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MÀN HÌNH PROFILE */}
        {viewMode === 'profile' && selectedUser && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
            <div style={{ background: 'white', width: '400px', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '100%', height: '120px', background: 'linear-gradient(to right, #00c6ff, #0072ff)', borderRadius: '10px 10px 0 0', position: 'absolute', top: 0 }}></div>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#ccc', border: '5px solid white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', fontWeight: 'bold', color: 'white', position: 'relative', zIndex: 1, marginTop: '50px' }}>
                {selectedUser.username[0].toUpperCase()}
              </div>
              <h2 style={{ marginTop: '10px', marginBottom: '5px' }}>{selectedUser.username}</h2>
              <p style={{ color: 'gray', margin: 0 }}>{selectedUser.email}</p>

              <div style={{ margin: '20px 0', borderTop: '1px solid #eee', paddingTop: '20px', width: '100%', textAlign: 'center' }}>
                <p style={{ margin: '5px 0' }}><strong>Trạng thái:</strong> <span style={{ color: selectedUser.status === 'online' ? 'green' : 'gray' }}>{selectedUser.status}</span></p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                {selectedUser.friendshipStatus === 'friends' && (
                  <button onClick={() => { setActiveChatId(selectedUser._id); setViewMode('chat'); }} style={{ background: '#0084ff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Nhắn tin ngay
                  </button>
                )}
                {selectedUser.friendshipStatus === 'request_sent' && (
                  <button disabled style={{ background: '#e4e6eb', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold' }}>
                    Đã gửi lời mời
                  </button>
                )}
                {selectedUser.friendshipStatus === 'request_received' && (
                  <>
                    <button onClick={() => handleAcceptFriend(selectedUser._id)} style={{ background: '#0084ff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Đồng ý kết bạn
                    </button>
                    <button onClick={() => handleRejectFriend(selectedUser._id)} style={{ background: 'transparent', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Từ chối
                    </button>
                  </>
                )}
                {selectedUser.friendshipStatus === 'none' && (
                  <button onClick={() => handleSendRequest(selectedUser._id)} style={{ background: '#0084ff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Kết bạn
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MÀN HÌNH CHAT */}
        {viewMode === 'chat' && activeFriend && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="chat-header" style={{ padding: '20px', background: 'white', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                {activeFriend.username[0].toUpperCase()}
              </div>
              <div>
                <strong style={{ display: 'block' }}>{activeFriend.username}</strong>
                <span style={{ fontSize: '12px', color: activeFriend.status === 'online' ? '#00a400' : 'gray' }}>
                  {activeFriend.status === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </span>
              </div>
            </div>

            <div className="chat-messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'gray', marginTop: '20px' }}>Hãy gửi lời chào đầu tiên!</div>
              ) : (
                currentMessages.map(msg => (
                  <div key={msg._id} className={`message ${msg.isMine ? 'mine' : ''}`}>
                    {msg.content}
                  </div>
                ))
              )}
            </div>

            <div className="chat-input-area" style={{ padding: '20px', background: 'white', display: 'flex', gap: '10px', borderTop: '1px solid #ddd' }}>
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, padding: '12px 15px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
              />
              <button onClick={handleSendMessage} style={{ padding: '10px 25px', background: '#0084ff', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                Gửi
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Chat;