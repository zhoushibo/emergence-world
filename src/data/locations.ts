/**
 * 地标数据 — 基于 modern_city_01.yaml 的 18 个地点
 * 每个地点包含 YAML 原始属性 + 3D 渲染参数（位置、尺寸、颜色）
 */

export interface LocationConfig {
  id: string;
  name: string;
  type: string;
  capacity: number;
  // 3D 参数
  position: [number, number, number];
  size: [number, number, number]; // [width, height, depth]
  color: string;
  roofColor: string;
}

/** 建筑类型 → 颜色映射 */
export const TYPE_COLORS: Record<string, { color: string; roof: string }> = {
  outdoor:     { color: '#4ade80', roof: '#22c55e' },  // 绿色（公园）
  transit:     { color: '#94a3b8', roof: '#64748b' },  // 灰色（交通）
  commercial:  { color: '#fbbf24', roof: '#f59e0b' },  // 黄色（商业）
  workplace:   { color: '#3b82f6', roof: '#2563eb' },  // 蓝色（办公）
  residential: { color: '#a78bfa', roof: '#8b5cf6' },  // 紫色（住宅）
  institution: { color: '#f97316', roof: '#ea580c' },  // 橙色（公共）
  government:  { color: '#ef4444', roof: '#dc2626' },  // 红色（政府）
  financial:   { color: '#14b8a6', roof: '#0d9488' },  // 青色（金融）
};

/** 全部 18 个地标配置 */
export const LOCATIONS: LocationConfig[] = [
  // ── 第一排（北面，z = -15）──
  {
    id: 'research_institute',
    name: '研究院',
    type: 'institution',
    capacity: 20,
    position: [-12, 0, -15],
    size: [4, 5, 4],
    color: '#f97316',
    roofColor: '#ea580c',
  },
  {
    id: 'hospital',
    name: '医院',
    type: 'institution',
    capacity: 20,
    position: [-4, 0, -15],
    size: [4, 4, 5],
    color: '#f97316',
    roofColor: '#ea580c',
  },
  {
    id: 'school',
    name: '学校',
    type: 'institution',
    capacity: 20,
    position: [4, 0, -15],
    size: [4, 3.5, 4],
    color: '#f97316',
    roofColor: '#ea580c',
  },
  {
    id: 'police_station',
    name: '警察局',
    type: 'institution',
    capacity: 10,
    position: [12, 0, -15],
    size: [3, 3.5, 3],
    color: '#f97316',
    roofColor: '#ea580c',
  },

  // ── 第二排（中北，z = -5）──
  {
    id: 'apartment_complex',
    name: '公寓小区',
    type: 'residential',
    capacity: 15,
    position: [-12, 0, -5],
    size: [4, 6, 3],
    color: '#a78bfa',
    roofColor: '#8b5cf6',
  },
  {
    id: 'office_tower',
    name: '写字楼',
    type: 'workplace',
    capacity: 25,
    position: [-4, 0, -5],
    size: [3, 8, 3],
    color: '#3b82f6',
    roofColor: '#2563eb',
  },
  {
    id: 'tech_hub',
    name: '科技中心',
    type: 'workplace',
    capacity: 30,
    position: [4, 0, -5],
    size: [5, 7, 4],
    color: '#3b82f6',
    roofColor: '#2563eb',
  },
  {
    id: 'coding_lab',
    name: '编程实验室',
    type: 'workplace',
    capacity: 15,
    position: [12, 0, -5],
    size: [3, 4, 3],
    color: '#3b82f6',
    roofColor: '#2563eb',
  },

  // ── 第三排（中南，z = 5）──
  {
    id: 'writers_studio',
    name: '作家工作室',
    type: 'commercial',
    capacity: 10,
    position: [-12, 0, 5],
    size: [3, 3, 3],
    color: '#fbbf24',
    roofColor: '#f59e0b',
  },
  {
    id: 'coffee_shop',
    name: '咖啡馆',
    type: 'commercial',
    capacity: 10,
    position: [-4, 0, 5],
    size: [2.5, 2.5, 2.5],
    color: '#fbbf24',
    roofColor: '#f59e0b',
  },
  {
    id: 'restaurant_row',
    name: '美食街',
    type: 'commercial',
    capacity: 15,
    position: [4, 0, 5],
    size: [5, 2.5, 2],
    color: '#fbbf24',
    roofColor: '#f59e0b',
  },
  {
    id: 'shopping_mall',
    name: '购物中心',
    type: 'commercial',
    capacity: 30,
    position: [12, 0, 5],
    size: [5, 4, 4],
    color: '#fbbf24',
    roofColor: '#f59e0b',
  },

  // ── 第四排（南面，z = 15）──
  {
    id: 'central_park',
    name: '中央公园',
    type: 'outdoor',
    capacity: 20,
    position: [-12, 0, 15],
    size: [5, 0.3, 5],
    color: '#4ade80',
    roofColor: '#22c55e',
  },
  {
    id: 'subway_station',
    name: '地铁站',
    type: 'transit',
    capacity: 30,
    position: [-4, 0, 15],
    size: [4, 2, 3],
    color: '#94a3b8',
    roofColor: '#64748b',
  },
  {
    id: 'city_hall',
    name: '市政厅',
    type: 'government',
    capacity: 10,
    position: [4, 0, 15],
    size: [4, 5, 4],
    color: '#ef4444',
    roofColor: '#dc2626',
  },
  {
    id: 'bank',
    name: '银行',
    type: 'financial',
    capacity: 10,
    position: [12, 0, 15],
    size: [3, 4, 3],
    color: '#14b8a6',
    roofColor: '#0d9488',
  },

  // ── 第五排（最南，z = 22）──
  {
    id: 'devops_center',
    name: '运维中心',
    type: 'institution',
    capacity: 10,
    position: [-4, 0, 22],
    size: [3, 3.5, 3],
    color: '#f97316',
    roofColor: '#ea580c',
  },
  {
    id: 'bookstore',
    name: '书店',
    type: 'commercial',
    capacity: 15,
    position: [4, 0, 22],
    size: [3, 3, 3],
    color: '#fbbf24',
    roofColor: '#f59e0b',
  },
];