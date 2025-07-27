// 模拟数据生成
const generateMockData = () => {
  let categoryList = [];
  for (let i = 1; i <= 25; i++) { // 25 个一级目录
    let subCategories = [];
    for (let j = 1; j <= 10; j++) { // 每个一级目录下有 10 个二级目录
      let products = [];
      for (let k = 1; k <= 100; k++) { // 每个二级目录下有 100 个商品
        products.push({
          id: `${i}-${j}-${k}`,
          name: `商品 ${i}-${j}-${k}`,
          price: Math.floor(Math.random() * 100) // 随机价格
        });
      }
      subCategories.push({
        id: `${i}-${j}`,
        name: `二级目录 ${i}-${j}`,
        products
      });
    }
    categoryList.push({
      id: `${i}`,
      name: `一级目录 ${i}`,
      subCategories
    });
  }
  return categoryList;
};

// 导出数据
module.exports = {
  generateMockData
};
