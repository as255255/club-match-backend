-- 创建数据库
CREATE DATABASE IF NOT EXISTS club_match_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_match_db;

-- 1. 用户表 User (通用简历基础)
CREATE TABLE `users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(32) NOT NULL UNIQUE COMMENT '学号，用于唯一身份认证',
  `name` VARCHAR(64) NOT NULL COMMENT '姓名/昵称',
  `major` VARCHAR(128) DEFAULT NULL COMMENT '专业',
  `grade` VARCHAR(32) DEFAULT NULL COMMENT '年级(如：2023级)',
  `academy` VARCHAR(128) DEFAULT NULL COMMENT '学院',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `bio` TEXT DEFAULT NULL COMMENT '个人简介',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生用户表';

-- 2. 社团表 Club
CREATE TABLE `clubs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL COMMENT '社团名称',
  `category` VARCHAR(64) NOT NULL COMMENT '类别(学术/科技/文艺等)',
  `description` TEXT COMMENT '社团简介',
  `cover_image` VARCHAR(255) DEFAULT NULL COMMENT '封面图URL',
  `status` ENUM('DRAFT', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT' COMMENT '平台审核状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社团基本信息表';

-- 3. 标签字典表 Tag (统一维护标签体系)
CREATE TABLE `tags` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL UNIQUE COMMENT '标签名称',
  `type` ENUM('INTEREST', 'SKILL', 'CHARACTER', 'REQUIREMENT') NOT NULL COMMENT '标签类型',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全平台标签字典表';

-- 4. 用户标签关联表 UserTag
CREATE TABLE `user_tags` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL,
  `weight` DECIMAL(5,2) DEFAULT 1.00 COMMENT '权重(显式选择或隐式计算)',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_user_tag` (`user_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户画像标签关联表';

-- 5. 社团标签关联表 ClubTag
CREATE TABLE `club_tags` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `club_id` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL,
  `weight` DECIMAL(5,2) DEFAULT 1.00 COMMENT '权重(社团重要特征)',
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_club_tag` (`club_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社团画像标签关联表';

-- 6. 招新岗位表 RecruitmentRole
CREATE TABLE `recruitment_roles` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `club_id` BIGINT NOT NULL,
  `role_name` VARCHAR(128) NOT NULL COMMENT '岗位名称(如：运营、技术)',
  `requirements` TEXT COMMENT '具体要求',
  `quota` INT DEFAULT 0 COMMENT '招收人数上限',
  `extra_questions` JSON DEFAULT NULL COMMENT '补充问题(JSON数组格式)',
  `status` ENUM('OPEN', 'CLOSED', 'NOT_STARTED') DEFAULT 'NOT_STARTED' COMMENT '招新状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社团招新岗位表';

-- 7. 报名表 Application
CREATE TABLE `applications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `club_id` BIGINT NOT NULL,
  `role_id` BIGINT NOT NULL,
  `status` ENUM('DRAFT', 'PENDING', 'INTERVIEWING', 'ACCEPTED', 'REJECTED', 'CANCELED') DEFAULT 'PENDING' COMMENT '报名状态',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `recruitment_roles`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_user_club_role` (`user_id`, `club_id`, `role_id`) COMMENT '防止同一岗位重复报名',
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_club_status` (`club_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户报名表';

-- 8. 报名答案表 ApplicationAnswer (应对补充问题)
CREATE TABLE `application_answers` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `application_id` BIGINT NOT NULL,
  `question_id` VARCHAR(64) NOT NULL COMMENT '对应 JSON 中的题目ID/Key',
  `answer` TEXT NOT NULL COMMENT '用户的回答',
  FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报名补充问题回答表';

-- 9. 收藏表 FavoriteClub
CREATE TABLE `favorite_clubs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `club_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_user_club` (`user_id`, `club_id`) COMMENT '防止重复收藏'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏社团表';