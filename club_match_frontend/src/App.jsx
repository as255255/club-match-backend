import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Menu, Button } from 'antd';
import ClubList from './pages/ClubList';
import MyApplications from './pages/MyApplications';
import ClubAdmin from './pages/ClubAdmin';
import Login from './pages/Login';
import InterestProfile from './pages/InterestProfile';
import AdminDashboard from './pages/AdminDashboard'; // 马上就建这个新页面！
import 'antd/dist/reset.css';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('user_name');
  const userRole = localStorage.getItem('user_role'); // 获取身份

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // 🌟 C端专属菜单 (学生)
  const studentMenuItems = [
    { key: 'home', label: '发现社团', onClick: () => navigate('/') },
    { key: 'mine', label: '我的报名', onClick: () => navigate('/my-applications') },
  ];

  // 🌟 B端专属菜单 (管理员)
  const adminMenuItems = [
    { key: 'dashboard', label: '数据看板 & 社团信息', onClick: () => navigate('/admin/dashboard') },
    { key: 'pool', label: '报名审批管理', onClick: () => navigate('/admin/pool') },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: userRole === 'admin' ? '#002329' : '#001529', padding: '0 20px' }}>
        {/* 根据角色动态加载菜单，管理员的导航栏颜色稍微深一点作为区分 */}
        <Menu 
          mode="horizontal" 
          theme="dark" 
          style={{ flex: 1, fontSize: '16px', background: 'transparent' }} 
          items={userRole === 'admin' ? adminMenuItems : studentMenuItems} 
        />
        {userName && (
          <div style={{ color: 'white' }}>
            <span style={{ marginRight: '10px', fontSize: '12px', background: '#1890ff', padding: '2px 8px', borderRadius: '4px' }}>
              {userRole === 'admin' ? '管理员' : '学生'}
            </span>
            欢迎, {userName} 
            <Button type="link" onClick={handleLogout} style={{ color: '#ff4d4f' }}>退出</Button>
          </div>
        )}
      </div>
      {children}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<InterestProfile />} />
        
        {/* C端学生路由 */}
        <Route path="/" element={<MainLayout><ClubList /></MainLayout>} />
        <Route path="/my-applications" element={<MainLayout><MyApplications /></MainLayout>} />
        
        {/* B端管理员路由 */}
        <Route path="/admin/dashboard" element={<MainLayout><AdminDashboard /></MainLayout>} />
        <Route path="/admin/pool" element={<MainLayout><ClubAdmin /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;