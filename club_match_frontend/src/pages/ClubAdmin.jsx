import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Typography, message, Card, Space, Popconfirm } from 'antd';
import api from '../utils/api';

const { Title, Text } = Typography;

const ClubAdmin = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 假设当前登录的社团管理员管理的是“吉他社”(club_id = 1)
  // 实际业务中，这里应该从管理员的登录 token 或缓存中获取其管理的 club_id
  const currentClubId = 1;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get(`/applications/club/${currentClubId}`);
      setData(response.data);
    } catch (error) {
      message.error('获取报名池数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 审批操作：调用后端的 PATCH /api/applications/{id}/status 接口
  const handleStatusChange = async (appId, newStatus) => {
    try {
      await api.patch(`/applications/${appId}/status`, null, {
        params: { status: newStatus }
      });
      message.success('状态更新成功！');
      fetchApplications(); // 刷新表格
    } catch (error) {
      message.error('操作失败');
    }
  };

  const statusConfig = {
    PENDING: { color: 'blue', text: '待审核' },
    INTERVIEWING: { color: 'orange', text: '面试中' },
    ACCEPTED: { color: 'green', text: '已录取' },
    REJECTED: { color: 'red', text: '已婉拒' },
  };

  const columns = [
    {
      title: '申请人',
      dataIndex: ['user', 'name'],
      key: 'user_name',
      render: (text, record) => (
        <div>
          <b>{text}</b>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.user.academy} - {record.user.major}
          </div>
        </div>
      )
    },
    {
      title: '学号',
      dataIndex: ['user', 'student_id'],
      key: 'student_id',
    },
    {
      title: '申请岗位',
      dataIndex: ['role', 'role_name'],
      key: 'role_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusConfig[status]?.color || 'default'}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: '操作 (快捷审批)',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'PENDING' && (
            <Button type="primary" size="small" onClick={() => handleStatusChange(record.id, 'INTERVIEWING')}>
              邀约面试
            </Button>
          )}
          {record.status === 'INTERVIEWING' && (
            <Popconfirm title="确定录取该同学吗？" onConfirm={() => handleStatusChange(record.id, 'ACCEPTED')}>
              <Button type="primary" size="small" style={{ background: '#52c41a', borderColor: '#52c41a' }}>录用</Button>
            </Popconfirm>
          )}
          {['PENDING', 'INTERVIEWING'].includes(record.status) && (
            <Popconfirm title="确定婉拒该同学吗？" onConfirm={() => handleStatusChange(record.id, 'REJECTED')}>
              <Button danger size="small">婉拒</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>🏢 社团招新工作台</Title>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          // 展开行：展示附加题的回答
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ margin: 0, padding: '10px 20px', background: '#fafafa', borderRadius: '8px' }}>
                <Text strong>附加题回答：</Text>
                {record.answers && record.answers.length > 0 ? (
                  <ul style={{ marginTop: '8px' }}>
                    {record.answers.map(ans => (
                      <li key={ans.id} style={{ marginBottom: '4px' }}>
                        <Text type="secondary">{ans.question_id}: </Text>
                        <Text>{ans.answer}</Text>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text type="secondary" style={{ marginLeft: '10px' }}>该候选人没有填写附加题。</Text>
                )}
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default ClubAdmin;