import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, message, Space, Spin } from 'antd';
import CheckableTag from 'antd/es/tag/CheckableTag';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const { Title, Paragraph } = Typography;

const InterestProfile = () => {
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTags();
  }, []);

  // 获取后台的所有标签
  const fetchTags = async () => {
    try {
      const response = await api.get('/users/tags');
      setAllTags(response.data);
    } catch (error) {
      message.error('获取标签失败');
    } finally {
      setLoading(false);
    }
  };

  // 点击标签的选中/取消逻辑
  const handleTagChange = (tagId, checked) => {
    const nextSelectedTags = checked
      ? [...selectedTags, tagId]
      : selectedTags.filter((id) => id !== tagId);
    setSelectedTags(nextSelectedTags);
  };

  // 提交画像
  const handleSubmit = async () => {
    if (selectedTags.length === 0) {
      message.warning('至少选择一个你感兴趣的标签吧！');
      return;
    }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem('user_id');
      // 调用后端刚才写的保存接口
      await api.post(`/users/${userId}/tags`, { tag_ids: selectedTags });

      message.success('画像生成成功！正在为你推荐社团...');
      // 填完画像，大功告成，跳转到发现社团首页
      navigate('/');
    } catch (error) {
      message.error('保存画像失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 600, padding: '20px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Title level={3}>✨ 丰富你的数字画像</Title>
          <Paragraph type="secondary">
            请选择你感兴趣的领域或想掌握的技能，AI 将为你精准匹配最契合的社团。
          </Paragraph>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
        ) : (
          <div style={{ marginBottom: '40px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {allTags.map((tag) => (
              <CheckableTag
                key={tag.id}
                checked={selectedTags.includes(tag.id)}
                onChange={(checked) => handleTagChange(tag.id, checked)}
                style={{
                  fontSize: '16px',
                  padding: '8px 16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                {tag.name}
              </CheckableTag>
            ))}
          </div>
        )}

        <Button
          type="primary"
          size="large"
          block
          onClick={handleSubmit}
          loading={submitting}
          style={{ borderRadius: '8px', height: '48px', fontSize: '16px' }}
        >
          生成专属推荐
        </Button>
      </Card>
    </div>
  );
};

export default InterestProfile;