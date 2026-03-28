import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  // 从本地缓存读取身份信息
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('user_role'); // 'student' 或 'admin'

  // 1. 如果根本没登录，直接踢回登录页
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. 如果登录了，但身份不匹配（比如学生想进管理员后台）
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // 提示权限不足并跳转回各自的首页
    alert("权限不足，无法访问该页面！");
    return userRole === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/clubs" />;
  }

  // 3. 身份校验通过，允许通行
  return children;
};

export default ProtectedRoute;