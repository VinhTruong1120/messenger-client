// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Kiểm tra cơ bản trước khi gửi
    if (!username || !email || !password) {
      setError("Vui lòng điền đầy đủ các trường!");
      setLoading(false);
      return;
    }

    try {
      // Gọi API đăng ký của Backend
      await axios.post('http://localhost:8000/api/auth/register', {
        username,
        email,
        password
      });

      alert("Đăng ký thành công! Hãy đăng nhập nhé.");
      navigate('/login'); // Chuyển sang trang Login
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
      setError(err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <form 
        onSubmit={handleRegister}
        style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '15px', width: '380px' }}
      >
        <h2 style={{ textAlign: 'center', color: '#0084ff' }}>Tạo Tài Khoản Mới</h2>
        
        {error && <div style={{ color: 'red', textAlign: 'center', fontSize: '14px', background: '#fff2f0', padding: '10px', borderRadius: '4px' }}>{error}</div>}

        <input 
          type="text" 
          placeholder="Tên hiển thị (Username)" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
        />

        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
        />
        
        <input 
          type="password" 
          placeholder="Mật khẩu" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', background: loading ? '#ccc' : '#0084ff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
        >
          {loading ? 'Đang xử lý...' : 'Đăng Ký Ngay'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '10px' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: '#0084ff', textDecoration: 'none', fontWeight: 'bold' }}>Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;