import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
export function createStore(path) {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, created TEXT NOT NULL); CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime TEXT NOT NULL, original TEXT NOT NULL);",
  );
  return {
    list(kind) {
      return db
        .prepare("SELECT * FROM records WHERE kind=? ORDER BY created DESC")
        .all(kind)
        .map((r) => ({ ...JSON.parse(r.data), id: r.id }));
    },
    put(kind, data, id) {
      if (
        id &&
        !db
          .prepare("SELECT id FROM records WHERE kind=? AND id=?")
          .get(kind, id)
      )
        return null;
      id ||= randomUUID();
      db.prepare(
        "INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      ).run(id, kind, JSON.stringify(data), new Date().toISOString());
      return { ...data, id };
    },
    remove(kind, id) {
      return (
        db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id)
          .changes > 0
      );
    },
    mediaAdd(file) {
      let id = randomUUID();
      db.prepare("INSERT INTO media VALUES(?,?,?,?)").run(
        id,
        file.filename,
        file.mimetype,
        file.originalname,
      );
      return id;
    },
    mediaGet(id) {
      return db.prepare("SELECT * FROM media WHERE id=?").get(id);
    },
    close() {
      db.close();
    },
  };
}
