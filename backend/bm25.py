# -*- coding: utf-8 -*-
"""轻量 BM25（jieba 分词，语料 IDF 随文档集即时计算）。"""
import math

import jieba


def tokenize(text):
    return [t for t in jieba.cut(text or '') if t.strip()]


class BM25:
    def __init__(self, docs, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.corpus = [tokenize(d) for d in docs]
        self.doc_len = [len(c) for c in self.corpus]
        self.N = len(self.corpus)
        self.avgdl = sum(self.doc_len) / self.N if self.N else 0.0
        self.idf = {}
        doc_freq = {}
        for doc in self.corpus:
            for term in set(doc):
                doc_freq[term] = doc_freq.get(term, 0) + 1
        for term, df in doc_freq.items():
            self.idf[term] = math.log(1 + (self.N - df + 0.5) / (df + 0.5))

    def score(self, query):
        q = tokenize(query)
        scores = []
        for i, doc in enumerate(self.corpus):
            if not doc:
                scores.append(0.0)
                continue
            tf = {}
            for t in doc:
                tf[t] = tf.get(t, 0) + 1
            dl = self.doc_len[i]
            s = 0.0
            for term in set(q):
                if term not in tf:
                    continue
                f = tf[term]
                idf = self.idf.get(term, 0.0)
                if self.avgdl:
                    denom = f + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
                else:
                    denom = f + self.k1
                s += idf * (f * (self.k1 + 1)) / denom
            scores.append(s)
        return scores