import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, message, Card } from 'antd';
import api from '../utils/api';

const { Title } = Typography;

const MyApplications = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      // 调用后端获取我的报名记录接口 (PRD 9.8)
      const response = await api.get('/applications/');
      setData(response.data);
    } catch (error) {
      message.error('获取报名记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 状态颜色字典
  const statusConfig = {
    DRAFT: { color: 'default', text: '草稿' },
    PENDING: { color: 'blue', text: '待审核' },
    INTERVIEWING: { color: 'orange', text: '面试中' },
    ACCEPTED: { color: 'green', text: '已录取 🎉' },
    REJECTED: { color: 'red', text: '未通过' },
    CANCELED: { color: 'default', text: '已取消' },
  };

  // 定义表格的列
  const columns = [
    {
      title: '报名社团',
      dataIndex: ['club', 'name'],
      key: 'club_name',
      render: (text) => <b>{text}</b>,
    },
    {
      title: '申请岗位',
      dataIndex: ['role', 'role_name'],
      key: 'role_name',
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusConfig[status]?.color || 'default'}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>📝 我的报名进度</Title>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default MyApplications;