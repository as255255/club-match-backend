import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Tag, Divider, Typography, message, Spin, Empty } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Paragraph, Text } = Typography;

const ClubDetail = () => {
  const { id } = useParams(); // 从网址获取社团 ID
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🌟 核心：从本地存储获取当前用户的角色
  const userRole = localStorage.getItem('user_role');

  useEffect(() => {
    fetchClubDetail();
  }, [id]);

  const fetchClubDetail = async () => {
    try {
      const res = await api.get(`/clubs/${id}`);
      setClub(res.data);
    } catch (err) {
      message.error('获取社团详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  if (!club) return <Empty description="找不到该社团信息" />;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        返回列表
      </Button>

      <Card
        cover={<img alt="cover" src={club.cover_url || 'https://via.placeholder.com/800x400'} style={{ height: 300, objectFit: 'cover' }} />}
        actions={[
          // 🚦 权限感知按钮逻辑
          userRole === 'admin' ? (
            <Button type="primary" danger icon={<EditOutlined />} onClick={() => message.info('管理功能开发中...')}>
              编辑社团资料 (部长权限)
            </Button>
          ) : (
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={() => {
                message.info('💡 请在社团大厅点击该社团的“一键报名”，选择你想投递的具体岗位！');
                navigate('/clubs');
            }}>
            </Button>
          )
        ]}
      >
        <Title level={2}>{club.name}</Title>
        <div style={{ marginBottom: 15 }}>
          {club.tags && club.tags.map(tag => (
            <Tag color="blue" key={tag}>{tag}</Tag>
          ))}
        </div>

        <Divider />

        <Title level={4}>社团简介</Title>
        <Paragraph style={{ fontSize: '16px', lineHeight: '1.8' }}>
          {club.description || '该社团暂无详细介绍。'}
        </Paragraph>

        <Divider />

        <Title level={4}>招新岗位</Title>
        <Paragraph>
          <Text strong>当前开放：</Text> {club.positions || '全员招新中'}
        </Paragraph>
      </Card>
    </div>
  );
};

export default ClubDetail;