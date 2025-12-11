# 🎄 Gemini Christmas Magic 3D

An interactive, magical 3D Christmas experience controlled entirely by your hand gestures. Built with React, Three.js, and MediaPipe.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-R3F-black)

---

## 🇬🇧 English Version

### ✨ Features

- **Interactive 3D Tree**: A voxel-based Christmas tree that transforms into a spherical particle system.
- **Gesture Control**: Control the entire experience using your webcam and hand movements (no mouse or keyboard needed!).
- **Magical Cursor**: A dynamic "Flame Jet" cursor that follows your index finger with particle trails.
- **Photo Gallery**: Floating memories that orbit the tree and fly into view for a 3D preview.
- **Immersive Atmosphere**: Dynamic lighting, falling snow, blooming ornaments, and starfields.
- **Performance Optimized**: Uses InstancedMesh and Canvas-based overlays for smooth 60FPS rendering.

### 🎮 How to Play (Gestures)

This application uses **Computer Vision** to track your hand. Ensure you are in a well-lit room.

| Gesture                     | Action              | Visual Cue                                                |
| :-------------------------- | :------------------ | :-------------------------------------------------------- |
| **👆 Point (Index Finger)** | **Move Cursor**     | A magical flame cursor follows your finger tip.           |
| **👋 Open Palm**            | **Explode / Orbit** | The tree bursts into particles and photos begin to orbit. |
| **👌 Pinch (OK Sign)**      | **Select / Click**  | Selects a photo to preview. (Thumb & Index tip touching). |
| **✊ Fist**                 | **Reset / Close**   | Reassembles the tree or closes the currently open photo.  |

### 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite
- **3D Engine**: Three.js, React Three Fiber (R3F), Drei
- **Computer Vision**: Google MediaPipe Tasks Vision
- **Styling**: Tailwind CSS
- **Effects**: React Three Postprocessing (Bloom)

### 🚀 Getting Started

1.  **Install Dependencies**

    ```bash
    npm install --force
    ```

2.  **Run Development Server**

    ```bash
    npm run dev
    ```

3.  **Allow Camera Access**
    When prompted by the browser, allow access to your camera. The video processing happens locally on your device; no video is sent to the cloud.

---

## 🇨🇳 中文版本 (Chinese Version)

### 🎄 3D 魔法圣诞树

这是一个完全由**手势控制**的互动式 3D 圣诞体验。项目使用 React、Three.js 和 MediaPipe 构建。

### ✨ 主要功能

- **互动 3D 圣诞树**: 这是一个由体素（Voxel）构成的圣诞树，可以瞬间爆裂成球形的粒子云。
- **手势控制**: 无需鼠标键盘，通过摄像头捕捉手势来掌控全场。
- **魔法光标**: 一个跟随你食指移动的“火焰喷射”光标，带有炫酷的拖尾粒子特效。
- **3D 照片墙**: 悬浮的照片围绕树身旋转，选中后会飞到眼前进行 3D 预览。
- **沉浸式氛围**: 包含动态下雪、发光的装饰品、环境光照和星空背景。
- **性能优化**: 使用 InstancedMesh 和 Canvas 叠加层，确保流畅的渲染体验。

### 🎮 操作指南 (手势说明)

本应用使用**计算机视觉**识别您的手部骨骼。请确保您处于光线充足的环境中。

| 手势                  | 动作            | 说明                                               |
| :-------------------- | :-------------- | :------------------------------------------------- |
| **👆 食指指点**       | **移动光标**    | 控制屏幕上的魔法火焰光标移动。                     |
| **👋 张开手掌**       | **爆裂 / 旋转** | 圣诞树炸裂分散，照片开始围绕中心旋转展示。         |
| **👌 捏合 (OK 手势)** | **选中 / 点击** | 选中光标悬停的照片进行放大预览（拇指与食指捏合）。 |
| **✊ 握拳**           | **复原 / 关闭** | 将树重新组装回原样，或者关闭当前正在预览的照片。   |

### 🛠 技术栈

- **前端框架**: React, TypeScript, Vite
- **3D 引擎**: Three.js, React Three Fiber (R3F), Drei
- **视觉算法**: Google MediaPipe Tasks Vision
- **样式**: Tailwind CSS
- **后期特效**: React Three Postprocessing (Bloom/发光)

### 🚀 快速开始

1.  **安装依赖**

    ```bash
    npm install --force
    ```

2.  **启动开发服务器**

    ```bash
    npm run dev
    ```

3.  **允许摄像头权限**
    浏览器提示时，请允许访问摄像头。所有的视频处理均在本地设备完成，不会上传至云端。

---

_Created with ❤️ for the Holiday Season._
