import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Menu, Button, ConfigProvider } from 'antd';
import { LogoutOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';

// 页面组件引入
import Login from './pages/Login';
import ClubList from './pages/ClubList';
import ClubDetail from './pages/ClubDetail';
import ApplyForm from './pages/ApplyForm';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute'; // 确保你建了这文件

import 'antd/dist/reset.css';

// ==========================================
// 🎨 全局布局组件：负责导航栏的动态显示
// ==========================================
const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = localStorage.getItem('user_name');
  const userRole = localStorage.getItem('user_role');

  // 如果是登录页，不显示导航栏
  if (location.pathname === '/login') return children;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // 🌟 C端菜单 (学生)
  const studentMenuItems = [
    { key: '/clubs', label: '发现社团', onClick: () => navigate('/clubs') },
    { key: '/my-applications', label: '我的报名', onClick: () => navigate('/my-applications') },
  ];

  // 🌟 B端菜单 (管理员)
  const adminMenuItems = [
    { key: '/admin/dashboard', label: '数据看板 & 岗位发布', onClick: () => navigate('/admin/dashboard') },
    { key: '/admin/pool', label: '报名审批管理', onClick: () => navigate('/admin/pool') },
  ];

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: userRole === 'admin' ? '#002329' : '#001529', // 管理员端用墨绿色区分
        padding: '0 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', marginRight: '40px' }}>
          {userRole === 'admin' ? '社团管理后台' : '招新广场'}
        </div>
        
        <Menu 
          mode="horizontal" 
          theme="dark" 
          selectedKeys={[location.pathname]}
          style={{ flex: 1, background: 'transparent' }} 
          items={userRole === 'admin' ? adminMenuItems : studentMenuItems} 
        />

        {userName && (
          <div style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              marginRight: '12px', 
              fontSize: '12px', 
              background: userRole === 'admin' ? '#52c41a' : '#1890ff', 
              padding: '2px 8px', 
              borderRadius: '4px' 
            }}>
              {userRole === 'admin' ? <><CrownOutlined /> 管理员</> : <><UserOutlined /> 学生</>}
            </span>
            <span style={{ marginRight: '15px' }}>{userName}</span>
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={handleLogout} 
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              退出
            </Button>
          </div>
        )}
      </div>
      <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f5f7fa' }}>
        {children}
      </div>
    </>
  );
};

// ==========================================
// 🚦 路由主入口
// ==========================================
function App() {
  return (
    <ConfigProvider theme={{ token: { borderRadius: 8 } }}>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            {/* 1. 公开路由 */}
            <Route path="/login" element={<Login />} />

            {/* 2. 学生路由 (C端) */}
            <Route path="/clubs" element={
              <ProtectedRoute allowedRoles={['student']}>
                <ClubList />
              </ProtectedRoute>
            } />
            <Route path="/club/:id" element={<ClubDetail />} />
            <Route path="/apply/:clubId/:roleId" element={
              <ProtectedRoute allowedRoles={['student']}>
                <ApplyForm />
              </ProtectedRoute>
            } />

            {/* 3. 管理员路由 (B端) */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* 4. 默认跳转逻辑 */}
            <Route path="/" element={<Navigate to="/clubs" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;