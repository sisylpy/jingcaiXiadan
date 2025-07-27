

Component({
  properties: {
    list: Array
  },
  methods: {
    renderTestItem({ item, index }) {
      console.log('renderTestItem called', item, index);
      return `<view style="height:80px;line-height:80px;border-bottom:1px solid #eee;">${index + 1}: ${item.name}</view>`;
    }
  }
});