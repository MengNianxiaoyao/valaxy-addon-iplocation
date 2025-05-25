<h1 align="center">valaxy-addon-iplocation</h1>

<pre align="center">
获取 ip 定位的各种信息
</pre>

<p align="center">
<a href="https://www.npmjs.com/package/valaxy-addon-iplocation" rel="nofollow"><img src="https://img.shields.io/npm/v/valaxy-addon-iplocation?color=0078E7" alt="NPM version"></a>
</p>

## 安装插件

### 基础使用

插件直接可以安装使用，通常不需要过多繁琐配置：

```bash
pnpm add valaxy-addon-iplocation
```

```ts
import { defineValaxyConfig } from 'valaxy'
import { addonIPlocation } from 'valaxy-addon-iplocation'

export default defineValaxyConfig({
  addons: [
    addonIPlocation(),
  ],
})
```

### 使用插件

```ts
import { defineValaxyConfig } from 'valaxy'
import { addonIPlocation } from 'valaxy-addon-iplocation'

export default defineValaxyConfig({
  addons: [
    addonIPlocation({
      api: 'your-apiurl',
    }),
  ],
})
```

## 配置 / Options

| 属性名 | 类型 | 默认值 | 说明 |
| ---- | ---- | ---- | ---- |
| api | `string` | --- | API 无内置，参考[ip-trace.js](https://github.com/MengNianxiaoyao/api-tools/blob/main/api/ip-trace.js)部署 |
| data | `string` | `ip-api` | 数据库来源，分别为 [ip-api](https://ip-api.com)和[ip-taobao](https://ip.taobao.com/)|
