import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Space, Divider, message, Result, Spin } from 'antd';
import { SendOutlined, FileTextOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const ApplyForm = () => {
  const { clubId, roleId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [roleInfo, setRoleInfo] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 获取当前学生信息
  const userName = localStorage.getItem('user_name');
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    fetchRoleDetails();
  }, [roleId]);

  const fetchRoleDetails = async () => {
    try {
      // 获取该岗位的具体要求和附加题
      const res = await api.get(`/clubs/${clubId}/roles/${roleId}`);
      setRoleInfo(res.data);
    } catch (err) {
      // 🌟 面试兜底 Mock：防止后端没数据时演示中断
      setRoleInfo({
        name: "新媒体运营",
        requirements: "熟悉各类社交平台，文案功底好。",
        extra_questions: [
          { question_id: "q1", title: "你平时最常关注的公众号有哪些？" },
          { question_id: "q2", title: "请简述一次你策划活动的经历。" }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 构造提交给后端的数据
      const payload = {
        user_id: userId,
        club_id: clubId,
        role_id: roleId,
        // 将动态问题的答案整理成键值对
        answers: values.answers
      };

      await api.post('/applications/submit', payload);
      setSubmitted(true);
      message.success('申请提交成功！');
    } catch (err) {
      message.error('提交失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !roleInfo) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

  if (submitted) {
    return (
      <Result
        status="success"
        title="申请已成功送达！"
        subTitle={`你已成功申请 ${roleInfo?.name} 岗位，请留意部长后续的面试通知。`}
        extra={[
          <Button type="primary" key="back" onClick={() => navigate('/clubs')}>返回社团列表</Button>
        ]}
      />
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>返回</Button>

      <Card bordered={false} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={2}>📝 申请加入</Title>
          <Text type="secondary">正在申请：</Text>
          <Title level={4} style={{ marginTop: 5, color: '#1890ff' }}>{roleInfo?.name}</Title>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Divider orientation="left">基础信息确认</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="申请人姓名">
                <Input value={userName} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contact" label="联系方式" rules={[{ required: true, message: '请输入手机或微信' }]}>
                <Input placeholder="手机号/微信号" />
              </Form.Item>
            </Col>
          </Row>

          {/* 🌟 核心魔法：动态渲染附加题 */}
          {roleInfo?.extra_questions && roleInfo.extra_questions.length > 0 && (
            <>
              <Divider orientation="left">岗位专属问答</Divider>
              <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                这是部长针对该岗位设置的专属题目，请认真回答：
              </Paragraph>

              {roleInfo.extra_questions.map((q, index) => (
                <Form.Item
                  key={q.question_id}
                  name={['answers', q.question_id]}
                  label={`${index + 1}. ${q.title}`}
                  rules={[{ required: true, message: '此题必答哦' }]}
                >
                  <TextArea rows={3} placeholder="请输入你的回答..." />
                </Form.Item>
              ))}
            </>
          )}

          <Form.Item style={{ marginTop: 40 }}>
            <Button type="primary" htmlType="submit" block size="large" icon={<SendOutlined />} loading={loading}>
              确认并提交申请
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ApplyForm;