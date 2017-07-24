# Force Latest Versions
> Force latest npm package versions.

[![npm version](https://badge.fury.io/js/force-latest.svg)](https://badge.fury.io/js/force-latest)

A CLI utility to force the installation of the latest package version of all packages in `package.json` marked as `latest`. Packages with any other version specification will be ignored. `devDependencies` is only parsed if `NODE_ENV` is not "production".

## Usage
Run the executable by entering `force-latest`. This can be added to a package's manifest as a `postinstall` script:

```json
{
    "name": "MyPackage",
    "scripts": {
        "postinstall": "force-latest"
    },
    "dependencies": {
        "some-library": "latest",
        "other": "^1.2.3"
    },
    "devDependencies": {
        "force-latest": "*"
    }
}
```

In this example, `some-library` will always be checked after an `npm install` is run. If it is not at the latest version as specified on [npmjs.com](npmjs.com), the latest version will be installed. The library `other` will not be checked or updated.
