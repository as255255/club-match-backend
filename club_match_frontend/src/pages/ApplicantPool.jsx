import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Card, Typography } from 'antd';
import api from '../utils/api';

const { Title } = Typography;

const ApplicantPool = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const clubId = localStorage.getItem('managed_club_id');

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      const res = await api.get(`/applications/club/${clubId}`);
      setData(res.data);
    } catch (err) {
      // 演示 Mock
      setData([
        { id: 1, user_name: '张同学', role_name: '算法组', status: 'PENDING' },
        { id: 2, user_name: '李同学', role_name: '宣传部', status: 'PENDING' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (appId, newStatus) => {
    try {
      await api.put(`/applications/${appId}/status`, { status: newStatus });
      message.success('操作成功！');
      fetchApplicants(); // 刷新列表
    } catch (err) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '申请人', dataIndex: 'user_name', key: 'user_name' },
    { title: '申请岗位', dataIndex: 'role_name', key: 'role_name' },
    { title: '当前状态', dataIndex: 'status', render: s => <Tag color="gold">{s}</Tag> },
    {
      title: '审批操作',
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => handleStatus(record.id, 'ACCEPTED')}>录取</Button>
          <Button danger onClick={() => handleStatus(record.id, 'REJECTED')}>拒绝</Button>
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <Title level={3}>📥 报名审批中心</Title>
      <Table columns={columns} dataSource={data} loading={loading} rowKey="id" />
    </Card>
  );
};

export default ApplicantPool;