import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { indexDocument } from "@/lib/inngest/functions/index-document";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [indexDocument],
});
