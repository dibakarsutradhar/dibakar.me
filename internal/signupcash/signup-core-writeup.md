> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/signup-core` (GitHub: `signupcash/Signup-Core`)
> Analysis date: 2026-10-02 · Snapshot of master as of last commit `e00759f` (2023-11-25)
> 306 commits on master (339 including unmerged dependabot branches) · 2020-03-22 → 2023-11-25
> Purpose: source of truth for CV/portfolio/LinkedIn/blog derivation. Parts I and II are a snapshot as of the analysis date; regenerate both together if the codebase changes materially.
> **Unified project framing:** this repo is the wallet core of **Signup — Non-Custodial Bitcoin Cash Wallet with NFT/SLP Factory**. The unified project view (one CV entry, combined numbers, shared caveats) lives in `00-project-overview.md`.
> Companion document: `nft-factory-writeup.md` — the NFT/SLP factory dApp (Dibakar's commissioned contribution to this project, Jan–Feb 2021) and the case study of consuming this SDK.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

**Signup Core** is the open-source core of **signup.cash**: a **non-custodial Bitcoin Cash wallet with a developer API for web dApps** — the "MetaMask of Bitcoin Cash" pattern, built 2020–2021. A Lerna monorepo ships three packages: `@signupcash/provider` (a 721-line SDK dApps embed via script tag), `signupcash-signer` (a Preact SPA wallet + signing web worker, ~9,200 LOC), and `@signupcash/utils` (offline signature verification). Its signature architecture: dApps never touch keys — the provider opens a wallet popup, communicates over `postMessage`, and payments/signatures are brokered through a server-side "tx bridge" with **budgeted, 1-hour expiring JWT spend tokens**. The project shipped SLP tokens, NFT1 minting, Electrum-based UTXO management, and Flipstarter-style anyone-can-pay crowdfunding commitments, peaked at v1.3.0 (May 2021), and was deprecated in Nov 2023.

Ready-to-adapt CV summary sentence (unified-project framing — see also `00-project-overview.md`): _Contributed to Signup, a non-custodial Bitcoin Cash wallet and dApp platform — a Lerna monorepo (provider SDK, Preact wallet SPA, signing web worker) featuring postMessage/bridge-mediated payments with budgeted JWT spend tokens, SLP/NFT1 token support, and Flipstarter anyone-can-pay commitments — and built its NFT/SLP factory dApp._

> **Relationship note (for accuracy):** the git history is ~91% Pooria Atarzadeh (`p0o`/`p0oker`, 279 of 306 commits), with the Flipstarter crowdfunding feature contributed by Sahid Miller (TNSahid, 22 commits). Within the unified **Signup** project, the user's role is: **author of the NFT/SLP factory dApp** (commissioned, fully claimable — see `nft-factory-writeup.md`) and **collaborator/contributor on the wallet core outside git history**. Do **not** claim the core's git-history work as personal work in derived artifacts — see §9 and the accuracy rules in `00-project-overview.md`.

## 2. The product

Positioning (from `README.md` and `packages/provider/README.md`): a **non-custodial wallet to build blockchain dApps exclusively for the Bitcoin Cash ecosystem** — "a BCH wallet with a developer API." The dual framing is deliberate: it is both an end-user wallet (popup at wallet.signup.cash) and a developer platform (embeddable SDK + docs.signup.cash). Framework-agnostic: works via `<script>` tag in plain JS or imports into React/Vue.

| Feature                                         | What it does                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dApp login (`requestAccess`)                    | Granular permission scopes: `bch_address`, `slp_address`, `slp_balances`, `cash_account`, `signature`; returns addresses, balances, optional Cash Account |
| Budgeted payments (`requestSpendToken` + `pay`) | dApp gets a 1-hour JWT "spend token" with a USD budget; wallet worker enforces cumulative per-session spending against live BCH price                     |
| Arbitrary payload signing (`sign`)              | Server-brokered ECDSA signed-message flow; dApps verify offline with `@signupcash/utils`                                                                  |
| BCH send                                        | P2PKH with Schnorr signatures, greedy UTXO selection, dust-546 guard, change to single address                                                            |
| SLP tokens                                      | Type-1 fungible send/balances via slpdb queries; NFT1 Group (129) + Child (65) genesis and transfer                                                       |
| NFT minting from dApps                          | `genesisNFTGroup` / `genesisNFTChild` (child mint burns one group token), IPFS image URIs                                                                 |
| Flipstarter crowdfunding                        | `sendAnyoneCanPayCommitment`: pledge tx signed with `SIGHASH_ALL\|SIGHASH_ANYONECANPAY` + ECDSA; pledge outpoint frozen locally against double-spend      |
| Wallet SPA                                      | Onboarding (12-word BIP39 recovery phrase), import, top-up QR, send, tokens/NFT galleries, backup, logout                                                 |

## 3. Architecture (summary level)

Three JS packages (~10,150 hand-written LOC total, excluding bundles/lockfiles) plus one closed-source component:

- **`@signupcash/provider`** (~771 LOC, single file `provider.js`) — UMD bundle exposing global `Signup`; injects a "Connect with signup" DOM overlay, opens a 430×800 popup to the wallet, all dApp↔wallet traffic is `window.postMessage` with origin checks and per-request UUID `reqId` matching. Payments/signatures bypass the popup: direct REST calls to the bridge.
- **`signupcash-signer` / packages/wallet** (~9,215 LOC, 52 JS files, 36 components) — Preact + emotion SPA served statically from Vercel (wallet.signup.cash), plus a **web worker** that verifies JWTs, enforces budgets, builds/signs transactions (Schnorr), and broadcasts via Electrum. Two Vercel serverless functions (`api/get-balance.js`, `api/subscribe-email.js`).
- **`@signupcash/utils`** (33 LOC) — one function: `verify(payload, bchAddr, signature)` via `bitcore-message` + `bchaddrjs`; the repo's only Jest tests.
- **bridge.signup.cash** — proprietary backend **not in this repo**; relays `POST /dapp/tx-request` and `/dapp/signature-request` to the wallet's worker over SSE (`EventSource` per session) and matches wallet responses to pending dApp HTTP requests. The central trust component and the biggest architectural unknown.

External services: 3 mainnet Electrum servers (ElectrumCluster), SLPdb at slpdb.fountainhead.cash (SLP indexing), bchd.fountainhead.cash (balance), Bitcoin.com price API, Mailchimp, Sentry, Google Fonts, 4 NFT icon CDNs. No CI, no TypeScript, no linter config; Lerna 3 + webpack 4 + Babel.

## 4. The story: how the project evolved

| Epoch                       | Period                              | Theme                                                                                                                                                                        | Landmark commits                                                      |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1. Genesis                  | Mar 2020                            | `signer/` + `client/` two-app architecture, CashAccounts support, identity login                                                                                             | `05d84cf` (initial), `2949366`, `a8bb47e`                             |
| 2. Rewrite                  | May–Jun 2020                        | localStorage → IndexedDB (`2c1e74e`); full wallet rewrite to Preact + emotion (15.7k real lines)                                                                             | `f67472b`                                                             |
| 3. Bridge architecture      | Jul–Aug 2020                        | Tx bridge protocol, request-permission pages, **USD budget control** (`e7a442a`), dust rejection, error codes, email subscribe                                               | `ee64017`, `840539b`, `c72be53`, `5a50f12`                            |
| 4. Monorepo & public launch | Sep–Oct 2020 (74 commits, busiest)  | `client/`→`provider/`, `signer/`→`wallet/` (`e87748d`); dist bundles purged from git (`0e5eaae`); `sign()` API; `packages/utils` with tests; npm publish; Sentry; Vercel SPA | `8a7b8e8`, `e87748d`, `a2e328a`, `6ba7a9c`, `7115c77`                 |
| 5. SLP token era            | Dec 2020–May 2021                   | SLP/NFT wallet pages, slpdb-based UTXO mechanism, Electrum Cash integration, tx-function rewrite, SLP genesis/NFT-child request pages                                        | `c3b3ec5`, `61f4ac3`, `8052133`, `97fb64b`, PR #63 `1c7861d` (v1.2.0) |
| 6. Flipstarter era          | Apr–May 2021 (60-commit peak month) | Anyone-can-pay commitments, coin freezing/unfreezing, contributions viewer, rebrand Contribution→Crowdfunding; v1.3.0                                                        | `8d141a8`, `c6ce86b`, `a659b23`, `324e0dc`, `aa5be25`                 |
| 7. Abandonment              | Aug 2021 → Nov 2023                 | Last substantive commit `38a3282` (examples index, 2021-08-23); ~30 dependabot security PRs from 2022–23 never merged; deprecation banner `e00759f` (2023-11-25)             | —                                                                     |

Notable arc details: the project pre-dates the May 2023 BCH `cash_tokens` upgrade entirely (grep across all branches finds no token-info/network-upgrade work — it died ~2.5 years before that). A Dec 2020 commit (`b74ac90`) documents a live infrastructure failure: "BCHD is broken now," balances rerouted via rest.bitcoin.com. Tags: `v.1.0-beta.1` (Apr 2021), `v1.2.0`/`v1.2.1` (May 13, 2021), `v1.3.0` (May 23, 2021). 25 numbered GitHub PRs (#4–#69) merged; the repo went public in Oct 2020 (`7115c77`).

## 5. Contributions in detail

Per the scoping decision, this section describes the **project's** contributions as a whole (no per-author attribution). The two epics below are the technically distinctive work.

**Ownership map (directories):** wallet UI + signing internals (`packages/wallet`, 138 file-touches) dominate; provider protocol (`packages/provider`, 43); utils (6). The Flipstarter feature touches both wallet (63 files) and provider (14 files) — the only multi-file cross-package feature contributed through external PRs.

**Thematic breakdown:**

1. **The provider↔wallet↔bridge protocol (Jul–Oct 2020)** — the project's core IP. Popup + `postMessage` with `reqId` correlation and origin checks (`provider.js:54-71,657-677`); JWT access/spend tokens minted by the wallet with the **first 32 bytes of the wallet's own entropy as the HS256 key** and 1-hour expiry (`src/utils/permission.js:9-40`); bridge-mediated `pay`/`sign` with SSE push to the worker (`src/worker/worker.js:57-75`); budget enforcement comparing `fiatToSats(budget)` against cumulative per-session spendings from IndexedDB (`worker.js:111-122`).
2. **UTXO safety machinery (2020–2021)** — `WithUtxos` HOC runs 5 parallel fetches (Electrum BCH UTXOs, SLPdb SLP/baton UTXOs, balances, local frozen list), filters SLP/baton UTXOs out of spendable BCH (burn protection), sorts confirmed-first, and snapshots the set into the worker so background bridge-driven txs use a consistent UTXO set; frozen-UTXO freeze/unfreeze/unfreeze-by-spending for pending pledges (`src/utils/blockchain.js`, `src/utils/wallet.js:173-272`).
3. **SLP + NFT1 pipeline (Jan–May 2021)** — OP_RETURN construction via `slp-mdm` for type-1/NFT1 group/child genesis and send (`transactions.js:117-467`), mint batons reserved at vout 2, child genesis burns one group token, slpdb query layer adapted from mainnet-js templates.
4. **Flipstarter anyone-can-pay commitments (Apr–May 2021)** — intermediate self-send pledge tx, second tx signed with `SIGHASH_ALL|SIGHASH_ANYONECANPAY` + ECDSA (deliberately not Schnorr, so campaigns can co-sign), commitment object `{inputs[], data, data_signature}` with the data signed via `signMessageWithPrivKey`, pledge outpoint frozen locally, owner can revoke by spending (`transactions.js:469-601`, `Crowdfunding.js` 550 LOC).
5. **Packaging & launch (Sep–Oct 2020)** — monorepo restructure with renames, purge of 276k lines of committed webpack bundles, versioned provider bundle `provider-v${version}.js`, npm publishing, Sentry with 100% trace sampling, Vercel SPA fallback.

**Signature engineering moments:**

- **Budget-capped spending as a product primitive** (`e7a442a`, Jul 2020): the spend token isn't a binary permission — it carries a USD budget converted to sats at request time via the live price API, and the worker accumulates per-session spending in IndexedDB (`SIGNUP_SPENDINGS`) and rejects when `pastSpendings + currentSpending > budgetInSats`. A dApp gets a "tip jar" grant, not the keys to the wallet.
- **Entropy reuse as a deliberate trade-off**: JWTs are signed with the first 32 bytes of wallet entropy (`permission.js`) — the bridge can't forge tokens, but the token-signing key shares a secret with the funds. This is the clearest example of the project's "small surface, shared trust root" philosophy, and a great discussion point for any security writeup.
- **Schnorr-by-default, ECDSA-for-co-signing**: normal BCH/SLP spends sign with Schnorr (`transactions.js:92,202,301,448,457`); the one place ECDSA + `ANYONECANPAY` is used is where a third party (the campaign) must co-sign later. Protocol knowledge encoded in signature-algorithm choice.
- **Live incident response** (`b74ac90`, Dec 2020): BCHD outage worked around by switching balance fetches mid-flight, recorded in a commit message.
- **Burn protection as a default**: SLP/baton UTXOs are excluded from spendable BCH so a naive BCH send can never burn tokens — with the incomplete `fanOutSendSlp` stub (`TODO` in `transactions.js`) showing where the design knowingly stopped.

**Commit hygiene:** main author uses short lowercase imperative messages, occasional emoji, typo-prone ("inital", "toekns", "sepnd token" in code comments); external contributor uses capitalized sentence style with conventional `fix:` prefixes on hotfix branches. PR workflow via GitHub with feature branches.

## 6. Engineering practices observed

- **Testing: essentially none.** Only `packages/utils` has Jest (1 suite, 4 tests + snapshots); wallet and provider have `"test": "echo \"Error: no test specified\" && exit 1"`. No e2e, no tx fixtures.
- **CI/CD: none.** No `.github/` directory. Deploys were Vercel (static SPA + serverless functions), Lerna/webpack builds run locally.
- **Docs culture:** everything external (docs.signup.cash + a read.cash architecture blog post, linked in README); in-repo markdown is 3 files with several stale spots (utils README advertises the wrong package name `@signupcash/verify`; root README has a broken `[here](here)` link).
- **Known tech debt, recorded in code:** abandoned Cash Accounts feature leaves dead imports (`getWalletCashAccount` imported in 4 components, undefined in `utils/wallet.js`) and a `SIGNUP_PREDICTED_CASH_ACCOUNT` key that is only ever deleted; hardcoded `$230/BCH` price in `api/get-balance.js`; single-address wallet with no change-address strategy.

## 7. Numbers worth quoting

| Metric                         | Value                                                            | Source                                        |
| ------------------------------ | ---------------------------------------------------------------- | --------------------------------------------- |
| Project lifespan               | Mar 22, 2020 → Aug 23, 2021 (code) / Nov 25, 2023 (final commit) | git log; `e00759f`                            |
| Commits on master              | 306 (267 non-merge), 25 numbered PRs (#4–#69)                    | `git log --no-merges \| wc -l`                |
| Hand-written LOC               | ~10,157 JS (excl. node_modules, dist, bundles)                   | `find packages -name '*.js' … \| xargs wc -l` |
| Wallet package                 | 52 JS files, ~9,215 LOC, 36 components                           | `find packages/wallet/src`                    |
| Provider SDK                   | 721-line single file, 10 public API methods                      | `provider.js:708-719`                         |
| Examples                       | 7 vanilla-JS demo pages (6 demos + index)                        | `packages/provider/examples/vanilla-js/`      |
| Tests                          | 1 Jest suite, 4 tests (utils only)                               | `packages/utils/__tests__/utils.test.js`      |
| Releases                       | v1.0-beta.1, v1.2.0, v1.2.1, v1.3.0 (all May 2021 except beta)   | git tags                                      |
| Token standards supported      | SLP type 1 + NFT1 Group (129) + NFT1 Child (65)                  | `provider.js:679-685`                         |
| Spend token TTL                | 1 hour, hardcoded; budget in USD                                 | `permission.js`                               |
| Bundle purge                   | ~276k generated lines removed from git (Sep–Aug 2020)            | `e87748d`/`0e5eaae` (⚠ inflation caveat)      |
| Unmerged security PRs at death | ~30 dependabot branches, 2022–2023                               | branch list                                   |

Inflation footnotes: the largest raw commits (`e87748d`, `0e5eaae`, `f67472b`) include committed webpack bundles (~155k + 120k lines); real hand-written code over the project is on the order of tens of thousands of lines, not the half-million raw insertions. Use the ~10k figure for current LOC and avoid raw insertion counts.

## 8. Raw material for derived artifacts

**CV bullet candidates** (suitable for an "analyzed/extended/evaluated" framing given §9):

- Analyzed the architecture of Signup.cash, a non-custodial Bitcoin Cash wallet and dApp SDK — a 3-package Lerna monorepo (~10k LOC) combining a postMessage/popup protocol, a signing web worker, and a server-side transaction bridge with SSE delivery.
- Mapped the end-to-end payment authorization flow: budgeted 1-hour JWT spend tokens signed with wallet-derived entropy, per-session cumulative spending enforced against live BCH price, and Schnorr-signed P2PKH settlement via Electrum clusters.
- Evaluated the trust model of a bridge-mediated non-custodial wallet, identifying the JWT signing-key/entropy-reuse trade-off, single-address UTXO handling, and unencrypted-at-rest mnemonic storage as key risk areas.
- Documented SLP/NFT1 token pipeline internals — OP_RETURN construction, mint-baton handling, group-burn child genesis — and Flipstarter-style `SIGHASH_ANYONECANPAY` pledge commitments with local UTXO freezing.
- Produced a standalone technical reference (system topology, 6 end-to-end data flows, data-model inventory, API/auth reference) sufficient to reconstruct system behavior without the codebase.

**Blog-post angles:**

1. **"The MetaMask of Bitcoin Cash: how Signup's popup-and-bridge wallet worked"** — the architecture is fully reconstructable from ~10k readable LOC; the postMessage/reqId/SSE design is the story.
2. **"When your JWT key is your wallet key: entropy reuse in a non-custodial wallet"** — security-analysis angle grounded in `permission.js`, with the bridge trust model as the discussion.
3. **"Schnorr by default, ECDSA for co-signing: signature choice as protocol design"** — the Flipstarter commitment scheme is a genuinely unusual, well-motivated decision.
4. **"Anatomy of an abandoned crypto SDK"** — what 30 unmerged dependabot PRs, a hardcoded $230 price, and dead Cash-Accounts imports teach about maintenance and the BCH ecosystem's 2021→2023 gap.
5. **"Budget-capped spending tokens: a better dApp permission UX"** — product-design angle; the USD-budget spend token predates similar patterns elsewhere.

**LinkedIn headline candidates:**

- "Deep-dived the architecture of Signup.cash — a non-custodial Bitcoin Cash wallet & dApp SDK with budgeted spend tokens, SLP/NFT support, and bridge-mediated signing."
- "Studying non-custodial wallet design: postMessage protocols, JWT spend tokens, and anyone-can-pay Flipstarter commitments in the Signup.cash codebase."

## 9. Caveats for accuracy

- **Attribution is the big one.** ~91% of commits are Pooria Atarzadeh (4 git identities: `p0o <pooria_az@ymail.com>`, `p0oker <p0oker@protonmail.com>`, `p0o <p0oker@protonmail.com>`, `Pooria Atarzadeh`); the Flipstarter crowdfunding feature is Sahid Miller's (TNSahid, 22 commits via PRs #65/#67/#68). Your identity has **zero commits** in the repo — any contribution claims must describe work outside git history (reviews, discussion, integration, analysis), and never in the first person over git-history work. Your concrete, git-verifiable contribution to the unified Signup project is the NFT-factory dApp (`nft-factory-writeup.md`).
- The repo is **deprecated** (banner since 2023-11-25) and its closed-source bridge may no longer run — demos and derived writeups should describe the design, not claim working live infrastructure.
- No BCH `cash_tokens` / May 2023 network-upgrade support exists anywhere in history — don't imply the project covers modern BCH tokens.
- Raw insertion/deletion counts are inflated ~50× by committed webpack bundles and lockfiles; use the ~10k LOC figure.
- The wallet package's npm name is `signupcash-signer`, not "wallet"; utils README's `@signupcash/verify` name is wrong.
- Known bugs safe to cite: `genesisNFTChild`'s `groupdId`/`groupId` typo (`provider.js:412-425`) breaks the mint-NFT example; provider message listeners leak (anonymous registration vs. named removal, `provider.js:672-690`).
- The repo contains a live Sentry DSN and a donation BCH address in `config.js`/README — fine for attribution, but don't republish credentials-looking strings.

---

# Part II — Technical Reference

_Standalone reference extracted from source at analysis date. File paths relative to repo root. Sufficient to reconstruct system behavior without the codebase._

## 10. System topology

```
+------------------+  popup + window.postMessage     +----------------------+
|   dApp (any web  | --------------------------------> | wallet.signup.cash   |
|   app, UMD SDK)  | <-------------------------------- | (Preact SPA, Vercel) |
|  provider.js     |   reqId-correlated, origin-checked|  src/components/*    |
+------------------+                                   +----------+-----------+
        |  localStorage: JWTs, sessionId                          |
        |  POST /dapp/tx-request, /dapp/signature-request         | EventSource
        v                                                         v (SSE)
+--------------------------------------------------------------------------+
|                    bridge.signup.cash  (CLOSED SOURCE, not in repo)      |
|        relays dApp HTTP requests <-> wallet SSE stream; matches reqIds   |
+------------------------------------+-------------------------------------+
                                     | POST /wallet/response
                                     v
                          +------------------------+
                          | wallet web worker      |
                          | src/worker/worker.js   |  JWT verify, USD budget,
                          | (webpack entry "worker")| UTXO set snapshot, sign+build
                          +-----+------------+-----+
                                |            |
              ElectrumCluster   |            | slpdb (SLP indexes)
        (UTXOs, broadcast)      |            | (SLP UTXOs/balances/batons)
                                v            v
                       BCH mainnet/testnet + SLP ledger
```

Who talks to what: only the **worker** touches Electrum/slpdb; the SPA gets chain state through the worker + a `WithUtxos` HOC; the **bridge** is a pure relay between dApp HTTPS and the wallet's SSE stream; the dApp talks to the wallet popup only for user-consent flows and to the bridge only for `pay`/`sign`. Dev mode: wallet at `localhost:5050`, bridge at `localhost:5044` (`src/config.js`, `provider.js:5-10`); network toggles to testnet when `NODE_ENV` is dev.

## 11. End-to-end data flows

1. **dApp login / access grant.** `new Signup.cash({addr, slpAddr})` injects `#_SIGNUP__CONTAINER` overlay → dApp calls `requestAccess(permissions)` → popup opens (`requestFromUserWallet()`, `provider.js:54-71`), payload `{reqId, reqType:"access", permissions}` via postMessage → wallet routes to `RequestAccess.js` → user clicks Allow → `makeAccessToken(permissions)` mints HS256 JWT (key = `walletEntropy.slice(0,32)`, `expiresIn:"1h"`, `permission.js`) + `uuid` sessionId → replies `{status:"GRANTED", accessToken, sessionId, bchAddr, slpAddr, slpBalances, cashAccount?}` → provider resolves the promise and writes `SIGNUP_ACCESS_TOKEN(+_EXPIRES_AT)`, `SIGNUP_SESSION_ID` to dApp localStorage (`provider.js:298-308`).
2. **Payment (`pay`, the flagship flow).** dApp first `requestSpendToken({budget})` (same popup flow, mints spend JWT). Then `pay(amount, unit, bchAddr?)` → `POST {bridge}/dapp/tx-request` with `{spendToken, sessionId, action:{type:"P2PKH", unit, amount, bchAddr}}` (`provider.js:314-340`) → bridge emits `WALLET-RESP` on the session's SSE stream → worker (`worker.js:77-174`) `decodeToken`s the JWT, checks budget: `fiatToSats(decodedToken.data.budget,"usd")` vs `getWalletSpendingsBySessionId(sessionId) + currentSpending` (rejects if over, `worker.js:111-122`), retries 5× via p-retry → `createSendTransaction()` (`transactions.js`): greedy UTXO selection from the worker's snapshot, fee via `bitbox.BitcoinCash.getByteCount`, dust guard 546 sats, signs inputs with **Schnorr** (line 92) → `sendRawTx()` Electrum broadcast (`blockchain.js:66-76`) → worker `POST {bridge}/wallet/response {sessionId, success, result:{txId, spent}}` and records spending in localforage `SIGNUP_SPENDINGS`; dApp's pending HTTP request resolves with `txId`.
3. **Payload signing (`sign`).** `POST {bridge}/dapp/signature-request` with `{accessToken, sessionId, action:{type:"SIGN", data}}` (`provider.js:464-470`) → worker checks `decodedToken.data.permissions.includes("signature")` → `signPayload()` builds `{signedBy:"Signup.cash", requestedBy, data, timestamp}` and signs with `bitbox.BitcoinCash.signMessageWithPrivKey` (`utils/wallet.js:101-133`) → response `{signature, payload, bchAddr}`; dApps verify offline with `@signupcash/utils` `verify()`.
4. **Popup-mediated SLP/NFT actions.** `sendSlp` / `genesisNFTGroup` / `genesisNFTChild` open the popup with `reqType ∈ {send_slp, genesis_slp, genesis_nft_child}` → consent components (`RequestSLPSend.js`, `RequestSLPGenesis.js`, `RequestNFTGenesisChild.js`) → wallet calls `sendSlpTx` / `genesisSlp` / `genesisNftChild` (`transactions.js:117-467`) → broadcast via Electrum. (Note `sendSlp` carries a `TODO: send a message to wallet to indicate it's a SLP tx` — incompletely wired vs bridge flows.)
5. **Flipstarter commitment.** `sendAnyoneCanPayCommitment(recipients, amount, unit, data)` → popup consent (`RequestSendContribution.js`, 489 LOC) → `sendCommitmentTx` (`transactions.js:469-601`): (a) build+broadcast intermediate self-send pledge tx; (b) freeze its outpoint in `SIGNUP_LOCKED_UTXOS`; (c) build second tx spending the pledge with `SIGHASH_ALL|SIGHASH_ANYONECANPAY` + **ECDSA** (lines 570-581); (d) return base64-decoded `{inputs[], data, data_signature}` where data is signed with `signMessageWithPrivKey`. Campaign later co-signs; owner can revoke by spending the pledge (unfreeze-by-spending, `a659b23`).
6. **UI balance refresh.** `WithUtxos` HOC runs 5 parallel fetches (Electrum BCH UTXOs; SLPdb SLP UTXOs; baton UTXOs; SLP balances; frozen list) → filters SLP/baton/frozen outpoints, sorts confirmed-first ascending-value, auto-unfreezes dead outpoints → pushes snapshot to worker (`workerCourier("update", …)`); worker-driven txs use this consistent set; UI does `cleanse_utxos` during refetch.

## 12. Data model reference

There is no server database in this repo. Persistence is browser-local + on-chain:

| Store                                                                                            | Engine                  | Key                                    | Contents                                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `SIGNUP_WALLET`                                                                                  | IndexedDB (localforage) | fixed                                  | base64-encoded 12-word BIP39 mnemonic (⚠ base64 only, no encryption) |
| `SIGNUP_WALLET_STATUS`                                                                           | IndexedDB               | fixed                                  | `"VERIFIED"` after backup confirmation                               |
| `SIGNUP_SPENDINGS`                                                                               | IndexedDB               | sessionId → `{spent, lastUsed}`        | cumulative per-session spending for budget enforcement               |
| `SIGNUP_LOCKED_UTXOS`                                                                            | IndexedDB               | txid → `[{txid, vout, reqType, data}]` | frozen outpoints reserved for pending pledges                        |
| `SIGNUP_PREDICTED_CASH_ACCOUNT`                                                                  | IndexedDB               | fixed                                  | only ever deleted — Cash Accounts abandoned                          |
| `SIGNUP_ACCESS_TOKEN` / `_EXPIRES_AT`, `SIGNUP_SPEND_TOKEN` / `_EXPIRES_AT`, `SIGNUP_SESSION_ID` | dApp localStorage       | fixed                                  | JWTs (HS256, 1h) + session id                                        |

On-chain constructs: SLP OP_RETURNs built by `slp-mdm` (`TokenType1`, `NFT1.Group` = versionType 129, `NFT1.Child` = 65); mint baton at vout 2; token outputs dust-capped at 546 sats; Flipstarter commitments are off-chain signed JSON pointing at on-chain outpoints.

Key derivation: BIP39 128-bit English mnemonic → BIP44 `m/44'/0'/0'/0/0` (`WALLET_HD_PATH`, `config.js`) — **single address**, change returns to the same address. JWT signing key = first 32 bytes of wallet entropy (`permission.js:9-22`).

Cache/TTL: none server-side; JWT expiry 1h (hardcoded — deadline parameter intentionally unused, see comment "avoid using deadline for now").

## 13. Pipeline / processing reference

| Stage        | Implementation                                 | External call                                                | Writes             | Constants                                                                                                 |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| UTXO fetch   | `blockchain.js` `getUtxos` via ElectrumCluster | `blockchain.scripthash.listunspent` (3 servers, quorum)      | worker snapshot    | cluster: `electroncash.de:60002`, `electroncash.dk:50004`, `electrum.imaginary.cash:50004` (mainnet, WSS) |
| SLP state    | `slp.js` slpdb queries                         | `https://slpdb.fountainhead.cash/q/{base64 query}`           | UI balances        | query templates adapted from mainnet-js                                                                   |
| Fee estimate | `transactions.js` `feesFor`                    | —                                                            | tx                 | `bitbox.BitcoinCash.getByteCount` P2PKH in/out; dust = 546                                                |
| Budget check | `worker.js:111-122`                            | Bitcoin.com price API via `fiatToSats`                       | `SIGNUP_SPENDINGS` | budget USD; reject if `past + current > budgetInSats`                                                     |
| Retry        | p-retry around tx build/broadcast              | —                                                            | —                  | 5 attempts                                                                                                |
| Broadcast    | `blockchain.js` `sendRawTx`                    | `blockchain.transaction.broadcast`                           | chain              | —                                                                                                         |
| Balance fn   | `api/get-balance.js` (Vercel)                  | `https://bchd.fountainhead.cash/v1/GetAddressUnspentOutputs` | HTTP resp          | hardcoded **$230/BCH** (stale)                                                                            |

Trigger conditions for async work: bridge SSE events per `sessionId` are the only async trigger; there are no queues or cron jobs anywhere in the repo.

## 14. Algorithms

- **UTXO selection**: naive greedy — sort spendable UTXOs confirmed-first, ascending value; no branch-and-bound, no change-address strategy (change to the single HD address, `transactions.js:37,80`).
- **Budget formula**: `budgetInSats = fiatToSats(budgetUSD, "usd")`; allow iff `pastSpendings + currentSpending <= budgetInSats` (`worker.js:111-122`).
- **Signature algorithm selection**: Schnorr for all standard BCH/SLP spends (`tx.signatureAlgorithms.SCHNORR`, lines 92/202/301/448/457); ECDSA + `SIGHASH_ALL|SIGHASH_ANYONECANPAY` exclusively for Flipstarter pledges (line 570) so the campaign can add its own inputs later without invalidating the pledge signature.
- **Burn protection filter**: `getAllUtxosWithSlpBalances` excludes any UTXO carrying SLP tokens or mint batons from spendable BCH, and excludes locally frozen outpoints; frozen entries whose outpoints no longer exist are auto-unfrozen.
- **NFT child mint**: burns exactly one group token; if group balance > 1 it attempts `fanOutSendSlp` (a `TODO` stub — incomplete), then waits 3s and refetches UTXOs before child genesis.

## 15. External services / model catalog

| Operation                               | Service                                                            | Mechanism                                  |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| BCH UTXOs + broadcast                   | Electrum Cash servers (3 mainnet, 3 testnet listed in `config.js`) | `electrum-cash` `ElectrumCluster` over WSS |
| SLP balances/UTXOs/batons/token details | SLPdb (`slpdb.fountainhead.cash`)                                  | base64-encoded JSON query in URL           |
| Address balance (serverless)            | bchd gRPC-JSON gateway (`bchd.fountainhead.cash`)                  | axios POST from Vercel fn                  |
| BCH→USD price                           | Bitcoin.com rate API via `bitbox.Price.current`                    | `src/utils/price.js`                       |
| dApp↔wallet relay                       | bridge.signup.cash (closed source)                                 | REST + SSE                                 |
| Email list                              | Mailchimp API (`us17.api.mailchimp.com`)                           | `api/subscribe-email.js`                   |
| Errors                                  | Sentry (DSN in `App.js:29-36`, tracesSampleRate 1.0 prod)          | `@sentry/browser`                          |
| NFT icons                               | 4 hardcoded CDNs incl. per-collection IDs (Waifu, Honk, Zombie)    | `config.js`                                |
| Fonts                                   | Google Fonts (Poppins), injected by provider                       | `provider.js:94-103`                       |

Crypto libraries: `bitbox-sdk` (mnemonic, HDNode, tx builder, message signing), `bitcore-lib-cash`, `@bitauth/libauth`, `slpjs`, `slp-mdm` (OP_RETURN serialization), `electrum-cash`, `jsonwebtoken` (HS256), `bchaddrjs` + `bitcore-message` (utils).

## 16. API & auth reference

**Provider public API** (frozen object, `provider.js:708-719`): `requestAccess(permissions[])`, `requestSpendToken({budget})`, `spendTokenExist()`, `pay(amount, unit, bchAddr?)` (units `SAT`/`SATS`/`SATOSHI`/`BCH` or fiat), `sign(data)`, `sendSlp(tokenId, amount, slpAddr?)`, `genesisNFTGroup(name, ticker, quantity, documentUri, documentHash?, keepBaton?)`, `genesisNFTChild(groupId, ticker, name, imageUri, imageHash?, receiverSlpAddr?)` (⚠ param typo `groupdId`), `sendAnyoneCanPayCommitment(recipients[], amount, unit, data, skipPopup?)` (the only fully JSDoc'd method), `utility.{onlyTokens, onlyGroupNFTs, onlyChildNFTs}` (versionType 1 / 129 / 65).

**Auth model**: two JWT types, both HS256-signed with `walletEntropy.slice(0,32)`, 1h expiry: _accessToken_ carries `permissions` array (scopes: `bch_address`, `slp_address`, `slp_balances`, `cash_account`, `signature`); _spendToken_ carries a USD `budget`. Tokens are minted by the wallet popup after user consent, stored in dApp localStorage, and presented to the bridge — which can route but **cannot forge** them (it doesn't hold the key). The dApp also cannot verify them (doesn't hold the key either); the worker verifies on every action. No rate limits implemented in-repo (bridge-side unknown).

**Bridge endpoints** (called by provider): `POST /dapp/tx-request`, `POST /dapp/signature-request`; wallet→bridge: SSE `GET /wallet/connect/{sessionId}`, `POST /wallet/response`.

## 17. Scheduling & queues

None. No cron, no queues, no background jobs. The only async machinery is the per-session SSE stream + web worker described above.

## 18. Bindings, secrets & deployment

- **Deploy**: wallet = static Vercel site (SPA rewrite to `/index.html`, `vercel.json`) + 2 serverless functions (`api/*.js`); provider = versioned UMD bundle on `cdn.signup.cash` (`provider-v${version}.js`); utils = npm package. Bridge = external, closed source.
- **Secrets in repo** (names/references only): Sentry DSN (`App.js`), Mailchimp API key/list-id env vars for the subscribe function, Electrum/slpdb endpoints. No .env committed; the real "secret" is the user's mnemonic in their browser.
- **Build**: Lerna 3 fan-out (`npm run dev/build`), webpack 4 (two wallet entries: `signer` + `worker`), Babel `preset-env`, react→preact/compat alias. No CI, no tests gate, no migrations (no server DB).

## 19. Operational gotchas & key file map

**Gotchas:**

- `genesisNFTChild(groudId,…)` — parameter typo means the body's `groupId` is a `ReferenceError`; the mint-NFT example cannot work as shipped (`provider.js:412-425`).
- Provider listeners leak: `listenForMessage` registers an anonymous wrapper but `removeListeningForMessage` removes a never-registered named handler (`provider.js:672-690`) — listeners accumulate per request.
- Dead Cash-Accounts imports: `getWalletCashAccount` imported in 4 request components but undefined in `utils/wallet.js` (abandoned feature).
- `sendSlp` is popup-based and incompletely wired (TODO in `provider.js:353`) unlike bridge-based `pay`/`sign`.
- Mnemonic at rest is base64, not encrypted; JWT key shares entropy with funds (see §5).
- Some tx builders hardcode `"mainnet"` (`transactions.js:245,414`) regardless of dev/testnet config.
- The bridge is closed source — every trust question ultimately routes there; dApp JWTs are unverifiable client-side by design.
- Hardcoded $230/BCH in `api/get-balance.js`; `get-balance` is the only bchd consumer.

**Key file map:**

| Topic                                             | File                                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| Provider SDK / popup protocol / postMessage       | `packages/provider/src/provider.js`                             |
| Working examples of every API call                | `packages/provider/examples/vanilla-js/*.html`                  |
| Worker: JWT verify, budget, SSE, bridge responses | `packages/wallet/src/worker/worker.js`                          |
| Tx building (BCH, SLP, NFT, commitment)           | `packages/wallet/src/utils/transactions.js`                     |
| Mnemonic/HD/spendings/UTXO freezing               | `packages/wallet/src/utils/wallet.js`                           |
| Electrum + slpdb fetch orchestration              | `packages/wallet/src/utils/blockchain.js`, `slp.js`             |
| JWT minting                                       | `packages/wallet/src/utils/permission.js`                       |
| Endpoints, HD path, icon CDNs, explorers          | `packages/wallet/src/config.js`                                 |
| Consent UI for dApp requests                      | `packages/wallet/src/components/Request*.js`, `Crowdfunding.js` |
| Signature verification lib (+ only tests)         | `packages/utils/lib/utils.js`, `__tests__/utils.test.js`        |
| Serverless balance/email                          | `packages/wallet/api/get-balance.js`, `subscribe-email.js`      |

_End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially._
