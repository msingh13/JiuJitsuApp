import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("cloud policies isolate accounts, reject forged ownership, protect media and increment edit revisions", async () => {
  const db = new PGlite();
  const alice = "11111111-1111-4111-8111-111111111111",
    bob = "22222222-2222-4222-8222-222222222222";
  const entry = "33333333-3333-4333-8333-333333333333";
  try {
    await db.exec(`
      create role authenticated; create role anon;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${alice}'), ('${bob}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
      grant usage on schema public,auth,storage to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id serial primary key,bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
      grant usage on sequence storage.objects_id_seq to authenticated;
      create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
      create function storage.filename(text) returns text language sql immutable as $$select (string_to_array($1,'/'))[array_length(string_to_array($1,'/'),1)]$$;
    `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610290001_private_journals.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    async function as(uid) {
      await db.exec(
        `reset role; set role authenticated; set request.jwt.claim.sub = '${uid}';`,
      );
    }
    await as(alice);
    await db.query(
      "insert into journal_records(user_id,id,kind,data) values($1,$2,'sessions',$3)",
      [alice, entry, { title: "Alice's class" }],
    );
    await db.query(
      "insert into journal_media(user_id,id,name,type,size) values($1,$2,'class.mp4','video/mp4',100)",
      [alice, entry],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('matcraft-media',$1)",
      [`${alice}/${entry}`],
    );
    assert.equal(
      (await db.query("select * from journal_records")).rows.length,
      1,
    );
    await db.exec('update journal_records set data = \'{"title":"Updated"}\'');
    assert.equal(
      (await db.query("select revision from journal_records")).rows[0].revision,
      2,
    );
    await as(bob);
    assert.equal(
      (await db.query("select * from journal_records")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from journal_media")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into journal_records(user_id,id,kind,data) values($1,$2,'sessions','{}')",
        [alice, crypto.randomUUID()],
      ),
      /row-level security/,
    );
    assert.equal(
      (
        await db.query(
          "update journal_records set data='{}' where user_id=$1 returning *",
          [alice],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from journal_records where user_id=$1 returning *",
          [alice],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('matcraft-media',$1)",
        [`${alice}/${entry}`],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('matcraft-media',$1)",
        [`${bob}/${entry}`],
      ),
      /row-level security/,
    );
    // Same record UUID can belong to different accounts without collisions.
    await db.query(
      "insert into journal_records(user_id,id,kind,data) values($1,$2,'sessions','{}')",
      [bob, entry],
    );
    await as(alice);
    assert.equal(
      (await db.query("select data from journal_records")).rows[0].data.title,
      "Updated",
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(
      db.query("select * from journal_records"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
