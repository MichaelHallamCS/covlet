<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI letter generation runs only in the server route /api/generate (src/lib/letter.server.ts); resumes and letters are never stored server-side — privacy promise in the UI.
- Resume/image parsing and .docx/PDF export run in the browser via dynamically imported libs (src/lib/files.ts) — they are browser-only and must not load during SSR.
