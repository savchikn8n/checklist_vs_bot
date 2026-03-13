import { loadChecklistTemplateFromSupabase } from "../../../lib/checklist-template-source";

export async function GET() {
  try {
    const result = await loadChecklistTemplateFromSupabase();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
