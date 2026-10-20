"""Copy the local inference runtime beside the EXE; the whole directory is portable."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, shutil, hashlib
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
target=root/'build'/f'XiangMeta-{version}'
target.mkdir(parents=True,exist_ok=True)
def copy_changed(source,destination):
    # Re-running staging does not overwrite unchanged loaded DLLs or weight files.
    source,destination=Path(source),Path(destination)
    if destination.is_file() and source.stat().st_size==destination.stat().st_size:
        # Large buffered hashes avoid thousands of tiny reads per model/DLL.
        with source.open('rb') as a,destination.open('rb') as b:
            if hashlib.file_digest(a,'sha256').digest()==hashlib.file_digest(b,'sha256').digest():return destination
    return shutil.copy2(source,destination)
for name in ['python','models']:
    print(f'Staging {name}...',flush=True)
    # The runtime contains ~20,000 small files. Bounded independent I/O keeps a
    # repeated verification fast without weakening content comparison.
    with ThreadPoolExecutor(max_workers=8) as pool:
        pending=[]
        def queue_copy(source,destination):
            pending.append(pool.submit(copy_changed,source,destination))
            return destination
        shutil.copytree(root/'runtime'/name,target/'runtime'/name,dirs_exist_ok=True,
                       ignore=shutil.ignore_patterns('__pycache__'),copy_function=queue_copy)
        for result in pending:result.result()
shutil.copy2(root/'runtime/model-inventory.json',target/'runtime/model-inventory.json')
config=json.loads((root/'data/local.json').read_text(encoding='utf-8'))
config['root']='.'
(target/'local.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
exe=root/'build/staging'/f'XiangMeta-{version}-x64.exe'
if not exe.exists():exe=target/exe.name
if exe.exists():
    if exe.resolve()!=(target/exe.name).resolve():shutil.copy2(exe,target/exe.name)
    sha=hashlib.file_digest(exe.open('rb'),'sha256').hexdigest()
    assert sha==hashlib.file_digest((target/exe.name).open('rb'),'sha256').hexdigest()
    (target/'SHA256.txt').write_text(f'{sha}  {exe.name}\n',encoding='utf-8')
(target/'使用说明.txt').write_text(f'''XiangMeta {version}

双击 XiangMeta-{version}-x64.exe 启动。
请移动或复制整个 XiangMeta-{version} 文件夹，保留 local.json 和 runtime。
EXE 包含世界、摄影与音乐，runtime 包含五个模型和独立 Python 环境。
不需要原始项目、Codex 缓存或另行安装 Python。首次模型加载需要几秒。
生成结果逐步显示；关闭界面会取消当前推理。

WASD 移动，鼠标转向，空格跳跃，F 使用展品，R 体验小互动或收集，P 摄影。
Esc 关闭界面后恢复环顾，再按 Esc 释放鼠标。靠近专辑或照片并用画面中心对准作品，按 F 打开。
更新时先关闭旧版本窗口，再启动新版。每次便携启动使用独立的临时资源目录。
进入世界后默认开启音乐，点击音符可以关闭。七首伴奏自动换曲；季节曲每次旅程首演一次。
音乐、专辑和 MV 已按响度校准，播放器默认音量为 95%；开关提示音单独保持轻柔。
同一次旅程反复进出或刷新不会重播，重新开启应用开始新的旅程。
收藏与个人进度保存在当前 Windows 用户的应用数据中。
海风港口在中央枢纽南侧，沿缓坡步行抵达，靠近柜台按 F 查看航线。
机器人岛、量化投资交易所岛和 AI 研究院均尚未开放，敬请期待。
《燕来有声》封面与完整 MV 已接入未名拾音工作台；春季《春》已接入四季首演。
科研工作台可以调整参数查看论文方程的数值曲线，默认值为演示参数，未经实验数据拟合。
''',encoding='utf-8')
print(f'Portable runtime ready: {target}; EXE included: {exe.exists()}',flush=True)
