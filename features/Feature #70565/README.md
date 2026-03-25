# Feature #70565

## 文件说明

- **Feature #70565-需求分析.md**：详细的需求测试分析
- **Feature #70565-doc.md**：测试文档
- **Case.zip**：设计好的测试用例
- **OriginalSVG.zip**：原始SVG图片素材

## 使用指南

1. 可根据`Feature #70565-doc.md`测试文档执行`Case-Storage.zip`环境中不同组织的用例
2. SVG相关问题可参考`OriginalSVG.zip`中的原始图片进行比对
3. 也可使用`OriginalSVG.zip`中的图片自行覆盖测试点

## svg Type
- Pure Vector Path: 仅使用 <path>、<polygon>、<circle> 等几何元素，无嵌入图像、无文字节点、无脚本
  - de.svg
  - misc.svg
  - bacteria-svgrepo-com.svg
  - peach-svgrepo-com.svg
  - cherry-svgrepo-com.svg
  - apple-svgrepo-com.svg
  - avocado-svgrepo-com.svg
  - banana-svgrepo-com.svg

- 矢量图形 + <text> 文字节点型
  - 中国.svg
  - 69aa79653e6f4.svg
  - svg-shandong.svg

- <image> 嵌入栅格图像型
  - us.svg
  - kr.svg

- <clipPath> 图表型
  - Chart.svg
  - Chart1.svg

- 混合型（矢量 + 嵌入图像 + <clipPath>）
  - big10.svg : 适合性能测

- 超大嵌入图像型（异常文件）
  - issue_svg_script_3.svg ： 8.1 MB，含 data:image，解析时占用极大内存（DoS 风险）

- 含 script 脚本注入型 ： 嵌入可执行 JavaScript，属于 SVG XSS 攻击载体
  - script.svg

- 空文件型
  - empty.svg
