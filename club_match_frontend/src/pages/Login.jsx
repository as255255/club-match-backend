import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Radio, Tabs } from 'antd';
import { UserOutlined, IdcardOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login'); // 控制当前显示登录还是注册
  const [loginForm] = Form.useForm();
  const navigate = useNavigate();

  // ==========================================
  // 1. 处理注册逻辑
  // ==========================================
  const onRegister = async (values) => {
    setLoading(true);
    try {
      await api.post('/users/register', {
        student_id: values.student_id,
        name: values.name,
        password: values.password,
        role: values.role, // 将注册身份发给后端
      });
      message.success('🎉 注册成功！请直接登录。');
      
      // 注册成功后，自动把学号和身份填入登录表单，并切换到登录 Tab
      loginForm.setFieldsValue({ student_id: values.student_id, role: values.role });
      setActiveTab('login');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        message.warning(error.response.data.detail || '该学号已被注册！');
      } else {
        message.error('注册失败，请检查网络（如果是云端可能在冷启动，请等30秒再试）');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. 处理登录逻辑
  // ==========================================
  const onLogin = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/users/login', {
        student_id: values.student_id,
        password: values.password,
      });
      
      // 保存身份牌 (Token) 和基础信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', response.data.id);
      localStorage.setItem('user_name', response.data.name);
      localStorage.setItem('user_role', values.role); // 存储前端选择的身份
      
      message.success(`欢迎回来，${response.data.name}！`);
      
      // 根据选择的身份，跳往不同的专属页面
      if (values.role === 'admin') {
        navigate('/admin/dashboard'); 
      } else {
        navigate('/profile'); 
      }
      
    } catch (error) {
      if (error.response && error.response.status === 401) {
        message.error('密码错误，请重新输入！');
      } else if (error.response && error.response.status === 404) {
        message.error('学号不存在，请先切换到【注册】页面创建账号！');
      } else {
        message.error('登录失败，请检查网络设置');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 视图：登录表单
  // ==========================================
  const renderLoginForm = () => (
    <Form form={loginForm} name="login" onFinish={onLogin} size="large" initialValues={{ role: 'student' }}>
      <Form.Item name="role" style={{ textAlign: 'center' }}>
        <Radio.Group optionType="button" buttonStyle="solid">
          <Radio.Button value="student">👨‍🎓 我是学生</Radio.Button>
          <Radio.Button value="admin">🏢 我是社团管理员</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="student_id" rules={[{ required: true, message: '请输入你的学号/工号！' }]}>
        <Input prefix={<IdcardOutlined />} placeholder="请输入学号/工号" />
      </Form.Item>

      <Form.Item name="password" rules={[{ required: true, message: '请输入密码！' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>登录系统</Button>
      </Form.Item>
    </Form>
  );

  // ==========================================
  // 视图：注册表单
  // ==========================================
  const renderRegisterForm = () => (
    <Form name="register" onFinish={onRegister} size="large" initialValues={{ role: 'student' }}>
      <Form.Item name="role" style={{ textAlign: 'center' }}>
        <Radio.Group optionType="button" buttonStyle="solid">
          <Radio.Button value="student">👨‍🎓 注册为新生</Radio.Button>
          <Radio.Button value="admin">🏢 注册为管理员</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="student_id" rules={[{ required: true, message: '请输入你的学号/工号！' }]}>
        <Input prefix={<IdcardOutlined />} placeholder="请输入学号/工号" />
      </Form.Item>

      <Form.Item name="name" rules={[{ required: true, message: '请输入你的真实姓名！' }]}>
        <Input prefix={<UserOutlined />} placeholder="请输入姓名" />
      </Form.Item>

      <Form.Item name="password" rules={[{ required: true, message: '请设置密码！' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="请设置一个强密码" />
      </Form.Item>

      <Form.Item 
        name="confirm" 
        dependencies={['password']}
        rules={[
          { required: true, message: '请再次确认密码！' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致，请仔细检查！'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
          立即注册
        </Button>
      </Form.Item>
    </Form>
  );

  // ==========================================
  // 页面主体骨架
  // ==========================================
  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', borderRadius: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Title level={3}>🎓 智能社团招新平台</Title>
          <Text type="secondary">安全、高效的一站式校园招新系统</Text>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key)} 
          centered 
          size="large"
          items={[
            { key: 'login', label: '账号登录', children: renderLoginForm() },
            { key: 'register', label: '新人注册', children: renderRegisterForm() },
          ]}
        />
      </Card>
    </div>
  );
};

export default Login;