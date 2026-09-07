import json

with open("package.json", "r") as f:
    pkg = json.load(f)

pkg["type"] = "module"
pkg["dependencies"]["framer-motion"] = "^13.2.0"
pkg["devDependencies"]["@testing-library/dom"] = "^10.4.1"
pkg["devDependencies"]["@testing-library/react"] = "^16.3.3"
pkg["devDependencies"]["jsdom"] = "^30.0.1"

with open("package.json", "w") as f:
    json.dump(pkg, f, indent=2)
