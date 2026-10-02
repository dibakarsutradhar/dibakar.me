> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/NFT-factory` (GitHub: `dibakarsutradhar/NFT-factory`)
> Analysis date: 2026-10-02 · Snapshot as of last commit `108fff9` (2021-02-10)
> 22 commits (21 by Dibakar Sutra Dhar, 1 repo-initialization LICENSE commit by p0oker/Pooria Atarzadeh) · 2021-01-02 → 2021-02-10
> Purpose: source of truth for CV/portfolio/LinkedIn/blog derivation. Companion document to `signup-core-writeup.md` — this is the case study of a dApp built on the Signup.cash SDK. Regenerate both together if either codebase changes materially.
> **Unified project framing:** this dApp is the **NFT/SLP factory** component of **Signup — Non-Custodial Bitcoin Cash Wallet with NFT/SLP Factory**. The unified project view (one CV entry, combined numbers, shared caveats) lives in `00-project-overview.md`.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

**NFT-factory** is the **NFT/SLP factory** of the unified **Signup** project (non-custodial Bitcoin Cash wallet + NFT/SLP factory — see `00-project-overview.md`): a four-step web wizard that lets non-custodial wallet users mint **SLP NFT1 collections** — an NFT group (parent) plus any number of NFT children — entirely from the browser. Built Jan–Feb 2021 on the `@signupcash/provider` SDK (v1.0.1), Create React App + Theme UI, with drag-and-drop image uploads pinned to **IPFS via Pinata** (live upload progress, gateway URLs stored in form state). All 21 development commits are Dibakar's; the Signup.cash maintainer (p0oker) initialized the repo and added the MPL-2.0 license before work began. The project reached "phase 2 complete" (UI + auth + IPFS pipeline) but its final mint step was left unwired — the provider SDK's NFT-genesis functions it needed only shipped in the SDK after this app was built.

Ready-to-adapt CV summary sentence (unified-project framing — see also `00-project-overview.md`): _Built the NFT/SLP factory for Signup, a non-custodial Bitcoin Cash wallet platform: a React wizard for minting SLP NFT1 collections from the wallet, with wallet-based login via the Signup provider SDK and drag-and-drop IPFS image pinning through Pinata._

## 2. The product

Positioning: a consumer-facing minting front-end for the Signup.cash wallet — "Create your own NFT with signup" (the Auth screen's literal heading, `src/components/Auth.js`). Target users: BCH wallet holders who want to launch NFT collections without touching CLI tools or raw SLP transactions.

| Feature                               | What it does                                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet login (`Auth.js`)              | "Connect with Signup" — calls `signup.requestAccess(['bch_address'])`; the wallet popup handles key custody, the dApp only ever receives the user's BCH address |
| NFT group (parent) form (`Parent.js`) | Ticker, name, initial quantity + drag-and-drop image upload (react-dropzone), pinned to IPFS with a live progress bar                                           |
| NFT child form (`Child.js`)           | Per-child ticker, name, mint quantity + image; group linkage shown as a locked select; supports minting multiple children sequentially                          |
| IPFS pipeline (Parent/Child)          | `POST api.pinata.cloud/pinning/pinFileToIPFS` with multipart FormData and axios `onUploadProgress`; stores `gateway.pinata.cloud/ipfs/{IpfsHash}` in state      |
| Review/summary (`Success.js`)         | Card grid of created children under the group name; "Create another NFT Child" loops back to the child step with fresh state                                    |
| Stepper engine (`Container.js`)       | `react-hooks-helper` `useStep` driving a 4-step flow (auth → parent → child → success) with a single `nftData` form-state object                                |

## 3. Architecture (summary level)

Single-page React 17 app (~900 hand-written LOC across 13 source files), bootstrapped with CRA 4, styled entirely with **Theme UI** (a 245-line design-token theme in `src/components/theme.js`) plus FontAwesome icons. No backend of its own: it composes two external services — the **Signup.cash wallet** (login/identity via the provider SDK popup) and **Pinata** (IPFS pinning, keys injected from `REACT_APP_*` env vars through `src/config/keys.js`). Routing is one catch-all `<Route path="/" component={Container}>`; all flow control is the stepper, not URLs. Deployment target was presumably static hosting (no deploy config in-repo).

The app sits conceptually **on top of** signup-core: it is a concrete consumer of the provider SDK whose mint step was designed to call `genesisNFTGroup` / `genesisNFTChild`.

## 4. The story: how the project evolved

| Phase                   | Dates          | Commits / milestones                                                                                                                                              |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handoff & scaffold      | Jan 2–4, 2021  | p0oker adds LICENSE (`901f4fa`); CRA initialized (`5623ad4`); auth step started (`d372a84`)                                                                       |
| Layout & UI foundations | Jan 15–20      | Form components, layout CSS, auth page, footer, centering (`93ddca6` → `a2f989f`)                                                                                 |
| State architecture      | Jan 23         | "hook container" (`e17c383`) and "parent child hook conversation" (`852ba67`) — the functional-components-with-shared-state refactor that produced `Container.js` |
| Reality check           | Jan 24         | **`c8b6886` "demo nonFunc"** — the honest marker that the mint flow couldn't be completed end-to-end                                                              |
| Polish + IPFS pipeline  | Jan 26 – Feb 5 | UI v2, env variables for Pinata keys (`d6db808`), parent IPFS upload complete (`501d2d8`), link-bug fix, PR #2 merged (`1365675`)                                 |
| Wrap-up                 | Feb 10         | "phase 2 complete" (`1b30d31`), PR #3 merged (`108fff9`) — last commit                                                                                            |

The engagement context matters: the parent project's own git history shows the provider SDK's NFT-genesis APIs (`genesisNFTGroup`, `genesisNFTChild`) were being built on Signup's unmerged `slp` branch during exactly this window (Jan–Apr 2021, commits `97fb64b`/`add2c0a`/`f09a32e`, merged as PR #63 in May 2021 — see `signup-core-writeup.md` §4). The npm-released provider this app pins (`1.0.1`) did not yet expose those functions, which is why the wizard's final mint action remained `console.log(formData)` (`Child.js:handleSubmit`). The app was built ahead of the SDK capability it depended on — a real-world integration-timing lesson.

## 5. Contributions in detail

All application code is Dibakar's (21 commits, raw +19,529/−1,292 — inflated by `package-lock.json`; real hand-written code ≈ 900 LOC). Thematic breakdown:

1. **Stepper state architecture** (Jan 15–23) — converted an early class/prop-drilling attempt into a hooks-based container: single `nftData` object (bchAddress → currentGroup → children[]) with immutable `setForm` updaters, `childIdx` for multi-child minting, and `useStep` navigation (`Container.js`). Commits `e17c383`, `852ba67`.
2. **IPFS upload pipeline** (Feb 3–5) — the most substantive engineering: react-dropzone single-image accept, multipart POST to Pinata with key headers, byte-accurate progress (`Math.round(100 * loaded/total)`) rendered into a Theme UI `Progress` bar, `IpfsHash` → gateway URL written back into the correct slice of form state (group vs. indexed child), object-URL cleanup on unmount (`Parent.js`, `Child.js`). Commits `d6db808`, `501d2d8`.
3. **Wallet-based auth** (Jan 4–27) — first real integration of the Signup provider SDK in a third-party dApp: `new Signup.cash(...)` → `requestAccess(['bch_address'])` → BCH address captured into wizard state (`Auth.js`). UI iterated across `d372a84`/`f54cc53`.
4. **Design system** — full Theme UI theme (color modes, cards, forms, buttons, thumb grids, responsive scale arrays) (`theme.js`), plus layout/footer chrome (`Layout.js`, `Footer.js`).
5. **Process** — dev-branch workflow with two PR merges (#2, #3), incremental UI commits, honest non-functional milestones.

**Signature engineering moments:**

- **Immutable multi-entity form state**: `Child.js` updates the right child via `children.map((child, idx) => idx === childIdx ? {...child, [name]: value} : child)` — a small but correct pattern for a repeatable sub-form, and the reason "Create another NFT Child" works at all.
- **Secrets hygiene attempt**: Pinata keys pulled from env into a single config module (`src/config/keys.js`) with dotenv (`d6db808`) — right instinct, undermined by CRA's `REACT_APP_` prefix baking them into the client bundle (see §9).
- **Honest milestone tracking**: `c8b6886` "demo nonFunc" documents the integration blocker in history rather than papering over it.

**Commit hygiene:** short lowercase imperative messages ("ui update v2", "ipfs upload parent complete"); small focused commits; PR-per-phase from a `dev` branch. Consistent and readable throughout.

## 6. Engineering practices observed

- No tests beyond CRA defaults (`setupTests.js` placeholder); no CI (no `.github/`); lint via CRA's ESLint config with a committed `.eslintcache` (minor hygiene slip).
- Component style mixed: hooks for flow components, class components for static chrome (`Layout`, `Footer`) — typical transition-era React 17.
- Styling consistently through Theme UI variant objects rather than ad-hoc CSS (only `App.css` shell remains from CRA).
- The project has no README content beyond the CRA boilerplate — the product story lives entirely in code.

## 7. Numbers worth quoting

| Metric                       | Value                                                                                              | Source                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| Engagement length            | Jan 2 → Feb 10, 2021 (~5.5 weeks)                                                                  | git log                     |
| Commits                      | 22 total — 21 by Dibakar, 1 repo-init by p0oker                                                    | `git shortlog -sne`         |
| Merged PRs                   | 2 (dev → main: #2, #3)                                                                             | git log                     |
| Hand-written LOC             | ~900 (13 src files; largest: `theme.js` 245, `Child.js` 181, `Parent.js` 169)                      | `wc -l`                     |
| Raw insertions               | +19,529 (⚠ dominated by `package-lock.json`)                                                       | `git log --numstat`         |
| Wizard steps                 | 4 (auth, parent, child, success)                                                                   | `Container.js`              |
| External services integrated | 2 (Signup wallet SDK, Pinata/IPFS)                                                                 | `package.json`, `Parent.js` |
| SDK version pinned           | `@signupcash/provider` 1.0.1                                                                       | `package-lock.json`         |
| Features wired vs. designed  | login ✅, IPFS upload ✅, group/child forms ✅, on-chain mint ❌ (SDK capability not yet released) | code + `c8b6886`            |

## 8. Raw material for derived artifacts

**CV bullet candidates:**

- Built the NFT/SLP factory for Signup, a non-custodial Bitcoin Cash wallet platform: a commissioned React dApp enabling non-custodial minting of SLP NFT1 collections through a 4-step wizard. (Combined core+factory bullets live in `00-project-overview.md`.)
- Integrated the Signup.cash provider SDK for wallet-based authentication, keeping the application fully keyless — users approve access in a wallet popup and the dApp receives only their BCH address.
- Implemented a drag-and-drop IPFS pinning pipeline (Pinata API, multipart uploads, live progress tracking, gateway URL management) for NFT imagery.
- Designed the multi-entity form state architecture powering repeatable NFT child minting within a single wizard session.
- Delivered a themed, responsive UI with Theme UI design tokens across 13 components in a 5-week engagement.

**Blog-post angles:**

1. **"Minting NFTs without keys: a wallet-popup UX for Bitcoin Cash"** — the keyless auth pattern is the differentiator vs. MetaMask-style dApps; `Auth.js` is a 50-line demonstration.
2. **"When your SDK ships after your app: an integration-timing postmortem"** — the honest `demo nonFunc` arc; the app was ready before `genesisNFTGroup` existed in a released provider.
3. **"NFT metadata done simply: Pinata + gateway URLs in a React wizard"** — practical IPFS-pinnet tutorial material with progress handling.
4. **"Building a multi-child minting wizard with one immutable state object"** — front-end architecture angle.

**LinkedIn headline candidates:**

- "Built the NFT/SLP factory for Signup — a non-custodial Bitcoin Cash wallet with an NFT minting wizard, wallet-popup login, and IPFS image pinning."
- "Commissioned dApp development for the Signup project (Bitcoin Cash): the NFT/SLP factory on the Signup.cash provider SDK."

## 9. Caveats for accuracy

- **The mint step is not functional.** `Child.js:handleSubmit` ends in `console.log(formData)`; no `genesisNFTGroup`/`genesisNFTChild` call exists. Never describe the app as "minting NFTs on-chain" — it is a minting _wizard front-end_ whose wallet login and IPFS pipeline work, with the final transaction step unwired. Commit `c8b6886` "demo nonFunc" is the receipt. (Root cause: the provider SDK's NFT functions shipped after this app was built — see §4.)
- **`Auth.js` has a live bug**: `new Signup.cash({ addrL: 'DEVELOPER BCH ADDRESS' })` — the key is `addrL` (typo for `addr`) and the value is a placeholder string that was never replaced. The login flow still worked because the SDK's connect widget tolerates it, but don't represent this file as production-clean.
- Other verifiable code issues if a reviewer digs: `Child.js` ticker input reads `formData.children.ticker` (array property access → `undefined`) and uses `onKeyDown` instead of `onChange`; `Success.js` uses `varient=` (typo) twice, so those theme variants silently don't apply; the dropzone cleanup calls `URL.revokeObjectURL()` with no argument in one branch.
- **Pinata API keys in a CRA app are client-exposed**: `REACT_APP_*` vars are compiled into the bundle. The env-var pattern looks safe but isn't; any derived writeup claiming "secure key handling" would be wrong.
- Raw insertion counts (+19.5k) are inflated by `package-lock.json`; quote the ~900 LOC figure instead.
- The repo has no README of its own (CRA boilerplate only) — attribute product claims to code, not docs.
- p0oker's single commit is repo initialization + LICENSE only; all app code is yours. This is one of the few signup-ecosystem artifacts that is legitimately claimable as your work.

---

# Part II — Technical Reference

_Standalone reference extracted from source at analysis date. Paths relative to repo root._

## 10. System topology

```
+---------------------------------------------------------------+
|                NFT-factory (CRA SPA, React 17)                |
|  App.js -> Route "/" -> Container.js (useStep wizard)          |
|     Auth -> Parent -> Child -> Success                         |
+---------+-----------------------------+-----------------------+
          |                             |
          | @signupcash/provider        | axios multipart POST
          | popup + postMessage         | + progress events
          v                             v
+----------------------+    +---------------------------+
| wallet.signup.cash   |    | api.pinata.cloud          |
| (non-custodial BCH   |    |  /pinning/pinFileToIPFS   |
|  wallet + SDK)       |    +---------------------------+
+----------------------+               |
          |                            | gateway.pinata.cloud/ipfs/{hash}
          v                            v
     BCH mainnet                 IPFS (image storage)
```

Who talks to what: the app holds no keys and runs no backend — the wallet popup performs all cryptographic operations; Pinata is called directly from the browser with key headers from `src/config/keys.js` (`REACT_APP_PINATA_API_KEY`, `REACT_APP_PINATA_API_SECRET_KEY` via dotenv). The only in-repo server-side code is none — it's a pure static SPA.

## 11. End-to-end data flows

1. **Login.** Auth screen button → `signup.requestAccess(['bch_address'])` (`Auth.js:15-20`) → Signup wallet popup → resolves `{bchAddr}` → `setForm({...formData, bchAddress})` → `navigation.next()` to Parent. (Note the constructor call uses `{addrL: 'DEVELOPER BCH ADDRESS'}` — placeholder + typo, see §9.)
2. **Group image pin.** Dropzone `onDrop` (single `image/*`) → `FormData` append → axios POST `https://api.pinata.cloud/pinning/pinFileToIPFS` with `pinata_api_key`/`pinata_secret_api_key` headers and `onUploadProgress` → progress % into local state → on success, `https://gateway.pinata.cloud/ipfs/{res.data.IpfsHash}` written to `formData.currentGroup.image` (`Parent.js:24-64`).
3. **Group form.** ticker/name/initialQuantity inputs mutate `formData.currentGroup` immutably → submit advances to Child (`Parent.js:96-107`).
4. **Child creation loop.** Child form (ticker, name, image via same Pinata flow, mintQuantity) updates `formData.children[childIdx]` via indexed map (`Child.js:78-90`) → submit logs form data and advances to Success. Success's "Create another NFT Child" (`Success.js:9-27`) increments `childIdx`, appends a blank child template, and `go('child')` — enabling N children per group.
5. **Intended (never wired) mint flow.** By design the wizard was to call the provider SDK's NFT genesis functions with the collected group/child data; at build time the released SDK (1.0.1) lacked them, so no transaction is ever constructed or broadcast. No BCH leaves any wallet through this app.

## 12. Data model reference

No persistence at all — no localStorage, no IndexedDB, no backend. The single source of truth is React state:

```
nftData = {
  bchAddress: string,            // from requestAccess
  currentGroup: {                // NFT1 group (parent)
    ticker, name, image,         // image = IPFS gateway URL
    initialQuantity              // string (number input), min 1
  },
  children: [{                   // NFT1 children, repeatable
    ticker, name, image,
    mintQuantity                 // string (number input)
  }]
}
childIdx: number                 // which child is being edited
```

This maps 1:1 onto the SLP NFT1 parent/child model in signup-core (`genesisNFTGroup` params ↔ `currentGroup`; `genesisNFTChild` params ↔ children entries).

## 13. Pipeline / processing reference

Only one real pipeline: image → IPFS.

| Stage          | Implementation                                                   | Constants                                                                              |
| -------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| File accept    | `useDropzone({accept: 'image/*', multiple: false, maxFiles: 1})` | single image only                                                                      |
| Upload         | axios POST `api.pinata.cloud/pinning/pinFileToIPFS`              | headers `pinata_api_key`, `pinata_secret_api_key`; `Content-Type: multipart/form-data` |
| Progress       | `onUploadProgress` → `Math.round(100 * loaded/total)`            | rendered as `<Progress max={1} value={progress/100}>`                                  |
| URL derivation | `gateway.pinata.cloud/ipfs/{IpfsHash}`                           | stored in form state                                                                   |
| Cleanup        | `URL.revokeObjectURL` on unmount for previews                    | one branch calls it with no argument (no-op)                                           |

Retry/failure behavior: upload errors are caught and `console.log`ged only — the form stays fillable but the image link is missing; no retry, no user-facing error UI.

## 14. Algorithms

Nothing computational beyond UI arithmetic (progress percentage). No scoring, ranking, or crypto — all cryptography is delegated to the wallet.

## 15. External services / model catalog

| Operation              | Service                                                   | Auth                                                   |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Wallet identity/access | Signup.cash wallet popup via `@signupcash/provider` 1.0.1 | non-custodial; user approves in wallet                 |
| Image pinning          | Pinata `pinFileToIPFS`                                    | API key + secret in request headers (⚠ client-exposed) |
| Image serving          | Pinata public gateway (`gateway.pinata.cloud`)            | none                                                   |

## 16. API & auth reference

- **In-app routes**: one — `<Route path="/">` renders `Container`; step navigation is internal (`useStep` ids: `auth`, `parent`, `child`, `success`). react-router is otherwise unused.
- **Auth**: the only auth is delegated to the Signup wallet (`requestAccess` permission scope `bch_address`). No tokens, sessions, or cookies are handled by this app.
- **Outbound API surface used**: Pinata pinning endpoint (POST, multipart) only. The provider SDK surface used: constructor + `requestAccess`.

## 17. Scheduling & queues

None.

## 18. Bindings, secrets & deployment

- **Secrets**: `REACT_APP_PINATA_API_KEY`, `REACT_APP_PINATA_API_SECRET_KEY` (env only, not committed; `.gitignore` covers env files). Because CRA inlines `REACT_APP_*` at build time, the keys ship to every browser that loads the bundle — treat them as public; a production version would need a proxy or ephemeral keys.
- **Build/deploy**: `react-scripts build` → static `build/`; no deploy configuration, CI, or hosting config in-repo.
- **Dependencies of note**: `@signupcash/provider ^1.0.1`, `react-dropzone 11`, `axios 0.21.1` (the pre-0.21.1-CVE-fix era — 0.21.1 still has known advisories), `theme-ui 0.3`, `react-hooks-helper 1.6`, FontAwesome 5.

## 19. Operational gotchas & key file map

**Gotchas:**

- `Auth.js`: `addrL` typo + `'DEVELOPER BCH ADDRESS'` placeholder in the SDK constructor — the app was never pointed at a real developer address.
- `Child.js`: ticker input binds `formData.children.ticker` (undefined — arrays have no `ticker` property) and uses `onKeyDown` where `onChange` is meant, so the value handling is inconsistent with the other fields.
- `Success.js`: `varient=` misspelling on two `Card`/`Button` props silently disables those Theme UI variants.
- Mint step unwired (see §9) — the wizard's terminal action is a `console.log`.
- No persistence: a page refresh loses all wizard state.
- No error surface: Pinata failures are console-only.
- `.eslintcache` committed to git.

**Key file map:**

| Topic                                | File                          |
| ------------------------------------ | ----------------------------- |
| Wizard engine + canonical data shape | `src/components/Container.js` |
| Wallet login                         | `src/components/Auth.js`      |
| Group form + IPFS upload             | `src/components/Parent.js`    |
| Child form + repeatable mint state   | `src/components/Child.js`     |
| Review + "another child" loop        | `src/components/Success.js`   |
| Design tokens/variants               | `src/components/theme.js`     |
| Pinata key wiring                    | `src/config/keys.js`          |

_End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially._
