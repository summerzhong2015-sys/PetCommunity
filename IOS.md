# Building PetCommunity for iPhone

The website and the app are the same code. Capacitor puts that code inside a
real iOS app that Xcode can build, sign and submit.

Everything here is run from `artifacts/pet-community`, on your Mac. None of it
can be done from a Linux machine — Apple only allows iOS builds on macOS.

## Before you start

- **Xcode** installed from the Mac App Store, opened once so it finishes
  setting itself up.
- **Node.js** (the LTS `.pkg` from nodejs.org), so `node` and `npm` exist.
- **CocoaPods**: `sudo gem install cocoapods`. Capacitor uses it to wire the
  iOS project together.

Check the first two:

    node --version
    xcodebuild -version

## One-time setup

    cd ~/Desktop/PetCommunity-MVP/artifacts/pet-community
    pnpm add @capacitor/core @capacitor/ios @capacitor/splash-screen
    pnpm add -D @capacitor/cli @capacitor/assets
    pnpm exec cap add ios

`capacitor.config.json` is already written, so `cap add ios` will pick up the
app name, the bundle id (`ca.murrayville.petcommunity`) and the background
colour without asking.

**The bundle id is permanent once you ship.** Change it in
`capacitor.config.json` before this step if you want something else, and make
it match the app record in App Store Connect.

Then the icon and launch screen, from the artwork in `assets/` (`icon.png`
at 1024 and `splash.png` at 2732 square, which are already there):

    pnpm exec capacitor-assets generate --ios

## Every time you change the app

    pnpm run build
    pnpm exec cap sync ios
    pnpm exec cap open ios

That builds the web app, copies it into the iOS project, and opens Xcode. In
Xcode: pick your iPhone from the device list at the top, press the play
button. The first run asks you to trust the developer certificate on the
phone — Settings → General → VPN & Device Management.

## Things that will bite

**The shared data still comes from the website.** A native build has no
server of its own, so the app asks `petcommunity-mvp.vercel.app/api/state`
directly. That is handled in `src/lib/shared.ts`. It means the phone app needs
a network connection for anything shared, and it means a Vercel deploy changes
what the app sees without rebuilding the app.

**Signing.** In Xcode, select the project, Signing & Capabilities, tick
"Automatically manage signing", and pick your team. This is where the $99
membership actually does something.

**Do not submit yet.** As it stands this is the website in a native shell, and
App Store review guideline 4.2 exists to reject exactly that. What makes it a
real app — push notifications for lost pets, real location, the camera — is
still to build. See `APP-STORE.md` for the order.

## What `pnpm add` will change

`package.json` and `pnpm-lock.yaml`. Both must be committed, or the Vercel
build will fail: Vercel installs with a frozen lockfile, and a `package.json`
that mentions packages the lockfile has never heard of is an error rather than
a warning. Run `./ship-fix.sh` after the install and the website stays fine.

The `ios/` folder that `cap add ios` creates should also be committed. It
holds your signing settings and the native project Xcode opens.
