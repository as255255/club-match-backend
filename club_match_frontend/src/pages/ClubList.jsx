import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Spin, Empty, message, Row, Col, Typography, Modal, Form, Select, Input, Progress } from 'antd';
import api from '../utils/api';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ClubList = () => {
  // ==========================================
  // 核心状态管理
  // ==========================================
  const [recommendations, setRecommendations] = useState([]); // 存 AI 推荐列表
  const [loading, setLoading] = useState(true); // 页面加载状态

  // 报名弹窗相关状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null); // 当前准备报名的社团
  const [roles, setRoles] = useState([]); // 当前社团的岗位列表
  const [selectedRole, setSelectedRole] = useState(null); // 新生选中的具体岗位
  const [submitting, setSubmitting] = useState(false); // 提交表单的 loading
  const [form] = Form.useForm();

  // ==========================================
  // 初始化：获取智能推荐列表
  // ==========================================
  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      // 这里的接口已经有 JWT 保安了，后端会自动从 Token 识别是谁，前端只需传 top_n
      const response = await api.get('/clubs/recommendations/smart', {
        params: { top_n: 10 }
      });
      setRecommendations(response.data);
    } catch (error) {
      message.error('获取推荐列表失败，请检查网络或是否已填报兴趣标签');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 动作：打开报名弹窗并拉取岗位
  // ==========================================
  const showApplyModal = async (club) => {
    setSelectedClub(club);
    setIsModalVisible(true);
    form.resetFields(); // 清空上次填写的表单
    setSelectedRole(null);
    setRoles([]); // 先清空旧的岗位列表

    // 动态去后端拉取该社团发布的岗位和附加题
    try {
      const response = await api.get(`/clubs/${club.id}/roles`);
      setRoles(response.data);
    } catch (error) {
      message.error('获取岗位信息失败');
    }
  };

  // 监听岗位下拉框变化，动态展示附加题
  const handleRoleChange = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    setSelectedRole(role);
  };

  // ==========================================
  // 动作：提交报名简历
  // ==========================================
  const handleApplySubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let answers = [];
      // 如果有附加题，安全地解析并组装答案
      if (selectedRole && selectedRole.extra_questions) {
        const questions = typeof selectedRole.extra_questions === 'string'
          ? JSON.parse(selectedRole.extra_questions)
          : selectedRole.extra_questions;

        answers = questions.map(q => ({
          question_id: q.question_id,
          answer: values[q.question_id] // 从表单 values 中取出对应题目的答案
        }));
      }

      const payload = {
        club_id: selectedClub.id,
        role_id: values.role_id,
        answers: answers
      };

      await api.post('/applications/', payload);

      message.success(`成功报名 ${selectedClub.name}！请等待面试通知。`);
      setIsModalVisible(false);
    } catch (error) {
      if (error.errorFields) {
        message.warning('请检查是否有漏填的必填项哦！');
        return;
      }
      if (error.response) {
        if (error.response.status === 400) {
          message.warning(error.response.data.detail || '您已经报过这个岗位啦，请勿重复提交！');
        } else if (error.response.status === 422) {
          message.error('系统校验失败：请检查是否已正常登录！');
        } else {
          message.error(`后端报错: ${JSON.stringify(error.response.data)}`);
        }
      } else {
        message.error('网络请求失败，请检查后端服务是否启动');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // 页面主体渲染
  // ==========================================
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2} style={{ marginBottom: '8px' }}>✨ 为你智能推荐的社团</Title>
        <Paragraph type="secondary" style={{ fontSize: '16px' }}>
          基于你的兴趣标签与行为偏好，由 AI 深度计算匹配
        </Paragraph>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}><Spin size="large" /></div>
      ) : recommendations.length === 0 ? (
        <Empty description="暂无推荐数据，请先完善个人兴趣画像" style={{ marginTop: '100px' }} />
      ) : (
        <Row gutter={[24, 32]}>
          {recommendations.map((rec) => {
            const club = rec.club; // 从推荐结果中解构出社团实体
            const matchScore = rec.match_score;
            const reason = rec.reason;

            return (
              <Col xs={24} sm={12} md={8} key={club.id}>
                <Card
                  hoverable
                  cover={<img alt={club.name} src={club.cover_image || 'https://via.placeholder.com/300x150'} style={{ height: '180px', objectFit: 'cover' }} />}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' } }} // 🌟 修复 v5 警告
                >
                  {/* 匹配度模块 */}
                  <div style={{ marginBottom: '16px', background: '#f0f5ff', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text strong style={{ color: '#1890ff' }}>🎯 匹配度</Text>
                      <Text strong style={{ fontSize: '18px', color: matchScore >= 80 ? '#cf1322' : '#fa8c16' }}>
                        {matchScore}%
                      </Text>
                    </div>
                    <Progress
                      percent={matchScore}
                      showInfo={false}
                      strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
                      size="small"
                      style={{ marginBottom: '8px' }}
                    />
                    <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.5' }}>💡 {reason}</Text>
                  </div>

                  {/* 社团基础信息 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <Title level={4} style={{ margin: 0 }}>{club.name}</Title>
                    <Tag color="blue">{club.category}</Tag>
                  </div>

                  <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ flex: 1, marginBottom: '20px', lineHeight: '1.6' }}>
                    {club.description}
                  </Paragraph>

                  {/* 报名按钮 */}
                  <Button type="primary" size="large" block style={{ borderRadius: '8px' }} onClick={() => showApplyModal(club)}>
                    一键报名
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ==========================================
          报名弹窗 (动态表单)
      ========================================== */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>📝 投递招新简历 - {selectedClub?.name}</Title>}
        open={isModalVisible}
        onOk={handleApplySubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={submitting}
        okText="确认投递"
        cancelText="再想想"
        destroyOnHidden={true} // 🌟 修复 v5 警告
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>

          <Form.Item name="role_id" label="你要申请的岗位" rules={[{ required: true, message: '必须选择一个岗位哦！' }]}>
            <Select placeholder="请选择岗位" onChange={handleRoleChange} size="large">
              {roles.map(role => (
                <Option value={role.id} key={role.id}>
                  {role.name} {role.requirements ? `(${role.requirements})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 黑科技：根据选中的岗位，动态渲染附加题 */}
          {selectedRole && selectedRole.extra_questions && (() => {
            const questions = typeof selectedRole.extra_questions === 'string'
              ? JSON.parse(selectedRole.extra_questions)
              : selectedRole.extra_questions;

            if (questions.length > 0) {
              return (
                <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '1px solid #f0f0f0' }}>
                  <Text strong style={{ color: '#1890ff', marginBottom: '16px', display: 'block' }}>
                    💡 部长设置了专属问答题，请认真填写哦：
                  </Text>
                  {questions.map((q, index) => (
                    <Form.Item
                      key={q.question_id}
                      name={q.question_id}
                      label={`${index + 1}. ${q.title || q.question}`}
                      rules={[{ required: true, message: '这道题是必答的哦！' }]}
                    >
                      <TextArea rows={3} placeholder="请尽情展示你的才华..." />
                    </Form.Item>
                  ))}
                </div>
              );
            }
            return null;
          })()}

          {(!roles || roles.length === 0) && (
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">获取岗位中，或者该社团尚未发布具体岗位...</Text>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ClubList;