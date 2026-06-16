import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Styled markdown for assistant output. The agent returns each product as a
 * compact block: bold name, price line, image, and a Buy link — this renders
 * it as a clean, mobile-friendly card stack. Links open in a new tab.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-foreground",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5 [&_strong]:font-semibold",
        "[&_h1]:mt-3 [&_h1]:text-base [&_h2]:mt-3 [&_h2]:text-base [&_h3]:mt-2 [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
        "[&_del]:text-muted-foreground",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center font-medium text-primary underline-offset-2 hover:underline"
            />
          ),
          img: ({ node: _node, ...props }) => (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              {...props}
              loading="lazy"
              className="my-2 aspect-[3/4] w-full max-w-[220px] rounded-xl border border-border bg-muted object-cover"
            />
          ),
          table: ({ node: _node, ...props }) => (
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
              <table {...props} className="w-full border-collapse text-left text-sm" />
            </div>
          ),
          th: ({ node: _node, ...props }) => (
            <th {...props} className="whitespace-nowrap border-b border-border bg-muted/50 px-3 py-2 font-medium" />
          ),
          td: ({ node: _node, ...props }) => (
            <td {...props} className="border-b border-border/60 px-3 py-2" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
