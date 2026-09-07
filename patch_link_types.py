with open("src/lib/types.ts", "r") as f:
    types = f.read()

if "LinkPreview" not in types:
    types = types.replace('  | "dm"\n  | "activity_created"', '  | "dm"\n  | "community"\n  | "activity_created"')
    types = types.replace('  replyToId?: string | null;\n  replyTo?: ReplyPreview | null;\n}', '  replyToId?: string | null;\n  replyTo?: ReplyPreview | null;\n  linkPreview?: LinkPreview | null;\n}')
    types = types.replace('  mentions?: MessageMention[];\n}', '  mentions?: MessageMention[];\n  linkPreview?: LinkPreview | null;\n}')
    
    lp = """
export interface LinkPreview {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  image?: string;
}"""
    types = types.replace('export interface Dm {', lp + '\n\nexport interface Dm {')
    with open("src/lib/types.ts", "w") as f:
        f.write(types)
