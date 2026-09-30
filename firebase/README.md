# Firebase native configuration

Place the files provided by the client here (they are git-ignored):

| File | Platform | Must match |
|---|---|---|
| `GoogleService-Info.plist` | iOS | `BUNDLE_ID` = `com.acvel.app` |
| `google-services-android.json` | Android | `client[].client_info.android_client_info.package_name` = `com.acvel.app` |

Then run:

```bash
npm run firebase:check          # validates both files and prints the EXPO_PUBLIC_FIREBASE_* values
npm run firebase:check -- --write-env   # also writes those values into .env
```

`app.config.ts` passes the files to `ios.googleServicesFile` / `android.googleServicesFile`, so a native
build (`npx expo run:android`, EAS) embeds them. Authentication itself runs on the Firebase JS SDK, which
needs only the `EXPO_PUBLIC_FIREBASE_*` values derived from these files.
