with open("server.ts", "r") as f:
    content = f.read()

old_calling_server = """        case "call_accept":
          sendTo(msg.to as string, {
            type: "call_accept",
            from: userId,
          });
          prisma.pendingCall.deleteMany({
            where: { fromUserId: msg.to as string, toUserId: userId }
          }).catch(console.error);
          break;

        case "call_reject":
          sendTo(msg.to as string, {
            type: "call_reject",
            from: userId,
          });
          prisma.pendingCall.deleteMany({
            where: { fromUserId: msg.to as string, toUserId: userId }
          }).catch(console.error);
          break;"""

new_calling_server = """        case "ice_restart_offer":
          sendTo(msg.to as string, {
            type: "ice_restart_offer",
            from: userId,
            sdp: msg.sdp,
          });
          break;

        case "ice_restart_answer":
          sendTo(msg.to as string, {
            type: "ice_restart_answer",
            from: userId,
            sdp: msg.sdp,
          });
          break;

        case "call_reject":
          sendTo(msg.to as string, {
            type: "call_reject",
            from: userId,
          });
          prisma.pendingCall.deleteMany({
            where: { fromUserId: userId, toUserId: msg.to as string }
          }).catch(console.error);
          break;"""

content = content.replace(old_calling_server, new_calling_server)

with open("server.ts", "w") as f:
    f.write(content)
