import re

with open('src/app/api/activities/[id]/route.ts', 'r') as f:
    content = f.read()

# Add import
content = content.replace("softDeleteActivity,", "softDeleteActivity, hardDeleteActivity,")

# Add DELETE method
delete_block = """
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    await hardDeleteActivity(session, id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
"""

content += delete_block

with open('src/app/api/activities/[id]/route.ts', 'w') as f:
    f.write(content)
