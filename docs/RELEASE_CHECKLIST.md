# Release Consistency Checklist

This checklist helps keep branding, release metadata, and download links aligned before shipping a new version of 喵哥Claw Desktop.

## Branding

- [ ] `package.json > name`, `description`, `productName`, and `appId` all match the current product branding.
- [ ] No leftover upstream or placeholder names remain in docs, scripts, or build config.
- [ ] Screenshots, icons, and release asset names reflect the current product name.

## Repository metadata

- [ ] `build.publish.owner` points to `miaoge2026`.
- [ ] `build.publish.repo` points to `miaoge-claw-desktop`.
- [ ] Any updater feed configuration matches the same owner/repo pair.
- [ ] Issue / discussion / wiki links point to this repository instead of placeholders.

## Versioning

- [ ] `package.json > version` matches the release tag.
- [ ] README download links point to the latest published tag.
- [ ] Asset filenames in README match the current packaged artifact version.
- [ ] Changelog entries and release notes refer to the same version.

## Developer workflow

- [ ] README clone URL and local setup commands use this repository.
- [ ] Package-manager commands are consistent (`pnpm` or `npm`, not mixed accidentally).
- [ ] Build and release instructions match the scripts that actually exist in `package.json`.

## Final verification

- [ ] Open the README in GitHub preview and click every external GitHub link once.
- [ ] Perform one dry-run build locally for the target platform.
- [ ] Confirm auto-update settings still point to the correct release source.
- [ ] Confirm release notes, artifacts, and tag naming are internally consistent.
