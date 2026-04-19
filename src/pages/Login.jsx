import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios'; // 1. Import axios

function Login() {
  const [email, setEmail] = useState(''); // Chuyển thành email nếu backend của bạn dùng email
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State để hiển thị lỗi (sai pass, sai email...)
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Xóa lỗi cũ khi bấm đăng nhập lại

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      // 2. Gửi request POST xuống Backend (Nhớ check đúng cổng 8000 của bạn)
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        email: email, 
        password: password
      });

      // 3. Nếu thành công, Backend sẽ trả về token. Ta lưu nó vào LocalStorage
      const token = response.data.token;
      localStorage.setItem('token', token);
      
      console.log("Đăng nhập thành công! Token:", token);

      // 4. Chuyển hướng sang trang Chat
      navigate('/chat');
      
    } catch (err) {
      // Bắt lỗi từ Backend trả về (sai mật khẩu, không tìm thấy user...)
      console.error("Lỗi đăng nhập:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message);
      } else {
        setError("Không thể kết nối đến Server!");
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <form 
        onSubmit={handleLogin}
        style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '15px', width: '350px' }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Đăng Nhập</h2>
        
        {/* Hiển thị lỗi màu đỏ nếu có */}
        {error && <div style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>{error}</div>}

        <input 
          type="email" // Tùy backend của bạn dùng email hay username nhé
          placeholder="Email của bạn" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        
        <input 
          type="password" 
          placeholder="Mật khẩu" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        
        <button type="submit" style={{ padding: '10px', background: '#0084ff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
          Vào Chat Ngay
        </button>
        <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '10px' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: '#0084ff', textDecoration: 'none', fontWeight: 'bold' }}>Đăng ký ngay</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;