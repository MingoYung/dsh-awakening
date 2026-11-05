# DSH NEXT 启动阶段与兼容边界

核对日期：2026-11-05。0.7.1目标为Windows DSH NEXT的三种精确构建：2.0.19-next（保留既有内核0.2.1-rc.2记录）、2.0.21-next（内核0.2.1-rc.4）与2.0.22-next（从应用包核对内核0.2.2-rc.1）。构建profile是工具内的宿主白名单，不等同DSH用户Profile。

## Host 注入与最早首屏

本机 NEXT 主进程启动 runtime 和主窗口并行。初始 `dsh-app://app/` 文档先由桌面安装包提供，Host 的注入表要等内核 startup 完成。因此普通插件的 `placement: head` 仍在 Host 就绪后执行。普通插件不会自动覆盖桌面最早的 HARNESS / Loading plugins 卡片。

可选首屏兼容层接入经过核验的初始文档，从本地资源播放，随后由 Host 复用同一播放器、进度和声音。它需用户明确安装/更新及重启；不宣称所有 DSH 版本安装普通插件即可接管最早首帧。

仅白名单中的Windows NEXT 2.0.19-next / 2.0.21-next / 2.0.22-next EXE、各自原始ASAR和已识别的受管理兼容包可处理。工具先按 EXE 的精确 SHA256 选择构建 profile，再核对对应原包、受管理包及资源范围；未知 profile 或无法匹配的原包直接拒绝，不回退使用2.0.19-next的默认 policy。EXE、Electron fuse、快捷方式和账户配置不改。

| 构建 | EXE SHA256 | 原始 ASAR SHA256 | policy |
| --- | --- | --- | --- |
| Windows NEXT 2.0.19-next | `2c12759a3c3f24f2e6776dae4e511cf5984b227f5e4322fd826fea647bf503b6` | `204e1dcc32ff6a9b661200b7ab97bda1cbd449904e2eddb71c9309cf767e06b5` | `tools/native-install/policy.json` |
| Windows NEXT 2.0.21-next | `423feb86156366aa2bc3374933f579027aef44bcc439c5743b72231d480afc00` | `16f2c62b1ccc98a968d9c7cf5edcd7af7a1e7690c2fba8cea361d1726d0db349` | `tools/native-install/builds/2.0.21-next/policy.json` |
| Windows NEXT 2.0.22-next | `ed9d42ce15a8e5f081ad389807d8093d59e8831717680f479fdc59ad46984288` | `c7057e19e777ff6423815268901ecfe30382323e0dc2e5405b7a7e915328607e` | `tools/native-install/builds/2.0.22-next/policy.json` |

各构建的受管理补丁摘要及历史升级范围由对应 policy 单独记录；版本字符串不是放行依据。不能把公开 Setup.exe / Portable.zip 的压缩分发摘要当作安装后 EXE / ASAR 散件摘要。

2.0.21-next与2.0.22-next的 `dshDesktopBoot.ready()` 返回包含 `documentId` / `profile` 的原生boot对象，主进程会在异步取得injections后再次检查sender与文档世代。兼容层保持该对象及真实UI mount健康报告，动画与正常UI并行，不伪报healthy；跳过、失败与重载不把旧文档报告送到新文档。原生request guard的owner/frame/origin/token边界保留，不修改EXE或fuse。

2.0.22-next的公开启动文档、renderer恢复和原生请求策略源码与2.0.21-next对应文件相同，但打包后的 `lib/main.js` 直接导入哈希命名的 `lib/web-document-ZxxDXtoU.js` 实现，独立 `lib/web-document.js` 只做转发。0.7.1保留新版main文件，只为其真实首屏调用增加权威上下文，并接入被实际导入的实现chunk，保留原导出别名与薄转发入口。替换路径和摘要由该构建policy固定；不把旧版完整main写入新版，也不把转发入口误当实现。候选摘要与历史升级范围以该policy为准。

## 0.7.1兼容更新、三作品与升级

普通 Host 与首屏载体读取同一份 `media/builtins.json`：`builtin:awakening` 对应新 DeepSeek，另有 `builtin:codex`、`builtin:claude-code`。作品摘要、长度、媒体路径与安全构图数据随包提供；载体核对受审核的完整资源清单，不从社区加载程序。

从已识别的0.5/0.6/0.7.0兼容包升级时，在首屏管理中明确选择“更新并重启”。若桌面升级已替换为新版默认原包，则为当前受支持构建选择“安装并重启”，并建立对应的新原包备份。工具等全部DSH进程正常退出后再次核对并原子替换、重开；取消、失败或超时不强杀进程。普通插件更新不会自动改ASAR。0.7.1沿用0.7.0三款影片、构图数据和播放器；载体就绪后，切换作品只改变保存的选择，下次启动读取所选作品，不为每次换片重写应用包。

原始备份在 `resources/.dsh-awakening-backup/app.asar`，只用于当前所选构建 profile，且必须匹配该构建的原始摘要。恢复前再次检查当前 EXE、原包备份及受管理包；不同构建的备份不能互换，不能把2.0.19-next原包写入2.0.21-next应用。宿主升级或旧备份消失时先核验新原包，再为当前构建建立可校验备份，不能凭旧 marker 或文件名放行。2.0.22-next也必须使用自身原包，不能拿2.0.21-next的备份恢复。导入视频和播放设置独立保留；恢复默认首屏使用同一受保护的流程。

首屏读取配置时只接受可静态判定的结构。禁用、卸载、安全/恢复模式、未审核包或资源校验失败时保守回到默认启动。账号、会话、Host token和其他插件配置不进入首屏资源。工具API继续要求本机私有请求策略、同源JSON和当前Host动作令牌，没有npm安装期副作用。

## 画面、音轨和窗口变化

0.7.0三部内置作品为新的1280×720完整视频。当前 `safe-camera` 分支由单一原生video直接成像并提供音轨，按安全构图关键帧计算CSS缩放与位移，不再把完整视频帧转绘到全窗口Canvas。可用时通过 `requestVideoFrameCallback` 的已解码 `mediaTime` 对齐布局；没有该接口时使用按解码帧计数或媒体时间去重的回调。同一播放器贯穿Host接管、窗口resize和预览；不使用旧13.6秒鲸鱼程序场景去重画这些新14秒衔接视频。

Claude Code横向标识与三部人物尾段使用各自安全区，窄窗和竖窗优先保留文字、人脸、口型与主要动作。有限源画幅之外使用同作品颜色环境，不模糊、不镜像、不用透明人物边缘遮接缝；外围暗区可以裁切。极端比例不保证保留源画面全部边缘。

普通本地导入/社区视频仍使用用户选择的cover或contain，不自动继承内置安全区。视频本身不含可执行作者代码。下载只在用户明确操作后发生，按长度与SHA256检查；正常开机只用本地文件。

尺寸变化只更新同一video的CSS布局，不seek、不重播、不另建音轨。当前safe-camera只在页面可见且确实存在画幅外补色区域时，以8×1的小Canvas读取边缘颜色，采样间隔至少250毫秒（最多4Hz），优先放到空闲回调；不复制整帧。采样失败沿用配置或上次可用底色，布局失败显示原生完整画面。暂停/结束不持续排帧，页面隐藏会取消帧回调与待执行采样，卸载时恢复样式并清理观察器、事件和回调。旧legacy Canvas兼容分支保留原有DPR、栅格与帧率限制及回退，不用于当前三部内置safe-camera影片。Esc/点击跳过、媒体失败、宿主加载失败和超时均可让出界面。有声自动播放被阻止时提示操作，避免静音口型。

0.7.0引入的性能优化针对全帧复制与重复布局开销；短样本中的 `droppedVideoFrames=0` 不能证明所有设备或所有系统负载下都无卡顿。具体对照数据与测试环境见验证记录，仍应以实际DSH播放体验复验。

## 0.2.2-rc.1普通插件合同

新版内核升级到Cordis 4.1.0、Schemastery 3.19.0，随包React仍为18.3.1。普通插件的模块工厂、Host注入、slots与configForms配置读写和settings接口须通过真实随包模块核对，不能由首屏原包识别结果代替。DSH实际manifest兼容性判断为预发布版本启用includePrerelease；原有 `engines.dsh: >=0.2.1-rc.2` 不因0.2.2-rc.1元组变化而自动失效。普通插件源码及播放器保持0.7.0字节，合同证据见 [v0.7.1-core.json](verification/v0.7.1-core.json)。

## 验证口径

源码构建、真实模块加载、独立浏览器播放/resize、资源路由及隔离ASAR副本的安装/升级/恢复检查分别记录，见 `verification/`。包内 `preview.html` 使用同一播放器，但不能将浏览器/合成Profile检查称为真实DSH冷启动人工验收。三种构建的离线检查和实机结果分别记录；2.0.21-next增加脚本编译缓存与窗口状态恢复，2.0.22-next另行核对新实现模块及普通插件合同。冷启动、热启动及记忆窗口状态应单独核对；本轮副本检查不作为新版实机启动、声音或恢复验收。0.7.1汇总、普通内核合同和原生副本范围分别见 [v0.7.1.json](verification/v0.7.1.json)、[v0.7.1-core.json](verification/v0.7.1-core.json)、[v0.7.1-native.json](verification/v0.7.1-native.json)。

早期排查参考了 [DSH Desktop NEXT](https://github.com/anywhere-labs/dsh-desktop/tree/master/dsh-desktop-next) 的主进程、preload和web-document源码，以及社区dsh-550c-boot、dsh-video-skin和dsh-boot-animation。构建时序结论以本机原始产物为直接证据，不保证上游移动分支逐行一致。
