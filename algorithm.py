import math
from typing import List, Dict


def calculate_cosine_similarity(user_vector: Dict[str, float], club_vector: Dict[str, float]) -> float:
    """
    计算用户标签和社团标签的余弦相似度
    :param user_vector: 用户的标签权重字典，如 {"编程": 1.0, "设计": 0.5}
    :param club_vector: 社团的标签权重字典，如 {"编程": 1.0, "算法": 0.8}
    :return: 相似度得分 (0.0 到 1.0 之间)
    """
    # 找到共同的标签
    common_tags = set(user_vector.keys()) & set(club_vector.keys())

    if not common_tags:
        return 0.0

    # 计算点积
    dot_product = sum(user_vector[tag] * club_vector[tag] for tag in common_tags)

    # 计算各自的模长
    user_magnitude = math.sqrt(sum(val ** 2 for val in user_vector.values()))
    club_magnitude = math.sqrt(sum(val ** 2 for val in club_vector.values()))

    if user_magnitude == 0 or club_magnitude == 0:
        return 0.0

    return dot_product / (user_magnitude * club_magnitude)


def get_recommended_clubs(user_tags: Dict[str, float], all_clubs_tags: Dict[int, Dict[str, float]], top_n: int = 5) -> \
List[dict]:
    """
    根据标签计算推荐列表
    :param user_tags: 当前用户的标签画像
    :param all_clubs_tags: 数据库中所有社团的画像字典 {club_id: {tag_name: weight}}
    """
    scores = []

    for club_id, club_tags in all_clubs_tags.items():
        # 这里只计算了 45% 权重的标签相似度，MVP 阶段我们将其放大作为核心依据
        sim_score = calculate_cosine_similarity(user_tags, club_tags)

        scores.append({
            "club_id": club_id,
            "match_score": round(sim_score * 100, 1),  # 转为百分比
            "reason": f"与你的兴趣契合度高达 {round(sim_score * 100, 1)}%" if sim_score > 0 else "可能带来全新体验"
        })

    # 按分数降序排列，取前 N 个
    scores.sort(key=lambda x: x["match_score"], reverse=True)
    return scores[:top_n]