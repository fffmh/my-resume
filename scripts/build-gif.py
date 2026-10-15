# -*- coding: utf-8 -*-
"""把采集到的连续截图合成为演示 GIF（无需 ffmpeg）。"""
import io
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = os.path.join(ROOT, 'docs', 'screenshots', 'frames')
OUT = os.path.join(ROOT, 'docs', 'screenshots', 'demo.gif')

files = sorted(f for f in os.listdir(FRAMES) if f.endswith('.png'))
if not files:
    raise SystemExit('没有帧文件')

images = []
for name in files:
    img = Image.open(os.path.join(FRAMES, name)).convert('RGB')
    img = img.resize((900, int(900 * img.height / img.width)), Image.LANCZOS)
    images.append(img.quantize(colors=128, method=Image.MEDIANCUT))

images[0].save(
    OUT,
    save_all=True,
    append_images=images[1:],
    duration=700,
    loop=0,
    optimize=True,
)
size_kb = os.path.getsize(OUT) / 1024
print(f'GIF 生成: {OUT} | {len(images)} 帧 | {size_kb:.0f} KB')