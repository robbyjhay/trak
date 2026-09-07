import re

with open("src/components/messaging/Messaging.tsx", "r") as f:
    text = f.read()

text = text.replace(
    '  function openThread(pid: string) {\\n    alert("openThread called! PID: " + pid);\\n    setActiveConv(pid);',
    '  function openThread(pid: string) {\\n    setActiveConv(pid);'
)

with open("src/components/messaging/Messaging.tsx", "w") as f:
    f.write(text)

