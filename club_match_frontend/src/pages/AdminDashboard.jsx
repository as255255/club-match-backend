import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Form, Input, Button, message, Typography, Tabs, Select, Result, Divider, Table, Space, Modal } from 'antd';
import { UsergroupAddOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, RocketOutlined, PlusOutlined, MinusCircleOutlined, TagsOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminDashboard = () => {
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm(); // 专门给发布岗位用的表单
  const [loading, setLoading] = useState(false);

  // 核心状态管理
  const [clubId, setClubId] = useState(localStorage.getItem('managed_club_id'));
  const [adminStatus, setAdminStatus] = useState(localStorage.getItem('admin_status'));

  const [allClubs, setAllClubs] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0 });

  // 🌟 新增：岗位管理相关状态
  const [roles, setRoles] = useState([]);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);

  // 页面初始化
  useEffect(() => {
    if (!clubId || clubId === 'undefined') {
      fetchAllClubs();
    } else if (adminStatus === 'APPROVED') {
      fetchClubData();
      fetchStats();
      fetchRoles(); // 拉取已有岗位
    }
  }, [clubId, adminStatus]);

  const fetchAllClubs = async () => {
    try {
      const response = await api.get('/clubs/');
      setAllClubs(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClubData = async () => {
    try {
      const response = await api.get('/clubs/');
      const myClub = response.data.find(c => c.id === parseInt(clubId));
      if (myClub) {
        form.setFieldsValue({
          name: myClub.name,
          category: myClub.category,
          description: myClub.description,
          cover_image: myClub.cover_image,
        });
      }
    } catch (error) {
      console.error(error);
    }
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
      console.error(error);
    }
  };

  // 🌟 拉取社团已发布的岗位
  const fetchRoles = async () => {
    try {
      const response = await api.get(`/clubs/${clubId}/roles`);
      setRoles(response.data);
    } catch (error) {
      console.error('拉取岗位失败', error);
    }
  };

  const handleApplyJoin = async (values) => {
    setLoading(true);
    try {
      await api.post(`/clubs/${values.target_club_id}/admins/apply`);
      message.success('申请发送成功！请等待现任部长审核。');
      localStorage.setItem('managed_club_id', values.target_club_id);
      localStorage.setItem('admin_status', 'PENDING');
      setClubId(values.target_club_id);
      setAdminStatus('PENDING');
    } catch (error) {
      message.error('申请失败，可能您已经申请过了');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/clubs/', values);
      message.success('🎉 社团创建成功！您已自动成为该社团的最高管理员。');
      localStorage.setItem('managed_club_id', response.data.id);
      localStorage.setItem('admin_status', 'APPROVED');
      setClubId(response.data.id);
      setAdminStatus('APPROVED');
    } catch (error) {
      message.error('创建失败，请检查填写信息');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClub = async (values) => {
    setLoading(true);
    try {
      await api.put(`/clubs/${clubId}`, values);
      message.success('✅ 社团信息更新成功！主页将实时生效。');
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 发布新岗位与附加题
  const handlePublishRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setLoading(true);

      // 组装数据：给每一个附加题动态生成一个独一无二的 question_id
      const payload = {
        name: values.name,
        requirements: values.requirements || "无特殊要求",
        extra_questions: (values.extra_questions || []).map((q, index) => ({
          question_id: `q_${Date.now()}_${index}`,
          title: q.title
        }))
      };

      await api.post(`/clubs/${clubId}/roles`, payload);
      message.success('✨ 新岗位及专属问卷发布成功！新生现在可以申请了。');
      setIsRoleModalVisible(false);
      roleForm.resetFields();
      fetchRoles(); // 刷新列表
    } catch (error) {
      console.log('表单校验失败或提交错误', error);
    } finally {
      setLoading(false);
    }
  };

  // 渲染岗位表格的列配置
  const roleColumns = [
    { title: '岗位名称', dataIndex: 'name', key: 'name', render: text => <Text strong color="#1890ff">{text}</Text> },
    { title: '岗位要求', dataIndex: 'requirements', key: 'requirements' },
    {
      title: '专属附加题数量',
      key: 'extra_questions',
      render: (_, record) => (
        <Text type="secondary">
          {record.extra_questions ? record.extra_questions.length : 0} 道题目
        </Text>
      )
    }
  ];

  // ==========================================
  // 视图 A：待审核状态
  // ==========================================
  if (adminStatus === 'PENDING') {
    return (
      <div style={{ padding: '100px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <Card style={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
          <Result
            status="info"
            title="您的管理权限申请正在审核中..."
            subTitle="已将您的申请发送给该社团的现任部长。审核通过后，您再次登录即可进入工作台。"
            extra={[
              <Button type="primary" key="console" onClick={() => {
                localStorage.removeItem('managed_club_id');
                localStorage.removeItem('admin_status');
                setClubId(null);
                setAdminStatus(null);
              }}>撤销申请并返回</Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  // ==========================================
  // 视图 B：小白入驻引导页
  // ==========================================
  if (!clubId || clubId === 'undefined') {
    return (
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Title level={2}>👋 欢迎来到社团管理中心</Title>
          <Paragraph type="secondary" style={{ fontSize: '16px' }}>请选择您的入驻方式，开启高效的招新之旅</Paragraph>
        </div>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={12}>
            <Card hoverable style={{ height: '100%', borderRadius: '16px', borderTop: '4px solid #1890ff' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <TeamOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                <Title level={4} style={{ marginTop: '16px' }}>加入已有社团</Title>
              </div>
              <Form layout="vertical" onFinish={handleApplyJoin}>
                <Form.Item name="target_club_id" rules={[{ required: true, message: '请选择一个社团' }]}>
                  <Select showSearch placeholder="请输入社团名称进行搜索" size="large" optionFilterProp="children">
                    {allClubs.map(club => (<Option key={club.id} value={club.id}>{club.name} ({club.category})</Option>))}
                  </Select>
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>发送入驻申请</Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card hoverable style={{ height: '100%', borderRadius: '16px', borderTop: '4px solid #52c41a' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <RocketOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                <Title level={4} style={{ marginTop: '16px' }}>创建全新社团</Title>
              </div>
              <Form layout="vertical" onFinish={handleCreateClub}>
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="社团名称" /></Form.Item></Col>
                  <Col span={12}><Form.Item name="category" rules={[{ required: true }]}><Input placeholder="分类(如:学术)" /></Form.Item></Col>
                </Row>
                <Form.Item name="description" rules={[{ required: true }]}><TextArea rows={2} placeholder="一句话纳新宣言" /></Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ background: '#52c41a', borderColor: '#52c41a' }}>一键创建并成为部长</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // ==========================================
  // 视图 C：正式工作台
  // ==========================================
  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: '30px' }}>🏢 招新工作台</Title>

      <Tabs defaultActiveKey="3" size="large" items={[
        {
          key: '1',
          label: '📊 数据看板',
          children: (
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Row>
                <Col span={8} style={{ textAlign: 'center' }}><Statistic title="累计收到简历" value={stats.total} prefix={<UsergroupAddOutlined />} styles={{ content: { color: '#1890ff', fontSize: '32px' } }} /></Col>
                <Col span={8} style={{ textAlign: 'center' }}><Statistic title="待处理审批" value={stats.pending} prefix={<ClockCircleOutlined />} styles={{ content: { color: '#faad14', fontSize: '32px' } }} /></Col>
                <Col span={8} style={{ textAlign: 'center' }}><Statistic title="已成功录用" value={stats.accepted} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a', fontSize: '32px' } }} /></Col>
              </Row>
            </Card>
          )
        },
        {
          key: '2',
          label: '📝 社团信息管理',
          children: (
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '800px', margin: '0 auto' }}>
              <Form form={form} layout="vertical" onFinish={handleUpdateClub}>
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="name" label="社团名称" rules={[{ required: true }]}><Input placeholder="社团名称" /></Form.Item></Col>
                  <Col span={12}><Form.Item name="category" label="社团分类" rules={[{ required: true }]}><Input placeholder="社团分类" /></Form.Item></Col>
                </Row>
                <Form.Item name="cover_image" label="对外宣传封面图 (URL)"><Input placeholder="https://..." /></Form.Item>
                <Form.Item name="description" label="社团简介与纳新宣言" rules={[{ required: true }]}><TextArea rows={5} /></Form.Item>
                <Form.Item style={{ textAlign: 'center' }}>
                  <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ width: '200px' }}>保存修改</Button>
                </Form.Item>
              </Form>
            </Card>
          )
        },
        // 🌟 新增的第三个选项卡：岗位与问卷发布中心
        {
          key: '3',
          label: '🎯 招新岗位发布',
          children: (
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <Text type="secondary">在这里发布社团的招新岗位，并为每个岗位设置专属的附加问答题。</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRoleModalVisible(true)}>
                  发布新岗位
                </Button>
              </div>
              <Table dataSource={roles} columns={roleColumns} rowKey="id" pagination={false} />
            </Card>
          )
        }
      ]} />

      {/* 🌟 核心魔法：发布新岗位 & 动态添加问卷题目的 Modal */}
      <Modal
        title={<Title level={4}><TagsOutlined /> 发布招新岗位</Title>}
        open={isRoleModalVisible}
        onOk={handlePublishRole}
        onCancel={() => { setIsRoleModalVisible(false); roleForm.resetFields(); }}
        okText="立即发布"
        cancelText="取消"
        confirmLoading={loading}
        destroyOnHidden={true}
        width={700}
        styles={{ body: { paddingTop: '20px' } }}
      >
        <Form form={roleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="岗位名称" rules={[{ required: true, message: '请输入岗位名称！' }]}>
                <Input placeholder="例如：新媒体部干事" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="requirements" label="岗位要求简述">
                <Input placeholder="例如：熟练使用PS/PR优先" />
              </Form.Item>
            </Col>
          </Row>

          <Divider dashed orientation="left" style={{ borderColor: '#1890ff' }}>
            <Text style={{ color: '#1890ff' }}>动态附加题设置 (可选)</Text>
          </Divider>
          <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: '16px' }}>
            想进一步考察新生的能力？给这个岗位添加几道专属的必答问答题吧！
          </Paragraph>

          {/* Ant Design 的动态表单列表项 */}
          <Form.List name="extra_questions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'title']}
                      label={`问题 ${index + 1}`}
                      rules={[{ required: true, message: '问题内容不能为空' }]}
                      style={{ width: '550px' }}
                    >
                      <Input placeholder="例如：你平时常用的剪辑软件有哪些？" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', fontSize: '18px', marginLeft: '8px' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: '8px' }}>
                    添加一道专属问答题
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

    </div>
  );
};

export default AdminDashboard;