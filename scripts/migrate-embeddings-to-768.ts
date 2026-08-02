import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Clear old OpenAI 1536-d vectors, then resize column for Groq nomic 768-d
  await sql`TRUNCATE TABLE document_chunks`;
  await sql`ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768)`;
  // Reset completed indexes so they can be re-ingested with the new model
  await sql`
    UPDATE files
    SET
      indexing_status = 'PENDING',
      indexed_at = NULL,
      chunk_count = NULL,
      index_error = 'Reindex required after switching to Groq embeddings',
      index_attempts = 0,
      updated_at = NOW()
    WHERE indexing_status IN ('COMPLETED', 'FAILED', 'INPROGRESS')
  `;
  console.log("Migrated document_chunks to vector(768); reset indexable file statuses");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
