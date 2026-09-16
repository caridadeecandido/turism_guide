"""
Minimal Mongo-collection-like interface backed by Postgres (JSONB per row).

Lets server.py keep its Motor-style query code (`db.spots.find({...})`,
`update_one({"$set": ...})`, `.sort().to_list()`, etc.) unchanged after the
move off MongoDB to Postgres/Neon.

Supported subset (everything server.py actually uses):
- find(query, projection).sort(field, dir).to_list(n)   — query: exact-match
  per key; a list-valued doc field matches if the query value is IN it
  (mirrors Mongo's scalar-vs-array semantics). projection: exclusion-style
  only ({"field": 0}), which is the only style used in this codebase.
- find_one(query, projection)
- insert_one(doc) / insert_many(docs)
- update_one(query, {"$set"|"$addToSet"|"$pull": {...}}, upsert=False)
- delete_one(query) / delete_many(query)
- count_documents(query) / distinct(field) / create_index(...) (no-op)

ponytail: filtering/sorting/distinct happen in Python after a full table
scan — no JSONB query pushdown. Fine at this dataset's scale (tens of rows
per table). Switch to real SQL WHERE/ORDER BY if a table ever grows past a
few thousand rows.

ponytail: create_index() is a no-op — no DB-enforced uniqueness. The app
already checks-before-write where it matters (admin_login, create_session).
Add real UNIQUE indexes if this CMS ever gets concurrent writers.
"""
import json
from datetime import datetime
from typing import Any, Optional
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

import asyncpg

_TABLES = [
    "spots", "partners", "guides", "translations", "admins",
    "users", "user_sessions", "site_config", "inquiries", "images",
]


def _json_default(o: Any) -> str:
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError(f"Not JSON serializable: {o!r}")


def _dumps(obj: Any) -> str:
    return json.dumps(obj, default=_json_default)


def _matches(doc: dict, query: dict) -> bool:
    for key, value in query.items():
        field = doc.get(key)
        if isinstance(field, list):
            if value not in field:
                return False
        elif field != value:
            return False
    return True


def _project(doc: dict, projection: Optional[dict]) -> dict:
    if not projection:
        return doc
    excluded = {k for k, v in projection.items() if not v}
    return {k: v for k, v in doc.items() if k not in excluded}


def _apply_update(doc: dict, update: dict) -> None:
    for op, fields in update.items():
        if op == "$set":
            doc.update(fields)
        elif op == "$addToSet":
            for k, v in fields.items():
                arr = doc.setdefault(k, [])
                if v not in arr:
                    arr.append(v)
        elif op == "$pull":
            for k, v in fields.items():
                doc[k] = [x for x in doc.get(k, []) if x != v]
        else:
            raise ValueError(f"Unsupported update operator: {op}")


class _UpdateResult:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count


class _DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class _Cursor:
    """Lazy, like Motor's: find() returns this synchronously; the query
    only runs once to_list() is awaited."""

    def __init__(self, pool: asyncpg.Pool, table: str, query: dict, projection: Optional[dict]):
        self._pool = pool
        self._table = table
        self._query = query
        self._projection = projection
        self._sort_field: Optional[str] = None
        self._sort_dir = 1

    def sort(self, field: str, direction: int = 1) -> "_Cursor":
        self._sort_field = field
        self._sort_dir = direction
        return self

    async def to_list(self, length: Optional[int] = None) -> list:
        rows = await self._pool.fetch(f"SELECT doc FROM {self._table}")
        docs = [d for r in rows if _matches((d := r["doc"]), self._query)]
        docs = [_project(d, self._projection) for d in docs]
        if self._sort_field:
            docs.sort(key=lambda d: d.get(self._sort_field) or 0, reverse=self._sort_dir < 0)
        return docs[:length] if length else docs


class Collection:
    def __init__(self, pool: asyncpg.Pool, table: str):
        self._pool = pool
        self._table = table

    async def _rows(self) -> list[asyncpg.Record]:
        return await self._pool.fetch(f"SELECT pk, doc FROM {self._table}")

    def find(self, query: Optional[dict] = None, projection: Optional[dict] = None) -> _Cursor:
        return _Cursor(self._pool, self._table, query or {}, projection)

    async def find_one(self, query: Optional[dict] = None, projection: Optional[dict] = None) -> Optional[dict]:
        for r in await self._rows():
            if _matches(r["doc"], query or {}):
                return _project(r["doc"], projection)
        return None

    async def insert_one(self, doc: dict) -> None:
        await self._pool.execute(f"INSERT INTO {self._table} (doc) VALUES ($1)", doc)

    async def insert_many(self, docs: list[dict]) -> None:
        if not docs:
            return
        await self._pool.executemany(f"INSERT INTO {self._table} (doc) VALUES ($1)", [(d,) for d in docs])

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> _UpdateResult:
        for r in await self._rows():
            if _matches(r["doc"], query):
                doc = r["doc"]
                _apply_update(doc, update)
                await self._pool.execute(f"UPDATE {self._table} SET doc = $1 WHERE pk = $2", doc, r["pk"])
                return _UpdateResult(1)
        if upsert:
            doc = dict(query)
            _apply_update(doc, update)
            await self.insert_one(doc)
        return _UpdateResult(0)

    async def delete_one(self, query: dict) -> _DeleteResult:
        for r in await self._rows():
            if _matches(r["doc"], query):
                await self._pool.execute(f"DELETE FROM {self._table} WHERE pk = $1", r["pk"])
                return _DeleteResult(1)
        return _DeleteResult(0)

    async def delete_many(self, query: dict) -> _DeleteResult:
        pks = [r["pk"] for r in await self._rows() if _matches(r["doc"], query)]
        if pks:
            await self._pool.execute(f"DELETE FROM {self._table} WHERE pk = ANY($1::bigint[])", pks)
        return _DeleteResult(len(pks))

    async def count_documents(self, query: dict) -> int:
        return sum(1 for r in await self._rows() if _matches(r["doc"], query or {}))

    async def distinct(self, field: str) -> list:
        values: set = set()
        for r in await self._rows():
            v = r["doc"].get(field)
            if isinstance(v, list):
                values.update(v)
            elif v not in (None, ""):
                values.add(v)
        return list(values)

    async def create_index(self, *args, **kwargs) -> None:
        pass


def _sanitize_dsn(dsn: str) -> str:
    """asyncpg doesn't recognize the `channel_binding` query param some
    providers (Neon) add to their connection strings — drop it."""
    parts = urlsplit(dsn)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "channel_binding"]
    return urlunsplit(parts._replace(query=urlencode(query)))


async def _init_conn(conn: asyncpg.Connection) -> None:
    await conn.set_type_codec("jsonb", encoder=_dumps, decoder=json.loads, schema="pg_catalog")


class PgJsonStore:
    def __init__(self, dsn: str):
        self._dsn = _sanitize_dsn(dsn)
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(self._dsn, init=_init_conn)
        async with self._pool.acquire() as conn:
            for table in _TABLES:
                await conn.execute(
                    f"CREATE TABLE IF NOT EXISTS {table} (pk BIGSERIAL PRIMARY KEY, doc JSONB NOT NULL)"
                )

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    def __getattr__(self, name: str) -> Collection:
        if name in _TABLES:
            return Collection(self._pool, name)
        raise AttributeError(name)


async def _smoke(dsn: str) -> None:
    """ponytail self-check: exercises every op this shim supports against a
    disposable table on the real target DB. Run: python db.py <DATABASE_URL>"""
    store = PgJsonStore(dsn)
    await store.connect()
    _TABLES.append("_smoke_test")
    try:
        async with store._pool.acquire() as conn:
            await conn.execute("CREATE TABLE IF NOT EXISTS _smoke_test (pk BIGSERIAL PRIMARY KEY, doc JSONB NOT NULL)")
        col = store._smoke_test

        await col.insert_many([{"id": "a", "tags": ["x", "y"], "n": 2}, {"id": "b", "tags": ["y"], "n": 1}])
        assert await col.count_documents({}) == 2

        found = await col.find({"tags": "x"}).to_list()
        assert [d["id"] for d in found] == ["a"], found

        sorted_docs = await col.find({}).sort("n", 1).to_list()
        assert [d["id"] for d in sorted_docs] == ["b", "a"], sorted_docs

        assert sorted(await col.distinct("tags")) == ["x", "y"]

        one = await col.find_one({"id": "a"}, {"n": 0})
        assert "n" not in one and one["id"] == "a", one

        res = await col.update_one({"id": "a"}, {"$set": {"n": 99}})
        assert res.matched_count == 1
        assert (await col.find_one({"id": "a"}))["n"] == 99

        await col.update_one({"id": "a"}, {"$addToSet": {"tags": "z"}})
        assert "z" in (await col.find_one({"id": "a"}))["tags"]
        await col.update_one({"id": "a"}, {"$pull": {"tags": "z"}})
        assert "z" not in (await col.find_one({"id": "a"}))["tags"]

        upsert_res = await col.update_one({"id": "c"}, {"$set": {"n": 5}}, upsert=True)
        assert upsert_res.matched_count == 0
        assert (await col.find_one({"id": "c"}))["n"] == 5

        del_res = await col.delete_one({"id": "b"})
        assert del_res.deleted_count == 1
        assert await col.count_documents({}) == 2
    finally:
        async with store._pool.acquire() as conn:
            await conn.execute("DROP TABLE IF EXISTS _smoke_test")
        await store.close()
    print("db.py smoke test: OK")


if __name__ == "__main__":
    import asyncio
    import sys

    asyncio.run(_smoke(sys.argv[1]))
