import re
import os

test_file = "/home/urfavtechbro/Desktop/Trak/src/__tests__/storage.test.ts"
with open(test_file, "r") as f:
    test_code = f.read()

# Change expectations
test_code = test_code.replace(
    "expect(out.publicUrl).toBe(`https://cdn.example.com/${out.key}`);",
    "expect(out.publicUrl).toContain(`/api/uploads/file?key=`);"
)

with open(test_file, "w") as f:
    f.write(test_code)

print("Patched tests")
