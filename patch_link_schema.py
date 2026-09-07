with open("prisma/schema.prisma", "r") as f:
    schema = f.read()

if "link_previews" not in schema:
    schema = schema.replace('  community_message_mentions CommunityMessageMention[]', '  community_message_mentions CommunityMessageMention[]\n  link_previews              LinkPreview?')
    schema = schema.replace('  attachments       MessageAttachment[]\n  replyToId         String?', '  attachments       MessageAttachment[]\n  link_previews     LinkPreview?\n  replyToId         String?')
    schema = schema.replace('  activity_missed\n  broadcast', '  activity_missed\n  broadcast\n  community')
    
    table = """
model LinkPreview {
  id                   String            @id @default(uuid())
  url                  String
  domain               String
  title                String?
  description          String?
  image                String?
  createdAt            DateTime          @default(now())

  directMessageId      String?           @unique
  directMessage        DirectMessage?    @relation(fields: [directMessageId], references: [id], onDelete: Cascade)

  communityMessageId   String?           @unique
  communityMessage     CommunityMessage? @relation(fields: [communityMessageId], references: [id], onDelete: Cascade)

  @@map("link_previews")
}"""
    schema += table
    with open("prisma/schema.prisma", "w") as f:
        f.write(schema)
