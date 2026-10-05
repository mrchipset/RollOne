# RollOne · 颜色骰子

一个移动端优先的响应式单页应用：点击骰子，以**完全等概率**随机落定为 N 种颜色之一，或一个「?」问号面。

- 结果集 = `COLORS.length + 1`（颜色 + 问号），每个结果概率严格为 `1 / (N + 1)`
- 问号是最终结果，不再解析为具体颜色
- 骰子面就是纯色块，没有任何图形；只有问号面额外显示一个「?」
- 问号会铺满整块色块：字号取卡片尺寸的 `min(95vw,27rem)`，实测字形约占卡片高度 88%
- 颜色由 `src/config/colors.ts` 数据驱动，增删颜色只改这一处
- 纯前端，无后端、无持久化、无 PWA

## 常用命令

```bash
pnpm install
pnpm dev      # 启动开发服务器（已带 --host，手机可同局域网访问）
pnpm test     # 运行 Vitest 单测
pnpm build    # tsc -b + vite build
pnpm lint     # oxlint
```

## 新增 / 修改颜色

在 `src/config/colors.ts` 的 `COLORS` 数组里增删条目即可，概率会自动按 `1 / (N + 1)` 重算：

```ts
{ id: 'teal', label: '青色', color: '#2f7d78' }
```

- `id` 必须唯一，且不能使用保留值 `'question'`
- `label` 是结果播报里显示的中文名（`aria-live` 会念出来，也是色盲用户唯一的区分手段）
- `color` 必须是 `#RGB` / `#RRGGBB` 等合法十六进制颜色

默认 5 色是从实体教具照片里做像素采样得到的（受光面众数）：红 `#BB3A3C`、橙 `#AD692A`、
黄 `#EACB26`、绿 `#335D2C`、紫 `#7F7099`。改色直接改这里的 `color` 即可。

## 随机抽取为什么是公平的

抽取走 `randBelow()`（`src/lib/random.ts`），采用**拒绝采样**，等价于 Python `random.choice` 内部的 `_randbelow`：

```ts
const bound = Math.floor(space / limit) * limit  // 不超过字空间的最大 limit 倍数
for (;;) {
  const value = source()
  if (value < bound) return value % limit        // 落在可整除区才接受
  // 否则落在 [bound, space) 这个“尾巴”上 → 整段丢弃重抽
}
```

直接用 `随机数 % limit` 会**引入偏差**：当 `limit` 不能整除 `2**32` 时，靠前的余数会多分到一些随机字。
拒绝采样保证每个结果对应**数量完全相同**的字，因此概率精确等于 `1 / limit`，无需任何浮点近似。
单测用可注入的小字空间**穷举**验证了这一点（`src/lib/random.test.ts`）。

随机源为 `crypto.getRandomValues`（CSPRNG），无 crypto 的运行时回退到 `Math.random`。

## 投掷动画节奏

换面间隔是**等比递增**的（从快到慢），模拟骰子落定的减速感，参数集中在 `src/lib/rollAnimation.ts`：

```ts
export const ROLL_DURATION_MS = 1800   // 时间表预算，不是硬编码定时器
export const SWAP_START_MS = 90        // 开头有多快
export const SWAP_GROWTH = 1.16        // 减速强度（必须 >= 1，否则时间表不收敛）
export const SWAP_MAX_MS = 320         // 单次间隔上限
```

跟随系统 `prefers-reduced-motion`：开启时会跳过动画直接出结果。

## 投掷动画开关

页面底部有一个「投掷动画」开关（ARIA `role="switch"`），可以在运行时关掉翻滚动画，点击后立即出结果。

- **默认值**：跟随系统 `prefers-reduced-motion` —— 系统要求减少动态效果时默认关闭，否则开启。
- **显式选择优先**：一旦用户手动切换过，就记住该选择并覆盖系统偏好。前端的 `@media (prefers-reduced-motion)` 规则已移除，避免它把用户显式打开的动画又屏蔽掉。
- **持久化**：写入 `localStorage` 的 `rollone:animation-enabled`。存储不可用（Safari 隐私模式等）时静默降级，本次会话内开关依然有效。

相关逻辑在 `src/lib/animationPreference.ts`，纯函数、可单独测试。

## 技术栈

TypeScript · React 19 · Vite 8 · Tailwind CSS 4（`@tailwindcss/vite`，CSS-first）· Vitest 5 + Testing Library · pnpm（淘宝镜像，见 `.npmrc`）
