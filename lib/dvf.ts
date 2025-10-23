00:10:54.337 Running build in Washington, D.C., USA (East) – iad1
00:10:54.364 Build machine configuration: 2 cores, 8 GB
00:10:54.457 Cloning github.com/LilyDPE/immo-estimator-2a (Branch: main, Commit: 104b266)
00:10:55.418 Cloning completed: 961.000ms
00:10:56.457 Restored build cache from previous deployment (CkizcBDhxQP3DpB6ud2y9NPk3LY3)
00:10:57.138 Running "vercel build"
00:10:57.516 Vercel CLI 48.5.0
00:10:57.813 Running "install" command: `npm install`...
00:10:59.326 
00:10:59.327 up to date, audited 441 packages in 1s
00:10:59.328 
00:10:59.328 156 packages are looking for funding
00:10:59.328   run `npm fund` for details
00:10:59.332 
00:10:59.333 3 vulnerabilities (1 moderate, 2 high)
00:10:59.333 
00:10:59.333 To address all issues (including breaking changes), run:
00:10:59.333   npm audit fix --force
00:10:59.334 
00:10:59.334 Run `npm audit` for details.
00:10:59.360 Detected Next.js version: 14.2.33
00:10:59.361 Running "next build"
00:11:00.020   ▲ Next.js 14.2.33
00:11:00.021 
00:11:00.067    Creating an optimized production build ...
00:11:00.628  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
00:11:02.973  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
00:11:03.858  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
00:11:04.714  ✓ Compiled successfully
00:11:04.715    Linting and checking validity of types ...
00:11:08.687 Failed to compile.
00:11:08.688 
00:11:08.688 ./lib/dvf.ts:1:19
00:11:08.688 Type error: Module '"@/types"' has no exported member 'PropertyType'.
00:11:08.688 
00:11:08.689 [0m[31m[1m>[22m[39m[90m 1 |[39m [36mimport[39m { [33mDVFSale[39m[33m,[39m [33mPropertyType[39m } [36mfrom[39m [32m'@/types'[39m[33m;[39m[0m
00:11:08.689 [0m [90m   |[39m                   [31m[1m^[22m[39m[0m
00:11:08.689 [0m [90m 2 |[39m[0m
00:11:08.689 [0m [90m 3 |[39m [36mconst[39m [33mDVF_API_BASE[39m [33m=[39m [32m'https://files.data.gouv.fr/geo-dvf/latest/csv'[39m[33m;[39m[0m
00:11:08.689 [0m [90m 4 |[39m[0m
00:11:08.704 Next.js build worker exited with code: 1 and signal: null
00:11:08.716 Error: Command "next build" exited with 1
