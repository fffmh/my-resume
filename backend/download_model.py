# -*- coding: utf-8 -*-
"""下载语义嵌入模型 bge-small-zh-v1.5（约 100MB）。
先走国内镜像 hf-mirror.com，失败再走 huggingface.co；必须先在环境变量设置 HF_ENDPOINT 再导入 huggingface_hub。"""
import os
import sys


def _load(endpoint):
    os.environ['HF_ENDPOINT'] = endpoint
    os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')
    from sentence_transformers import SentenceTransformer  # 导入必须在设置 HF_ENDPOINT 之后
    return SentenceTransformer('BAAI/bge-small-zh-v1.5')


def main():
    endpoints = ['https://hf-mirror.com', 'https://huggingface.co']
    for ep in endpoints:
        try:
            print(f'正在通过 {ep} 下载 bge-small-zh-v1.5（约 100MB，需要几分钟，请耐心等待）...', flush=True)
            model = _load(ep)
            print(f'模型就绪：{model}')
            print('语义检索（RAG）已启用。')
            return
        except Exception as exc:  # noqa: BLE001
            print(f'  {ep} 下载失败：{exc}', flush=True)
    print('全部源下载失败：请检查网络/代理后重试（镜像 hf-mirror.com 一般可用）。')
    print('不影响使用：系统将自动降级为词法（BM25/关键词）检索。')
    sys.exit(1)


if __name__ == '__main__':
    main()