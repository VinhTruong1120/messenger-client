// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Register from './pages/Register';


function App() {
  return (
    // Bọc toàn bộ ứng dụng bằng BrowserRouter
    <BrowserRouter>
      <Routes>
        {/* Nếu người dùng vào trang chủ (/), tự động đá họ sang /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Định nghĩa các đường dẫn */}
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/register" element={<Register />} />
        
        {/* Đường dẫn mặc định nếu gõ bậy (trang 404) */}
        <Route path="*" element={<h2>404 - Không tìm thấy trang</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;