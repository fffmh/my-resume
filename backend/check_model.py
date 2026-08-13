# -*- coding: utf-8 -*-
"""检查语义模型是否已缓存（start-backend.bat 调用）。"""
import os
import sys

p = os.path.expanduser('~/.cache/huggingface/hub/models--BAAI--bge-small-zh-v1.5')
sys.exit(0 if os.path.isdir(p) else 1)