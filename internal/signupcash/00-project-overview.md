> **Internal document — not for publication.**
> Project: **Signup — Non-Custodial Bitcoin Cash Wallet with NFT/SLP Factory**
> Analysis date: 2026-10-02 · Repos frozen (last commits 2021 / 2023)
> This is the unified project view. The two per-repo deep writeups are the source documents:
> `signup-core-writeup.md` (wallet core + SDK) · `nft-factory-writeup.md` (NFT/SLP factory dApp)

---

# Signup — one project, two repos

**Signup** is a **non-custodial Bitcoin Cash wallet with a developer API and an NFT/SLP factory** — the "MetaMask of Bitcoin Cash" pattern: users hold their own keys in a browser wallet, dApps integrate through an embeddable SDK, and the ecosystem includes a wizard for minting NFT collections entirely from the browser. Two repositories make up the project:

| Component                                            | Repo                                                                                                                                                            | Role                                                                                                                                                                       | Status                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Wallet core** (`signupcash/Signup-Core`)           | Lerna monorepo: `@signupcash/provider` SDK (721-line single file), `signupcash-signer` Preact wallet SPA + signing web worker (~9,215 LOC), `@signupcash/utils` | Non-custodial wallet + dApp platform: postMessage/popup protocol, budgeted JWT spend tokens, SLP type-1 + NFT1 Group/Child support, Flipstarter anyone-can-pay commitments | Deprecated Nov 2023 at v1.3.0         |
| **NFT/SLP factory** (`dibakarsutradhar/NFT-factory`) | CRA + Theme UI SPA (~900 LOC)                                                                                                                                   | Consumer-facing minting wizard: wallet login → NFT group (parent) → NFT children → review, with drag-and-drop IPFS pinning via Pinata                                      | Frozen Feb 2021 at "phase 2 complete" |

**How they connect:** NFT-factory is a dApp built _on_ the wallet's SDK. Its data model maps 1:1 onto the wallet's NFT1 primitives (`genesisNFTGroup` ↔ the wizard's parent form; `genesisNFTChild` ↔ its repeatable child form), and its login is the SDK's `requestAccess(['bch_address'])` popup flow. The wallet holds every key; the factory app never touches one.

## Dibakar's role in the project

- **NFT-factory: author.** Commissioned by Signup.cash (maintainer p0oker initialized the repo and added the MPL-2.0 license before work began). All 21 development commits, Jan 2 – Feb 10, 2021. This is the fully claimable piece.
- **Signup core: collaborator/contributor outside git history.** The core repo's git history is ~91% Pooria Atarzadeh (p0oker) with the Flipstarter feature by Sahid Miller. Any claim on the core must be framed as collaboration/analysis/integration work, **never** as authorship. The deep writeup's §9 carries the full anti-overclaim checklist.

## Numbers for the unified project entry

| Metric                    | Value                                                                  | Source                                           |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Project activity window   | Mar 2020 → Aug 2023 (core, incl. deprecation) · Jan–Feb 2021 (factory) | git logs                                         |
| Core commits / LOC        | 306 commits · ~10,150 hand-written LOC · 3 npm packages                | `signup-core-writeup.md` §7                      |
| Factory commits / LOC     | 21 commits (all Dibakar) · ~900 LOC · 13 components                    | `nft-factory-writeup.md` §7                      |
| Token standards           | SLP type-1 fungible, NFT1 Group (129), NFT1 Child (65)                 | core `provider.js:679-685`                       |
| Keyless payment primitive | USD-budgeted, 1-hour JWT spend tokens enforced by the wallet worker    | core `permission.js`, `worker/worker.js:111-122` |
| Factory wizard            | 4 steps (auth → parent → child → success), N children per group        | factory `Container.js`                           |
| Releases                  | core v1.0-beta.1 → v1.3.0 (May 2021)                                   | git tags                                         |

## Raw material — the single CV project entry

**Project line:** _Signup — non-custodial Bitcoin Cash wallet with NFT/SLP factory_ (or "Signup.cash ecosystem").

**Bullet candidates** (blend of core + factory; core bullets framed as collaboration):

- Contributed to Signup, a non-custodial Bitcoin Cash wallet and dApp platform (3-package monorepo, ~10k LOC) combining a postMessage/popup protocol, a signing web worker, and budgeted JWT spend tokens — and built its NFT/SLP factory dApp end to end.
- Built the NFT/SLP factory: a commissioned React wizard for minting SLP NFT1 collections from the non-custodial wallet, with wallet-popup login and drag-and-drop IPFS image pinning (Pinata).
- Integrated the Signup provider SDK in a production dApp while its NFT-genesis APIs were still unreleased, keeping the application fully keyless — the wallet popup performs all cryptography and the dApp receives only a BCH address.
- Analyzed the wallet core's trust model end to end: JWTs signed with wallet-derived entropy, per-session budget enforcement against live BCH price, and Schnorr-signed P2PKH settlement via Electrum clusters.
- Designed the multi-entity form state architecture powering repeatable NFT child minting within a single wizard session.

**Headline candidates:**

- "Built the NFT factory for Signup.cash — non-custodial Bitcoin Cash wallet with an NFT/SLP minting wizard, wallet-popup login, and IPFS pinning."
- "Signup: a non-custodial Bitcoin Cash wallet and dApp platform — contributed to the core SDK and built its NFT/SLP factory."

**Blog angles** (strongest of both docs): "Minting NFTs without keys: a wallet-popup UX for Bitcoin Cash" · "When your SDK ships after your app: an integration-timing postmortem" · "When your JWT key is your wallet key: entropy reuse in a non-custodial wallet".

## Accuracy rules for derived artifacts

1. **One project, honest split:** the wallet core is p0oker's creation; the NFT factory is Dibakar's. The unified entry above is worded accordingly — "contributed to" for the core, "built" for the factory.
2. The factory's mint step was never wired to the chain (`c8b6886` "demo nonFunc"); say "minting wizard" / "NFT/SLP factory", not "users minted NFTs with it". The wallet core _did_ ship working NFT1 genesis — the capability exists in the project.
3. Never cite raw insertion counts (+19.5k factory is lockfile-inflated; core's half-million raw insertions are bundle-inflated).
4. Both repos are frozen; describe designs, not live services (the closed-source bridge and wallet hosting are gone or unmaintained).

_Regenerate this overview together with both per-repo writeups._
