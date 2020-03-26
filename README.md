# Bug reproduction for Prisma Client

The issue is that the Query Engine binary versions are pinned to the `prisma2` package rather than the `@prisma/sdk` package.

---

Getting the following out of the way to make sure we're all on the same page:

1. When I say that package A's version 0.1.2 is pinned to package B's version 0.1.2, I mean that package A's version 0.1.2 _always_ uses package B's version 0.1.2, no exceptions. Even if a newer version of package B is available, package A v0.1.2 WILL NOT use the latest version of package B.

2. A basic understanding of prisma2 internals is required. In a nutshell, these are the calls that are made to generate Prisma Client

```
┌─────────────────────┐   calls     ┌─────────────────────┐    calls    ┌─────────────────────┐
│  prisma2 generate   │────────────▶│   @prisma/client    │────────────▶│     @prisma/sdk     │───────▶ generates Prisma Client
└─────────────────────┘             └─────────────────────┘             └─────────────────────┘
```

The takeaways here are:
a. `prisma2` CLI does not generate Prisma Client, `@prisma/sdk` does.
b. `@prisma/sdk` exposes a programmatic way of generating Prisma Client. This is used by `prisma2`, and by Prisma Studio.
c. The `@prisma/sdk` package `spawn`s the `query-engine-darwin` binary (during generation).
d. The `prisma2` package **DOES NOT** `spawn` the `query-engine-darwin` binary. It merely asks `@prisma/client` to do it, which in turn asks `@prisma/sdk` to do it.

3. v0.1.2 of the SDK is only guaranteed to be compatible with v0.1.2 of the binary. It _may_ be compatible with 0.1.3, but _not always_.

---

Okay, so now here is how you can reproduce this issue:

1. Clone this repository
2. Run `yarn` on its root, then `yarn generate`. (This will cause the SDK to download the query engine binary behind the scenes)
3. Run `yarn binary-version`. (This will run the downloaded query engine binary and print out its version)
4. Note what the output is. When I created this repo, the output was:

```
prisma 8814060fa684793b73d07dbfccd4b7777b3361ae
```

5. If you get something else, you have reproduced the problem. An explanation follows.

(This repository uses the programmatic API to generate Prisma Client. This is done because it demostrates the problem.)

---

Note that the versions of `@prisma/client`, `@prisma/sdk` & `@prisma/fetch-engine` are all fixed in the `package.json`, and herein lies the problem.

I expect that a specific version of the SDK (& client by extension) is pinned to a specific version of the binary. This is currently not happening, as you've seen. When I created this repo, I got version `88140...`, and when you ran the same exact repo, you got something else. Now imagine the version you got had a breaking change. **All of a sudden, a script that was working before stops working completely without changing a thing**.

### Explanation:

When you try to generate Prisma Client, a query engine binary needs to be downloaded. The version of this download is dictated by whoever is initiating the download. The CLI knows what version itself is compatible with, but the SDK does not. AKA: `prisma2` v0.1.2 knows to always use binary version v0.1.2, but SDK v0.1.2 does not know which binary version to download.

So, when you run `prisma2 generate`, the CLI v0.1.2 _specifically_ downloads binary version 0.1.2. However, there is no way to _specifically_ download a binary version when using the programmatic API. The programmatic API will _always_ download the latest alpha binary. (even if it has breaking changes)

So the effect of this is that `prisma2 generate` always works correctly, but the programmatic API does not.

---

The root of our problems is that we've pinned the wrong packages together. `prisma2` & `query-engine-darwin` are pinned, when in reality, `@prisma/sdk` & `query-engine-darwin` should be pinned together. Why? Because the SDK is what uses the binary, not `prisma2`.

This means that whoever uses the programmatic API is completely unprotected from breaking changes. If a breaking change is pushed out between preview024 & preview025, all these consumers will be completely broken till preview025 goes out. These consumers are currently Prisma Studio and Nexus. In the future, these will be third party libraries.

---

If we pin `@prisma/sdk` to the `query-engine-darwin` binary, the CLI will continue to work the exact same way, but the programmatic API will also start behaving the way we expect.
