import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  tablePlugin,
  thematicBreakPlugin,
  codeBlockPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ListsToggle,
  CreateLink,
  InsertTable,
  Separator
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  value: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  height?: number;
  className?: string;
  hideToolbar?: boolean;
  /**
   * Changing this key will force-remount the underlying editor.
   * Useful when you programmatically replace the content (e.g., insert template).
   */
  resetKey?: string | number;
  /** Enable Rich/Source/Diff mode buttons. */
  enableModes?: boolean;
  /** Baseline markdown to diff against when in Diff mode. */
  diffBase?: string;
};

/**
 * MarkdownEditor — wrapper around @mdxeditor/editor configured for our app.
 * Replaces @uiw/react-md-editor with a richer, themed experience.
 */
export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  height = 600,
  className,
  hideToolbar = false,
  resetKey,
  enableModes = false,
  diffBase = "",
}: Props) {
  type Mode = 'rich' | 'source' | 'diff'
  const [mode, setMode] = useState<Mode>('rich')
  const [localResetKey, setLocalResetKey] = useState(0)

  // When switching back to rich mode, remount MDXEditor to reflect latest text
  useEffect(() => {
    if (mode === 'rich') setLocalResetKey((k) => k + 1)
  }, [mode])
  const plugins = useMemo(() => {
    const base = [
      listsPlugin(),
      quotePlugin(),
      headingsPlugin(),
      linkPlugin(),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
    ];
    if (hideToolbar) return base;
    return [
      toolbarPlugin({
        toolbarContents: () => (
          <div className="flex items-center gap-1 w-full">
            <div className="flex items-center gap-1">
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertTable />
            </div>
            {enableModes && (
              <div className="ml-auto">
                <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <TabsList>
                    <TabsTrigger value="rich">Rich Text</TabsTrigger>
                    <TabsTrigger value="source">Source</TabsTrigger>
                    <TabsTrigger value="diff" disabled={!diffBase}>Diff</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
        ),
      }),
      ...base,
    ];
  }, [hideToolbar, enableModes, mode, diffBase]);

  return (
    <div
      className={cn(
        "jit-mdxeditor rounded-md border bg-background overflow-hidden flex flex-col",
        className
      )}
      style={{ height }}
    >
      {/* Fallback toggles bar for non-rich modes so switching remains possible */}
      {enableModes && mode !== 'rich' && (
        <div className="border-b bg-muted/30 px-2 py-1.5">
          <div className="flex items-center">
            <div className="ml-auto">
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList>
                  <TabsTrigger value="rich">Rich Text</TabsTrigger>
                  <TabsTrigger value="source">Source</TabsTrigger>
                  <TabsTrigger value="diff" disabled={!diffBase}>Diff</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      )}
      <div className={cn("flex-1 min-h-0", mode === 'diff' ? 'overflow-auto' : 'overflow-hidden')}>
        {mode === 'rich' && (
          <div className="h-full overflow-y-auto">
            <MDXEditor
              key={`${resetKey ?? ''}-${localResetKey}`}
              className="h-full"
              markdown={value}
              onChange={onChange}
              readOnly={readOnly}
              plugins={plugins}
              // Make content blend with our typography and theme
              contentEditableClassName={
                "prose prose-sm sm:prose base max-w-none dark:prose-invert focus:outline-none p-4 sm:p-6"
              }
            />
          </div>
        )}
        {mode === 'source' && (
          <textarea
            className="w-full h-full p-4 font-mono text-sm bg-background outline-none resize-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {mode === 'diff' && (
          <DiffView base={diffBase} current={value} />
        )}
      </div>
    </div>
  );
}

function DiffView({ base, current }: { base: string; current: string }) {
  // Very small unified diff by lines (LCS)
  const a = base.split(/\r?\n/)
  const b = current.split(/\r?\n/)
  const lcs = buildLCS(a, b)
  const ops: Array<{ type: 'eq' | 'del' | 'add'; text: string }> = []
  let i = 0, j = 0
  for (const [x, y] of lcs) {
    while (i < x) ops.push({ type: 'del', text: a[i++] })
    while (j < y) ops.push({ type: 'add', text: b[j++] })
    if (i < a.length && j < b.length) {
      ops.push({ type: 'eq', text: a[i] })
      i++; j++
    }
  }
  while (i < a.length) ops.push({ type: 'del', text: a[i++] })
  while (j < b.length) ops.push({ type: 'add', text: b[j++] })

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="w-full min-w-0 p-4 text-sm font-mono leading-5">
        {ops.map((op, idx) => {
          const cls =
            op.type === 'eq'
              ? 'text-foreground'
              : op.type === 'add'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
          const prefix = op.type === 'add' ? '+ ' : op.type === 'del' ? '- ' : '  '
          return (
            <div key={idx} className={`whitespace-pre-wrap break-words ${cls}`}>
              {prefix + op.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildLCS(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length, m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const path: Array<[number, number]> = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { path.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return path
}
