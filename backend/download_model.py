# -*- coding: utf-8 -*-
"""下载语义嵌入模型 bge-small-zh-v1.5（约 100MB）。HF 直连失败自动切 hf-mirror 镜像。"""
import os
import sys


def main():
    os.environ.setdefault('HF_ENDPOINT', 'https://huggingface.co')
    os.environ.setdefault('HF_HUB_ENABLE_HF_TRANSFER', '0')
    try:
        from sentence_transformers import SentenceTransformer
        print('正在下载 bge-small-zh-v1.5（约 100MB，首次需要几分钟）...')
        model = SentenceTransformer('BAAI/bge-small-zh-v1.5')
        print(f'模型就绪：{model}')
        print('语义检索（RAG）已启用。')
    except Exception as exc:  # noqa: BLE001
        print(f'HF 直连失败（{exc}），尝试镜像 hf-mirror.com ...')
        os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('BAAI/bge-small-zh-v1.5')
            print(f'模型就绪（镜像）：{model}')
            print('语义检索（RAG）已启用。')
        except Exception as exc2:  # noqa: BLE001
            print(f'下载失败：{exc2}')
            print('不影响使用：系统将自动降级为词法（BM25/关键词）检索。')
            sys.exit(1)


if __name__ == '__main__':
    main()