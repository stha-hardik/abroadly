"""Tiny in-process LRU cache for normalized queries.

The goal isn't perfect concurrency or persistence — it's:
  (1) cheap repeat lookups for hot questions ("UK visa fee" gets asked all day)
  (2) zero added dependencies (no Redis yet)

Capacity is small on purpose — 1000 entries covers a single-instance backend
nicely without growing unbounded memory. Hash key is sha256(query.lower().strip())
so cosmetic whitespace / case differences hit the same cache row.
"""
from __future__ import annotations

import hashlib
from collections import OrderedDict
from threading import Lock

_MAX_ENTRIES = 1000


class _LRU:
    def __init__(self, max_entries: int = _MAX_ENTRIES) -> None:
        self._store: "OrderedDict[str, str]" = OrderedDict()
        self._lock = Lock()
        self._max = max_entries

    @staticmethod
    def _key(query: str) -> str:
        canonical = query.lower().strip()
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def get(self, query: str) -> str | None:
        k = self._key(query)
        with self._lock:
            if k not in self._store:
                return None
            self._store.move_to_end(k)  # mark as recently used
            return self._store[k]

    def set(self, query: str, normalized: str) -> None:
        k = self._key(query)
        with self._lock:
            self._store[k] = normalized
            self._store.move_to_end(k)
            while len(self._store) > self._max:
                self._store.popitem(last=False)  # evict oldest

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)


# Process-wide singleton — chat.py and tests both share it.
cache = _LRU()
