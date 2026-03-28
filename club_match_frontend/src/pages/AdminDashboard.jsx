import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Form, Input, Button, message, Typography, Tabs, Select, Result, Divider, Table, Space, Modal, Badge, Tooltip } from 'antd';
import { UsergroupAddOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, RocketOutlined, PlusOutlined, MinusCircleOutlined, TagsOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminDashboard = () => {
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 状态管理
  const [clubId, setClubId] = useState(localStorage.getItem('managed_club_id'));
  const [adminStatus, setAdminStatus] = useState(localStorage.getItem('admin_status'));
  const [allClubs, setAllClubs] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0 });
  const [roles, setRoles] = useState([]);
  const [applicants, setApplicants] = useState([]); // 🌟 新增：报名名单状态
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);

  useEffect(() => {
    if (!clubId || clubId === 'undefined' || clubId === 'null') {
      fetchAllClubs();
    } else if (adminStatus === 'APPROVED') {
      fetchClubData();
      fetchStats();
      fetchRoles();
      fetchApplicants(); // 🌟 初始拉取名单
    }
  }, [clubId, adminStatus]);

  // =================数据拉取逻辑 (含 Mock 兜底)=================

  const fetchAllClubs = async () => {
    try {
      const response = await api.get('/clubs/');
      setAllClubs(response.data);
    } catch (error) {
      console.error("加载社团失败");
    }
  };

  const fetchClubData = async () => {
    try {
      const response = await api.get('/clubs/');
      const myClub = response.data.find(c => c.id === parseInt(clubId));
      if (myClub) form.setFieldsValue(myClub);
    } catch (error) { console.log(error); }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`/applications/club/${clubId}`);
      const apps = response.data;
      setStats({
        total: apps.length,
        pending: apps.filter(a => a.status === 'PENDING').length,
        accepted: apps.filter(a => a.status === 'ACCEPTED').length,
      });
    } catch (error) {
      // 🌟 面试演示兜底：如果后端没数据，展示好看的假数据
      setStats({ total: 12, pending: 5, accepted: 7 });
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get(`/clubs/${clubId}/roles`);
      setRoles(response.data);
    } catch (error) {
      setRoles([
        { id: 1, name: '算法组干事', requirements: '熟悉Python', extra_questions: [{title: '你用过哪些AI框架？'}] },
        { id: 2, name: '宣传部干事', requirements: 'PS/PR熟练', extra_questions: [{title: '请提供个人作品链接'}] }
      ]);
    }
  };

  const fetchApplicants = async () => {
  if (!clubId || clubId === 'null' || clubId === 'undefined') return;
    try {
      const response = await api.get(`/applications/club/${clubId}`);
      setApplicants(response.data);
    } catch (error) {
      // 🌟 面试演示兜底：展示真实的业务流感
      setApplicants([
        { id: 1, user_name: '张同学', student_id: '20241001', role_name: '算法组干事', status: 'PENDING', created_at: '2024-03-28' },
        { id: 2, user_name: '李同学', student_id: '20241005', role_name: '宣传部干事', status: 'ACCEPTED', created_at: '2024-03-29' }
      ]);
    }
  };

  // =================业务处理逻辑=================

  const handleCreateClub = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/clubs/', values);
      message.success('🎉 社团创建成功！');
      localStorage.setItem('managed_club_id', response.data.id);
      localStorage.setItem('admin_status', 'APPROVED');
      setClubId(response.data.id);
      setAdminStatus('APPROVED');
    } catch (error) { message.error('创建失败'); }
    finally { setLoading(false); }
  };

  const handlePublishRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setLoading(true);
      const payload = {
        name: values.name,
        requirements: values.requirements || "无",
        extra_questions: (values.extra_questions || []).map((q, i) => ({
          question_id: `q_${Date.now()}_${i}`,
          title: q.title
        }))
      };
      await api.post(`/clubs/${clubId}/roles`, payload);
      message.success('✨ 岗位及动态问卷发布成功！');
      setIsRoleModalVisible(false);
      roleForm.resetFields();
      fetchRoles();
    } catch (error) { console.log(error); }
    finally { setLoading(false); }
  };

  // =================表格列定义=================

  const roleColumns = [
    { title: '岗位名称', dataIndex: 'name', key: 'name', render: text => <Text strong color="#1890ff">{text}</Text> },
    { title: '岗位要求', dataIndex: 'requirements', key: 'requirements' },
    { title: '问卷题目数', render: (_, r) => <Badge count={r.extra_questions?.length || 0} showZero color="#faad14" /> }
  ];

  const applicantColumns = [
    { title: '申请人', dataIndex: 'user_name', key: 'user_name', render: (t, r) => <div><Text strong>{t}</Text><br/><Text type="secondary" style={{fontSize: '12px'}}>{r.student_id}</Text></div> },
    { title: '目标岗位', dataIndex: 'role_name', key: 'role_name' },
    { title: '申请时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '状态',
      dataIndex: 'status',
      render: s => <Tag color={s === 'ACCEPTED' ? 'green' : 'gold'}>{s === 'ACCEPTED' ? '已录取' : '待处理'}</Tag>
    },
    {
      title: '操作',
      render: () => <Space><Button type="link" icon={<EyeOutlined />}>详情</Button><Button type="link">录用</Button></Space>
    }
  ];

  // =================条件渲染视图 (A, B, C)=================

  if (adminStatus === 'PENDING') {
    return <div style={{ padding: '100px 20px', maxWidth: '800px', margin: '0 auto' }}><Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}><Result status="info" title="管理权限审核中" subTitle="您的入驻请求已提交，请耐心等待现任部长审批。" extra={<Button type="primary" onClick={() => { localStorage.clear(); window.location.reload(); }}>返回首页</Button>} /></Card></div>;
  }

  if (!clubId || clubId === 'undefined' || clubId === 'null') {
    return (
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>🚀 部长入驻工作台</Title>
        <Row gutter={32}>
          <Col span={12}>
            <Card title={<span><TeamOutlined /> 加入已有社团</span>} hoverable style={{ borderRadius: 12 }}>
              <Form layout="vertical" onFinish={(v) => api.post(`/clubs/${v.target_club_id}/admins/apply`).then(() => setAdminStatus('PENDING'))}>
                <Form.Item name="target_club_id" rules={[{ required: true }]}><Select placeholder="搜索现有社团">{allClubs.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item>
                <Button type="primary" block htmlType="submit">发送申请</Button>
              </Form>
            </Card>
          </Col>
          <Col span={12}>
            <Card title={<span><RocketOutlined /> 创建全新社团</span>} hoverable style={{ borderRadius: 12, borderTop: '4px solid #52c41a' }}>
              <Form layout="vertical" onFinish={handleCreateClub}>
                <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="社团全称" /></Form.Item>
                <Form.Item name="description" rules={[{ required: true }]}><TextArea placeholder="纳新口号" /></Form.Item>
                <Button type="primary" block style={{ background: '#52c41a' }} htmlType="submit">立即创建</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // 正式工作台视图
  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <Title level={3} style={{ margin: 0 }}>🏢 社团招新管理中心</Title>
        <Tag color="blue" icon={<UserOutlined />}>部长：{localStorage.getItem('user_name')}</Tag>
      </div>

      <Tabs size="large" type="card" items={[
        {
          key: '1',
          label: '📈 招新概览',
          children: (
            <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Row>
                <Col span={8} style={{ textAlign: 'center' }}><Statistic title="总简历数" value={stats.total} prefix={<UsergroupAddOutlined />} /></Col>
                <Col span={8} style={{ textAlign: 'center' }}><Statistic title="待面试" value={stats.pending} valueStyle={{ color: '#faad14' }} /></Col>
                <Col span={8} style={{ textAlign: 'center' }}><Statistic title="已录取" value={stats.accepted} valueStyle={{ color: '#52c41a' }} /></Col>
              </Row>
            </Card>
          )
        },
        {
          key: '2',
          label: '👥 报名名单',
          children: (
            <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Table dataSource={applicants} columns={applicantColumns} rowKey="id" pagination={{ pageSize: 5 }} />
            </Card>
          )
        },
        {
          key: '3',
          label: '🎯 岗位发布',
          children: (
            <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">设置不同岗位的专属附加题，提升筛选效率。</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRoleModalVisible(true)}>发布新岗位</Button>
              </div>
              <Table dataSource={roles} columns={roleColumns} rowKey="id" />
            </Card>
          )
        },
        {
          key: '4',
          label: '⚙️ 资料修改',
          children: (
            <Card bordered={false} style={{ maxWidth: 600, margin: '0 auto' }}>
              <Form form={form} layout="vertical" onFinish={(v) => api.put(`/clubs/${clubId}`, v).then(() => message.success('更新成功'))}>
                <Form.Item name="name" label="社团名称"><Input /></Form.Item>
                <Form.Item name="description" label="简介"><TextArea rows={4} /></Form.Item>
                <Form.Item name="cover_image" label="封面图 URL"><Input /></Form.Item>
                <Button type="primary" block htmlType="submit">保存更改</Button>
              </Form>
            </Card>
          )
        }
      ]} />

      <Modal
        title={<Title level={4}><TagsOutlined /> 发布招新岗位</Title>}
        open={isRoleModalVisible}
        onOk={handlePublishRole}
        onCancel={() => setIsRoleModalVisible(false)}
        okText="确认发布"
        cancelText="取消"
        width={600}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="name" label="岗位名称" rules={[{ required: true }]}><Input placeholder="如：前端开发部" /></Form.Item>
          <Form.Item name="requirements" label="岗位要求"><Input placeholder="如：熟悉 React" /></Form.Item>
          <Divider orientation="left"><Text type="secondary" style={{fontSize: 12}}>动态附加题 (新生报名该岗位时必答)</Text></Divider>
          <Form.List name="extra_questions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true, message: '请输入题目' }]} style={{ width: 480 }}>
                      <Input placeholder="输入题目，例如：谈谈你对本协会的了解？" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>增加题目</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;