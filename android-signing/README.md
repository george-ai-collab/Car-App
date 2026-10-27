# Test-build signing key

`debug.keystore` signs the **test** APKs that GitHub builds. Because every build uses this
same key, a new test APK installs as an **update** over the old one (your data stays).

This key is only for test builds. The Play Store release will use a separate, private
release key that is never committed to the repo.
