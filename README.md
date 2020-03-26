# Bug reproduction for Prisma Client

The issue is that the CLI and the programmatic API do not behave similarly. A breaking change in the binary breaks all old programmatic API consumers instantly. This includes Studio & Nexus as of now.

---

Getting the following out of the way to make sure we're all on the same page:

1. When I say that package A's version 0.1.2 is pinned to package B's version 0.1.2, I mean that package A's version 0.1.2 _always_ uses package B's version 0.1.2, no exceptions. Even if a newer version of package B is available, package A v0.1.2 WILL NOT use the latest version of package B.

---

## Repository structure

1. There are two folders:

    - The `cli` folder uses the `prisma2` CLI to generate Prisma Client
    - The `programmatic` folder uses the programmatic API to generate Prisma Client

2. You'll want to run `yarn` in both folders to install dependencies.

3. Each folder has a `generate` NPM script that will attempt to generate Prisma Client.

4. Each folder also has a `binary-version` NPM script that will print out the version of the binary that was downloaded during generation.

5. Both folders use a fixed version (2.0.0-preview024) of dependencies. This is because I know a breaking change was introduced between preview024 and preview025, which demonstrates the bug.

6. All NPM scripts are written assuming you're on macOS, if you're on Linux / Windows, these scripts should be easy enough to tweak.

---

## Reproducing the problem:

1. Run `yarn generate` in the `cli` folder. Prisma Client should be generated correctly. If you run `yarn binary-version`, you'll see that the binary version used is: `377df4fe30aa992f13f1ba152cf83d5770bdbc85`.
2. Run `yarn generate` in the `programmatic` folder. You'll see an error:

    ```
    Error: Get config error: Found argument '/Users/siddhant/Code/prisma2-client-binaries/programmatic/schema.prisma' which wasn't expected, or isn't valid in this context

    USAGE:
        query-engine-darwin cli get-config

    For more information try --help
    ```

3. Run `yarn binary-version` in the `programmatic` folder, and you'll see that the binary version is: `8814060fa684793b73d07dbfccd4b7777b3361ae` (this might be something else for you, the point is, it is not the same as `cli` folder)

---

## Explanation:

- On March 12, 2020, 2.0.0-preview024 was released.

- On March 25, 2020, a breaking change was introduced in the query engine binary. What this breaking change was is not relevant. What's relevant is that the way the query engine binary is supposed to be spawned needed to change.

- Today, March 26, 2020, 2.0.0-preview024 of the CLI continues to generate Prisma Client correctly. However, 2.0.0-preview024 of the SDK (the programmatic API) is now broken. Put in other words, **a script that was working before has now stopped working without changing a thing**

So why is this happening?

This is happening because `prisma2` CLI knows which binary it is compatible with, but `@prisma/sdk` does not. The SDK _always_ downloads the latest alpha binary, which it may not be compatible with (unless told otherwise).

---

## Proposed solution:

- The root of our problems is that we've pinned the wrong package versions together. `prisma2` & `query-engine-darwin` are pinned, when in fact, `@prisma/sdk` & `query-engine-darwin` should be pinned together.

- A _specific_ version of `prisma2` knows to use a _specific_ version of `query-engine-darwin`. This means that when you use the CLI, it tells the SDK to download a specific version of the binary and use that for generation.

- However, this knowledge of compatibility **needs** to reside in the SDK, because the SDK is what owns (and works with) the binary. It is unreasonable to expect that the SDK consumer (CLI, Studio, Nexus & third-party libraries) tells the SDK which version of the binary to download.

- If the SDK & the binary versions were to be pinned together, the CLI will continue to work the same way as it does right now, but the programmatic API would also stop breaking. AKA: If preview024 works today, it will continue to work forever, even if breaking changes are introduced in the future.

- We need to address this before Beta / GA, because as you've seen, a breaking change today will break Studio and Nexus that were released months ago. Whoever uses the programmatic API is completely unprotected from breaking changes.
