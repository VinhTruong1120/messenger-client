import React from 'react';

function Sidebar({ conversations, activeConversation, setActiveConversation, myId }) {
  // Helper lấy thông tin người bạn chat cùng
  const getFriend = (conv) => {
    return conv.members.find(m => m._id !== myId);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Messenger</h3>
      </div>

      <div className="friend-list">
        {conversations.map(conv => {
          const friend = getFriend(conv);
          const lastMsgText = conv.lastMessage?.text || "Chưa có tin nhắn";

          return (
            <div
              key={conv._id}
              className={`friend-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
              onClick={() => setActiveConversation(conv)}
            >
              <div className="avatar">
                {friend?.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <strong>{friend?.username}</strong>
                <div style={{ fontSize: '13px', color: 'gray', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lastMsgText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;