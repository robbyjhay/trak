import re

with open("src/context/TrakStore.tsx", "r") as f:
    text = f.read()

# Add exceptions to value object
text = text.replace(
    '    getActivity: (id) => db.activities.find((a) => a.id === id),',
    '    getActivity: (id) => db.activities.find((a) => a.id === id),\n    requestException,\n    approveException,\n    rejectException,'
)
text = text.replace(
    '  const value: TrakStoreValue = {',
    '  const value: TrakStoreValue = {'
)
# Actually, they need to be extracted from `functions` or just added inline.
# Wait! In TrakStore.tsx, the functions are defined inline in `const functions = useMemo(() => ({ ... }), [])`. Then they are merged into `value`.
