/** 新規帳簿に用意する既定カテゴリ。 */
export const DEFAULT_CATEGORIES: {
  name: string;
  type: string;
  icon: string;
  color: string;
}[] = [
  // 支出
  { name: "食費", type: "EXPENSE", icon: "food", color: "orange" },
  { name: "日用品", type: "EXPENSE", icon: "cart", color: "teal" },
  { name: "住居", type: "EXPENSE", icon: "home", color: "indigo" },
  { name: "水道・光熱", type: "EXPENSE", icon: "bolt", color: "yellow" },
  { name: "交通", type: "EXPENSE", icon: "train", color: "blue" },
  { name: "通信", type: "EXPENSE", icon: "wifi", color: "cyan" },
  { name: "娯楽", type: "EXPENSE", icon: "play", color: "pink" },
  { name: "医療・健康", type: "EXPENSE", icon: "heart", color: "red" },
  { name: "サブスク", type: "EXPENSE", icon: "repeat", color: "purple" },
  { name: "その他", type: "EXPENSE", icon: "tag", color: "gray" },
  // 収入
  { name: "給与", type: "INCOME", icon: "wallet", color: "green" },
  { name: "賞与", type: "INCOME", icon: "gift", color: "mint" },
  { name: "副業", type: "INCOME", icon: "briefcase", color: "blue" },
  { name: "その他収入", type: "INCOME", icon: "plus", color: "gray" },
];
